import json
from datetime import datetime
from redis import Redis
from app.models import ZoneDensitySnapshot


class HeatmapStore:
    """
    Redis-backed store for zone density snapshots.
    Publishes updates to heatmap:{venue_id} channel.
    Anonymized: snapshots contain only zone-level aggregate data (Property 17).
    """

    def __init__(self, redis_url: str):
        self._redis = Redis.from_url(redis_url, decode_responses=True)

    def update_zone(self, snapshot: ZoneDensitySnapshot) -> None:
        key = f'heatmap:{snapshot.venue_id}'
        field = f'zone:{snapshot.zone_id}'
        value = snapshot.model_dump_json()
        self._redis.hset(key, field, value)
        self._redis.publish(key, value)

    def get_snapshot(self, venue_id: str) -> dict[str, ZoneDensitySnapshot]:
        key = f'heatmap:{venue_id}'
        raw = self._redis.hgetall(key)
        result = {}
        for field, value in raw.items():
            zone_id = field.replace('zone:', '')
            result[zone_id] = ZoneDensitySnapshot.model_validate_json(value)
        return result

    def get_zone(self, venue_id: str, zone_id: str) -> ZoneDensitySnapshot | None:
        key = f'heatmap:{venue_id}'
        field = f'zone:{zone_id}'
        value = self._redis.hget(key, field)
        if value is None:
            return None
        return ZoneDensitySnapshot.model_validate_json(value)

    def mark_stale_zones(self, venue_id: str, zone_ids: list[str]) -> None:
        key = f'heatmap:{venue_id}'
        for zone_id in zone_ids:
            field = f'zone:{zone_id}'
            raw = self._redis.hget(key, field)
            if raw:
                snap = ZoneDensitySnapshot.model_validate_json(raw)
                snap.status = 'unavailable'
                snap.data_available = False
                self._redis.hset(key, field, snap.model_dump_json())
