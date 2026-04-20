from datetime import datetime

# Severity mapping — used in property tests
SEVERITY = {'green': 0, 'amber': 1, 'red': 2}

DEFAULT_THRESHOLDS = {'yellow': 0.5, 'red': 0.8}


def classify_density(density_percent: float, thresholds: dict = None) -> str:
    """
    Classify a density percentage into green/amber/red.
    Monotonically non-decreasing in severity (Property 5).
    Aligned with FRONTEND-GUIDELINES color tokens (amber replaces yellow).
    """
    t = thresholds or DEFAULT_THRESHOLDS
    yellow_threshold = t.get('yellow', DEFAULT_THRESHOLDS['yellow'])
    red_threshold = t.get('red', DEFAULT_THRESHOLDS['red'])

    if density_percent >= red_threshold:
        return 'red'
    if density_percent >= yellow_threshold:
        return 'amber'
    return 'green'


def is_stale(last_updated: datetime, now: datetime, stale_threshold_seconds: int = 30) -> bool:
    """
    Returns True if the zone has not received data within the threshold (Property 6).
    """
    return (now - last_updated).total_seconds() > stale_threshold_seconds
