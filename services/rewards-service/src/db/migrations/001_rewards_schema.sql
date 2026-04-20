-- Rewards Service schema

CREATE TABLE IF NOT EXISTS gamification_events (
  event_guid          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendee_id         TEXT NOT NULL,
  venue_event_id      TEXT NOT NULL,
  action_type         TEXT NOT NULL,
  reference_id        TEXT,
  points_awarded      INTEGER NOT NULL DEFAULT 0,
  deduplication_key   TEXT NOT NULL UNIQUE,  -- (attendeeId, actionType, venueEventId, referenceId)
  awarded_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gamification_attendee ON gamification_events (attendee_id);

CREATE TABLE IF NOT EXISTS reward_redemptions (
  redemption_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendee_id     TEXT NOT NULL,
  reward_id       TEXT NOT NULL,
  points_cost     INTEGER NOT NULL,
  redeemed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status          TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS attendee_points (
  attendee_id     TEXT PRIMARY KEY,
  total_points    INTEGER NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
