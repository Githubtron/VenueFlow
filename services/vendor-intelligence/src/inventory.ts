/**
 * Inventory depletion alert pipeline.
 * Validates: Requirements 30.2
 */
import { Pool } from 'pg';
import Redis from 'ioredis';

export interface InventoryItem {
  kioskId: string;
  venueId: string;
  itemName: string;
  currentStock: number;
  lowStockThreshold: number;
}

export async function updateInventory(
  pool: Pool,
  redis: Redis,
  kioskId: string,
  venueId: string,
  itemName: string,
  currentStock: number,
): Promise<{ depleted: boolean }> {
  await pool.query(
    `INSERT INTO kiosk_inventory (kiosk_id, venue_id, item_name, current_stock, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (kiosk_id, item_name)
     DO UPDATE SET current_stock = $4, updated_at = NOW()`,
    [kioskId, venueId, itemName, currentStock],
  );

  // Check threshold
  const result = await pool.query<{ low_stock_threshold: number }>(
    `SELECT low_stock_threshold FROM kiosk_inventory
     WHERE kiosk_id = $1 AND item_name = $2`,
    [kioskId, itemName],
  );

  const threshold = result.rows[0]?.low_stock_threshold ?? 10;
  const depleted = currentStock <= threshold;

  if (depleted) {
    // Publish alert to Redis for Notification Service
    await redis.publish(
      `inventory-alert:${venueId}`,
      JSON.stringify({ kioskId, venueId, itemName, currentStock, threshold }),
    );
  }

  return { depleted };
}

export async function getInventory(
  pool: Pool,
  kioskId: string,
): Promise<InventoryItem[]> {
  const result = await pool.query<{
    kiosk_id: string;
    venue_id: string;
    item_name: string;
    current_stock: number;
    low_stock_threshold: number;
  }>(
    `SELECT kiosk_id, venue_id, item_name, current_stock, low_stock_threshold
     FROM kiosk_inventory WHERE kiosk_id = $1`,
    [kioskId],
  );

  return result.rows.map((r) => ({
    kioskId: r.kiosk_id,
    venueId: r.venue_id,
    itemName: r.item_name,
    currentStock: r.current_stock,
    lowStockThreshold: r.low_stock_threshold,
  }));
}
