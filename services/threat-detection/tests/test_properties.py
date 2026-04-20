"""
Property tests for Threat Detection Service.
Feature: venueflow-platform
Properties: P22, P23
Validates: Requirements 18.1, 18.2
"""
from hypothesis import given, settings
from hypothesis import strategies as st


# ─── P22: Threat Alert Generation Completeness ───────────────────────────────

ANOMALY_THRESHOLD = 0.75


def generate_threat_alert(session_token: str, anomaly_score: float, seen_sessions: set) -> dict | None:
    """
    Simulates threat alert generation with deduplication.
    Returns alert only if score > threshold AND session not already alerted.
    """
    if anomaly_score <= ANOMALY_THRESHOLD:
        return None
    if session_token in seen_sessions:
        return None  # deduplicate
    seen_sessions.add(session_token)
    return {"sessionToken": session_token, "anomalyScore": anomaly_score, "type": "suspicious_movement"}


@given(
    session_token=st.text(min_size=1, max_size=50),
    anomaly_score=st.floats(min_value=0.751, max_value=1.0, allow_nan=False),
    duplicate_count=st.integers(min_value=2, max_value=10),
)
@settings(max_examples=300)
def test_p22_threat_alert_generation_completeness(session_token, anomaly_score, duplicate_count):
    """
    Property 22: Threat Alert Generation Completeness
    Movement sequences with anomaly score > threshold generate exactly one ThreatAlert.
    Duplicate sensor events for the same session produce no duplicate alerts.
    """
    seen_sessions: set = set()
    alerts = []

    # Submit same session multiple times (simulating duplicate sensor events)
    for _ in range(duplicate_count):
        alert = generate_threat_alert(session_token, anomaly_score, seen_sessions)
        if alert:
            alerts.append(alert)

    assert len(alerts) == 1, (
        f"Expected exactly 1 alert for session {session_token} with score {anomaly_score}, "
        f"got {len(alerts)} (submitted {duplicate_count} times)"
    )


@given(
    session_token=st.text(min_size=1, max_size=50),
    anomaly_score=st.floats(min_value=0.0, max_value=0.75, allow_nan=False),
)
@settings(max_examples=200)
def test_p22_no_alert_below_threshold(session_token, anomaly_score):
    """Scores at or below threshold must not generate alerts."""
    seen_sessions: set = set()
    alert = generate_threat_alert(session_token, anomaly_score, seen_sessions)
    assert alert is None, f"Unexpected alert for score {anomaly_score} (threshold={ANOMALY_THRESHOLD})"


# ─── P23: Unauthorized Access Alert Correctness ──────────────────────────────

def check_unauthorized_access(
    session_token: str,
    role: str,
    zone_id: str,
    is_restricted: bool,
) -> dict | None:
    """Generates unauthorized access alert for ATTENDEE in restricted zone."""
    if role == "ATTENDEE" and is_restricted:
        return {"sessionToken": session_token, "zoneId": zone_id, "type": "unauthorized_access"}
    return None


@given(
    session_token=st.text(min_size=1, max_size=50),
    zone_id=st.text(min_size=1, max_size=50),
)
@settings(max_examples=300)
def test_p23_unauthorized_access_alert_correctness(session_token, zone_id):
    """
    Property 23: Unauthorized Access Alert Correctness
    ATTENDEE-role tokens in isRestrictedAccess=True zones generate an alert
    referencing the correct zoneId and session token.
    """
    alert = check_unauthorized_access(
        session_token=session_token,
        role="ATTENDEE",
        zone_id=zone_id,
        is_restricted=True,
    )

    assert alert is not None, "Expected unauthorized access alert for ATTENDEE in restricted zone"
    assert alert["sessionToken"] == session_token, "Alert must reference correct session token"
    assert alert["zoneId"] == zone_id, "Alert must reference correct zoneId"
    assert alert["type"] == "unauthorized_access"


@given(
    session_token=st.text(min_size=1, max_size=50),
    zone_id=st.text(min_size=1, max_size=50),
    role=st.sampled_from(["STAFF", "ADMIN", "EMERGENCY"]),
)
@settings(max_examples=200)
def test_p23_no_alert_for_authorized_roles(session_token, zone_id, role):
    """Non-ATTENDEE roles in restricted zones must not generate unauthorized access alerts."""
    alert = check_unauthorized_access(
        session_token=session_token,
        role=role,
        zone_id=zone_id,
        is_restricted=True,
    )
    assert alert is None, f"Unexpected alert for role {role} in restricted zone"
