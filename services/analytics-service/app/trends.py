"""
Congestion trends — time-bucket aggregations from TimescaleDB.
Validates: Requirements 17.2

Property 21: Congestion Trend Monotonic Aggregation
Feature: venueflow-platform, Property 21: Congestion Trend Monotonic Aggregation
"""
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

PERIOD_INTERVALS = {
    'day': '1 hour',
    'week': '6 hours',
    'month': '1 day',
}


async def get_congestion_trends(
    db_pool,
    venue_id: str,
    period: str = 'day',
) -> list[dict]:
    """
    Returns time-bucketed congestion trends.
    Buckets are non-overlapping and returned in chronological order (Property 21).
    """
    interval = PERIOD_INTERVALS.get(period, '1 hour')

    try:
        async with db_pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT
                    time_bucket($1::interval, last_updated) AS bucket_start,
                    zone_id,
                    venue_id,
                    AVG(density_percent) AS avg_density,
                    MAX(density_percent) AS peak_density,
                    AVG(current_count)::int AS avg_count
                FROM zone_density_snapshots
                WHERE venue_id = $2
                  AND last_updated >= NOW() - $3::interval
                GROUP BY bucket_start, zone_id, venue_id
                ORDER BY bucket_start ASC
                """,
                interval,
                venue_id,
                {'day': '24 hours', 'week': '7 days', 'month': '30 days'}.get(period, '24 hours'),
            )
            return [
                {
                    'bucket_start': row['bucket_start'].isoformat(),
                    'zone_id': row['zone_id'],
                    'venue_id': row['venue_id'],
                    'avg_density': round(float(row['avg_density']), 3),
                    'peak_density': round(float(row['peak_density']), 3),
                    'avg_count': row['avg_count'],
                }
                for row in rows
            ]
    except Exception as e:
        logger.warning(f'[analytics] Trends query failed, returning stub: {e}')
        return []
