-- Entry Router schema

CREATE TABLE IF NOT EXISTS entry_events (
  event_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id     TEXT NOT NULL,
  attendee_id   TEXT NOT NULL,
  event_id_ref  TEXT NOT NULL,
  gate_id       TEXT NOT NULL,
  venue_id      TEXT NOT NULL,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint ensures idempotent scans (Property: duplicate scan returns ALREADY_ENTERED)
CREATE UNIQUE INDEX IF NOT EXISTS idx_entry_events_ticket_id ON entry_events (ticket_id);

CREATE TABLE IF NOT EXISTS gate_assignments (
  attendee_id   TEXT PRIMARY KEY,
  gate_id       TEXT NOT NULL,
  venue_id      TEXT NOT NULL,
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
