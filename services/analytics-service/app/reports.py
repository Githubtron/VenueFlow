"""
Post-event report generation.
Validates: Requirements 17.3, 6.6
"""
import uuid
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


async def generate_post_event_report(
    db_pool,
    venue_id: str,
    event_id: str,
) -> dict:
    """
    Compile full post-event report from PostgreSQL.
    Returns JSON report (PDF generation via reportlab is a TODO).
    """
    report_id = str(uuid.uuid4())
    generated_at = datetime.now(timezone.utc).isoformat()

    # Default values for when DB is unavailable
    total_attendance = 0
    total_incidents = 0
    total_sos = 0
    evacuation_events = 0
    avg_resolution_seconds = 0.0
    peak_zones: list[str] = []

    try:
        async with db_pool.acquire() as conn:
            # Total attendance (entry events)
            att = await conn.fetchval(
                'SELECT COUNT(*) FROM entry_events WHERE event_id_ref = $1', event_id
            )
            total_attendance = att or 0

            # Incident stats
            inc = await conn.fetchrow(
                """SELECT COUNT(*) AS total,
                   AVG(EXTRACT(EPOCH FROM (resolved_at - submitted_at)))
                     FILTER (WHERE resolved_at IS NOT NULL) AS avg_resolution
                   FROM incident_reports WHERE venue_id = $1 AND event_id = $2""",
                venue_id, event_id,
            )
            if inc:
                total_incidents = inc['total'] or 0
                avg_resolution_seconds = float(inc['avg_resolution'] or 0)

            # SOS count
            sos = await conn.fetchval(
                "SELECT COUNT(*) FROM emergency_audit WHERE venue_id = $1 AND session_event_id = $2 AND type = 'sos'",
                venue_id, event_id,
            )
            total_sos = sos or 0

            # Evacuation count
            evac = await conn.fetchval(
                "SELECT COUNT(*) FROM emergency_audit WHERE venue_id = $1 AND session_event_id = $2 AND type = 'evacuation'",
                venue_id, event_id,
            )
            evacuation_events = evac or 0

            # Peak density zones
            zones = await conn.fetch(
                """SELECT zone_id FROM zone_density_snapshots
                   WHERE venue_id = $1
                   GROUP BY zone_id
                   ORDER BY MAX(density_percent) DESC LIMIT 5""",
                venue_id,
            )
            peak_zones = [r['zone_id'] for r in zones]

    except Exception as e:
        logger.warning(f'[analytics] Report DB query failed: {e}')

    return {
        'report_id': report_id,
        'venue_id': venue_id,
        'event_id': event_id,
        'generated_at': generated_at,
        'total_attendance': total_attendance,
        'peak_density_zones': peak_zones,
        'avg_entry_wait_minutes': 0.0,  # TODO: compute from entry_events timestamps
        'total_incidents': total_incidents,
        'total_sos_signals': total_sos,
        'evacuation_events': evacuation_events,
        'avg_incident_resolution_seconds': avg_resolution_seconds,
        'format': 'json',
    }
