/**
 * Emergency audit log — append-only.
 * Property 14: Emergency Audit Log Completeness
 * Validates: Requirements 5.7
 */
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export type EmergencyEventType = 'sos' | 'evacuation' | 'pa_trigger' | 'medical_sos';

export interface AuditEntry {
  eventId: string;
  venueId: string;
  type: EmergencyEventType;
  initiatorId: string;
  zoneId: string;
  timestamp: string;
  status: 'active' | 'resolved';
  metadata?: Record<string, unknown>;
}

export async function logAuditEvent(
  pool: Pool,
  venueId: string,
  type: EmergencyEventType,
  initiatorId: string,
  zoneId: string,
  metadata: Record<string, unknown> = {},
): Promise<AuditEntry> {
  const eventId = uuidv4();
  const timestamp = new Date().toISOString();

  await pool.query(
    `INSERT INTO emergency_audit (event_id, venue_id, type, initiator_id, zone_id, timestamp, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [eventId, venueId, type, initiatorId, zoneId, timestamp, JSON.stringify(metadata)],
  );

  return { eventId, venueId, type, initiatorId, zoneId, timestamp, status: 'active', metadata };
}

export async function getAuditLog(
  pool: Pool,
  venueId: string,
  limit = 100,
): Promise<AuditEntry[]> {
  const result = await pool.query<{
    event_id: string; venue_id: string; type: string;
    initiator_id: string; zone_id: string; timestamp: Date;
    status: string; metadata: Record<string, unknown>;
  }>(
    `SELECT * FROM emergency_audit WHERE venue_id = $1 ORDER BY timestamp DESC LIMIT $2`,
    [venueId, limit],
  );

  return result.rows.map((r) => ({
    eventId: r.event_id,
    venueId: r.venue_id,
    type: r.type as EmergencyEventType,
    initiatorId: r.initiator_id,
    zoneId: r.zone_id,
    timestamp: r.timestamp.toISOString(),
    status: r.status as 'active' | 'resolved',
    metadata: r.metadata,
  }));
}
