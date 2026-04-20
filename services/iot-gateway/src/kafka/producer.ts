import { Kafka, Producer } from 'kafkajs';
import { SensorReading } from '@venueflow/shared-types';
import { SensorFailureEvent } from '../types';

export function createProducer(brokers: string[]): Producer {
  const kafka = new Kafka({ clientId: 'iot-gateway', brokers });
  return kafka.producer({
    allowAutoTopicCreation: false,
    retry: { retries: 3 },
  });
}

export async function sendSensorReading(
  producer: Producer,
  reading: SensorReading,
): Promise<void> {
  await producer.send({
    topic: 'sensor.readings',
    messages: [{ value: JSON.stringify(reading) }],
    acks: -1,
  });
}

export async function sendSensorFailure(
  producer: Producer,
  event: SensorFailureEvent,
): Promise<void> {
  await producer.send({
    topic: 'sensor.failures',
    messages: [{ value: JSON.stringify(event) }],
    acks: -1,
  });
}
