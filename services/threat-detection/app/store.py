"""
In-memory + Redis alert store for threat detection.
"""
import json
import uuid
from datetime import datetime, timezone
from redis import Redis
from app.models import ThreatAlert


class AlertStore:
    def __init__(self, redis_url: str):
        self._redis = Redis.from_url(redis_url, decode_responses=True)
        self._alerts: dict[str, ThreatAlert] = {}

    def save(self, alert: ThreatAlert) -> None:
        self._alerts[alert.alert_id] = alert
        self._redis.hset(f'threats:{alert.venue_id}', alert.alert_id, alert.model_dump_json())
        self._redis.publish(f'threats:{alert.venue_id}', alert.model_dump_json())

    def get_active(self, venue_id: str) -> list[ThreatAlert]:
        raw = self._redis.hgetall(f'threats:{venue_id}')
        alerts = []
        for value in raw.values():
            try:
                a = ThreatAlert.model_validate_json(value)
                if a.status == 'active':
                    alerts.append(a)
            except Exception:
                pass
        return sorted(alerts, key=lambda a: a.detected_at, reverse=True)

    def resolve(self, venue_id: str, alert_id: str, resolved_by: str) -> ThreatAlert | None:
        raw = self._redis.hget(f'threats:{venue_id}', alert_id)
        if not raw:
            return None
        alert = ThreatAlert.model_validate_json(raw)
        alert.status = 'resolved'
        alert.resolved_by = resolved_by
        alert.resolved_at = datetime.now(timezone.utc)
        self._redis.hset(f'threats:{venue_id}', alert_id, alert.model_dump_json())
        return alert
