"""
Queue wait time predictor.

Primary model: XGBoost regressor (loaded from S3 / local file).
Fallback model: Exponential Moving Average (EMA) when XGBoost confidence is low.

Validates: Requirements 3.1, 3.3, 3.6
"""
import os
import math
import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

MODEL_VERSION = os.getenv('MODEL_VERSION', '1.0.0-ema-baseline')
EMA_ALPHA = 0.3          # EMA smoothing factor
MIN_CONFIDENCE = 0.6     # below this, fall back to EMA
MAX_WAIT_MINUTES = 60.0  # cap predictions at 60 minutes


class EMAPredictor:
    """
    Exponential Moving Average fallback predictor.
    Maintains per-location EMA of observed wait times.
    """
    def __init__(self, alpha: float = EMA_ALPHA):
        self._alpha = alpha
        self._ema: dict[str, float] = {}

    def update(self, location_id: str, observed_wait: float) -> None:
        if location_id not in self._ema:
            self._ema[location_id] = observed_wait
        else:
            self._ema[location_id] = (
                self._alpha * observed_wait +
                (1 - self._alpha) * self._ema[location_id]
            )

    def predict(self, location_id: str, density: float) -> float:
        base = self._ema.get(location_id, 5.0)  # default 5 min if no history
        # Scale by density
        return min(base * (1 + density), MAX_WAIT_MINUTES)


class XGBoostPredictor:
    """
    XGBoost-based wait time predictor.
    In production, loads model from S3. Here uses a deterministic formula
    as a stand-in until a trained model artifact is available.
    """

    def predict(self, features: dict) -> tuple[float, float]:
        """
        Returns (predicted_wait_minutes, confidence_score).
        Features: density, time_of_day_hour, event_phase, historical_throughput
        """
        density = features.get('current_density', 0.0)
        hour = features.get('time_of_day_hour', 12)
        phase = features.get('event_phase', 'general')
        throughput = features.get('historical_throughput') or 20.0

        # Phase multipliers based on typical crowd behaviour
        phase_multiplier = {
            'pre_show': 1.5,
            'halftime': 2.0,
            'post_show': 1.8,
            'general': 1.0,
        }.get(phase, 1.0)

        # Peak hour penalty (17:00–20:00)
        hour_penalty = 1.3 if 17 <= hour <= 20 else 1.0

        base_wait = (density * 30.0) / max(throughput / 20.0, 0.1)
        predicted = min(base_wait * phase_multiplier * hour_penalty, MAX_WAIT_MINUTES)
        predicted = max(predicted, 0.0)

        # Confidence is higher when density is in a well-modelled range
        confidence = 0.85 if 0.1 <= density <= 0.9 else 0.65

        return round(predicted, 2), round(confidence, 3)


class QueuePredictor:
    """
    Main predictor — uses XGBoost with EMA fallback.
    """
    def __init__(self):
        self._xgb = XGBoostPredictor()
        self._ema = EMAPredictor()
        self._model_version = MODEL_VERSION

    def predict(self, features: dict) -> tuple[float, float, str]:
        """Returns (predicted_wait_minutes, confidence_score, model_version)."""
        wait, confidence = self._xgb.predict(features)

        if confidence < MIN_CONFIDENCE:
            location_id = features.get('location_id', 'unknown')
            density = features.get('current_density', 0.0)
            wait = self._ema.predict(location_id, density)
            confidence = 0.55
            version = f'{self._model_version}-ema-fallback'
        else:
            version = self._model_version

        return max(wait, 0.0), confidence, version

    def update_ema(self, location_id: str, observed_wait: float) -> None:
        self._ema.update(location_id, observed_wait)


def find_alternatives(
    predictions: list[dict],
    target_location_id: str,
    max_results: int = 3,
) -> list[dict]:
    """
    Returns kiosks with strictly shorter predicted wait than the target.
    Validates: Requirements 3.5 (Property 9)
    """
    target = next((p for p in predictions if p['location_id'] == target_location_id), None)
    if not target:
        return []

    target_wait = target['predicted_wait_minutes']

    alternatives = [
        p for p in predictions
        if p['location_id'] != target_location_id
        and p['predicted_wait_minutes'] < target_wait
    ]

    # Sort by shortest wait first
    alternatives.sort(key=lambda p: p['predicted_wait_minutes'])
    return alternatives[:max_results]
