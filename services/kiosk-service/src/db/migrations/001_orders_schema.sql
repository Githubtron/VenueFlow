-- Kiosk Service — Orders Schema
-- Requirements: 3.4

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS orders (
  order_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  attendee_id   TEXT        NOT NULL,
  kiosk_id      TEXT        NOT NULL,
  event_id      TEXT        NOT NULL,
  seat_section  TEXT        NOT NULL,
  items         JSONB       NOT NULL DEFAULT '[]',
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'preparing', 'ready', 'collected')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_attendee_id ON orders (attendee_id);
CREATE INDEX IF NOT EXISTS idx_orders_kiosk_id    ON orders (kiosk_id);
CREATE INDEX IF NOT EXISTS idx_orders_status      ON orders (status);
