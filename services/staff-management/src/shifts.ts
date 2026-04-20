/**
 * Shift scheduling and duty roster management.
 * Validates: Requirements 28.3
 */
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export interface Shift {
  shiftId: string;
  staffId: string;
  venueId: string;
  eventId: string;
  assignedZoneId: string;
  startTime: string;
  endTime: string;
  role: string;
}

export async function createShift(
  pool: Pool,
  staffId: string,
  venueId: string,
  eventId: string,
  assignedZoneId: string,
  startTime: string,
  endTime: string,
  role = 'STAFF',
): Promise<Shift> {
  const shiftId = uuidv4();
  await pool.query(
    `INSERT INTO shifts (shift_id, staff_id, venue_id, event_id, assigned_zone_id, start_time, end_time, role)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [shiftId, staffId, venueId, eventId, assignedZoneId, startTime, endTime, role],
  );
  return { shiftId, staffId, venueId, eventId, assignedZoneId, startTime, endTime, role };
}

export async function getShifts(
  pool: Pool,
  venueId: string,
  date: string,
): Promise<Shift[]> {
  const result = await pool.query<{
    shift_id: string; staff_id: string; venue_id: string; event_id: string;
    assigned_zone_id: string; start_time: Date; end_time: Date; role: string;
  }>(
    `SELECT * FROM shifts
     WHERE venue_id = $1
     AND DATE(start_time) = $2::date
     ORDER BY start_time`,
    [venueId, date],
  );

  return result.rows.map((r) => ({
    shiftId: r.shift_id,
    staffId: r.staff_id,
    venueId: r.venue_id,
    eventId: r.event_id,
    assignedZoneId: r.assigned_zone_id,
    startTime: r.start_time.toISOString(),
    endTime: r.end_time.toISOString(),
    role: r.role,
  }));
}

export async function updateShift(
  pool: Pool,
  shiftId: string,
  updates: Partial<Pick<Shift, 'assignedZoneId' | 'startTime' | 'endTime'>>,
): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (updates.assignedZoneId) { fields.push(`assigned_zone_id = $${idx++}`); values.push(updates.assignedZoneId); }
  if (updates.startTime) { fields.push(`start_time = $${idx++}`); values.push(updates.startTime); }
  if (updates.endTime) { fields.push(`end_time = $${idx++}`); values.push(updates.endTime); }

  if (fields.length === 0) return;
  values.push(shiftId);

  await pool.query(
    `UPDATE shifts SET ${fields.join(', ')} WHERE shift_id = $${idx}`,
    values,
  );
}
