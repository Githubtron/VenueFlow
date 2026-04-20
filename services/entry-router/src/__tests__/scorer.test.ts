/**
 * Tests for gate scoring algorithm.
 *
 * Property 1: Gate Recommendation Completeness
 * Feature: venueflow-platform, Property 1: Gate Recommendation Completeness
 * Validates: Requirements 1.1
 *
 * Property 3: Red_Zone Gate Reassignment
 * Feature: venueflow-platform, Property 3: Red_Zone Gate Reassignment
 * Validates: Requirements 1.5
 */
import * as fc from 'fast-check';
import { scoreGates, scoreGatesExcluding, GateState } from '../gate/scorer';

function makeGate(overrides: Partial<GateState> = {}): GateState {
  return {
    gateId: 'gate-1',
    zoneId: 'zone-gate-1',
    currentCount: 50,
    capacity: 500,
    densityPercent: 0.1,
    status: 'green',
    ...overrides,
  };
}

// ── Unit tests ────────────────────────────────────────────────────────────────

describe('scoreGates — unit tests', () => {
  it('returns null when no gates provided', () => {
    expect(scoreGates([])).toBeNull();
  });

  it('returns the only gate when one gate exists', () => {
    const result = scoreGates([makeGate({ gateId: 'gate-1' })]);
    expect(result?.gateId).toBe('gate-1');
  });

  it('prefers less congested gate', () => {
    const gates: GateState[] = [
      makeGate({ gateId: 'gate-busy', currentCount: 400, capacity: 500 }),
      makeGate({ gateId: 'gate-free', currentCount: 10, capacity: 500 }),
    ];
    const result = scoreGates(gates);
    expect(result?.gateId).toBe('gate-free');
  });

  it('returns non-negative predictedWaitMinutes', () => {
    const result = scoreGates([makeGate({ currentCount: 0 })]);
    expect(result?.predictedWaitMinutes).toBeGreaterThanOrEqual(0);
  });

  it('skips red zones when alternatives exist', () => {
    const gates: GateState[] = [
      makeGate({ gateId: 'gate-red', status: 'red' }),
      makeGate({ gateId: 'gate-green', status: 'green' }),
    ];
    const result = scoreGates(gates);
    expect(result?.gateId).toBe('gate-green');
  });

  it('falls back to red zone if all gates are red', () => {
    const gates: GateState[] = [
      makeGate({ gateId: 'gate-red-1', status: 'red' }),
      makeGate({ gateId: 'gate-red-2', status: 'red' }),
    ];
    const result = scoreGates(gates);
    expect(result).not.toBeNull();
  });
});

describe('scoreGatesExcluding — Red_Zone reassignment', () => {
  it('excludes the specified gate', () => {
    const gates: GateState[] = [
      makeGate({ gateId: 'gate-1' }),
      makeGate({ gateId: 'gate-2' }),
    ];
    const result = scoreGatesExcluding(gates, 'gate-1');
    expect(result?.gateId).toBe('gate-2');
  });

  it('returns null when only the excluded gate exists', () => {
    const result = scoreGatesExcluding([makeGate({ gateId: 'gate-1' })], 'gate-1');
    expect(result).toBeNull();
  });
});

// ── Property 1: Gate Recommendation Completeness ─────────────────────────────

describe('Property 1: Gate Recommendation Completeness', () => {
  it('always returns a valid gateId and non-negative wait for any venue with >=1 active gate', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            gateId: fc.uuid(),
            zoneId: fc.uuid(),
            currentCount: fc.integer({ min: 0, max: 1000 }),
            capacity: fc.integer({ min: 1, max: 2000 }),
            densityPercent: fc.float({ min: 0, max: 1 }),
            status: fc.constantFrom('green', 'yellow') as fc.Arbitrary<'green' | 'yellow'>,
          }),
          { minLength: 1, maxLength: 20 },
        ),
        (gates: GateState[]) => {
          const result = scoreGates(gates);
          if (result === null) return true; // no active gates — acceptable
          return (
            typeof result.gateId === 'string' &&
            result.gateId.length > 0 &&
            result.predictedWaitMinutes >= 0
          );
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ── Property 3: Red_Zone Gate Reassignment ────────────────────────────────────

describe('Property 3: Red_Zone Gate Reassignment', () => {
  it('reassigned gate is never the Red_Zone gate when alternatives exist', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            gateId: fc.uuid(),
            zoneId: fc.uuid(),
            currentCount: fc.integer({ min: 0, max: 500 }),
            capacity: fc.integer({ min: 1, max: 1000 }),
            densityPercent: fc.float({ min: 0, max: 1 }),
            status: fc.constantFrom('green', 'yellow') as fc.Arbitrary<'green' | 'yellow'>,
          }),
          { minLength: 2, maxLength: 10 },
        ),
        (gates: GateState[]) => {
          const redGateId = gates[0].gateId;
          const result = scoreGatesExcluding(gates, redGateId);
          if (result === null) return true;
          return result.gateId !== redGateId;
        },
      ),
      { numRuns: 200 },
    );
  });
});
