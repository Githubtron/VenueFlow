"""
Redis-backed prediction store.
Stores latest predictions per location and publishes to queue.predictions Kafka topic.
"""
import json
import logging
from datetime import datetime
from redis import Redis
from app.models import QueuePrediction

logger = logging.getLogger(__name__)


class PredictionStore:
    def __init__(self, redis_url: str):
        self._redis = Redis.from_url(redis_url, decode_responses=True)

    def save(self, prediction: QueuePrediction) -> None:
        key = f'queue:{prediction.venue_id}'
        field = f'loc:{prediction.location_id}'
        self._redis.hset(key, field, prediction.model_dump_json())

    def get_all(self, venue_id: str) -> list[QueuePrediction]:
        key = f'queue:{venue_id}'
        raw = self._redis.hgetall(key)
        results = []
        for value in raw.values():
            try:
                results.append(QueuePrediction.model_validate_json(value))
            except Exception as e:
                logger.error(f'[queue-predictor] Failed to parse prediction: {e}')
        return results

    def get_one(self, venue_id: str, location_id: str) -> QueuePrediction | None:
        key = f'queue:{venue_id}'
        field = f'loc:{location_id}'
        raw = self._redis.hget(key, field)
        if raw is None:
            return None
        return QueuePrediction.model_validate_json(raw)
