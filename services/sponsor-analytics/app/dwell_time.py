"""
Sponsor dwell time and footfall computation from ZoneDensitySnapshot time-series.
Validates: Requirements 34.1
"""
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


async def compute_sponsor_analytics(
    db_pool,
    venue_id: str,
    sponsor_zone_id: str,
    zone_id: str,
    event_id: str,
) -> dict:
    """
    Aggregate dwell time and footfall for a sponsor zone from TimescaleDB.
    """
    try:
        async with db_pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT
                    COUNT(*) AS snapshot_count,
                    AVG(current_count) AS avg_count,
                    MAX(current_count) AS peak_count,
                    SUM(current_count) AS total_footfall_proxy
                FROM zone_density_snapshots
                WHERE venue_id = $1 AND zone_id = $2
                """,
                venue_id, zone_id,
            )
            row = rows[0] if rows else {}
            avg_count = float(row.get('avg_count') or 0)
            peak_count = int(row.get('peak_count') or 0)
            snapshot_count = int(row.get('snapshot_count') or 0)

            # Dwell time estimate: avg_count * 10s (snapshot interval) / avg_count
            avg_dwell_seconds = 10.0 * snapshot_count / max(avg_count, 1) if avg_count > 0 else 0

            return {
                'sponsor_zone_id': sponsor_zone_id,
                'venue_id': venue_id,
                'event_id': event_id,
                'total_footfall': int(avg_count * snapshot_count),
                'avg_dwell_time_seconds': round(avg_dwell_seconds, 1),
                'peak_footfall': peak_count,
                'unique_visitors': int(avg_count * snapshot_count * 0.7),  # estimate
            }
    except Exception as e:
        logger.warning(f'[sponsor-analytics] DB query failed: {e}')
        return {
            'sponsor_zone_id': sponsor_zone_id,
            'venue_id': venue_id,
            'event_id': event_id,
            'total_footfall': 0,
            'avg_dwell_time_seconds': 0.0,
            'peak_footfall': 0,
            'unique_visitors': 0,
        }
