// Rewards Service — VenueFlow
// Gamification: points award pipeline with idempotency, redemption, leaderboard.
// Validates: Requirements 22.1, 22.2

import express from 'express';
import { Pool } from 'pg';
import { startKafkaConsumer } from './kafka/consumer';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] ?? 'postgresql://venueflow:venueflow_dev@localhost:5432/venueflow' });
const app = express();
app.use(express.json());

// Points per action type
const POINTS_MAP: Record<string, number> = {
  gate_entry: 10,
  early_arrival: 20,
  use_alternate_gate: 15,
  order_from_seat: 5,
  report_incident: 25,
};

// ── GET /rewards/:attendeeId ──────────────────────────────────────────────────

app.get('/rewards/:attendeeId', async (req, res) => {
  const { attendeeId } = req.params;
  try {
    const points = await pool.query('SELECT total_points FROM attendee_points WHERE attendee_id = $1', [attendeeId]);
    const history = await pool.query(
      'SELECT * FROM gamification_events WHERE attendee_id = $1 ORDER BY awarded_at DESC LIMIT 50',
      [attendeeId],
    );
    res.json({ attendeeId, totalPoints: points.rows[0]?.total_points ?? 0, history: history.rows });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

// ── POST /rewards/:attendeeId/award ───────────────────────────────────────────

app.post('/rewards/:attendeeId/award', async (req, res) => {
  const { attendeeId } = req.params;
  const { actionType, venueEventId, referenceId } = req.body as { actionType?: string; venueEventId?: string; referenceId?: string };
  if (!actionType || !venueEventId) { res.status(400).json({ error: 'actionType and venueEventId required' }); return; }

  const deduplicationKey = `${attendeeId}:${actionType}:${venueEventId}:${referenceId ?? ''}`;
  const points = POINTS_MAP[actionType] ?? 5;

  try {
    await pool.query(
      `INSERT INTO gamification_events (attendee_id, venue_event_id, action_type, reference_id, points_awarded, deduplication_key)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [attendeeId, venueEventId, actionType, referenceId ?? null, points, deduplicationKey],
    );
    await pool.query(
      `INSERT INTO attendee_points (attendee_id, total_points) VALUES ($1, $2)
       ON CONFLICT (attendee_id) DO UPDATE SET total_points = attendee_points.total_points + $2, updated_at = NOW()`,
      [attendeeId, points],
    );
    res.status(201).json({ attendeeId, pointsAwarded: points, actionType, deduplicationKey });
  } catch (err: unknown) {
    const pg = err as { code?: string };
    if (pg.code === '23505') {
      res.status(409).json({ status: 'ALREADY_AWARDED', deduplicationKey });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// ── POST /rewards/:attendeeId/redeem/:rewardId ────────────────────────────────

app.post('/rewards/:attendeeId/redeem/:rewardId', async (req, res) => {
  const { attendeeId, rewardId } = req.params;
  const { pointsCost } = req.body as { pointsCost?: number };
  if (!pointsCost) { res.status(400).json({ error: 'pointsCost required' }); return; }

  try {
    const result = await pool.query(
      `UPDATE attendee_points SET total_points = total_points - $1, updated_at = NOW()
       WHERE attendee_id = $2 AND total_points >= $1 RETURNING total_points`,
      [pointsCost, attendeeId],
    );
    if (result.rows.length === 0) { res.status(422).json({ error: 'Insufficient points' }); return; }

    await pool.query(
      `INSERT INTO reward_redemptions (attendee_id, reward_id, points_cost) VALUES ($1, $2, $3)`,
      [attendeeId, rewardId, pointsCost],
    );
    const voucherCode = `VF-${rewardId.slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    res.json({ attendeeId, rewardId, pointsCost, remainingPoints: result.rows[0].total_points, status: 'completed', voucherCode });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

// ── GET /rewards/leaderboard/:eventId ─────────────────────────────────────────

app.get('/rewards/leaderboard/:eventId', async (req, res) => {
  const { eventId } = req.params;
  try {
    const result = await pool.query(
      `SELECT attendee_id, SUM(points_awarded) AS total_points
       FROM gamification_events WHERE venue_event_id = $1
       GROUP BY attendee_id ORDER BY total_points DESC LIMIT 20`,
      [eventId],
    );
    res.json({ eventId, leaderboard: result.rows });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = parseInt(process.env['PORT'] ?? '3009', 10);
if (require.main === module) {
  app.listen(PORT, () => console.log(`[rewards-service] Listening on port ${PORT}`));
  startKafkaConsumer(pool).catch((err) =>
    console.error('[rewards-service] Kafka consumer failed to start:', err),
  );
}

export default app;
