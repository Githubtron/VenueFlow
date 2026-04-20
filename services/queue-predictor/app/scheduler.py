"""
60-second prediction scheduler.
Fetches zone densities from Redis, runs inference, stores predictions.
Validates: Requirements 3.1
"""
import json
import logging
import threading
import time
from datetime import datetime, timezone

from redis import Redis
from app.predictor import QueuePredictor
from app.models import QueuePrediction
from app.store import PredictionStore

logger = logging.getLogger(__name__)

PREDICTION_INTERVAL_SECONDS = 60


def _get_density_for_location(redis: Redis, venue_id: str, zone_id: str) -> float:
    """Fetch current density for a zone from the heatmap store."""
    raw = redis.hget(f'heatmap:{venue_id}', f'zone:{zone_id}')
    if raw:
        try:
            data = json.loads(raw)
            return float(data.get('density_percent', 0.0))
        except Exception:
            pass
    return 0.0


def _get_weather(redis: Redis, venue_id: str) -> str:
    """Fetch latest weather condition from external enrichment cache."""
    raw = redis.get(f'weather:{venue_id}')
    if raw:
        try:
            data = json.loads(raw)
            return data.get('condition', 'clear')
        except Exception:
            pass
    return 'clear'


def start_scheduler(
    store: PredictionStore,
    redis_url: str,
    locations: list[dict],
) -> threading.Thread:
    """
    Starts the 60-second prediction loop in a background thread.
    locations: list of {location_id, location_type, venue_id, zone_id}
    """
    predictor = QueuePredictor()
    redis = Redis.from_url(redis_url, decode_responses=True)

    def _run():
        while True:
            now = datetime.now(timezone.utc)
            hour = now.hour

            for loc in locations:
                try:
                    density = _get_density_for_location(redis, loc['venue_id'], loc.get('zone_id', loc['location_id']))
                    weather = _get_weather(redis, loc['venue_id'])

                    features = {
                        'location_id': loc['location_id'],
                        'current_density': density,
                        'time_of_day_hour': hour,
                        'event_phase': 'general',
                        'weather_condition': weather,
                    }

                    wait, confidence, version = predictor.predict(features)

                    prediction = QueuePrediction(
                        location_id=loc['location_id'],
                        location_type=loc['location_type'],
                        venue_id=loc['venue_id'],
                        predicted_wait_minutes=wait,
                        confidence_score=confidence,
                        generated_at=now,
                        model_version=version,
                    )
                    store.save(prediction)

                except Exception as e:
                    logger.error(f'[queue-predictor] Prediction failed for {loc["location_id"]}: {e}')

            time.sleep(PREDICTION_INTERVAL_SECONDS)

    thread = threading.Thread(target=_run, daemon=True, name='queue-scheduler')
    thread.start()
    return thread
