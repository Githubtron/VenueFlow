import time
from threading import Lock


class WindowAggregator:
    """
    Accumulates SensorReading counts per zoneId over a tumbling window.
    Thread-safe via a lock.
    """

    def __init__(self):
        self._lock = Lock()
        self._window: dict[str, dict] = {}  # zoneId -> {count, venue_id}
        self._window_start = time.monotonic()

    def add(self, reading: dict) -> None:
        zone_id = reading.get('zoneId') or reading.get('zone_id')
        venue_id = reading.get('venueId') or reading.get('venue_id')
        count = reading.get('count', 0)

        if not zone_id or not venue_id:
            return

        with self._lock:
            if zone_id not in self._window:
                self._window[zone_id] = {'count': 0, 'venue_id': venue_id}
            self._window[zone_id]['count'] += count

    def flush(self) -> dict[str, dict]:
        """Returns {zoneId: {count, venue_id}} and resets the window."""
        with self._lock:
            result = dict(self._window)
            self._window = {}
            self._window_start = time.monotonic()
        return result

    def elapsed_seconds(self) -> float:
        return time.monotonic() - self._window_start
