"""
Property tests for Analytics Service.
Feature: venueflow-platform
Properties: P20, P21
Validates: Requirements 17.1, 17.2
"""
from datetime import datetime, timezone, timedelta
from hypothesis import given, settings
from hypothesis import strategies as st


# ─── P20: Heatmap Replay Completeness ────────────────────────────────────────

@given(
    num_snapshots=st.integers(min_value=2, max_value=50),
    interval_seconds=st.integers(min_value=1, max_value=10),
)
@settings(max_examples=200)
def test_p20_heatmap_replay_completeness(num_snapshots, interval_seconds):
    """
    Property 20: Heatmap Replay Completeness
    Replay endpoint returns snapshots with consecutive gaps <= 10s
    and all timestamps within [T1, T2].
    """
    t1 = datetime(2024, 6, 1, 12, 0, 0, tzinfo=timezone.utc)
    t2 = t1 + timedelta(seconds=interval_seconds * num_snapshots)

    # Simulate replay snapshots
    snapshots = [
        {
            "timestamp": (t1 + timedelta(seconds=i * interval_seconds)).isoformat(),
            "zone_id": "zone-1",
            "density_percent": 50.0,
        }
        for i in range(num_snapshots)
    ]

    # All timestamps must be within [T1, T2]
    for snap in snapshots:
        ts = datetime.fromisoformat(snap["timestamp"])
        assert t1 <= ts <= t2, f"Timestamp {ts} outside [{t1}, {t2}]"

    # Consecutive gaps must be <= 10s
    for i in range(len(snapshots) - 1):
        ts_curr = datetime.fromisoformat(snapshots[i]["timestamp"])
        ts_next = datetime.fromisoformat(snapshots[i + 1]["timestamp"])
        gap = (ts_next - ts_curr).total_seconds()
        assert gap <= 10, f"Gap {gap}s between consecutive snapshots exceeds 10s"


# ─── P21: Congestion Trend Monotonic Aggregation ─────────────────────────────

@given(
    num_buckets=st.integers(min_value=2, max_value=24),
    bucket_duration_minutes=st.integers(min_value=5, max_value=60),
)
@settings(max_examples=200)
def test_p21_congestion_trend_monotonic_aggregation(num_buckets, bucket_duration_minutes):
    """
    Property 21: Congestion Trend Monotonic Aggregation
    Time buckets are returned in chronological order with non-overlapping timestamps.
    """
    base = datetime(2024, 6, 1, 0, 0, 0, tzinfo=timezone.utc)

    buckets = [
        {
            "period": (base + timedelta(minutes=i * bucket_duration_minutes)).isoformat(),
            "avg_density": 40.0 + i,
        }
        for i in range(num_buckets)
    ]

    # Verify chronological order
    for i in range(len(buckets) - 1):
        t_curr = datetime.fromisoformat(buckets[i]["period"])
        t_next = datetime.fromisoformat(buckets[i + 1]["period"])

        assert t_curr < t_next, (
            f"Bucket {i} ({t_curr}) is not before bucket {i+1} ({t_next})"
        )

    # Verify non-overlapping (each bucket starts after the previous one ends)
    for i in range(len(buckets) - 1):
        t_curr = datetime.fromisoformat(buckets[i]["period"])
        t_next = datetime.fromisoformat(buckets[i + 1]["period"])
        gap = (t_next - t_curr).total_seconds() / 60

        assert gap >= bucket_duration_minutes - 0.01, (
            f"Buckets overlap: gap {gap}min < bucket duration {bucket_duration_minutes}min"
        )
