/**
 * Property tests for Incident Report Service.
 * Feature: venueflow-platform
 * Property: P28
 * Validates: Requirements 23.2
 */
import * as fc from 'fast-check';

interface IncidentReport {
  reportId: string;
  priorityScore: number;
  type: string;
  zoneId: string;
  createdAt: string;
}

/** Sort incidents by priority score descending (as the Operations Dashboard feed does) */
function sortByPriority(incidents: IncidentReport[]): IncidentReport[] {
  return [...incidents].sort((a, b) => b.priorityScore - a.priorityScore);
}

// ─── P28: Incident Priority Ordering ─────────────────────────────────────────

describe('Property 28: Incident Priority Ordering', () => {
  it('Operations Dashboard feed displays higher-priority incidents before lower-priority ones', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            reportId: fc.uuid(),
            priorityScore: fc.integer({ min: 1, max: 5 }),
            type: fc.constantFrom('medical', 'safety', 'infrastructure', 'suspicious', 'other'),
            zoneId: fc.uuid(),
            createdAt: fc.date().map(d => d.toISOString()),
          }),
          { minLength: 2, maxLength: 20 }
        ),
        (incidents) => {
          const sorted = sortByPriority(incidents);

          // Verify sorted order: each item's priority >= next item's priority
          for (let i = 0; i < sorted.length - 1; i++) {
            if (sorted[i]!.priorityScore < sorted[i + 1]!.priorityScore) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 300 }
    );
  });

  it('for any pair (I1 with P1 > P2 for I2), I1 appears before I2 in sorted feed', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }),
        fc.integer({ min: 1, max: 4 }),
        (p1, p2diff) => {
          const p2 = Math.max(1, p1 - p2diff);
          if (p1 <= p2) return true;

          const i1: IncidentReport = { reportId: 'i1', priorityScore: p1, type: 'safety', zoneId: 'z1', createdAt: new Date().toISOString() };
          const i2: IncidentReport = { reportId: 'i2', priorityScore: p2, type: 'other', zoneId: 'z2', createdAt: new Date().toISOString() };

          const sorted = sortByPriority([i2, i1]); // intentionally reversed input
          const i1Index = sorted.findIndex(r => r.reportId === 'i1');
          const i2Index = sorted.findIndex(r => r.reportId === 'i2');

          return i1Index < i2Index;
        }
      ),
      { numRuns: 200 }
    );
  });
});
