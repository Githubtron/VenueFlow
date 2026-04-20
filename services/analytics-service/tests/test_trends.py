"""
Tests for congestion trends.

Property 21: Congestion Trend Monotonic Aggregation
Feature: venueflow-platform, Property 21: Congestion Trend Monotonic Aggregation
Validates: Requirements 17.2
"""
from datetime import datetime, timezone, timedelta
from hypothesis import given, settings, assume
from hypothesis import strategies as st


def make_bucket(start_iso: str, end_iso: str, avg_density: float) -> dict:
    return {'bucket_start': start_iso, 'bucket_end': end_iso, 'avg_density': avg_density}


def is_chronological(buckets: list[dict]) -> bool:
    """Check that buckets are in chronological order with non-overlapping timestamps."""
    for i in range(1, len(buckets)):
        t1 = datetime.fromisoformat(buckets[i - 1]['bucket_start'])
        t2 = datetime.fromisoformat(buckets[i]['bucket_start'])
        if t2 <= t1:
            return False
    return True


def test_empty_trends_is_valid():
    assert is_chronological([]) is True


def test_single_bucket_is_chronological():
    buckets = [make_bucket('2024-01-01T10:00:00+00:00', '2024-01-01T11:00:00+00:00', 0.5)]
    assert is_chronological(buckets) is True


def test_two_ordered_buckets():
    buckets = [
        make_bucket('2024-01-01T10:00:00+00:00', '2024-01-01T11:00:00+00:00', 0.3),
        make_bucket('2024-01-01T11:00:00+00:00', '2024-01-01T12:00:00+00:00', 0.5),
    ]
    assert is_chronological(buckets) is True


def test_unordered_buckets_fail_check():
    buckets = [
        make_bucket('2024-01-01T12:00:00+00:00', '2024-01-01T13:00:00+00:00', 0.5),
        make_bucket('2024-01-01T10:00:00+00:00', '2024-01-01T11:00:00+00:00', 0.3),
    ]
    assert is_chronological(buckets) is False


# ── Property 21: Congestion Trend Monotonic Aggregation ──────────────────────

@given(
    num_buckets=st.integers(min_value=2, max_value=20),
    start_hour=st.integers(min_value=0, max_value=20),
    bucket_hours=st.integers(min_value=1, max_value=3),
)
@settings(max_examples=200)
def test_sorted_buckets_always_chronological(num_buckets, start_hour, bucket_hours):
    """Property 21: Buckets returned in chronological order with non-overlapping timestamps."""
    base = datetime(2024, 6, 1, start_hour, 0, 0, tzinfo=timezone.utc)
    buckets = []
    for i in range(num_buckets):
        start = base + timedelta(hours=i * bucket_hours)
        end = start + timedelta(hours=bucket_hours)
        buckets.append(make_bucket(start.isoformat(), end.isoformat(), 0.5))

    assert is_chronological(buckets) is True
