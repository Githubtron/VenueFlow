"""
Threat Detection REST endpoints.
Validates: Requirements 18.1, 18.2
"""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from app.models import ThreatAlert, ZoneTransition
from app.detector import (
    MovementAnomalyDetector, UnauthorizedAccessDetector,
    WatchlistMatcher, FloodGuard, ANOMALY_THRESHOLD, MODEL_VERSION,
)

router = APIRouter()

# Service-level singletons
_anomaly_detector = MovementAnomalyDetector()
_access_detector = UnauthorizedAccessDetector()
_watchlist = WatchlistMatcher()
_flood_guard = FloodGuard()


@router.get('/threats/{venue_id}/active')
async def get_active_threats(venue_id: str, request: Request):
    store = request.app.state.store
    alerts = store.get_active(venue_id)
    return {'venue_id': venue_id, 'alerts': [a.model_dump() for a in alerts], 'last_updated': datetime.now(timezone.utc).isoformat()}


@router.post('/threats/{venue_id}/resolve/{alert_id}')
async def resolve_threat(venue_id: str, alert_id: str, request: Request):
    store = request.app.state.store
    body = await request.json()
    resolved_by = body.get('resolvedBy', 'staff')
    alert = store.resolve(venue_id, alert_id, resolved_by)
    if not alert:
        raise HTTPException(status_code=404, detail='Alert not found')
    return alert.model_dump()


@router.post('/threats/detect/transition')
async def detect_from_transition(transition: ZoneTransition, request: Request):
    """
    Called when an attendee transitions to a new zone.
    Checks for unauthorized access and movement anomalies.
    """
    store = request.app.state.store
    alerts_generated = []

    # 1. Unauthorized access check
    role = request.headers.get('X-User-Role', 'ATTENDEE')
    if _access_detector.is_unauthorized(transition.zone_id, role):
        if _flood_guard.allow(transition.zone_id):
            alert = ThreatAlert(
                alert_id=str(uuid.uuid4()),
                venue_id=transition.venue_id,
                event_id=transition.event_id,
                zone_id=transition.zone_id,
                alert_type='unauthorized_access',
                session_token=transition.session_token,
                anomaly_score=1.0,
                model_version=MODEL_VERSION,
                detected_at=datetime.now(timezone.utc),
            )
            store.save(alert)
            alerts_generated.append(alert.alert_id)

    # 2. Movement anomaly check
    _anomaly_detector.record_transition(
        transition.session_token,
        transition.zone_id,
        datetime.now(timezone.utc),
    )
    score = _anomaly_detector.compute_anomaly_score(transition.session_token)
    if score > ANOMALY_THRESHOLD and _flood_guard.allow(transition.zone_id):
        alert = ThreatAlert(
            alert_id=str(uuid.uuid4()),
            venue_id=transition.venue_id,
            event_id=transition.event_id,
            zone_id=transition.zone_id,
            alert_type='suspicious_movement',
            session_token=transition.session_token,
            anomaly_score=score,
            model_version=MODEL_VERSION,
            detected_at=datetime.now(timezone.utc),
        )
        store.save(alert)
        alerts_generated.append(alert.alert_id)

    return {'alertsGenerated': len(alerts_generated), 'alertIds': alerts_generated}


@router.post('/threats/detect/entry')
async def detect_from_entry(request: Request):
    """
    Called at gate entry with perceptual hash for watchlist comparison.
    No raw biometric data stored.
    """
    store = request.app.state.store
    body = await request.json()
    perceptual_hash = body.get('perceptualHash', '')
    venue_id = body.get('venueId', '')
    event_id = body.get('eventId', '')
    zone_id = body.get('zoneId', '')
    session_token = body.get('sessionToken', '')

    if _watchlist.check(perceptual_hash):
        alert = ThreatAlert(
            alert_id=str(uuid.uuid4()),
            venue_id=venue_id,
            event_id=event_id,
            zone_id=zone_id,
            alert_type='watchlist_match',
            session_token=session_token,
            anomaly_score=1.0,
            model_version=MODEL_VERSION,
            detected_at=datetime.now(timezone.utc),
        )
        store.save(alert)
        return {'match': True, 'alertId': alert.alert_id}

    return {'match': False}


@router.post('/threats/admin/restricted-zones')
async def register_restricted_zone(request: Request):
    body = await request.json()
    zone_id = body.get('zoneId')
    if not zone_id:
        raise HTTPException(status_code=400, detail='zoneId required')
    _access_detector.register_restricted_zone(zone_id)
    return {'status': 'registered', 'zoneId': zone_id}


@router.post('/threats/admin/watchlist')
async def load_watchlist(request: Request):
    body = await request.json()
    hashes = body.get('hashes', [])
    _watchlist.load_watchlist(hashes)
    return {'status': 'loaded', 'count': len(hashes)}
