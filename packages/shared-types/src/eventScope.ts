/**
 * EventScope — VenueFlow multi-event scoping conventions
 *
 * All PostgreSQL queries, Redis keys, and Kafka event schemas MUST include
 * `eventId` so that data from concurrent EventSessions never bleeds across
 * session boundaries.
 *
 * Conventions:
 *   PostgreSQL: every scoped table has an `event_id` column; queries always
 *               include `WHERE event_id = $N`.
 *   Redis keys:  `{key}:{eventId}` — e.g. `heatmap:venue-1:event-abc`
 *   Kafka:       every event payload includes `eventId` as a top-level field.
 */

/** Append `:eventId` suffix to a Redis key to scope it to an EventSession. */
export function withEventScope(key: string, eventId: string): string {
  return `${key}:${eventId}`;
}

/**
 * Build a scoped Redis key for a given resource type and venue/event pair.
 * e.g. scopedKey('heatmap', 'venue-1', 'event-abc') → 'heatmap:venue-1:event-abc'
 */
export function scopedKey(resource: string, venueId: string, eventId: string): string {
  return `${resource}:${venueId}:${eventId}`;
}

/** Validate that a Kafka event payload carries an `eventId` field. */
export function assertEventScoped(payload: Record<string, unknown>): void {
  if (!payload['eventId'] || typeof payload['eventId'] !== 'string') {
    throw new Error('Kafka event payload is missing required `eventId` field');
  }
}
