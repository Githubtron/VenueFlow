// Rewards Kafka Consumer — VenueFlow
// Consumes `gamification.events` topic and awards points with idempotency.
// Deduplication key: (attendeeId, actionType, venueEventId, referenceId)
// Validates: Requirements 22.1

import { Pool } from 'pg';

const POINTS_MAP: Record<string, number> = {
  gate_entry: 10,
  early_arrival: 20,
  use_alternate_gate: 15,
  order_from_seat: 5,
  report_incident: 25,
  pre_event_sync: 20,
  accessible_route: 25,
  off_peak_kiosk_order: 30,
  valid_incident_report: 40,
};

export interface GamificationEvent {
  attendeeId: string;
  actionType: string;
  venueEventId: string;
  referenceId?: string;
}

/**
 * Award points for a gamification event.
 * Idempotent: duplicate events (same deduplication key) are silently discarded.
 * Returns the number of points awarded, or 0 if duplicate.
 */
export async function awardPoints(pool: Pool, event: GamificationEvent): Promise<number> {
  const { attendeeId, actionType, venueEventId, referenceId } = event;
  const deduplicationKey = `${attendeeId}:${actionType}:${venueEventId}:${referenceId ?? ''}`;
  const points = POINTS_MAP[actionType] ?? 5;

  try {
    await pool.query(
      `INSERT INTO gamification_events
         (attendee_id, venue_event_id, action_type, reference_id, points_awarded, deduplication_key)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [attendeeId, venueEventId, actionType, referenceId ?? null, points, deduplicationKey],
    );

    await pool.query(
      `INSERT INTO attendee_points (attendee_id, total_points)
       VALUES ($1, $2)
       ON CONFLICT (attendee_id)
       DO UPDATE SET total_points = attendee_points.total_points + $2, updated_at = NOW()`,
      [attendeeId, points],
    );

    return points;
  } catch (err: unknown) {
    const pg = err as { code?: string };
    if (pg.code === '23505') {
      // Duplicate deduplication key — discard silently
      return 0;
    }
    throw err;
  }
}

/**
 * Start the Kafka consumer loop for `gamification.events`.
 * Uses kafkajs if available; falls back to a no-op stub in environments
 * where Kafka is not configured (e.g. unit tests).
 */
export async function startKafkaConsumer(pool: Pool): Promise<void> {
  const brokers = (process.env['KAFKA_BROKERS'] ?? '').split(',').filter(Boolean);
  if (brokers.length === 0) {
    console.warn('[rewards-service] KAFKA_BROKERS not set — Kafka consumer disabled');
    return;
  }

  // Dynamic import so the service starts without kafkajs in dev/test
  let Kafka: typeof import('kafkajs').Kafka;
  try {
    ({ Kafka } = await import('kafkajs'));
  } catch {
    console.warn('[rewards-service] kafkajs not installed — Kafka consumer disabled');
    return;
  }

  const kafka = new Kafka({ clientId: 'rewards-service', brokers });
  const consumer = kafka.consumer({ groupId: 'rewards-service-group' });

  await consumer.connect();
  await consumer.subscribe({ topic: 'gamification.events', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      try {
        const event = JSON.parse(message.value.toString()) as GamificationEvent;
        const awarded = await awardPoints(pool, event);
        if (awarded > 0) {
          console.log(`[rewards-service] Awarded ${awarded} pts to ${event.attendeeId} for ${event.actionType}`);
        }
      } catch (err) {
        console.error('[rewards-service] Failed to process gamification event:', err);
      }
    },
  });

  console.log('[rewards-service] Kafka consumer started on gamification.events');
}
