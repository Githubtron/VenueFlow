from fastapi import APIRouter, HTTPException, Request, Query
from typing import Optional
import datetime

router = APIRouter()


@router.get('/heatmap/{venue_id}')
async def get_heatmap(venue_id: str, request: Request, event_id: Optional[str] = Query(None)):
    store = request.app.state.store
    snapshots = store.get_snapshot(venue_id)
    return {
        'venue_id': venue_id,
        'event_id': event_id,
        'zones': {k: v.model_dump() for k, v in snapshots.items()},
        'generated_at': datetime.datetime.utcnow().isoformat() + 'Z',
    }


@router.get('/heatmap/{venue_id}/zones/{zone_id}')
async def get_zone(venue_id: str, zone_id: str, request: Request):
    store = request.app.state.store
    snapshot = store.get_zone(venue_id, zone_id)
    if snapshot is None:
        raise HTTPException(status_code=404, detail=f'Zone {zone_id} not found for venue {venue_id}')
    return snapshot.model_dump()


@router.get('/heatmap/{venue_id}/replay')
async def replay_heatmap(
    venue_id: str,
    from_ts: Optional[str] = Query(None),
    to_ts: Optional[str] = Query(None),
):
    # Stub — full TimescaleDB implementation in Phase 4 analytics task
    return {'venue_id': venue_id, 'from_ts': from_ts, 'to_ts': to_ts, 'snapshots': []}
