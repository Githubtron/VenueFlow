"""
Tests for classifier.py

Property 5: Zone Density Classification Monotonicity
Feature: venueflow-platform, Property 5: Zone Density Classification Monotonicity
Validates: Requirements 2.3

Property 6: Stale Sensor Data Marking
Feature: venueflow-platform, Property 6: Stale Sensor Data Marking
Validates: Requirements 2.7
"""
from datetime import datetime, timedelta
from hypothesis import given, assume, settings
from hypothesis import strategies as st

from app.classifier import classify_density, is_stale, SEVERITY


# ── Unit tests ────────────────────────────────────────────────────────────────

def test_green_at_zero():
    assert classify_density(0.0) == 'green'

def test_green_below_yellow_threshold():
    assert classify_density(0.49) == 'green'

def test_yellow_at_threshold():
    assert classify_density(0.5) == 'amber'

def test_yellow_below_red_threshold():
    assert classify_density(0.79) == 'amber'

def test_red_at_threshold():
    assert classify_density(0.8) == 'red'

def test_red_above_threshold():
    assert classify_density(1.0) == 'red'

def test_not_stale_within_threshold():
    now = datetime.utcnow()
    assert is_stale(now - timedelta(seconds=29), now) is False

def test_stale_exactly_at_boundary():
    now = datetime.utcnow()
    assert is_stale(now - timedelta(seconds=30), now) is False

def test_stale_beyond_threshold():
    now = datetime.utcnow()
    assert is_stale(now - timedelta(seconds=31), now) is True


# ── Property 5: Monotonicity ──────────────────────────────────────────────────

@given(
    d1=st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False),
    d2=st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False),
)
@settings(max_examples=200)
def test_classification_monotonicity(d1, d2):
    """Property 5: For any D1 < D2, severity(classify(D1)) <= severity(classify(D2))."""
    assume(d1 < d2)
    assert SEVERITY[classify_density(d1)] <= SEVERITY[classify_density(d2)]


# ── Property 6: Stale marking ─────────────────────────────────────────────────

@given(seconds_ago=st.integers(min_value=31, max_value=3600))
@settings(max_examples=200)
def test_stale_always_true_beyond_threshold(seconds_ago):
    """Property 6: Any zone with last_updated > 30s ago must be marked unavailable."""
    now = datetime.utcnow()
    last_updated = now - timedelta(seconds=seconds_ago)
    assert is_stale(last_updated, now) is True


@given(seconds_ago=st.integers(min_value=0, max_value=29))
@settings(max_examples=100)
def test_not_stale_within_threshold_property(seconds_ago):
    """Zones updated within 30s must NOT be stale."""
    now = datetime.utcnow()
    last_updated = now - timedelta(seconds=seconds_ago)
    assert is_stale(last_updated, now) is False
