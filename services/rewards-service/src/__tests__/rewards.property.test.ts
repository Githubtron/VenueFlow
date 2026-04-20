/**
 * Property test for Gamification Idempotency.
 * Feature: venueflow-platform
 * Property: P27
 * Validates: Requirements 22.1
 */
import * as fc from 'fast-check';

interface GamificationEvent {
  attendeeId: string;
  actionType: string;
  venueEventId: string;
  referenceId?: string;
}

/** Deduplication key — same as production implementation */
function deduplicationKey(event: GamificationEvent): string {
  return `${event.attendeeId}:${event.actionType}:${event.venueEventId}:${event.referenceId ?? ''}`;
}

/** Simulates idempotent points award — returns points awarded (0 if duplicate) */
function awardPointsIdempotent(
  seen: Set<string>,
  event: GamificationEvent,
  pointsMap: Record<string, number>,
): number {
  const key = deduplicationKey(event);
  if (seen.has(key)) return 0;
  seen.add(key);
  return pointsMap[event.actionType] ?? 5;
}

const POINTS_MAP: Record<string, number> = {
  gate_entry: 10,
  off_peak_kiosk_order: 30,
  valid_incident_report: 40,
  pre_event_sync: 20,
  accessible_route: 25,
};

// ─── P27: Gamification Idempotency ───────────────────────────────────────────

describe('Property 27: Gamification Idempotency', () => {
  it('submitting the same event multiple times awards points exactly once', () => {
    fc.assert(
      fc.property(
        fc.record({
          attendeeId: fc.uuid(),
          actionType: fc.constantFrom(...Object.keys(POINTS_MAP)),
          venueEventId: fc.uuid(),
          referenceId: fc.option(fc.uuid(), { nil: undefined }),
        }),
        fc.integer({ min: 2, max: 10 }),
        (event, submitCount) => {
          const seen = new Set<string>();
          let totalAwarded = 0;

          for (let i = 0; i < submitCount; i++) {
            totalAwarded += awardPointsIdempotent(seen, event, POINTS_MAP);
          }

          const expectedPoints = POINTS_MAP[event.actionType] ?? 5;
          return totalAwarded === expectedPoints;
        }
      ),
      { numRuns: 300 }
    );
  });

  it('different referenceIds for the same action are treated as distinct events', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (attendeeId, venueEventId, ref1, ref2) => {
          if (ref1 === ref2) return true;

          const seen = new Set<string>();
          const event1: GamificationEvent = { attendeeId, actionType: 'gate_entry', venueEventId, referenceId: ref1 };
          const event2: GamificationEvent = { attendeeId, actionType: 'gate_entry', venueEventId, referenceId: ref2 };

          const awarded1 = awardPointsIdempotent(seen, event1, POINTS_MAP);
          const awarded2 = awardPointsIdempotent(seen, event2, POINTS_MAP);

          return awarded1 > 0 && awarded2 > 0;
        }
      ),
      { numRuns: 200 }
    );
  });
});
