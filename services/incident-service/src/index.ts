// Incident Report Service — VenueFlow
// AI-prioritized incident reports, assignment, resolution.
// Validates: Requirements 23.1, 23.2

import express from 'express';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import { computePriorityScore, IncidentType } from './prioritizer';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] ?? 'postgresql://venueflow:venueflow_dev@localhost:5432/venueflow' });
const redis = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379');
const app = express();
app.use(express.json());

// ── POST /incidents ───────────────────────────────────────────────────────────

app.post('/incidents', async (req, res) => {
  const { venueId, eventId, reporterId, zoneId, type, description, photoBase64 } = req.body as {
    venueId?: string; eventId?: string; reporterId?: string; zoneId?: string;
    type?: IncidentType; description?: string; photoBase64?: string;
  };

  if (!venueId || !eventId || !reporterId || !zoneId || !type || !description) {
    res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'venueId, eventId, reporterId, zoneId, type, description required', requestId: uuidv4(), timestamp: new Date().toISOString() } });
    return;
  }

  // Get zone density for priority boost
  let zoneDensity = 0;
  try {
    const raw = await redis.hget(`heatmap:${venueId}`, `zone:${zoneId}`);
    if (raw) zoneDensity = JSON.parse(raw).density_percent ?? 0;
  } catch { /* non-fatal */ }

  // Count duplicate reports for same zone/type in last 5 min
  let duplicateCount = 0;
  try {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM incident_reports WHERE venue_id = $1 AND zone_id = $2 AND type = $3 AND submitted_at > NOW() - INTERVAL '5 minutes'`,
      [venueId, zoneId, type],
    );
    duplicateCount = parseInt(result.rows[0]?.count ?? '0', 10);
  } catch { /* non-fatal */ }

  const priorityScore = computePriorityScore(type, description, zoneDensity, duplicateCount);
  const incidentId = uuidv4();

  try {
    await pool.query(
      `INSERT INTO incident_reports (incident_id, venue_id, event_id, reporter_id, zone_id, type, description, priority_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [incidentId, venueId, eventId, reporterId, zoneId, type, description, priorityScore],
    );

    // Publish to Operations Dashboard real-time feed
    await redis.publish(`incidents:${venueId}`, JSON.stringify({ incidentId, type, priorityScore, zoneId, eventId }));

    res.status(201).json({ incidentId, priorityScore, status: 'open' });
  } catch (err) {
    console.error('[incident-service] submit error:', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error', requestId: uuidv4(), timestamp: new Date().toISOString() } });
  }
});

// ── GET /incidents/:venueId ───────────────────────────────────────────────────

app.get('/incidents/:venueId', async (req, res) => {
  const { venueId } = req.params;
  const { eventId, status } = req.query as { eventId?: string; status?: string };

  try {
    const conditions = ['venue_id = $1'];
    const values: unknown[] = [venueId];
    let idx = 2;

    if (eventId) { conditions.push(`event_id = $${idx++}`); values.push(eventId); }
    if (status) { conditions.push(`status = $${idx++}`); values.push(status); }

    const result = await pool.query(
      `SELECT * FROM incident_reports WHERE ${conditions.join(' AND ')} ORDER BY priority_score DESC, submitted_at ASC`,
      values,
    );
    res.json({ incidents: result.rows, total: result.rows.length });
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error', requestId: uuidv4(), timestamp: new Date().toISOString() } });
  }
});

// ── PATCH /incidents/:incidentId/resolve ──────────────────────────────────────

app.patch('/incidents/:incidentId/resolve', async (req, res) => {
  const { incidentId } = req.params;
  try {
    const result = await pool.query(
      `UPDATE incident_reports SET status = 'resolved', resolved_at = NOW() WHERE incident_id = $1 RETURNING *`,
      [incidentId],
    );
    if (result.rows.length === 0) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Incident not found', requestId: uuidv4(), timestamp: new Date().toISOString() } }); return; }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error', requestId: uuidv4(), timestamp: new Date().toISOString() } });
  }
});

// ── POST /incidents/:incidentId/assign ────────────────────────────────────────

app.post('/incidents/:incidentId/assign', async (req, res) => {
  const { incidentId } = req.params;
  const { staffId } = req.body as { staffId?: string };
  if (!staffId) { res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'staffId required', requestId: uuidv4(), timestamp: new Date().toISOString() } }); return; }

  try {
    const result = await pool.query(
      `UPDATE incident_reports SET assigned_staff_id = $1, status = 'assigned' WHERE incident_id = $2 RETURNING *`,
      [staffId, incidentId],
    );
    if (result.rows.length === 0) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Incident not found', requestId: uuidv4(), timestamp: new Date().toISOString() } }); return; }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error', requestId: uuidv4(), timestamp: new Date().toISOString() } });
  }
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = parseInt(process.env['PORT'] ?? '3012', 10);
if (require.main === module) app.listen(PORT, () => console.log(`[incident-service] Listening on port ${PORT}`));

export default app;
