/**
 * Tests for incident prioritizer.
 *
 * Property 28: Incident Priority Ordering
 * Feature: venueflow-platform, Property 28: Incident Priority Ordering
 * Validates: Requirements 23.2
 */
import * as fc from 'fast-check';
import { computePriorityScore, IncidentType } from '../prioritizer';

const INCIDENT_TYPES: IncidentType[] = ['medical', 'safety', 'infrastructure', 'suspicious', 'other'];

describe('computePriorityScore — unit tests', () => {
  it('medical incidents always score 5 with critical keywords', () => {
    expect(computePriorityScore('medical', 'person unconscious', 0.9, 3)).toBe(5);
  });

  it('medical base score is 5', () => {
    expect(computePriorityScore('medical', 'person needs help', 0, 0)).toBe(5);
  });

  it('other type has lowest base score', () => {
    const score = computePriorityScore('other', 'general issue', 0, 0);
    expect(score).toBe(1);
  });

  it('high density zone boosts score', () => {
    const low = computePriorityScore('safety', 'issue', 0.3, 0);
    const high = computePriorityScore('safety', 'issue', 0.9, 0);
    expect(high).toBeGreaterThanOrEqual(low);
  });

  it('duplicate reports boost score', () => {
    const single = computePriorityScore('safety', 'issue', 0, 0);
    const multiple = computePriorityScore('safety', 'issue', 0, 3);
    expect(multiple).toBeGreaterThanOrEqual(single);
  });

  it('score is always between 1 and 5', () => {
    for (const type of INCIDENT_TYPES) {
      const score = computePriorityScore(type, 'fire weapon stampede', 1.0, 10);
      expect(score).toBeGreaterThanOrEqual(1);
      expect(score).toBeLessThanOrEqual(5);
    }
  });
});

// ── Property 28: Incident Priority Ordering ───────────────────────────────────

describe('Property 28: Incident Priority Ordering', () => {
  it('score is always in range 1–5 for any valid input', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...INCIDENT_TYPES),
        fc.string({ minLength: 0, maxLength: 100 }),
        fc.float({ min: 0, max: 1, allow_nan: false } as never),
        fc.integer({ min: 0, max: 20 }),
        (type: IncidentType, description: string, density: number, duplicates: number) => {
          const score = computePriorityScore(type, description, density, duplicates);
          return score >= 1 && score <= 5 && Number.isInteger(score);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('medical incidents always score >= all other types with same inputs', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 50 }),
        fc.float({ min: 0, max: 1 } as never),
        fc.integer({ min: 0, max: 5 }),
        (description: string, density: number, duplicates: number) => {
          const medicalScore = computePriorityScore('medical', description, density, duplicates);
          for (const type of INCIDENT_TYPES) {
            const otherScore = computePriorityScore(type, description, density, duplicates);
            if (medicalScore < otherScore) return false;
          }
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
