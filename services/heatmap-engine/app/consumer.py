import json
import logging
import threading
import time
from datetime import datetime

from kafka import KafkaConsumer
from app.aggregator import WindowAggregator
from app.classifier import classify_density, is_stale
from app.models import ZoneDensitySnapshot

logger = logging.getLogger(__name__)

WINDOW_SECONDS = 10
DEFAULT_CAPACITY = 1000  # fallback if zone config not available


def _process_window(store, window_data: dict, stale_threshold: int) -> None:
    now = datetime.utcnow()
    for zone_id, data in window_data.items():
        count = data['count']
        venue_id = data['venue_id']
        density = min(count / DEFAULT_CAPACITY, 1.0)
        status = classify_density(density)
        snapshot = ZoneDensitySnapshot(
            zone_id=zone_id,
            venue_id=venue_id,
            current_count=count,
            density_percent=density,
            status=status,
            last_updated=now,
            data_available=True,
        )
        try:
            store.update_zone(snapshot)
        except Exception as e:
            logger.error(f'[heatmap-engine] Failed to update zone {zone_id}: {e}')


def start_consumer(store, aggregator: WindowAggregator, brokers: str, stale_threshold: int = 30) -> threading.Thread:
    def _run():
        try:
            consumer = KafkaConsumer(
                'sensor.readings',
                bootstrap_servers=brokers.split(','),
                value_deserializer=lambda m: json.loads(m.decode('utf-8')),
                auto_offset_reset='latest',
                enable_auto_commit=True,
                group_id='heatmap-engine',
            )
        except Exception as e:
            logger.error(f'[heatmap-engine] Kafka consumer init failed: {e}')
            return

        last_flush = time.monotonic()
        for message in consumer:
            try:
                aggregator.add(message.value)
            except Exception as e:
                logger.error(f'[heatmap-engine] Aggregator error: {e}')

            if time.monotonic() - last_flush >= WINDOW_SECONDS:
                window_data = aggregator.flush()
                if window_data:
                    _process_window(store, window_data, stale_threshold)
                last_flush = time.monotonic()

    thread = threading.Thread(target=_run, daemon=True, name='heatmap-consumer')
    thread.start()
    return thread
