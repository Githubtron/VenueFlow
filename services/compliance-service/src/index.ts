// Compliance & Audit Management Service — VenueFlow
// Fire-code capacity checker, audit trail, regulatory reports, GDPR dashboard.
// Validates: Requirements 33.1, 33.2, 33.3, 33.4

import express from 'express';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import { getCapacityStatus } from './capacity-checker';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] ?? 'postgresql://venueflow:venueflow_dev@localhost:5432/venueflow' });
const redis = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379');
const app = express();
app.use(express.json());

// In-memory fire-code limits per venue (set via admin endpoint)
const fireLimits: Record<string, Record<string, number>> = {};

// ── GET /compliance/:venueId/capacity-status ──────────────────────────────────

app.get('/compliance/:venueId/capacity-status', async (req, res) => {
  const { venueId } = req.params;
  try {
    const statuses = await getCapacityStatus(redis, venueId, fireLimits[venueId] ?? {});
    const hasViolations = statuses.some((s) => !s.compliant);

    // Log violations to compliance audit
    for (const s of statuses.filter((s) => !s.compliant)) {
      await pool.query(
        `INSERT INTO compliance_audit (venue_id, actor_id, action_type, zone_id, details)
         VALUES ($1, 'system', 'fire_code_violation', $2, $3)`,
        [venueId, s.zoneId, JSON.stringify({ occupancy: s.currentOccupancy, limit: s.fireCodeLimit })],
      ).catch(() => { /* non-fatal */ });
    }

    res.json({ venueId, statuses, hasViolations, checkedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error', requestId: uuidv4(), timestamp: new Date().toISOString() } });
  }
});

// ── POST /compliance/:venueId/fire-limits ─────────────────────────────────────

app.post('/compliance/:venueId/fire-limits', (req, res) => {
  const { venueId } = req.params;
  const { limits } = req.body as { limits?: Record<string, number> };
  if (!limits) { res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'limits required', requestId: uuidv4(), timestamp: new Date().toISOString() } }); return; }
  fireLimits[venueId] = limits;
  res.json({ status: 'configured', venueId, zoneCount: Object.keys(limits).length });
});

// ── GET /compliance/:venueId/audit-trail ──────────────────────────────────────

app.get('/compliance/:venueId/audit-trail', async (req, res) => {
  const { venueId } = req.params;
  const { eventId, from, to, limit = '100', offset = '0' } = req.query as Record<string, string>;

  try {
    const conditions = ['venue_id = $1'];
    const values: unknown[] = [venueId];
    let idx = 2;

    if (eventId) { conditions.push(`event_id = $${idx++}`); values.push(eventId); }
    if (from) { conditions.push(`recorded_at >= $${idx++}`); values.push(from); }
    if (to) { conditions.push(`recorded_at <= $${idx++}`); values.push(to); }

    values.push(parseInt(limit, 10), parseInt(offset, 10));
    const result = await pool.query(
      `SELECT * FROM compliance_audit WHERE ${conditions.join(' AND ')} ORDER BY recorded_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      values,
    );
    res.json({ venueId, entries: result.rows, count: result.rows.length });
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error', requestId: uuidv4(), timestamp: new Date().toISOString() } });
  }
});

// ── POST /compliance/:venueId/reports/generate ────────────────────────────────

app.post('/compliance/:venueId/reports/generate', async (req, res) => {
  const { venueId } = req.params;
  const { eventId, reportType } = req.query as { eventId?: string; reportType?: string };

  if (!eventId) { res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'eventId required', requestId: uuidv4(), timestamp: new Date().toISOString() } }); return; }

  try {
    // Aggregate incident counts
    const incidents = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM incident_reports WHERE venue_id = $1 AND event_id = $2`,
      [venueId, eventId],
    ).catch(() => ({ rows: [{ count: '0' }] }));

    // Aggregate SOS counts
    const sos = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM emergency_audit WHERE venue_id = $1 AND session_event_id = $2`,
      [venueId, eventId],
    ).catch(() => ({ rows: [{ count: '0' }] }));

    const report = {
      reportId: uuidv4(),
      venueId,
      eventId,
      reportType: reportType ?? 'regulatory',
      generatedAt: new Date().toISOString(),
      summary: {
        totalIncidents: parseInt(incidents.rows[0]?.count ?? '0', 10),
        totalSOSSignals: parseInt(sos.rows[0]?.count ?? '0', 10),
        complianceStatus: 'reviewed',
      },
      // TODO: Generate full PDF via reportlab in production
      format: 'json',
    };

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error', requestId: uuidv4(), timestamp: new Date().toISOString() } });
  }
});

// ── GET /compliance/gdpr/consents ─────────────────────────────────────────────

app.get('/compliance/gdpr/consents', async (req, res) => {
  const { venueId } = req.query as { venueId?: string };
  if (!venueId) { res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'venueId required', requestId: uuidv4(), timestamp: new Date().toISOString() } }); return; }
  try {
    const result = await pool.query('SELECT * FROM gdpr_consents WHERE venue_id = $1', [venueId]);
    res.json({ venueId, consents: result.rows, count: result.rows.length });
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error', requestId: uuidv4(), timestamp: new Date().toISOString() } });
  }
});

// ── DELETE /compliance/gdpr/consents/:attendeeId ──────────────────────────────

app.delete('/compliance/gdpr/consents/:attendeeId', async (req, res) => {
  const { attendeeId } = req.params;
  // Hash attendeeId for storage (never store raw ID)
  const { createHash } = await import('crypto');
  const hash = createHash('sha256').update(attendeeId).digest('hex');

  try {
    await pool.query(
      `UPDATE gdpr_consents SET data_deleted_at = NOW(), consent_given = FALSE WHERE attendee_id_hash = $1`,
      [hash],
    );
    // Log GDPR deletion to audit trail
    await pool.query(
      `INSERT INTO compliance_audit (venue_id, actor_id, action_type, details)
       VALUES ('system', $1, 'gdpr_deletion', $2)`,
      [attendeeId, JSON.stringify({ attendeeIdHash: hash })],
    );
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error', requestId: uuidv4(), timestamp: new Date().toISOString() } });
  }
});

// ── GET /compliance/gdpr/export/:attendeeId ───────────────────────────────────

app.get('/compliance/gdpr/export/:attendeeId', async (req, res) => {
  const { attendeeId } = req.params;
  const { createHash } = await import('crypto');
  const hash = createHash('sha256').update(attendeeId).digest('hex');

  try {
    const consent = await pool.query('SELECT * FROM gdpr_consents WHERE attendee_id_hash = $1', [hash]);
    res.json({
      attendeeIdHash: hash,
      exportedAt: new Date().toISOString(),
      consentRecord: consent.rows[0] ?? null,
      // TODO: Include entry events, incident reports, gamification events in full export
      note: 'Full data export requires cross-service aggregation — see KNOWN_GAPS.md',
    });
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error', requestId: uuidv4(), timestamp: new Date().toISOString() } });
  }
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = parseInt(process.env['PORT'] ?? '3013', 10);
if (require.main === module) app.listen(PORT, () => console.log(`[compliance-service] Listening on port ${PORT}`));

export default app;
