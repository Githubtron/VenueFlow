// Unit tests for Rewards Service
// Validates: Requirements 22.1, 22.2

import { awardPoints, GamificationEvent } from '../kafka/consumer';
import { Pool } from 'pg';

// ── Mock pg Pool ──────────────────────────────────────────────────────────────

function makePool(queryResponses: Array<{ rows: unknown[]; rowCount?: number } | Error>) {
  let callIndex = 0;
  return {
    query: jest.fn(async () => {
      const resp = queryResponses[callIndex++];
      if (resp instanceof Error) throw resp;
      return resp;
    }),
  } as unknown as Pool;
}

// ── Deduplication key generation ──────────────────────────────────────────────

describe('awardPoints — deduplication', () => {
  it('awards points for a new unique event', async () => {
    const pool = makePool([
      { rows: [] },                          // INSERT gamification_events
      { rows: [{ total_points: 10 }] },      // UPSERT attendee_points
    ]);

    const event: GamificationEvent = {
      attendeeId: 'att-1',
      actionType: 'gate_entry',
      venueEventId: 'event-1',
    };

    const awarded = await awardPoints(pool, event);
    expect(awarded).toBe(10);
  });

  it('returns 0 for a duplicate event (unique constraint violation)', async () => {
    const dupError = Object.assign(new Error('duplicate key'), { code: '23505' });
    const pool = makePool([dupError]);

    const event: GamificationEvent = {
      attendeeId: 'att-1',
      actionType: 'gate_entry',
      venueEventId: 'event-1',
    };

    const awarded = await awardPoints(pool, event);
    expect(awarded).toBe(0);
  });

  it('propagates non-duplicate errors', async () => {
    const pool = makePool([new Error('connection refused')]);

    const event: GamificationEvent = {
      attendeeId: 'att-1',
      actionType: 'gate_entry',
      venueEventId: 'event-1',
    };

    await expect(awardPoints(pool, event)).rejects.toThrow('connection refused');
  });
});

// ── Points calculation per action type ────────────────────────────────────────

describe('awardPoints — points per action type', () => {
  const cases: Array<[string, number]> = [
    ['gate_entry', 10],
    ['early_arrival', 20],
    ['use_alternate_gate', 15],
    ['order_from_seat', 5],
    ['report_incident', 25],
    ['pre_event_sync', 20],
    ['accessible_route', 25],
    ['off_peak_kiosk_order', 30],
    ['valid_incident_report', 40],
    ['unknown_action', 5], // fallback
  ];

  test.each(cases)('action %s awards %d points', async (actionType, expectedPoints) => {
    const pool = makePool([
      { rows: [] },
      { rows: [{ total_points: expectedPoints }] },
    ]);

    const awarded = await awardPoints(pool, {
      attendeeId: 'att-x',
      actionType,
      venueEventId: 'event-x',
    });

    expect(awarded).toBe(expectedPoints);
  });
});

// ── referenceId included in deduplication key ─────────────────────────────────

describe('awardPoints — referenceId in deduplication key', () => {
  it('includes referenceId in the INSERT call', async () => {
    const pool = makePool([
      { rows: [] },
      { rows: [{ total_points: 5 }] },
    ]);

    await awardPoints(pool, {
      attendeeId: 'att-2',
      actionType: 'order_from_seat',
      venueEventId: 'event-2',
      referenceId: 'order-99',
    });

    const insertCall = (pool.query as jest.Mock).mock.calls[0] as [string, unknown[]];
    const params = insertCall[1];
    // deduplication_key is the 6th param
    expect(params[5]).toBe('att-2:order_from_seat:event-2:order-99');
  });

  it('uses empty string for missing referenceId', async () => {
    const pool = makePool([
      { rows: [] },
      { rows: [{ total_points: 10 }] },
    ]);

    await awardPoints(pool, {
      attendeeId: 'att-3',
      actionType: 'gate_entry',
      venueEventId: 'event-3',
    });

    const insertCall = (pool.query as jest.Mock).mock.calls[0] as [string, unknown[]];
    const params = insertCall[1];
    expect(params[5]).toBe('att-3:gate_entry:event-3:');
  });
});
