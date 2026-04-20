-- Incident Report Service schema

CREATE TABLE IF NOT EXISTS incident_reports (
  incident_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id          TEXT NOT NULL,
  event_id          TEXT NOT NULL,
  reporter_id       TEXT NOT NULL,
  zone_id           TEXT NOT NULL,
  type              TEXT NOT NULL CHECK (type IN ('medical', 'safety', 'infrastructure', 'suspicious', 'other')),
  description       TEXT NOT NULL,
  photo_url         TEXT,
  priority_score    INTEGER NOT NULL DEFAULT 1 CHECK (priority_score BETWEEN 1 AND 5),
  status            TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'resolved')),
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at       TIMESTAMPTZ,
  assigned_staff_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_incidents_venue_status ON incident_reports (venue_id, status, priority_score DESC);
