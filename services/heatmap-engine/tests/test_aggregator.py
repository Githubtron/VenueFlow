"""Tests for WindowAggregator."""
from app.aggregator import WindowAggregator


def make_reading(zone_id='zone-a', venue_id='venue-1', count=10):
    return {'zoneId': zone_id, 'venueId': venue_id, 'count': count}


def test_add_accumulates_count():
    agg = WindowAggregator()
    agg.add(make_reading(count=5))
    agg.add(make_reading(count=3))
    result = agg.flush()
    assert result['zone-a']['count'] == 8


def test_flush_resets_window():
    agg = WindowAggregator()
    agg.add(make_reading(count=10))
    agg.flush()
    result = agg.flush()
    assert result == {}


def test_multiple_zones_aggregated_independently():
    agg = WindowAggregator()
    agg.add(make_reading(zone_id='zone-a', count=5))
    agg.add(make_reading(zone_id='zone-b', count=7))
    agg.add(make_reading(zone_id='zone-a', count=3))
    result = agg.flush()
    assert result['zone-a']['count'] == 8
    assert result['zone-b']['count'] == 7


def test_venue_id_preserved_in_flush():
    agg = WindowAggregator()
    agg.add(make_reading(venue_id='venue-42', count=1))
    result = agg.flush()
    assert result['zone-a']['venue_id'] == 'venue-42'


def test_add_ignores_missing_zone_id():
    agg = WindowAggregator()
    agg.add({'venueId': 'venue-1', 'count': 5})  # no zoneId
    result = agg.flush()
    assert result == {}
