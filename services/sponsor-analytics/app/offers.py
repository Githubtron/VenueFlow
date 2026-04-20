"""
Proximity-triggered in-app offer delivery.
Deduplication: (attendeeId, offerId, eventId) — deliver at most once per event.
Validates: Requirements 34.2
"""
import uuid
import logging
from datetime import datetime, timezone
from redis import Redis

logger = logging.getLogger(__name__)

DEDUP_TTL_SECONDS = 86400  # 24 hours


class OfferDeliveryService:
    def __init__(self, redis_url: str):
        self._redis = Redis.from_url(redis_url, decode_responses=True)
        # In-memory offer registry (replace with PostgreSQL in production)
        self._offers: dict[str, dict] = {}
        self._sponsor_zones: dict[str, dict] = {}

    def register_offer(self, offer: dict) -> None:
        self._offers[offer['offer_id']] = offer

    def register_sponsor_zone(self, zone: dict) -> None:
        self._sponsor_zones[zone['sponsor_zone_id']] = zone

    def get_offers_for_zone(self, zone_id: str) -> list[dict]:
        """Returns active offers for sponsor zones adjacent to the given zone."""
        now = datetime.now(timezone.utc)
        result = []
        for sz in self._sponsor_zones.values():
            if sz.get('zone_id') == zone_id:
                for offer in self._offers.values():
                    if offer.get('sponsor_zone_id') == sz['sponsor_zone_id']:
                        valid_until = offer.get('valid_until')
                        if valid_until:
                            try:
                                vu = datetime.fromisoformat(str(valid_until).replace('Z', '+00:00'))
                                if vu < now:
                                    continue
                            except Exception:
                                pass
                        result.append(offer)
        return result

    def try_deliver(self, attendee_id: str, offer_id: str, event_id: str) -> bool:
        """
        Attempt to deliver an offer. Returns True if delivered (first time).
        Deduplication key: (attendeeId, offerId, eventId) — at most once per event.
        """
        dedup_key = f'offer-dedup:{attendee_id}:{offer_id}:{event_id}'
        # SET NX (only set if not exists) — atomic deduplication
        result = self._redis.set(dedup_key, '1', ex=DEDUP_TTL_SECONDS, nx=True)
        if result:
            # Publish to notification channel
            self._redis.publish(
                f'alerts:{attendee_id}',
                __import__('json').dumps({
                    'type': 'sponsor_offer',
                    'offerId': offer_id,
                    'message': self._offers.get(offer_id, {}).get('message', ''),
                    'deepLink': self._offers.get(offer_id, {}).get('deep_link', ''),
                }),
            )
            return True
        return False  # already delivered
