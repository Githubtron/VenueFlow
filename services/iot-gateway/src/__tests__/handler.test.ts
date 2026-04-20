import { createMessageHandler, inferSensorType } from '../mqtt/handler';
import { HeartbeatMonitor } from '../heartbeat/monitor';
import { Producer } from 'kafkajs';
import { SensorReading } from '@venueflow/shared-types';

const makeProducer = (): jest.Mocked<Pick<Producer, 'send'>> => ({
  send: jest.fn().mockResolvedValue(undefined),
});

const makeMonitor = (): jest.Mocked<Pick<HeartbeatMonitor, 'update'>> => ({
  update: jest.fn(),
});

const validReading: SensorReading = {
  sensorId: 'sensor-1',
  zoneId: 'zone-a',
  venueId: 'venue-1',
  count: 5,
  timestamp: '2024-01-15T10:30:00.000Z',
  sensorType: 'pressure',
};

describe('inferSensorType', () => {
  it('infers pressure from topic prefix', () => {
    expect(inferSensorType('sensors/pressure/zone-a')).toBe('pressure');
  });

  it('infers ir from topic prefix', () => {
    expect(inferSensorType('sensors/ir/zone-b')).toBe('ir');
  });

  it('infers ble from topic prefix', () => {
    expect(inferSensorType('sensors/ble/zone-c')).toBe('ble');
  });

  it('returns null for unknown topic prefix', () => {
    expect(inferSensorType('sensors/unknown/zone-a')).toBeNull();
  });
});

describe('createMessageHandler', () => {
  it('calls produce for a valid message', async () => {
    const producer = makeProducer();
    const monitor = makeMonitor();
    const handler = createMessageHandler(
      producer as unknown as Producer,
      monitor as unknown as HeartbeatMonitor,
    );

    const payload = Buffer.from(JSON.stringify(validReading));
    await handler('sensors/pressure/zone-a', payload);

    expect(producer.send).toHaveBeenCalledTimes(1);
    expect(producer.send).toHaveBeenCalledWith(
      expect.objectContaining({ topic: 'sensor.readings' }),
    );
    expect(monitor.update).toHaveBeenCalledWith(validReading);
  });

  it('does NOT call produce for a malformed message', async () => {
    const producer = makeProducer();
    const monitor = makeMonitor();
    const logger = { error: jest.fn() };
    const handler = createMessageHandler(
      producer as unknown as Producer,
      monitor as unknown as HeartbeatMonitor,
      logger,
    );

    const payload = Buffer.from(JSON.stringify({ sensorId: 'x' })); // missing required fields
    await handler('sensors/pressure/zone-a', payload);

    expect(producer.send).not.toHaveBeenCalled();
    expect(monitor.update).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
  });

  it('does NOT call produce for invalid JSON', async () => {
    const producer = makeProducer();
    const monitor = makeMonitor();
    const logger = { error: jest.fn() };
    const handler = createMessageHandler(
      producer as unknown as Producer,
      monitor as unknown as HeartbeatMonitor,
      logger,
    );

    const payload = Buffer.from('not-json');
    await handler('sensors/pressure/zone-a', payload);

    expect(producer.send).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
  });

  it('infers sensorType from topic prefix when not in payload', async () => {
    const producer = makeProducer();
    const monitor = makeMonitor();
    const handler = createMessageHandler(
      producer as unknown as Producer,
      monitor as unknown as HeartbeatMonitor,
    );

    // Payload without sensorType — should be inferred from topic
    const { sensorType: _, ...withoutType } = validReading;
    const payload = Buffer.from(JSON.stringify(withoutType));
    await handler('sensors/ir/zone-a', payload);

    expect(producer.send).toHaveBeenCalledTimes(1);
    const sentMessage = JSON.parse(
      (producer.send.mock.calls[0][0] as { messages: { value: string }[] }).messages[0].value,
    );
    expect(sentMessage.sensorType).toBe('ir');
  });

  it('infers sensorType as ble from ble topic prefix', async () => {
    const producer = makeProducer();
    const monitor = makeMonitor();
    const handler = createMessageHandler(
      producer as unknown as Producer,
      monitor as unknown as HeartbeatMonitor,
    );

    const { sensorType: _, ...withoutType } = validReading;
    const payload = Buffer.from(JSON.stringify(withoutType));
    await handler('sensors/ble/zone-a', payload);

    expect(producer.send).toHaveBeenCalledTimes(1);
    const sentMessage = JSON.parse(
      (producer.send.mock.calls[0][0] as { messages: { value: string }[] }).messages[0].value,
    );
    expect(sentMessage.sensorType).toBe('ble');
  });
});
