/**
 * Per-kiosk revenue and footfall analytics.
 * Validates: Requirements 30.1
 */
import { Pool } from 'pg';

export interface KioskAnalytics {
  kioskId: string;
  venueId: string;
  eventId: string;
  totalRevenue: number;
  transactionCount: number;
  avgTransactionValue: number;
}

export async function getKioskAnalytics(
  pool: Pool,
  venueId: string,
  kioskId: string,
  eventId: string,
): Promise<KioskAnalytics> {
  const result = await pool.query<{
    total_revenue: string;
    transaction_count: string;
  }>(
    `SELECT
       COALESCE(SUM(amount), 0) AS total_revenue,
       COUNT(*) AS transaction_count
     FROM kiosk_transactions
     WHERE kiosk_id = $1 AND venue_id = $2 AND event_id = $3`,
    [kioskId, venueId, eventId],
  );

  const row = result.rows[0];
  const totalRevenue = parseFloat(row.total_revenue);
  const transactionCount = parseInt(row.transaction_count, 10);

  return {
    kioskId,
    venueId,
    eventId,
    totalRevenue,
    transactionCount,
    avgTransactionValue: transactionCount > 0 ? totalRevenue / transactionCount : 0,
  };
}

export async function recordTransaction(
  pool: Pool,
  kioskId: string,
  venueId: string,
  eventId: string,
  amount: number,
): Promise<void> {
  await pool.query(
    `INSERT INTO kiosk_transactions (kiosk_id, venue_id, event_id, amount)
     VALUES ($1, $2, $3, $4)`,
    [kioskId, venueId, eventId, amount],
  );
}
