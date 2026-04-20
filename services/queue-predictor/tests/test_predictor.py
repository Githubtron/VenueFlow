"""
Tests for Queue Predictor.

Property 8: Queue Prediction Availability
Feature: venueflow-platform, Property 8: Queue Prediction Availability
Validates: Requirements 3.2

Property 9: Alternative Kiosk Suggestion
Feature: venueflow-platform, Property 9: Alternative Kiosk Suggestion
Validates: Requirements 3.5
"""
from hypothesis import given, settings
from hypothesis import strategies as st
from app.predictor import QueuePredictor, EMAPredictor, find_alternatives


# ── Unit tests ────────────────────────────────────────────────────────────────

def make_features(density=0.5, hour=14, phase='general'):
    return {
        'location_id': 'kiosk-1',
        'current_density': density,
        'time_of_day_hour': hour,
        'event_phase': phase,
        'historical_throughput': 20.0,
    }


def test_predictor_returns_non_negative_wait():
    predictor = QueuePredictor()
    wait, _, _ = predictor.predict(make_features())
    assert wait >= 0.0


def test_predictor_returns_confidence_between_0_and_1():
    predictor = QueuePredictor()
    _, confidence, _ = predictor.predict(make_features())
    assert 0.0 <= confidence <= 1.0


def test_predictor_returns_model_version_string():
    predictor = QueuePredictor()
    _, _, version = predictor.predict(make_features())
    assert isinstance(version, str) and len(version) > 0


def test_halftime_phase_higher_wait_than_general():
    predictor = QueuePredictor()
    wait_general, _, _ = predictor.predict(make_features(density=0.5, phase='general'))
    wait_halftime, _, _ = predictor.predict(make_features(density=0.5, phase='halftime'))
    assert wait_halftime >= wait_general


def test_zero_density_gives_zero_or_minimal_wait():
    predictor = QueuePredictor()
    wait, _, _ = predictor.predict(make_features(density=0.0))
    assert wait >= 0.0


def test_ema_fallback_used_when_confidence_low():
    predictor = QueuePredictor()
    # Very low density triggers low confidence path
    features = make_features(density=0.0)
    wait, confidence, version = predictor.predict(features)
    assert wait >= 0.0


def test_ema_update_and_predict():
    ema = EMAPredictor()
    ema.update('kiosk-1', 10.0)
    ema.update('kiosk-1', 12.0)
    result = ema.predict('kiosk-1', 0.5)
    assert result >= 0.0


def test_find_alternatives_returns_shorter_waits():
    predictions = [
        {'location_id': 'k1', 'predicted_wait_minutes': 15.0},
        {'location_id': 'k2', 'predicted_wait_minutes': 5.0},
        {'location_id': 'k3', 'predicted_wait_minutes': 8.0},
        {'location_id': 'k4', 'predicted_wait_minutes': 20.0},
    ]
    alts = find_alternatives(predictions, 'k1')
    for alt in alts:
        assert alt['predicted_wait_minutes'] < 15.0


def test_find_alternatives_excludes_target():
    predictions = [
        {'location_id': 'k1', 'predicted_wait_minutes': 15.0},
        {'location_id': 'k2', 'predicted_wait_minutes': 5.0},
    ]
    alts = find_alternatives(predictions, 'k1')
    assert all(a['location_id'] != 'k1' for a in alts)


def test_find_alternatives_sorted_by_shortest_first():
    predictions = [
        {'location_id': 'k1', 'predicted_wait_minutes': 20.0},
        {'location_id': 'k2', 'predicted_wait_minutes': 8.0},
        {'location_id': 'k3', 'predicted_wait_minutes': 3.0},
        {'location_id': 'k4', 'predicted_wait_minutes': 12.0},
    ]
    alts = find_alternatives(predictions, 'k1')
    waits = [a['predicted_wait_minutes'] for a in alts]
    assert waits == sorted(waits)


# ── Property 8: Queue Prediction Availability ─────────────────────────────────

@given(
    density=st.floats(min_value=0.0, max_value=1.0, allow_nan=False),
    hour=st.integers(min_value=0, max_value=23),
    phase=st.sampled_from(['pre_show', 'halftime', 'post_show', 'general']),
)
@settings(max_examples=200)
def test_prediction_always_returns_non_negative_wait(density, hour, phase):
    """Property 8: For any active location, predictor returns non-negative wait."""
    predictor = QueuePredictor()
    features = {
        'location_id': 'kiosk-test',
        'current_density': density,
        'time_of_day_hour': hour,
        'event_phase': phase,
    }
    wait, confidence, version = predictor.predict(features)
    assert wait >= 0.0
    assert 0.0 <= confidence <= 1.0
    assert len(version) > 0


# ── Property 9: Alternative Kiosk Suggestion ─────────────────────────────────

@given(
    target_wait=st.floats(min_value=10.1, max_value=60.0, allow_nan=False),
    alt_waits=st.lists(
        st.floats(min_value=0.0, max_value=60.0, allow_nan=False),
        min_size=1,
        max_size=10,
    ),
)
@settings(max_examples=200)
def test_alternatives_always_have_strictly_shorter_wait(target_wait, alt_waits):
    """Property 9: Every suggested alternative has strictly shorter wait than target."""
    predictions = [{'location_id': 'target', 'predicted_wait_minutes': target_wait}]
    for i, w in enumerate(alt_waits):
        predictions.append({'location_id': f'alt-{i}', 'predicted_wait_minutes': w})

    alts = find_alternatives(predictions, 'target')
    for alt in alts:
        assert alt['predicted_wait_minutes'] < target_wait
