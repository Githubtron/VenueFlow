/**
 * Kafka producer for emergency events.
 * Publishes to emergency.sos topic.
 */
import { Kafka, Producer } from 'kafkajs';

let producer: Producer | null = null;

export function getProducer(): Producer {
  if (!producer) {
    const kafka = new Kafka({
      clientId: 'emergency-coordinator',
      brokers: (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(','),
    });
    producer = kafka.producer({ allowAutoTopicCreation: false, retry: { retries: 3 } });
  }
  return producer;
}

export async function publishSOS(payload: Record<string, unknown>): Promise<void> {
  try {
    const p = getProducer();
    await p.send({
      topic: 'emergency.sos',
      messages: [{ value: JSON.stringify(payload) }],
      acks: -1,
    });
  } catch (err) {
    console.error('[emergency-coordinator] Kafka publish failed:', err);
    // Non-fatal — SOS is already stored in DB and Redis
  }
}
