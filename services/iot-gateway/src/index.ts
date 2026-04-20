// IoT Gateway — VenueFlow
// MQTT-to-Kafka bridge: subscribes to MQTT broker topics for pressure/IR/BLE sensors,
// validates SensorReading schema, and produces events to the `sensor.readings` Kafka topic.
// Also monitors sensor heartbeats and emits `sensor.failures` events on timeout.

import { createMqttClient } from './mqtt/client';
import { createMessageHandler } from './mqtt/handler';
import { createProducer, sendSensorFailure } from './kafka/producer';
import { HeartbeatMonitor } from './heartbeat/monitor';

const MQTT_BROKER_URL = process.env['MQTT_BROKER_URL'] ?? 'mqtt://localhost:1883';
const KAFKA_BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');
const SENSOR_HEARTBEAT_INTERVAL_MS = parseInt(
  process.env['SENSOR_HEARTBEAT_INTERVAL_MS'] ?? '30000',
  10,
);

async function main(): Promise<void> {
  const producer = createProducer(KAFKA_BROKERS);
  await producer.connect();

  const monitor = new HeartbeatMonitor(SENSOR_HEARTBEAT_INTERVAL_MS, (event) =>
    sendSensorFailure(producer, event),
  );
  monitor.start();

  const handler = createMessageHandler(producer, monitor);
  createMqttClient(MQTT_BROKER_URL, (topic, payload) => {
    handler(topic, payload).catch((err) =>
      console.error('[iot-gateway] Handler error:', err),
    );
  });

  const shutdown = async (): Promise<void> => {
    console.log('[iot-gateway] Shutting down...');
    monitor.stop();
    await producer.disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('[iot-gateway] Fatal error:', err);
  process.exit(1);
});
