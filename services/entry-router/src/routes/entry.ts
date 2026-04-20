/**
 * Entry Router — /entry/* routes
 *
 * GET  /entry/recommendation/:attendeeId  — AI gate recommendation
 * POST /entry/scan                        — QR ticket validation + entry recording
 * POST /entry/face-scan                   — Face-scan entry (no biometric storage)
 */
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db/client';
import { validateTicket } from '../validation/ticket';
import { scoreGates, GateState } from '../gate/scorer';
import { getRedisClient } from '../redis/client';

const router = Router();

const VENUE_PUBLIC_KEY = process.env['VENUE_PUBLIC_KEY'] ?? '';

// ── GET /entry/recommendation/:attendeeId ─────────────────────────────────────

router.get('/recommendation/:attendeeId', async (req: Request, res: Response): Promise<void> => {
  const { attendeeId } = req.params;
  const venueId = req.query['venueId'] as string;

  if (!venueId) {
    res.status(400).json({ error: 'venueId query parameter is required' });
    return;
  }

  try {
    const redis = getRedisClient();
    const raw = await redis.hgetall(`heatmap:${venueId}`);

    const gates: GateState[] = Object.entries(raw)
      .filter(([field]) => field.startsWith('zone:gate-'))
      .map(([, value]) => {
        const snap = JSON.parse(value);
        return {
          gateId: snap.zone_id,
          zoneId: snap.zone_id,
          currentCount: snap.current_count ?? 0,
          capacity: snap.capacity ?? 500,
          densityPercent: snap.density_percent ?? 0,
          status: snap.status ?? 'green',
        } as GateState;
      });

    if (gates.length === 0) {
      res.status(404).json({ error: 'No gate data available for venue' });
      return;
    }

    const recommendation = scoreGates(gates);
    if (!recommendation) {
      res.status(503).json({ error: 'No available gates' });
      return;
    }

    // Store assignment for Red_Zone reassignment tracking
    await pool.query(
      `INSERT INTO gate_assignments (attendee_id, gate_id, venue_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (attendee_id) DO UPDATE SET gate_id = $2, assigned_at = NOW()`,
      [attendeeId, recommendation.gateId, venueId],
    );

    res.json({
      attendeeId,
      gateId: recommendation.gateId,
      gateName: `Gate ${recommendation.gateId}`,
      predictedWaitMinutes: recommendation.predictedWaitMinutes,
      reason: 'Least congested gate based on current density',
      venueId,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[entry-router] recommendation error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /entry/scan ──────────────────────────────────────────────────────────

router.post('/scan', async (req: Request, res: Response): Promise<void> => {
  const { qrPayload, gateId, venueId } = req.body as {
    qrPayload?: string;
    gateId?: string;
    venueId?: string;
  };

  if (!qrPayload || !gateId || !venueId) {
    res.status(400).json({ error: 'qrPayload, gateId, and venueId are required' });
    return;
  }

  const result = validateTicket(qrPayload, VENUE_PUBLIC_KEY);
  if (!result.valid) {
    res.status(401).json({ error: 'INVALID_TICKET', reason: result.reason });
    return;
  }

  const { ticketId, attendeeId, eventId } = result.payload;

  try {
    await pool.query(
      `INSERT INTO entry_events (event_id, ticket_id, attendee_id, event_id_ref, gate_id, venue_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [uuidv4(), ticketId, attendeeId, eventId, gateId, venueId],
    );

    res.json({ status: 'ENTERED', ticketId, attendeeId, gateId, entryTimestamp: new Date().toISOString() });
  } catch (err: unknown) {
    const pg = err as { code?: string };
    if (pg.code === '23505') {
      res.status(409).json({ status: 'ALREADY_ENTERED', ticketId });
    } else {
      console.error('[entry-router] scan error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// ── POST /entry/face-scan ─────────────────────────────────────────────────────

router.post('/face-scan', async (req: Request, res: Response): Promise<void> => {
  const { attendeeId, gateId, venueId, eventId } = req.body as {
    attendeeId?: string;
    gateId?: string;
    venueId?: string;
    eventId?: string;
  };

  if (!attendeeId || !gateId || !venueId || !eventId) {
    res.status(400).json({ error: 'attendeeId, gateId, venueId, and eventId are required' });
    return;
  }

  // No biometric data stored — entry event recorded with attendeeId only (Property 4)
  try {
    await pool.query(
      `INSERT INTO entry_events (event_id, ticket_id, attendee_id, event_id_ref, gate_id, venue_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [uuidv4(), `face-${attendeeId}-${eventId}`, attendeeId, eventId, gateId, venueId],
    );

    res.json({ status: 'ENTERED', attendeeId, gateId, method: 'face-scan', entryTimestamp: new Date().toISOString() });
  } catch (err: unknown) {
    const pg = err as { code?: string };
    if (pg.code === '23505') {
      res.status(409).json({ status: 'ALREADY_ENTERED', attendeeId });
    } else {
      console.error('[entry-router] face-scan error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;
