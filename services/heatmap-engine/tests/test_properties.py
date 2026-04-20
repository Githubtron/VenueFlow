"""
Property tests for Heatmap Engine.
Feature: venueflow-platform
Properties: P5, P6, P17
Validates: Requirements 2.3, 2.7, 7.5, 9.2
"""
from datetime import datetime, timezone, timedelta
from hypothesis import given, settings
from hypothesis import strategies as st
from app.classifier import classify_density, ZoneState


# ─── P5: Zone Density Classification Monotonicity ────────────────────────────

SEVERITY_ORDER = {"green": 0, "yellow": 1, "red": 2}


@given(
    d1=st.floats(min_value=0.0, max_value=99.9, allow_nan=False),
    d2=st.floats(min_value=0.0, max_value=100.0, allow_nan=False),
)
@settings(max_examples=500)
def test_p5_density_classification_monotonicity(d1, d2):
    """
    Property 5: Zone Density Classification Monotonicity
    For any D1 < D2, severity(classifier(D1)) <= severity(classifier(D2)).
    """
    if d1 >= d2:
        return  # only test pairs where d1 < d2

    now = datetime.now(timezone.utc)
    state1 = ZoneState(zone_id="z1", density_percent=d1, last_updated=now)
    state2 = ZoneState(zone_id="z1", density_percent=d2, last_updated=now)

    status1 = classify_density(state1)
    status2 = classify_density(state2)

    # unavailable zones are excluded from ordering (stale data)
    if status1 == "unavailable" or status2 == "unavailable":
        return

    sev1 = SEVERITY_ORDER.get(status1, -1)
    sev2 = SEVERITY_ORDER.get(status2, -1)

    assert sev1 <= sev2, (
        f"Monotonicity violated: density {d1} → {status1} (sev={sev1}), "
        f"density {d2} → {status2} (sev={sev2})"
    )


# ─── P6: Stale Sensor Data Marking ───────────────────────────────────────────

@given(
    seconds_ago=st.floats(min_value=30.1, max_value=3600.0, allow_nan=False),
    density=st.floats(min_value=0.0, max_value=100.0, allow_nan=False),
)
@settings(max_examples=300)
def test_p6_stale_sensor_data_marking(seconds_ago, density):
    """
    Property 6: Stale Sensor Data Marking
    Any zone with lastUpdated > 30s ago must be classified as 'unavailable'.
    """
    stale_time = datetime.now(timezone.utc) - timedelta(seconds=seconds_ago)
    state = ZoneState(zone_id="z1", density_percent=density, last_updated=stale_time)

    status = classify_density(state)

    assert status == "unavailable", (
        f"Expected 'unavailable' for zone last updated {seconds_ago:.1f}s ago, "
        f"got '{status}' (density={density})"
    )


# ─── P17: Heatmap Anonymization ───────────────────────────────────────────────

@given(
    zone_id=st.text(min_size=1, max_size=50),
    density=st.floats(min_value=0.0, max_value=100.0, allow_nan=False),
    count=st.integers(min_value=0, max_value=100000),
)
@settings(max_examples=300)
def test_p17_heatmap_anonymization(zone_id, density, count):
    """
    Property 17: Heatmap Anonymization
    Every ZoneDensitySnapshot output contains only zone-level aggregate fields
    and no attendee-identifiable fields.
    """
    from app.models import ZoneDensitySnapshot

    snapshot = ZoneDensitySnapshot(
        zone_id=zone_id,
        venue_id="venue-1",
        density_percent=density,
        count=count,
        status="green",
        last_updated=datetime.now(timezone.utc).isoformat(),
    )

    snapshot_dict = snapshot.dict()

    # Must NOT contain any attendee-identifiable fields
    forbidden_fields = {
        "attendee_id", "user_id", "name", "email", "phone",
        "ticket_id", "seat_number", "face_hash", "biometric",
        "location", "lat", "lng", "device_id", "ip_address",
    }

    for field in forbidden_fields:
        assert field not in snapshot_dict, (
            f"Anonymization violation: field '{field}' found in ZoneDensitySnapshot"
        )

    # Must contain zone-level aggregate fields
    assert "zone_id" in snapshot_dict
    assert "density_percent" in snapshot_dict
    assert "count" in snapshot_dict
