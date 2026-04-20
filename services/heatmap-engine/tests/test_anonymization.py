"""
Property 17: Heatmap Anonymization
Feature: venueflow-platform, Property 17: Heatmap Anonymization
Validates: Requirements 7.5, 9.2

ZoneDensitySnapshot must contain only zone-level aggregate fields.
No attendee-identifiable fields may be present.
"""
from datetime import datetime
from app.models import ZoneDensitySnapshot

FORBIDDEN_FIELDS = {
    'attendee_id', 'user_id', 'email', 'name',
    'location', 'device_id', 'ip_address', 'phone',
}

ALLOWED_FIELDS = {
    'zone_id', 'venue_id', 'current_count',
    'density_percent', 'status', 'last_updated', 'data_available',
}


def _make_snapshot(**kwargs) -> ZoneDensitySnapshot:
    defaults = dict(
        zone_id='z1', venue_id='v1', current_count=50,
        density_percent=0.5, status='amber',
        last_updated=datetime.utcnow(), data_available=True,
    )
    return ZoneDensitySnapshot(**{**defaults, **kwargs})


def test_snapshot_contains_no_pii_fields():
    """Property 17: No attendee-identifiable fields in snapshot."""
    snapshot = _make_snapshot()
    fields = set(snapshot.model_fields.keys())
    assert fields.isdisjoint(FORBIDDEN_FIELDS), \
        f'Found PII fields in ZoneDensitySnapshot: {fields & FORBIDDEN_FIELDS}'


def test_snapshot_only_has_aggregate_fields():
    """Snapshot schema must exactly match the allowed aggregate field set."""
    snapshot = _make_snapshot()
    fields = set(snapshot.model_fields.keys())
    assert fields == ALLOWED_FIELDS, \
        f'Unexpected fields: {fields - ALLOWED_FIELDS}, Missing: {ALLOWED_FIELDS - fields}'


def test_green_snapshot_anonymized():
    snap = _make_snapshot(current_count=10, density_percent=0.1, status='green')
    assert snap.zone_id == 'z1'
    assert snap.current_count == 10
    assert not hasattr(snap, 'attendee_id')


def test_unavailable_snapshot_anonymized():
    snap = _make_snapshot(status='unavailable', data_available=False)
    assert snap.status == 'unavailable'
    assert snap.data_available is False
    fields = set(snap.model_fields.keys())
    assert fields.isdisjoint(FORBIDDEN_FIELDS)
