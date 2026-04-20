import { SensorReading } from '@venueflow/shared-types';
import { Producer } from 'kafkajs';
import { validateSensorReading } from '../validation/schema';
import { sendSensorReading } from '../kafka/producer';
import { HeartbeatMonitor } from '../heartbeat/monitor';

/** Infer sensorType from MQTT topic prefix. */
export function inferSensorType(topic: string): SensorReading['sensorType'] | null {
  if (topic.startsWith('sensors/pressure/')) return 'pressure';
  if (topic.startsWith('sensors/ir/')) return 'ir';
  if (topic.startsWith('sensors/ble/')) return 'ble';
  return null;
}

export type MessageHandlerFn = (topic: string, payload: Buffer) => Promise<void>;

/**
 * Factory that returns an MQTT message handler bound to the given producer and monitor.
 */
export function createMessageHandler(
  producer: Producer,
  monitor: HeartbeatMonitor,
  logger: { error: (msg: string) => void } = console,
): MessageHandlerFn {
  return async (topic: string, payload: Buffer): Promise<void> => {
    let raw: unknown;

    try {
      raw = JSON.parse(payload.toString('utf8'));
    } catch {
      logger.error(`[iot-gateway] Dropped malformed message: invalid JSON (topic=${topic})`);
      return;
    }

    // Inject sensorType from topic if not present in payload
    if (typeof raw === 'object' && raw !== null) {
      const obj = raw as Record<string, unknown>;
      if (!obj['sensorType']) {
        const inferred = inferSensorType(topic);
        if (inferred) obj['sensorType'] = inferred;
      }
    }

    const reading = validateSensorReading(raw);

    if (!reading) {
      logger.error(
        `[iot-gateway] Dropped malformed message: failed schema validation (topic=${topic})`,
      );
      return;
    }

    await sendSensorReading(producer, reading);
    monitor.update(reading);
  };
}
