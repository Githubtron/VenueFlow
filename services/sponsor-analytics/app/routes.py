"""
Sponsor Analytics REST endpoints.
Validates: Requirements 34.1, 34.2, 34.3
"""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from app.dwell_time import compute_sponsor_analytics

router = APIRouter()


@router.get('/sponsors/{venue_id}/zones/{sponsor_zone_id}/analytics')
async def get_sponsor_analytics(
    venue_id: str,
    sponsor_zone_id: str,
    request: Request,
    event_id: str = '',
):
    offer_service = request.app.state.offer_service
    db_pool = getattr(request.app.state, 'db_pool', None)

    # Get zone_id for this sponsor zone
    sz = offer_service._sponsor_zones.get(sponsor_zone_id)
    zone_id = sz['zone_id'] if sz else sponsor_zone_id

    analytics = await compute_sponsor_analytics(db_pool, venue_id, sponsor_zone_id, zone_id, event_id)

    # Add offer stats
    offer_deliveries = 0
    ctr = 0.0
    try:
        keys = request.app.state.offer_service._redis.keys(f'offer-dedup:*:*:{event_id}')
        offer_deliveries = len(keys)
    except Exception:
        pass

    return {**analytics, 'offer_deliveries': offer_deliveries, 'offer_click_through_rate': ctr}


@router.post('/sponsors/offers')
async def create_offer(request: Request):
    body = await request.json()
    required = ['sponsor_zone_id', 'message', 'deep_link', 'valid_until']
    if not all(k in body for k in required):
        raise HTTPException(status_code=400, detail=f'Required fields: {required}')

    offer = {**body, 'offer_id': str(uuid.uuid4())}
    request.app.state.offer_service.register_offer(offer)
    return offer


@router.post('/sponsors/zones')
async def register_sponsor_zone(request: Request):
    body = await request.json()
    if not all(k in body for k in ['venue_id', 'zone_id', 'sponsor_name']):
        raise HTTPException(status_code=400, detail='venue_id, zone_id, sponsor_name required')

    zone = {**body, 'sponsor_zone_id': body.get('sponsor_zone_id', str(uuid.uuid4()))}
    request.app.state.offer_service.register_sponsor_zone(zone)
    return zone


@router.post('/sponsors/proximity-trigger')
async def proximity_trigger(request: Request):
    """Called when attendee enters a zone — triggers offer delivery if applicable."""
    body = await request.json()
    attendee_id = body.get('attendeeId', '')
    zone_id = body.get('zoneId', '')
    event_id = body.get('eventId', '')

    offer_service = request.app.state.offer_service
    offers = offer_service.get_offers_for_zone(zone_id)
    delivered = []

    for offer in offers:
        if offer_service.try_deliver(attendee_id, offer['offer_id'], event_id):
            delivered.append(offer['offer_id'])

    return {'attendeeId': attendee_id, 'zoneId': zone_id, 'offersDelivered': len(delivered), 'offerIds': delivered}


@router.get('/sponsors/{venue_id}/reports/{sponsor_zone_id}')
async def sponsor_report(venue_id: str, sponsor_zone_id: str, request: Request, event_id: str = ''):
    db_pool = getattr(request.app.state, 'db_pool', None)
    offer_service = request.app.state.offer_service
    sz = offer_service._sponsor_zones.get(sponsor_zone_id)
    zone_id = sz['zone_id'] if sz else sponsor_zone_id

    analytics = await compute_sponsor_analytics(db_pool, venue_id, sponsor_zone_id, zone_id, event_id)
    return {
        'report_id': str(uuid.uuid4()),
        'venue_id': venue_id,
        'sponsor_zone_id': sponsor_zone_id,
        'event_id': event_id,
        'generated_at': datetime.now(timezone.utc).isoformat(),
        **analytics,
        'format': 'json',
    }
