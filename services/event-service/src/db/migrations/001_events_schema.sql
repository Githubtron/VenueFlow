-- Event Service schema — VenueFlow
-- Stores EventSession records scoped by venue.

CREATE TABLE IF NOT EXISTS event_sessions (
  event_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id            TEXT NOT NULL,
  name                TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'scheduled'
                        CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  start_time          TIMESTAMPTZ NOT NULL,
  end_time            TIMESTAMPTZ NOT NULL,
  expected_attendance INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_sessions_venue ON event_sessions (venue_id);
CREATE INDEX IF NOT EXISTS idx_event_sessions_status ON event_sessions (status);
