"""
Property tests for Queue Predictor.
Feature: venueflow-platform
Properties: P8, P9
Validates: Requirements 3.2, 3.5
"""
from hypothesis import given, settings
from hypothesis import strategies as st
from app.predictor import predict_wait_time, get_alternatives


# ─── P8: Queue Prediction Availability ───────────────────────────────────────

@given(
    location_id=st.text(min_size=1, max_size=50),
    density=st.floats(min_value=0.0, max_value=100.0, allow_nan=False),
    time_of_day=st.floats(min_value=0.0, max_value=23.99, allow_nan=False),
    confidence=st.floats(min_value=0.0, max_value=1.0, allow_nan=False),
)
@settings(max_examples=300)
def test_p8_queue_prediction_availability(location_id, density, time_of_day, confidence):
    """
    Property 8: Queue Prediction Availability
    Queue_Predictor always returns a response with non-negative predictedWaitMinutes
    for any active location ID.
    """
    result = predict_wait_time(
        location_id=location_id,
        density_percent=density,
        time_of_day=time_of_day,
        confidence_score=confidence,
    )

    assert result is not None, f"predict_wait_time returned None for location {location_id}"
    assert "predictedWaitMinutes" in result, "Response missing predictedWaitMinutes"
    assert result["predictedWaitMinutes"] >= 0, (
        f"predictedWaitMinutes must be non-negative, got {result['predictedWaitMinutes']}"
    )


# ─── P9: Alternative Kiosk Suggestion ────────────────────────────────────────

@given(
    queried_wait=st.floats(min_value=10.01, max_value=60.0, allow_nan=False),
    alt_waits=st.lists(
        st.floats(min_value=0.0, max_value=60.0, allow_nan=False),
        min_size=1,
        max_size=10,
    ),
)
@settings(max_examples=300)
def test_p9_alternative_kiosk_suggestion(queried_wait, alt_waits):
    """
    Property 9: Alternative Kiosk Suggestion
    Every suggested alternative has a strictly shorter wait time than the queried kiosk.
    """
    kiosks = [
        {"kioskId": f"kiosk-{i}", "predictedWaitMinutes": w}
        for i, w in enumerate(alt_waits)
    ]

    alternatives = get_alternatives(
        queried_wait_minutes=queried_wait,
        all_kiosks=kiosks,
    )

    for alt in alternatives:
        assert alt["predictedWaitMinutes"] < queried_wait, (
            f"Alternative kiosk wait {alt['predictedWaitMinutes']} is not strictly "
            f"shorter than queried wait {queried_wait}"
        )
