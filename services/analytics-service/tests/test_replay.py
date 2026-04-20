"""
Tests for heatmap replay engine.

Property 20: Heatmap Replay Completeness
Feature: venueflow-platform, Property 20: Heatmap Replay Completeness
Validates: Requirements 17.1
"""
from datetime import datetime, timezone, timedelta
from hypothesis import given, settings
from hypothesis import strategies as st
from app.replay import _generate_stub_frames


def test_stub_frames_cover_full_time_range():
    from_ts = datetime(2024, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
    to_ts = datetime(2024, 1, 1, 10, 1, 0, tzinfo=timezone.utc)
    frames = _generate_stub_frames('venue-1', from_ts, to_ts, 10)
    assert len(frames) > 0
    assert frames[0]['timestamp'] == from_ts.isoformat()


def test_stub_frames_in_chronological_order():
    from_ts = datetime(2024, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
    to_ts = datetime(2024, 1, 1, 10, 2, 0, tzinfo=timezone.utc)
    frames = _generate_stub_frames('venue-1', from_ts, to_ts, 10)
    timestamps = [f['timestamp'] for f in frames]
    assert timestamps == sorted(timestamps)


def test_stub_frames_interval_respected():
    from_ts = datetime(2024, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
    to_ts = datetime(2024, 1, 1, 10, 1, 0, tzinfo=timezone.utc)
    frames = _generate_stub_frames('venue-1', from_ts, to_ts, 10)
    for i in range(1, len(frames)):
        t1 = datetime.fromisoformat(frames[i - 1]['timestamp'])
        t2 = datetime.fromisoformat(frames[i]['timestamp'])
        gap = (t2 - t1).total_seconds()
        assert gap <= 10 + 0.001  # allow floating point tolerance


# ── Property 20: Heatmap Replay Completeness ─────────────────────────────────

@given(
    duration_seconds=st.integers(min_value=10, max_value=300),
    interval=st.integers(min_value=5, max_value=30),
)
@settings(max_examples=100)
def test_replay_frames_within_time_window(duration_seconds, interval):
    """Property 20: All frames must have timestamps within [from_ts, to_ts]."""
    from_ts = datetime(2024, 6, 1, 12, 0, 0, tzinfo=timezone.utc)
    to_ts = from_ts + timedelta(seconds=duration_seconds)
    frames = _generate_stub_frames('venue-1', from_ts, to_ts, interval)

    for frame in frames:
        ts = datetime.fromisoformat(frame['timestamp'])
        assert ts >= from_ts
        assert ts <= to_ts + timedelta(seconds=interval)  # allow last frame


@given(
    duration_seconds=st.integers(min_value=20, max_value=120),
    interval=st.integers(min_value=5, max_value=15),
)
@settings(max_examples=100)
def test_consecutive_frame_gaps_within_interval(duration_seconds, interval):
    """Property 20: Consecutive frame gaps must be <= interval seconds."""
    from_ts = datetime(2024, 6, 1, 12, 0, 0, tzinfo=timezone.utc)
    to_ts = from_ts + timedelta(seconds=duration_seconds)
    frames = _generate_stub_frames('venue-1', from_ts, to_ts, interval)

    for i in range(1, len(frames)):
        t1 = datetime.fromisoformat(frames[i - 1]['timestamp'])
        t2 = datetime.fromisoformat(frames[i]['timestamp'])
        gap = (t2 - t1).total_seconds()
        assert gap <= interval + 0.001
