/**
 * Tests for Emergency Audit Log.
 *
 * Property 14: Emergency Audit Log Completeness
 * Feature: venueflow-platform, Property 14: Emergency Audit Log Completeness
 * Validates: Requirements 5.7
 */
import * as fc from 'fast-check';
import { logAuditEvent, AuditEntry, EmergencyEventType } from '../audit';

// Mock pg pool
const mockQuery = jest.fn();
jest.mock('../db/client', () => ({ default: { query: (...args: unknown[]) => mockQuery(...args) } }));

beforeEach(() => mockQuery.mockReset());

const EVENT_TYPES: EmergencyEventType[] = ['sos', 'evacuation', 'pa_trigger', 'medical_sos'];

describe('logAuditEvent — unit tests', () => {
  it('inserts a record and returns an AuditEntry with correct fields', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    const pool = (await import('../db/client')).default as unknown as { query: typeof mockQuery };
    const entry = await logAuditEvent(pool as never, 'venue-1', 'sos', 'attendee-1', 'zone-a', { eventId: 'ev-1' });

    expect(entry.venueId).toBe('venue-1');
    expect(entry.type).toBe('sos');
    expect(entry.initiatorId).toBe('attendee-1');
    expect(entry.zoneId).toBe('zone-a');
    expect(entry.status).toBe('active');
    expect(typeof entry.eventId).toBe('string');
    expect(entry.eventId.length).toBeGreaterThan(0);
    expect(typeof entry.timestamp).toBe('string');
  });

  it('timestamp is recorded at or before processing time', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    const pool = (await import('../db/client')).default as unknown as { query: typeof mockQuery };
    const before = new Date().toISOString();
    const entry = await logAuditEvent(pool as never, 'venue-1', 'evacuation', 'staff-1', 'zone-b');
    const after = new Date().toISOString();

    expect(entry.timestamp >= before).toBe(true);
    expect(entry.timestamp <= after).toBe(true);
  });
});

// ── Property 14: Emergency Audit Log Completeness ─────────────────────────────

describe('Property 14: Emergency Audit Log Completeness', () => {
  it('every emergency event produces an audit entry with correct type and non-null timestamp', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...EVENT_TYPES),
        fc.uuid(),
        fc.uuid(),
        async (type: EmergencyEventType, initiatorId: string, zoneId: string) => {
          mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
          const pool = (await import('../db/client')).default as unknown as { query: typeof mockQuery };
          const entry = await logAuditEvent(pool as never, 'venue-test', type, initiatorId, zoneId);

          return (
            entry.type === type &&
            entry.initiatorId === initiatorId &&
            entry.zoneId === zoneId &&
            typeof entry.timestamp === 'string' &&
            entry.timestamp.length > 0 &&
            typeof entry.eventId === 'string' &&
            entry.eventId.length > 0
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
