/**
 * Kiosk Service — Orders routes
 *
 * POST   /orders                    — create order (pending)
 * PATCH  /orders/:orderId/status    — advance order status; notifies on → ready
 * GET    /orders/:orderId           — fetch order with current status
 *
 * Requirements: 3.4
 */
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { pool } from '../db/client';

const router = Router();

const NOTIFICATION_SERVICE_URL =
  process.env['NOTIFICATION_SERVICE_URL'] ?? 'http://localhost:3005';

// Valid status transitions
const STATUS_TRANSITIONS: Record<string, string> = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'collected',
};

// Rough estimate: 5 min base + 2 min per item
function estimateReadyMinutes(items: Array<{ itemId: string; quantity: number }>): number {
  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
  return 5 + Math.ceil(totalQty / 2);
}

// ─── POST /orders ─────────────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { attendeeId, kioskId, eventId, seatSection, items } = req.body as {
    attendeeId?: string;
    kioskId?: string;
    eventId?: string;
    seatSection?: string;
    items?: Array<{ itemId: string; quantity: number }>;
  };

  if (!attendeeId || !kioskId || !eventId || !seatSection || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({
      error: {
        code: 'INVALID_REQUEST',
        message: 'attendeeId, kioskId, eventId, seatSection, and items[] are required',
        requestId: uuidv4(),
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  const orderId = uuidv4();
  const estimatedReadyMinutes = estimateReadyMinutes(items);

  await pool.query(
    `INSERT INTO orders (order_id, attendee_id, kiosk_id, event_id, seat_section, items, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
    [orderId, attendeeId, kioskId, eventId, seatSection, JSON.stringify(items)]
  );

  res.status(201).json({ orderId, estimatedReadyMinutes });
});

// ─── PATCH /orders/:orderId/status ────────────────────────────────────────────

router.patch('/:orderId/status', async (req: Request, res: Response): Promise<void> => {
  const { orderId } = req.params;
  const { status } = req.body as { status?: string };

  if (!status) {
    res.status(400).json({
      error: {
        code: 'INVALID_REQUEST',
        message: 'status is required',
        requestId: uuidv4(),
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  const result = await pool.query(
    'SELECT order_id, attendee_id, kiosk_id, status FROM orders WHERE order_id = $1',
    [orderId]
  );

  if (result.rowCount === 0) {
    res.status(404).json({
      error: {
        code: 'ORDER_NOT_FOUND',
        message: `Order ${orderId} not found`,
        requestId: uuidv4(),
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  const order = result.rows[0] as {
    order_id: string;
    attendee_id: string;
    kiosk_id: string;
    status: string;
  };

  const expectedNext = STATUS_TRANSITIONS[order.status];
  if (status !== expectedNext) {
    res.status(422).json({
      error: {
        code: 'INVALID_TRANSITION',
        message: `Cannot transition from '${order.status}' to '${status}'. Expected '${expectedNext}'.`,
        requestId: uuidv4(),
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  await pool.query(
    `UPDATE orders SET status = $1, updated_at = NOW() WHERE order_id = $2`,
    [status, orderId]
  );

  // Notify attendee when order becomes ready (Requirement 3.4)
  if (status === 'ready') {
    try {
      await axios.post(`${NOTIFICATION_SERVICE_URL}/notifications/order-ready`, {
        attendeeId: order.attendee_id,
        orderId: order.order_id,
        kioskId: order.kiosk_id,
      });
    } catch (err) {
      // Non-fatal: log and continue
      console.error('[kiosk-service] Failed to notify order-ready:', err);
    }
  }

  res.json({ orderId, status });
});

// ─── GET /orders/:orderId ─────────────────────────────────────────────────────

router.get('/:orderId', async (req: Request, res: Response): Promise<void> => {
  const { orderId } = req.params;

  const result = await pool.query(
    `SELECT order_id, attendee_id, kiosk_id, event_id, seat_section, items, status, created_at, updated_at
     FROM orders WHERE order_id = $1`,
    [orderId]
  );

  if (result.rowCount === 0) {
    res.status(404).json({
      error: {
        code: 'ORDER_NOT_FOUND',
        message: `Order ${orderId} not found`,
        requestId: uuidv4(),
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  const row = result.rows[0] as {
    order_id: string;
    attendee_id: string;
    kiosk_id: string;
    event_id: string;
    seat_section: string;
    items: unknown;
    status: string;
    created_at: Date;
    updated_at: Date;
  };

  res.json({
    orderId: row.order_id,
    attendeeId: row.attendee_id,
    kioskId: row.kiosk_id,
    eventId: row.event_id,
    seatSection: row.seat_section,
    items: row.items,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
});

export default router;
