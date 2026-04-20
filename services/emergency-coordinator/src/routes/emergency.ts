/**
 * Emergency Coordinator routes.
 *
 * POST /emergency/sos          — Attendee SOS (Requirement 5.1)
 * POST /emergency/evacuate     — Zone/full evacuation (Requirement 5.2, 5.3)
 * GET  /emergency/status/:venueId — Current evacuation state (Requirement 5.5)
 * GET  /emergency/audit/:venueId  — Audit log (Requirement 5.7)
 */
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db/client';
import { logAuditEvent } from '../audit';
import { publishSOS } from '../kafka/producer';
import { getExitRoute, getAllExitRoutes, seedDefaultRoutes } from '../offline-routes';
import Redis from 'ioredis';

const router = Router();
const redis = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379');

// Active evacuations in-memory (replace with Redis/DB in production)
const activeEvacuations = new Map<string, {
  evacuationId: string; venueId: string; scope: string;
  affectedZones: string[]; initiatedAt: string;
}>();

// ── POST /emergency/sos ───────────────────────────────────────────────────────

router.post('/sos', async (req: Request, res: Response): Promise<void> => {
  const { zoneId, eventId, attendeeId, location } = req.body as {
    zoneId?: string; eventId?: string; attendeeId?: string;
    location?: { lat: number; lng: number };
  };

  if (!zoneId || !eventId || !attendeeId) {
    res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'zoneId, eventId, attendeeId required', requestId: uuidv4(), timestamp: new Date().toISOString() } });
    return;
  }

  try {
    const entry = await logAuditEvent(pool, req.body.venueId ?? 'unknown', 'sos', attendeeId, zoneId, { eventId, location });

    // Publish to Redis for Operations Dashboard WebSocket
    await redis.publish(`emergency:${req.body.venueId ?? 'unknown'}`, JSON.stringify({
      type: 'sos', sosId: entry.eventId, attendeeId, zoneId, eventId, timestamp: entry.timestamp,
    }));

    // Publish to Kafka emergency.sos topic
    await publishSOS({ sosId: entry.eventId, venueId: req.body.venueId, attendeeId, zoneId, eventId, timestamp: entry.timestamp });

    // Get offline exit route for the zone
    const exitRoute = getExitRoute(req.body.venueId ?? 'unknown', zoneId) ?? {
      zoneId, exitNodeIds: [], instructions: ['Follow exit signs'], estimatedMinutes: 3,
    };

    res.status(201).json({
      sosId: entry.eventId,
      status: 'received',
      nearestExitRoute: exitRoute,
    });
  } catch (err) {
    console.error('[emergency-coordinator] SOS error:', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error', requestId: uuidv4(), timestamp: new Date().toISOString() } });
  }
});

// ── POST /emergency/evacuate ──────────────────────────────────────────────────

router.post('/evacuate', async (req: Request, res: Response): Promise<void> => {
  const { venueId, eventId, scope, zoneId, initiatorId } = req.body as {
    venueId?: string; eventId?: string; scope?: 'zone' | 'full';
    zoneId?: string; initiatorId?: string;
  };

  if (!venueId || !eventId || !scope) {
    res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'venueId, eventId, scope required', requestId: uuidv4(), timestamp: new Date().toISOString() } });
    return;
  }

  const evacuationId = uuidv4();
  const affectedZones = scope === 'full' ? ['all'] : [zoneId ?? 'unknown'];
  const initiatedAt = new Date().toISOString();

  try {
    await logAuditEvent(pool, venueId, 'evacuation', initiatorId ?? 'system', zoneId ?? 'all', { eventId, scope, evacuationId });

    // Store active evacuation
    activeEvacuations.set(venueId, { evacuationId, venueId, scope, affectedZones, initiatedAt });

    // Broadcast evacuation to all attendees in venue via Redis
    await redis.publish(`emergency:${venueId}`, JSON.stringify({
      type: 'evacuation', evacuationId, scope, affectedZones, eventId, initiatedAt,
    }));

    // TODO: Trigger PA system adapter (stub — log intent)
    console.log(`[emergency-coordinator] PA trigger: evacuation for venue ${venueId}, scope ${scope}`);
    await logAuditEvent(pool, venueId, 'pa_trigger', initiatorId ?? 'system', zoneId ?? 'all', { evacuationId });

    res.status(201).json({ evacuationId, status: 'initiated', affectedZones });
  } catch (err) {
    console.error('[emergency-coordinator] evacuate error:', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error', requestId: uuidv4(), timestamp: new Date().toISOString() } });
  }
});

// ── GET /emergency/status/:venueId ────────────────────────────────────────────

router.get('/status/:venueId', (req: Request, res: Response): void => {
  const { venueId } = req.params;
  const evacuation = activeEvacuations.get(venueId);
  res.json({
    venueId,
    activeEvacuation: evacuation ?? null,
    hasActiveEvacuation: !!evacuation,
  });
});

// ── GET /emergency/audit/:venueId ─────────────────────────────────────────────

router.get('/audit/:venueId', async (req: Request, res: Response): Promise<void> => {
  const { venueId } = req.params;
  const limit = parseInt(req.query['limit'] as string ?? '100', 10);
  try {
    const { getAuditLog } = await import('../audit');
    const entries = await getAuditLog(pool, venueId, limit);
    res.json({ venueId, entries, count: entries.length });
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error', requestId: uuidv4(), timestamp: new Date().toISOString() } });
  }
});

// ── GET /emergency/exit-routes/:venueId ───────────────────────────────────────

router.get('/exit-routes/:venueId', (req: Request, res: Response): void => {
  const { venueId } = req.params;
  const routes = getAllExitRoutes(venueId);
  res.json({ venueId, routes, count: routes.length });
});

// ── POST /emergency/exit-routes/seed ─────────────────────────────────────────

router.post('/exit-routes/seed', (req: Request, res: Response): void => {
  const { venueId, zoneIds } = req.body as { venueId?: string; zoneIds?: string[] };
  if (!venueId || !zoneIds?.length) { res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'venueId and zoneIds required', requestId: uuidv4(), timestamp: new Date().toISOString() } }); return; }
  seedDefaultRoutes(venueId, zoneIds);
  res.json({ status: 'seeded', venueId, zoneCount: zoneIds.length });
});

export default router;
