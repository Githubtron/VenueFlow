/**
 * Medical & Safety Response routes.
 *
 * POST  /medical/sos                    — Attendee medical SOS (Requirement 29.1)
 * POST  /medical/dispatch/:sosId        — Dispatch first-aid staff (Requirement 29.2)
 * GET   /medical/triage/:venueId        — Triage priority queue (Requirement 29.4)
 * PATCH /medical/sos/:sosId/resolve     — Resolve medical SOS
 * GET   /medical/stations/:venueId      — AED and first-aid stations (Requirement 29.3)
 * POST  /medical/stations               — Seed station data (ADMIN)
 */
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db/client';
import { logAuditEvent } from '../audit';
import Redis from 'ioredis';

const router = Router();
const redis = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379');

// In-memory station store (replace with PostgreSQL in production)
const stations: Record<string, { stationId: string; venueId: string; type: 'first_aid' | 'aed'; zoneId: string; floorLevel: number; coordinates: { lat: number; lng: number } }[]> = {};

// ── POST /medical/sos ─────────────────────────────────────────────────────────

router.post('/sos', async (req: Request, res: Response): Promise<void> => {
  const { venueId, eventId, reporterId, zoneId, severity, description, location } = req.body as {
    venueId?: string; eventId?: string; reporterId?: string; zoneId?: string;
    severity?: string; description?: string; location?: { lat: number; lng: number };
  };

  if (!venueId || !eventId || !reporterId || !zoneId || !severity) {
    res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'venueId, eventId, reporterId, zoneId, severity required', requestId: uuidv4(), timestamp: new Date().toISOString() } });
    return;
  }

  const sosId = uuidv4();
  const submittedAt = new Date().toISOString();

  try {
    await pool.query(
      `INSERT INTO medical_sos (sos_id, venue_id, event_id, reporter_id, zone_id, severity, description, location, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [sosId, venueId, eventId, reporterId, zoneId, severity, description ?? '', JSON.stringify(location ?? {}), submittedAt],
    );

    await logAuditEvent(pool, venueId, 'medical_sos', reporterId, zoneId, { sosId, eventId, severity });

    // Publish to triage queue
    await redis.publish(`emergency:${venueId}`, JSON.stringify({ type: 'medical_sos', sosId, zoneId, severity, submittedAt }));

    // Auto-dispatch nearest first-aid staff
    const staffKeys = await redis.keys('staff-location:*');
    let nearestStaff: string | null = null;
    for (const key of staffKeys) {
      const raw = await redis.get(key);
      if (!raw) continue;
      try {
        const loc = JSON.parse(raw);
        if (loc.venueId === venueId && loc.specialization === 'first_aid') {
          nearestStaff = loc.staffId;
          break; // take first available first-aid staff
        }
      } catch { /* skip */ }
    }

    if (nearestStaff) {
      await pool.query(
        `UPDATE medical_sos SET dispatched_staff_id = $1, dispatch_timestamp = NOW(), status = 'dispatched' WHERE sos_id = $2`,
        [nearestStaff, sosId],
      );
      await redis.publish(`emergency:${venueId}`, JSON.stringify({ type: 'medical_dispatch', sosId, staffId: nearestStaff, zoneId }));
    }

    // Find nearest AED
    const venueStations = stations[venueId] ?? [];
    const nearestAED = venueStations.find((s) => s.type === 'aed' && s.zoneId === zoneId) ?? venueStations.find((s) => s.type === 'aed') ?? null;

    res.status(201).json({ sosId, status: 'received', nearestAED });
  } catch (err) {
    console.error('[emergency-coordinator] medical SOS error:', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error', requestId: uuidv4(), timestamp: new Date().toISOString() } });
  }
});

// ── POST /medical/dispatch/:sosId ─────────────────────────────────────────────

router.post('/dispatch/:sosId', async (req: Request, res: Response): Promise<void> => {
  const { sosId } = req.params;
  const { staffId } = req.body as { staffId?: string };

  if (!staffId) { res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'staffId required', requestId: uuidv4(), timestamp: new Date().toISOString() } }); return; }

  try {
    const result = await pool.query(
      `UPDATE medical_sos SET dispatched_staff_id = $1, dispatch_timestamp = NOW(), status = 'dispatched'
       WHERE sos_id = $2 RETURNING *`,
      [staffId, sosId],
    );
    if (result.rows.length === 0) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'SOS not found', requestId: uuidv4(), timestamp: new Date().toISOString() } }); return; }
    res.json({ sosId, staffId, status: 'dispatched', dispatchTimestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error', requestId: uuidv4(), timestamp: new Date().toISOString() } });
  }
});

// ── GET /medical/triage/:venueId ──────────────────────────────────────────────

router.get('/triage/:venueId', async (req: Request, res: Response): Promise<void> => {
  const { venueId } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM medical_sos WHERE venue_id = $1 AND status != 'resolved'
       ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, submitted_at ASC`,
      [venueId],
    );
    res.json({ venueId, queue: result.rows, count: result.rows.length });
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error', requestId: uuidv4(), timestamp: new Date().toISOString() } });
  }
});

// ── PATCH /medical/sos/:sosId/resolve ─────────────────────────────────────────

router.patch('/sos/:sosId/resolve', async (req: Request, res: Response): Promise<void> => {
  const { sosId } = req.params;
  const { resolutionNotes } = req.body as { resolutionNotes?: string };
  try {
    const result = await pool.query(
      `UPDATE medical_sos SET status = 'resolved', resolved_at = NOW(), resolution_notes = $1
       WHERE sos_id = $2 RETURNING *`,
      [resolutionNotes ?? '', sosId],
    );
    if (result.rows.length === 0) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'SOS not found', requestId: uuidv4(), timestamp: new Date().toISOString() } }); return; }
    res.json({ sosId, status: 'resolved', resolvedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error', requestId: uuidv4(), timestamp: new Date().toISOString() } });
  }
});

// ── GET /medical/stations/:venueId ────────────────────────────────────────────

router.get('/stations/:venueId', (req: Request, res: Response): void => {
  const { venueId } = req.params;
  res.json({ venueId, stations: stations[venueId] ?? [] });
});

// ── POST /medical/stations ────────────────────────────────────────────────────

router.post('/stations', (req: Request, res: Response): void => {
  const { venueId, type, zoneId, floorLevel, coordinates } = req.body;
  if (!venueId || !type || !zoneId) { res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'venueId, type, zoneId required', requestId: uuidv4(), timestamp: new Date().toISOString() } }); return; }
  if (!stations[venueId]) stations[venueId] = [];
  const station = { stationId: uuidv4(), venueId, type, zoneId, floorLevel: floorLevel ?? 1, coordinates: coordinates ?? { lat: 0, lng: 0 } };
  stations[venueId].push(station);
  res.status(201).json(station);
});

export default router;
