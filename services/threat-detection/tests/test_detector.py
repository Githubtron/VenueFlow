"""
Tests for Threat Detection Service.

Property 22: Threat Alert Generation Completeness
Feature: venueflow-platform, Property 22: Threat Alert Generation Completeness
Validates: Requirements 18.1

Property 23: Unauthorized Access Alert Correctness
Feature: venueflow-platform, Property 23: Unauthorized Access Alert Correctness
Validates: Requirements 18.2
"""
from datetime import datetime, timezone, timedelta
from hypothesis import given, settings, assume
from hypothesis import strategies as st

from app.detector import (
    MovementAnomalyDetector, UnauthorizedAccessDetector,
    WatchlistMatcher, FloodGuard, ANOMALY_THRESHOLD,
)


# ── Unit tests ────────────────────────────────────────────────────────────────

def test_unauthorized_access_attendee_in_restricted_zone():
    detector = UnauthorizedAccessDetector()
    detector.register_restricted_zone('zone-vip')
    assert detector.is_unauthorized('zone-vip', 'ATTENDEE') is True


def test_unauthorized_access_staff_in_restricted_zone_allowed():
    detector = UnauthorizedAccessDetector()
    detector.register_restricted_zone('zone-vip')
    assert detector.is_unauthorized('zone-vip', 'STAFF') is False


def test_unauthorized_access_attendee_in_public_zone():
    detector = UnauthorizedAccessDetector()
    assert detector.is_unauthorized('zone-public', 'ATTENDEE') is False


def test_anomaly_score_zero_for_single_transition():
    detector = MovementAnomalyDetector()
    detector.record_transition('session-1', 'zone-a', datetime.now(timezone.utc))
    assert detector.compute_anomaly_score('session-1') == 0.0


def test_anomaly_score_increases_with_rapid_zone_switching():
    detector = MovementAnomalyDetector()
    now = datetime.now(timezone.utc)
    for i in range(8):
        detector.record_transition('session-rapid', f'zone-{i}', now)
    score = detector.compute_anomaly_score('session-rapid')
    assert score > 0.0


def test_watchlist_match_returns_true_for_known_hash():
    matcher = WatchlistMatcher()
    matcher.load_watchlist(['abc123', 'def456'])
    assert matcher.check('abc123') is True


def test_watchlist_no_match_for_unknown_hash():
    matcher = WatchlistMatcher()
    matcher.load_watchlist(['abc123'])
    assert matcher.check('unknown') is False


def test_flood_guard_allows_under_limit():
    guard = FloodGuard()
    for _ in range(9):
        assert guard.allow('zone-a') is True


def test_flood_guard_blocks_at_limit():
    guard = FloodGuard()
    for _ in range(10):
        guard.allow('zone-flood')
    assert guard.allow('zone-flood') is False


# ── Property 22: Threat Alert Generation Completeness ────────────────────────

@given(
    num_zones=st.integers(min_value=8, max_value=15),
    session_token=st.text(min_size=5, max_size=20),
)
@settings(max_examples=100)
def test_high_anomaly_score_above_threshold_for_rapid_switching(num_zones, session_token):
    """Property 22: Rapid zone switching produces anomaly score > threshold."""
    detector = MovementAnomalyDetector()
    now = datetime.now(timezone.utc)
    for i in range(num_zones):
        detector.record_transition(session_token, f'zone-{i}', now)
    score = detector.compute_anomaly_score(session_token)
    # With 8+ unique zones, score should exceed threshold
    assert score > ANOMALY_THRESHOLD


# ── Property 23: Unauthorized Access Alert Correctness ───────────────────────

@given(
    zone_id=st.text(min_size=3, max_size=20, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd'), whitelist_characters='-_')),
)
@settings(max_examples=100)
def test_attendee_always_unauthorized_in_restricted_zone(zone_id):
    """Property 23: ATTENDEE in restricted zone always triggers unauthorized access."""
    assume(len(zone_id) >= 3)
    detector = UnauthorizedAccessDetector()
    detector.register_restricted_zone(zone_id)
    assert detector.is_unauthorized(zone_id, 'ATTENDEE') is True


@given(
    role=st.sampled_from(['STAFF', 'ADMIN', 'EMERGENCY']),
    zone_id=st.text(min_size=3, max_size=20),
)
@settings(max_examples=100)
def test_non_attendee_never_unauthorized(role, zone_id):
    """Property 23: Non-ATTENDEE roles are never flagged as unauthorized."""
    assume(len(zone_id) >= 3)
    detector = UnauthorizedAccessDetector()
    detector.register_restricted_zone(zone_id)
    assert detector.is_unauthorized(zone_id, role) is False
