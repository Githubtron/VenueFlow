-- Vendor & Concession Intelligence schema

CREATE TABLE IF NOT EXISTS kiosk_transactions (
  transaction_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kiosk_id        TEXT NOT NULL,
  venue_id        TEXT NOT NULL,
  event_id        TEXT NOT NULL,
  amount          NUMERIC(10,2) NOT NULL DEFAULT 0,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kiosk_tx_kiosk_event ON kiosk_transactions (kiosk_id, event_id);

CREATE TABLE IF NOT EXISTS kiosk_inventory (
  inventory_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kiosk_id        TEXT NOT NULL,
  venue_id        TEXT NOT NULL,
  item_name       TEXT NOT NULL,
  current_stock   INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (kiosk_id, item_name)
);

CREATE TABLE IF NOT EXISTS kiosk_orders (
  order_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kiosk_id        TEXT NOT NULL,
  venue_id        TEXT NOT NULL,
  event_id        TEXT NOT NULL,
  placed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fulfilled_at    TIMESTAMPTZ,
  sla_threshold_seconds INTEGER NOT NULL DEFAULT 300
);

CREATE INDEX IF NOT EXISTS idx_kiosk_orders_kiosk ON kiosk_orders (kiosk_id, event_id);
