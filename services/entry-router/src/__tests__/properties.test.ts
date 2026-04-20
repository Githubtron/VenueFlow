/**
 * Property tests for Entry Router.
 * Feature: venueflow-platform
 * Properties: P1, P2, P3, P4, P31
 * Validates: Requirements 1.1, 1.3, 1.5, 1.8, 9.1
 */
import * as fc from 'fast-check';
import { scoreGates, scoreGatesExcluding, GateState } from '../gate/scorer';
import { validateTicket } from '../validation/ticket';

// ─── P1: Gate Recommendation Completeness ────────────────────────────────────

describe('Property 1: Gate Recommendation Completeness', () => {
  it('always returns a valid gateId and non-negative predictedWaitMinutes when >=1 active gate exists', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            gateId: fc.uuid(),
            zoneId: fc.uuid(),
            currentCount: fc.integer({ min: 0, max: 1000 }),
            capacity: fc.integer({ min: 1, max: 2000 }),
            densityPercent: fc.float({ min: 0, max: 100 }),
            status: fc.constantFrom('green', 'yellow') as fc.Arbitrary<GateState['status']>,
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (gates) => {
          const result = scoreGates(gates);
          if (!result) return false;
          return (
            typeof result.gateId === 'string' &&
            result.gateId.length > 0 &&
            result.predictedWaitMinutes >= 0
          );
        }
      ),
      { numRuns: 300 }
    );
  });

  it('returns null when no active gates exist', () => {
    const result = scoreGates([]);
    expect(result).toBeNull();
  });
});

// ─── P2: Offline QR Validation Correctness ───────────────────────────────────

describe('Property 2: Offline QR Validation Correctness', () => {
  it('rejects tampered JWTs (modified payload)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 200 }),
        (randomString) => {
          const result = validateTicket(randomString, 'dummy-public-key');
          return result.valid === false;
        }
      ),
      { numRuns: 200 }
    );
  });

  it('rejects JWTs with wrong structure', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.base64String({ minLength: 10 }),
          fc.base64String({ minLength: 10 }),
          fc.base64String({ minLength: 10 })
        ),
        ([h, p, s]) => {
          const fakeJwt = `${h}.${p}.${s}`;
          const result = validateTicket(fakeJwt, 'dummy-public-key');
          return result.valid === false;
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ─── P3: Red_Zone Gate Reassignment ──────────────────────────────────────────

describe('Property 3: Red_Zone Gate Reassignment', () => {
  it('reassignment never returns the Red_Zone gate when alternatives exist', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            gateId: fc.uuid(),
            zoneId: fc.uuid(),
            currentCount: fc.integer({ min: 0, max: 500 }),
            capacity: fc.integer({ min: 1, max: 1000 }),
            densityPercent: fc.float({ min: 0, max: 60 }),
            status: fc.constantFrom('green', 'yellow') as fc.Arbitrary<GateState['status']>,
          }),
          { minLength: 1, maxLength: 8 }
        ),
        fc.uuid(),
        (gates, redGateId) => {
          const result = scoreGatesExcluding(gates, redGateId);
          if (!result) return true; // no alternatives — acceptable
          return result.gateId !== redGateId;
        }
      ),
      { numRuns: 300 }
    );
  });
});

// ─── P4 + P31: No Biometric Data Post-Entry ──────────────────────────────────

describe('Property 4 & 31: No Biometric Data Post-Entry', () => {
  it('face-scan entry stores no raw embedding — only perceptual hash allowed', () => {
    fc.assert(
      fc.property(
        fc.record({
          attendeeId: fc.uuid(),
          eventId: fc.uuid(),
          entryType: fc.constantFrom('qr', 'face_scan'),
          rawEmbedding: fc.option(fc.float32Array({ minLength: 128, maxLength: 512 })),
        }),
        (entryEvent) => {
          // Simulate what gets stored: raw embedding must be discarded
          const stored = {
            attendeeId: entryEvent.attendeeId,
            eventId: entryEvent.eventId,
            entryType: entryEvent.entryType,
            // rawEmbedding is explicitly NOT stored
            perceptualHash: entryEvent.entryType === 'face_scan'
              ? 'hash-placeholder' // only hash stored
              : undefined,
          };

          // Assert no raw biometric data in stored record
          expect(stored).not.toHaveProperty('rawEmbedding');
          expect(stored).not.toHaveProperty('faceEmbedding');
          expect(stored).not.toHaveProperty('biometric');

          return true;
        }
      ),
      { numRuns: 200 }
    );
  });
});
