/**
 * Gate scoring algorithm for Entry Router.
 * score = (queue_length / capacity) + (distance_weight * attendee_distance)
 * Lower score = better gate recommendation.
 */

export interface GateState {
  gateId: string;
  zoneId: string;
  currentCount: number;
  capacity: number;
  densityPercent: number;
  status: 'green' | 'yellow' | 'red' | 'unavailable';
}

export interface ScoredGate {
  gateId: string;
  score: number;
  predictedWaitMinutes: number;
}

const DISTANCE_WEIGHT = 0.3;
const THROUGHPUT_PER_MINUTE = 20; // people processed per gate per minute

/**
 * Score all active gates and return the best recommendation.
 * Returns null if no active gates are available.
 */
export function scoreGates(
  gates: GateState[],
  attendeeDistances: Record<string, number> = {},
): ScoredGate | null {
  const active = gates.filter(
    (g) => g.status !== 'unavailable' && g.status !== 'red',
  );

  if (active.length === 0) {
    // Fall back to any non-unavailable gate if all are red
    const fallback = gates.filter((g) => g.status !== 'unavailable');
    if (fallback.length === 0) return null;
    active.push(...fallback);
  }

  let best: ScoredGate | null = null;

  for (const gate of active) {
    const queueRatio = gate.capacity > 0 ? gate.currentCount / gate.capacity : 1;
    const distance = attendeeDistances[gate.gateId] ?? 0;
    const score = queueRatio + DISTANCE_WEIGHT * distance;
    const predictedWaitMinutes = Math.max(
      0,
      Math.ceil(gate.currentCount / THROUGHPUT_PER_MINUTE),
    );

    if (best === null || score < best.score) {
      best = { gateId: gate.gateId, score, predictedWaitMinutes };
    }
  }

  return best;
}

/**
 * Returns the best gate excluding a specific gateId (used for Red_Zone reassignment).
 */
export function scoreGatesExcluding(
  gates: GateState[],
  excludeGateId: string,
  attendeeDistances: Record<string, number> = {},
): ScoredGate | null {
  return scoreGates(
    gates.filter((g) => g.gateId !== excludeGateId),
    attendeeDistances,
  );
}
