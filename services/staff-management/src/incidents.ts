/**
 * Incident ownership assignment with SLA tracking.
 * Validates: Requirements 28.4
 */
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export interface IncidentAssignment {
  assignmentId: string;
  incidentId: string;
  staffId: string;
  venueId: string;
  assignedAt: string;
  resolvedAt?: string;
  slaBreached: boolean;
  resolutionSeconds?: number;
}

export async function assignIncident(
  pool: Pool,
  incidentId: string,
  staffId: string,
  venueId: string,
  slaThresholdSeconds = 600,
): Promise<IncidentAssignment> {
  const assignmentId = uuidv4();
  await pool.query(
    `INSERT INTO incident_assignments (assignment_id, incident_id, staff_id, venue_id, sla_threshold_seconds)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (incident_id) DO UPDATE SET staff_id = $3, assigned_at = NOW()`,
    [assignmentId, incidentId, staffId, venueId, slaThresholdSeconds],
  );
  return { assignmentId, incidentId, staffId, venueId, assignedAt: new Date().toISOString(), slaBreached: false };
}

export async function resolveIncident(
  pool: Pool,
  incidentId: string,
): Promise<IncidentAssignment | null> {
  const result = await pool.query<{
    assignment_id: string; incident_id: string; staff_id: string; venue_id: string;
    assigned_at: Date; sla_threshold_seconds: number;
  }>(
    `UPDATE incident_assignments SET resolved_at = NOW()
     WHERE incident_id = $1
     RETURNING *`,
    [incidentId],
  );

  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  const resolvedAt = new Date();
  const resolutionSeconds = (resolvedAt.getTime() - r.assigned_at.getTime()) / 1000;

  return {
    assignmentId: r.assignment_id,
    incidentId: r.incident_id,
    staffId: r.staff_id,
    venueId: r.venue_id,
    assignedAt: r.assigned_at.toISOString(),
    resolvedAt: resolvedAt.toISOString(),
    slaBreached: resolutionSeconds > r.sla_threshold_seconds,
    resolutionSeconds,
  };
}

export async function getStaffIncidents(
  pool: Pool,
  staffId: string,
): Promise<IncidentAssignment[]> {
  const result = await pool.query<{
    assignment_id: string; incident_id: string; staff_id: string; venue_id: string;
    assigned_at: Date; resolved_at: Date | null; sla_threshold_seconds: number;
  }>(
    `SELECT * FROM incident_assignments WHERE staff_id = $1 AND resolved_at IS NULL ORDER BY assigned_at`,
    [staffId],
  );

  return result.rows.map((r) => ({
    assignmentId: r.assignment_id,
    incidentId: r.incident_id,
    staffId: r.staff_id,
    venueId: r.venue_id,
    assignedAt: r.assigned_at.toISOString(),
    resolvedAt: r.resolved_at?.toISOString(),
    slaBreached: false,
  }));
}
