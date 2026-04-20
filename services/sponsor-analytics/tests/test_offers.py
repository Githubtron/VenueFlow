"""
Tests for offer deduplication.
Validates: Requirements 34.2
"""
from unittest.mock import MagicMock, patch
from app.offers import OfferDeliveryService


def make_service():
    with patch('app.offers.Redis') as MockRedis:
        mock_redis = MagicMock()
        MockRedis.from_url.return_value = mock_redis
        service = OfferDeliveryService('redis://localhost:6379')
        service._redis = mock_redis
        return service, mock_redis


def test_first_delivery_returns_true():
    service, mock_redis = make_service()
    mock_redis.set.return_value = True  # NX succeeded
    result = service.try_deliver('attendee-1', 'offer-1', 'event-1')
    assert result is True


def test_duplicate_delivery_returns_false():
    service, mock_redis = make_service()
    mock_redis.set.return_value = None  # NX failed — already exists
    result = service.try_deliver('attendee-1', 'offer-1', 'event-1')
    assert result is False


def test_different_attendee_same_offer_allowed():
    service, mock_redis = make_service()
    mock_redis.set.return_value = True
    r1 = service.try_deliver('attendee-1', 'offer-1', 'event-1')
    r2 = service.try_deliver('attendee-2', 'offer-1', 'event-1')
    assert r1 is True
    assert r2 is True


def test_same_attendee_different_event_allowed():
    service, mock_redis = make_service()
    mock_redis.set.return_value = True
    r1 = service.try_deliver('attendee-1', 'offer-1', 'event-1')
    r2 = service.try_deliver('attendee-1', 'offer-1', 'event-2')
    assert r1 is True
    assert r2 is True


def test_dedup_key_includes_all_three_components():
    service, mock_redis = make_service()
    mock_redis.set.return_value = True
    service.try_deliver('att-123', 'off-456', 'ev-789')
    call_args = mock_redis.set.call_args
    key = call_args[0][0]
    assert 'att-123' in key
    assert 'off-456' in key
    assert 'ev-789' in key
