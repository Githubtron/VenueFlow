-- Emergency Coordinator schema

-- Append-only audit log (no UPDATE/DELETE permissions in production)
CREATE TABLE IF NOT EXISTS emergency_audit (
  event_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id        TEXT NOT NULL,
  session_event_id TEXT,
  type            TEXT NOT NULL CHECK (type IN ('sos', 'evacuation', 'pa_trigger', 'medical_sos')),
  initiator_id    TEXT NOT NULL,
  zone_id         TEXT NOT NULL,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  metadata        JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_emergency_audit_venue ON emergency_audit (venue_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS medical_sos (
  sos_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id            TEXT NOT NULL,
  event_id            TEXT NOT NULL,
  reporter_id         TEXT NOT NULL,
  zone_id             TEXT NOT NULL,
  severity            TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description         TEXT,
  location            JSONB,
  dispatched_staff_id TEXT,
  dispatch_timestamp  TIMESTAMPTZ,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dispatched', 'resolved')),
  submitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at         TIMESTAMPTZ,
  resolution_notes    TEXT
);

CREATE INDEX IF NOT EXISTS idx_medical_sos_venue ON medical_sos (venue_id, status);
