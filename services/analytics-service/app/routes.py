"""
Analytics Service REST endpoints.
Validates: Requirements 17.1, 17.2, 17.3, 6.6
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request, Query
from typing import Optional
from app.replay import stream_replay_frames
from app.trends import get_congestion_trends
from app.reports import generate_post_event_report

router = APIRouter()


@router.get('/analytics/{venue_id}/replay')
async def replay_heatmap(
    venue_id: str,
    request: Request,
    from_ts: str = Query(...),
    to_ts: str = Query(...),
    interval: int = Query(default=10, ge=1, le=3600),
    event_id: Optional[str] = Query(default=None),
):
    """
    Stream ZoneDensitySnapshot records in chronological order.
    Consecutive snapshots <= interval seconds apart (Property 20).
    """
    try:
        from_dt = datetime.fromisoformat(from_ts.replace('Z', '+00:00'))
        to_dt = datetime.fromisoformat(to_ts.replace('Z', '+00:00'))
    except ValueError:
        raise HTTPException(status_code=400, detail='Invalid timestamp format. Use ISO 8601.')

    if from_dt >= to_dt:
        raise HTTPException(status_code=400, detail='from_ts must be before to_ts')

    db_pool = getattr(request.app.state, 'db_pool', None)
    frames = await stream_replay_frames(db_pool, venue_id, from_dt, to_dt, interval)

    return {
        'venue_id': venue_id,
        'event_id': event_id,
        'from_ts': from_ts,
        'to_ts': to_ts,
        'interval_seconds': interval,
        'frames': frames,
        'frame_count': len(frames),
    }


@router.get('/analytics/{venue_id}/congestion-trends')
async def congestion_trends(
    venue_id: str,
    request: Request,
    period: str = Query(default='day', pattern='^(day|week|month)$'),
):
    """
    Time-bucketed congestion trends.
    Buckets returned in chronological order with non-overlapping timestamps (Property 21).
    """
    db_pool = getattr(request.app.state, 'db_pool', None)
    trends = await get_congestion_trends(db_pool, venue_id, period)

    return {
        'venue_id': venue_id,
        'period': period,
        'trends': trends,
        'generated_at': datetime.now(timezone.utc).isoformat(),
    }


@router.get('/analytics/{venue_id}/incidents')
async def incident_analytics(
    venue_id: str,
    request: Request,
    event_id: Optional[str] = Query(default=None),
):
    """Incident analytics grouped by type, zone, resolution time."""
    db_pool = getattr(request.app.state, 'db_pool', None)
    if not db_pool:
        return {'venue_id': venue_id, 'event_id': event_id, 'incidents': []}

    try:
        async with db_pool.acquire() as conn:
            conditions = ['venue_id = $1']
            values = [venue_id]
            if event_id:
                conditions.append('event_id = $2')
                values.append(event_id)

            rows = await conn.fetch(
                f"""SELECT type, zone_id, COUNT(*) AS count,
                    AVG(EXTRACT(EPOCH FROM (resolved_at - submitted_at)))
                      FILTER (WHERE resolved_at IS NOT NULL) AS avg_resolution_seconds
                    FROM incident_reports
                    WHERE {' AND '.join(conditions)}
                    GROUP BY type, zone_id
                    ORDER BY count DESC""",
                *values,
            )
            return {
                'venue_id': venue_id,
                'event_id': event_id,
                'incidents': [dict(r) for r in rows],
            }
    except Exception as e:
        return {'venue_id': venue_id, 'event_id': event_id, 'incidents': [], 'error': str(e)}


@router.get('/analytics/{venue_id}/events/{event_id}/report')
async def post_event_report(venue_id: str, event_id: str, request: Request):
    """Generate full post-event report."""
    db_pool = getattr(request.app.state, 'db_pool', None)
    report = await generate_post_event_report(db_pool, venue_id, event_id)
    return report
