"""
Threat detection engine.

1. Rule-based unauthorized access detector (ATTENDEE in restricted zone)
2. Movement anomaly detector (statistical baseline — LSTM stub)
3. Watchlist hash comparison (perceptual hash matching)

Validates: Requirements 18.1, 18.2
"""
import hashlib
import logging
from collections import defaultdict, deque
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

MODEL_VERSION = '1.0.0-rule-based'
ANOMALY_THRESHOLD = 0.75
FLOOD_GUARD_WINDOW_SECONDS = 60
FLOOD_GUARD_MAX_ALERTS = 10
SLIDING_WINDOW_MINUTES = 5


class MovementAnomalyDetector:
    """
    Statistical movement anomaly detector.
    Maintains a 5-minute sliding window of zone transitions per session token.
    LSTM model is stubbed — uses rapid zone-switching heuristic as proxy.
    """

    def __init__(self):
        # session_token -> deque of (zone_id, timestamp)
        self._windows: dict[str, deque] = defaultdict(lambda: deque(maxlen=50))

    def record_transition(self, session_token: str, zone_id: str, timestamp: datetime) -> None:
        self._windows[session_token].append((zone_id, timestamp))

    def compute_anomaly_score(self, session_token: str) -> float:
        """
        Heuristic: rapid zone switching in short time window = high anomaly score.
        Returns 0.0–1.0. Scores > ANOMALY_THRESHOLD trigger an alert.
        """
        window = self._windows.get(session_token)
        if not window or len(window) < 3:
            return 0.0

        now = datetime.now(timezone.utc)
        recent = [
            (zone, ts) for zone, ts in window
            if (now - ts.replace(tzinfo=timezone.utc) if ts.tzinfo is None else now - ts).total_seconds()
            <= SLIDING_WINDOW_MINUTES * 60
        ]

        if len(recent) < 3:
            return 0.0

        # Count unique zones visited in window
        unique_zones = len({z for z, _ in recent})
        # Score: more unique zones in short window = higher anomaly
        score = min(unique_zones / 10.0, 1.0)
        return round(score, 3)


class UnauthorizedAccessDetector:
    """
    Rule-based: detects ATTENDEE-role sessions in restricted zones.
    Validates: Requirements 18.2
    """

    def __init__(self):
        self._restricted_zones: set[str] = set()

    def register_restricted_zone(self, zone_id: str) -> None:
        self._restricted_zones.add(zone_id)

    def is_unauthorized(self, zone_id: str, role: str) -> bool:
        """Returns True if an ATTENDEE enters a restricted zone."""
        return zone_id in self._restricted_zones and role == 'ATTENDEE'


class WatchlistMatcher:
    """
    Compares perceptual hashes against a pre-loaded watchlist.
    No raw biometric data stored — hashes only.
    Validates: Requirements 1.7, 18.1, 9.1
    """

    def __init__(self):
        self._watchlist: set[str] = set()

    def load_watchlist(self, hashes: list[str]) -> None:
        self._watchlist.update(hashes)

    def check(self, perceptual_hash: str) -> bool:
        """Returns True if hash matches watchlist entry."""
        return perceptual_hash in self._watchlist


class FloodGuard:
    """
    Prevents alert flooding: max FLOOD_GUARD_MAX_ALERTS per zone per 60s window.
    """

    def __init__(self):
        self._counts: dict[str, list[datetime]] = defaultdict(list)

    def allow(self, zone_id: str) -> bool:
        now = datetime.now(timezone.utc)
        recent = [
            t for t in self._counts[zone_id]
            if (now - t.replace(tzinfo=timezone.utc) if t.tzinfo is None else now - t).total_seconds()
            <= FLOOD_GUARD_WINDOW_SECONDS
        ]
        self._counts[zone_id] = recent
        if len(recent) >= FLOOD_GUARD_MAX_ALERTS:
            logger.warning(f'[threat-detection] Flood guard triggered for zone {zone_id}')
            return False
        self._counts[zone_id].append(now)
        return True
