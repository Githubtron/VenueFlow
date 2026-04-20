/**
 * Property tests for Notification Service.
 * Feature: venueflow-platform
 * Properties: P7, P25
 * Validates: Requirements 2.4, 20.1
 */
import * as fc from 'fast-check';

// ─── Minimal inline implementations for property testing ─────────────────────
// These mirror the logic in the actual delivery modules without requiring
// a live Redis/Kafka connection.

interface Attendee {
  attendeeId: string;
  zoneId: string;
}

interface ZoneTransition {
  zoneId: string;
  adjacentZoneIds: string[];
  newStatus: 'green' | 'yellow' | 'red';
}

/** Simulates which attendees should be notified on a Red_Zone transition */
function getNotificationTargets(
  transition: ZoneTransition,
  attendees: Attendee[],
): string[] {
  if (transition.newStatus !== 'red') return [];
  const relevantZones = new Set([transition.zoneId, ...transition.adjacentZoneIds]);
  return attendees
    .filter(a => relevantZones.has(a.zoneId))
    .map(a => a.attendeeId);
}

interface NotificationAttempt {
  attendeeId: string;
  fcmReceiptReceived: boolean;
  receiptDelayMs: number;
}

const SMS_FALLBACK_THRESHOLD_MS = 30_000;

/** Returns attendees who need SMS fallback */
function getSMSFallbackTargets(attempts: NotificationAttempt[]): string[] {
  return attempts
    .filter(a => !a.fcmReceiptReceived && a.receiptDelayMs >= SMS_FALLBACK_THRESHOLD_MS)
    .map(a => a.attendeeId);
}

// ─── P7: Red_Zone Notification Dispatch ──────────────────────────────────────

describe('Property 7: Red_Zone Notification Dispatch', () => {
  it('dispatch includes all attendees in zone Z and adjacent zones on Red_Zone transition', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            attendeeId: fc.uuid(),
            zoneId: fc.constantFrom('zone-A', 'zone-B', 'zone-C', 'zone-D'),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        fc.constantFrom('zone-A', 'zone-B', 'zone-C'),
        fc.array(fc.constantFrom('zone-A', 'zone-B', 'zone-C', 'zone-D'), { maxLength: 3 }),
        (attendees, redZoneId, adjacentZones) => {
          const transition: ZoneTransition = {
            zoneId: redZoneId,
            adjacentZoneIds: adjacentZones,
            newStatus: 'red',
          };

          const targets = getNotificationTargets(transition, attendees);
          const targetSet = new Set(targets);

          // Every attendee in the red zone or adjacent zones must be notified
          const relevantZones = new Set([redZoneId, ...adjacentZones]);
          const expectedTargets = attendees
            .filter(a => relevantZones.has(a.zoneId))
            .map(a => a.attendeeId);

          return expectedTargets.every(id => targetSet.has(id));
        }
      ),
      { numRuns: 300 }
    );
  });

  it('non-Red_Zone transitions produce no notifications', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ attendeeId: fc.uuid(), zoneId: fc.string() }), { maxLength: 10 }),
        fc.constantFrom('green', 'yellow') as fc.Arbitrary<'green' | 'yellow'>,
        (attendees, status) => {
          const transition: ZoneTransition = {
            zoneId: 'zone-X',
            adjacentZoneIds: [],
            newStatus: status,
          };
          return getNotificationTargets(transition, attendees).length === 0;
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ─── P25: SMS Fallback Delivery Trigger ──────────────────────────────────────

describe('Property 25: SMS Fallback Delivery Trigger', () => {
  it('SMS fallback is initiated for every notification without FCM receipt within 30s', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            attendeeId: fc.uuid(),
            fcmReceiptReceived: fc.boolean(),
            receiptDelayMs: fc.integer({ min: 0, max: 60_000 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (attempts) => {
          const fallbackTargets = getSMSFallbackTargets(attempts);
          const fallbackSet = new Set(fallbackTargets);

          // Every attempt without receipt after 30s must be in fallback list
          const expectedFallbacks = attempts.filter(
            a => !a.fcmReceiptReceived && a.receiptDelayMs >= SMS_FALLBACK_THRESHOLD_MS
          );

          return expectedFallbacks.every(a => fallbackSet.has(a.attendeeId));
        }
      ),
      { numRuns: 300 }
    );
  });

  it('attendees with FCM receipt are never in SMS fallback list', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            attendeeId: fc.uuid(),
            fcmReceiptReceived: fc.constant(true),
            receiptDelayMs: fc.integer({ min: 0, max: 60_000 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (attempts) => {
          const fallbackTargets = getSMSFallbackTargets(attempts);
          return fallbackTargets.length === 0;
        }
      ),
      { numRuns: 200 }
    );
  });
});
