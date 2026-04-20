-- Staff & Resource Management schema

CREATE TABLE IF NOT EXISTS staff_locations (
  staff_id        TEXT NOT NULL,
  venue_id        TEXT NOT NULL,
  zone_id         TEXT,
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (staff_id)
);

CREATE TABLE IF NOT EXISTS shifts (
  shift_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id        TEXT NOT NULL,
  venue_id        TEXT NOT NULL,
  event_id        TEXT NOT NULL,
  assigned_zone_id TEXT NOT NULL,
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ NOT NULL,
  role            TEXT NOT NULL DEFAULT 'STAFF'
);

CREATE INDEX IF NOT EXISTS idx_shifts_venue_date ON shifts (venue_id, start_time);

CREATE TABLE IF NOT EXISTS incident_assignments (
  assignment_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id     TEXT NOT NULL UNIQUE,
  staff_id        TEXT NOT NULL,
  venue_id        TEXT NOT NULL,
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ,
  sla_threshold_seconds INTEGER NOT NULL DEFAULT 600
);

CREATE INDEX IF NOT EXISTS idx_incident_assignments_staff ON incident_assignments (staff_id);
