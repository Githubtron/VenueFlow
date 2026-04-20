/**
 * Unit tests for order status transitions and notification dispatch.
 * Requirements: 3.4
 */
import request from 'supertest';
import app from '../index';

// ─── Mock pg pool ─────────────────────────────────────────────────────────────

const mockQuery = jest.fn();
jest.mock('../db/client', () => ({
  pool: { query: (...args: unknown[]) => mockQuery(...args) },
}));

// ─── Mock axios (notification service) ───────────────────────────────────────

const mockAxiosPost = jest.fn();
jest.mock('axios', () => ({
  post: (...args: unknown[]) => mockAxiosPost(...args),
  create: jest.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_ORDER_BODY = {
  attendeeId: 'att-001',
  kioskId: 'kiosk-A1',
  eventId: 'evt-2024',
  seatSection: 'B12',
  items: [{ itemId: 'burger', quantity: 2 }],
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── POST /orders ─────────────────────────────────────────────────────────────

describe('POST /orders', () => {
  it('creates an order and returns orderId + estimatedReadyMinutes', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const res = await request(app).post('/orders').send(VALID_ORDER_BODY);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('orderId');
    expect(typeof res.body.estimatedReadyMinutes).toBe('number');
    expect(res.body.estimatedReadyMinutes).toBeGreaterThan(0);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/orders').send({ attendeeId: 'att-001' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_REQUEST');
  });

  it('returns 400 when items array is empty', async () => {
    const res = await request(app)
      .post('/orders')
      .send({ ...VALID_ORDER_BODY, items: [] });
    expect(res.status).toBe(400);
  });

  it('estimates ready time based on item quantity', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });

    // 4 items total → 5 + ceil(4/2) = 7 min
    const res = await request(app)
      .post('/orders')
      .send({ ...VALID_ORDER_BODY, items: [{ itemId: 'burger', quantity: 4 }] });

    expect(res.status).toBe(201);
    expect(res.body.estimatedReadyMinutes).toBe(7);
  });
});

// ─── PATCH /orders/:orderId/status ────────────────────────────────────────────

describe('PATCH /orders/:orderId/status', () => {
  const orderId = 'order-uuid-123';

  it('transitions pending → preparing', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ order_id: orderId, attendee_id: 'att-001', kiosk_id: 'kiosk-A1', status: 'pending' }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const res = await request(app)
      .patch(`/orders/${orderId}/status`)
      .send({ status: 'preparing' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ orderId, status: 'preparing' });
    expect(mockAxiosPost).not.toHaveBeenCalled();
  });

  it('transitions preparing → ready and dispatches notification', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ order_id: orderId, attendee_id: 'att-001', kiosk_id: 'kiosk-A1', status: 'preparing' }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    mockAxiosPost.mockResolvedValueOnce({ status: 200 });

    const res = await request(app)
      .patch(`/orders/${orderId}/status`)
      .send({ status: 'ready' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');

    // Notification must be dispatched with correct payload
    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    expect(mockAxiosPost).toHaveBeenCalledWith(
      expect.stringContaining('/notifications/order-ready'),
      { attendeeId: 'att-001', orderId, kioskId: 'kiosk-A1' }
    );
  });

  it('transitions ready → collected without notification', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ order_id: orderId, attendee_id: 'att-001', kiosk_id: 'kiosk-A1', status: 'ready' }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const res = await request(app)
      .patch(`/orders/${orderId}/status`)
      .send({ status: 'collected' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('collected');
    expect(mockAxiosPost).not.toHaveBeenCalled();
  });

  it('returns 422 for invalid transition (pending → ready)', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ order_id: orderId, attendee_id: 'att-001', kiosk_id: 'kiosk-A1', status: 'pending' }],
    });

    const res = await request(app)
      .patch(`/orders/${orderId}/status`)
      .send({ status: 'ready' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('returns 404 when order does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request(app)
      .patch(`/orders/nonexistent/status`)
      .send({ status: 'preparing' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ORDER_NOT_FOUND');
  });

  it('continues gracefully when notification service is unavailable', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ order_id: orderId, attendee_id: 'att-001', kiosk_id: 'kiosk-A1', status: 'preparing' }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    mockAxiosPost.mockRejectedValueOnce(new Error('Connection refused'));

    const res = await request(app)
      .patch(`/orders/${orderId}/status`)
      .send({ status: 'ready' });

    // Status update succeeds even if notification fails
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
  });
});

// ─── GET /orders/:orderId ─────────────────────────────────────────────────────

describe('GET /orders/:orderId', () => {
  const orderId = 'order-uuid-123';

  it('returns order details', async () => {
    const now = new Date();
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        order_id: orderId,
        attendee_id: 'att-001',
        kiosk_id: 'kiosk-A1',
        event_id: 'evt-2024',
        seat_section: 'B12',
        items: [{ itemId: 'burger', quantity: 2 }],
        status: 'pending',
        created_at: now,
        updated_at: now,
      }],
    });

    const res = await request(app).get(`/orders/${orderId}`);

    expect(res.status).toBe(200);
    expect(res.body.orderId).toBe(orderId);
    expect(res.body.status).toBe('pending');
    expect(res.body.seatSection).toBe('B12');
  });

  it('returns 404 for unknown order', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request(app).get('/orders/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ORDER_NOT_FOUND');
  });
});
