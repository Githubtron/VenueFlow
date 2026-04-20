/**
 * Vendor SLA compliance tracker.
 * Validates: Requirements 30.4
 */
import { Pool } from 'pg';

export interface SLAReport {
  kioskId: string;
  eventId: string;
  totalOrders: number;
  breachedOrders: number;
  avgFulfillmentSeconds: number;
  slaBreachRate: number;
  compliant: boolean;
}

export async function recordOrderFulfillment(
  pool: Pool,
  orderId: string,
  kioskId: string,
  venueId: string,
  eventId: string,
): Promise<void> {
  await pool.query(
    `UPDATE kiosk_orders SET fulfilled_at = NOW()
     WHERE order_id = $1`,
    [orderId],
  );
}

export async function createOrder(
  pool: Pool,
  kioskId: string,
  venueId: string,
  eventId: string,
  slaThresholdSeconds = 300,
): Promise<string> {
  const { v4: uuidv4 } = await import('uuid');
  const orderId = uuidv4();
  await pool.query(
    `INSERT INTO kiosk_orders (order_id, kiosk_id, venue_id, event_id, sla_threshold_seconds)
     VALUES ($1, $2, $3, $4, $5)`,
    [orderId, kioskId, venueId, eventId, slaThresholdSeconds],
  );
  return orderId;
}

export async function getKioskSLAReport(
  pool: Pool,
  kioskId: string,
  eventId: string,
): Promise<SLAReport> {
  const result = await pool.query<{
    total_orders: string;
    breached_orders: string;
    avg_fulfillment_seconds: string;
  }>(
    `SELECT
       COUNT(*) AS total_orders,
       COUNT(*) FILTER (
         WHERE fulfilled_at IS NOT NULL
         AND EXTRACT(EPOCH FROM (fulfilled_at - placed_at)) > sla_threshold_seconds
       ) AS breached_orders,
       COALESCE(AVG(
         EXTRACT(EPOCH FROM (fulfilled_at - placed_at))
       ) FILTER (WHERE fulfilled_at IS NOT NULL), 0) AS avg_fulfillment_seconds
     FROM kiosk_orders
     WHERE kiosk_id = $1 AND event_id = $2`,
    [kioskId, eventId],
  );

  const row = result.rows[0];
  const totalOrders = parseInt(row.total_orders, 10);
  const breachedOrders = parseInt(row.breached_orders, 10);
  const avgFulfillmentSeconds = parseFloat(row.avg_fulfillment_seconds);
  const slaBreachRate = totalOrders > 0 ? breachedOrders / totalOrders : 0;

  return {
    kioskId,
    eventId,
    totalOrders,
    breachedOrders,
    avgFulfillmentSeconds,
    slaBreachRate,
    compliant: slaBreachRate < 0.1, // compliant if <10% breach rate
  };
}
