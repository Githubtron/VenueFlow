// Event Service routes — VenueFlow
// Manages EventSession lifecycle: create, query, status transitions.
// Validates: Requirements 19.1

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env['DATABASE_URL'] ?? 'postgresql://venueflow:venueflow_dev@localhost:5432/venueflow',
});

const router = Router();

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  scheduled: ['active', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

// ── GET /events?venueId={id}&status=active ────────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  const { venueId, status } = req.query as { venueId?: string; status?: string };
  if (!venueId) {
    res.status(400).json({ error: 'venueId query parameter is required' });
    return;
  }

  try {
    let query = 'SELECT * FROM event_sessions WHERE venue_id = $1';
    const params: unknown[] = [venueId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY start_time ASC';
    const result = await pool.query(query, params);
    res.json({ venueId, events: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /events ──────────────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response) => {
  const { venueId, name, startTime, endTime, expectedAttendance } = req.body as {
    venueId?: string;
    name?: string;
    startTime?: string;
    endTime?: string;
    expectedAttendance?: number;
  };

  if (!venueId || !name || !startTime || !endTime) {
    res.status(400).json({ error: 'venueId, name, startTime, and endTime are required' });
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO event_sessions (venue_id, name, start_time, end_time, expected_attendance)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [venueId, name, startTime, endTime, expectedAttendance ?? 0],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /events/:eventId ──────────────────────────────────────────────────────

router.get('/:eventId', async (req: Request, res: Response) => {
  const { eventId } = req.params;
  try {
    const result = await pool.query('SELECT * FROM event_sessions WHERE event_id = $1', [eventId]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'EventSession not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PATCH /events/:eventId/status ─────────────────────────────────────────────

router.patch('/:eventId/status', async (req: Request, res: Response) => {
  const { eventId } = req.params;
  const { status: newStatus } = req.body as { status?: string };

  if (!newStatus) {
    res.status(400).json({ error: 'status is required' });
    return;
  }

  try {
    const current = await pool.query('SELECT status FROM event_sessions WHERE event_id = $1', [eventId]);
    if (current.rows.length === 0) {
      res.status(404).json({ error: 'EventSession not found' });
      return;
    }

    const currentStatus: string = current.rows[0].status;
    const allowed = VALID_TRANSITIONS[currentStatus] ?? [];

    if (!allowed.includes(newStatus)) {
      res.status(422).json({
        error: `Invalid status transition: ${currentStatus} → ${newStatus}`,
        allowedTransitions: allowed,
      });
      return;
    }

    const result = await pool.query(
      'UPDATE event_sessions SET status = $1 WHERE event_id = $2 RETURNING *',
      [newStatus, eventId],
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
