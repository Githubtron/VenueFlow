-- Compliance & Audit Management schema

-- Append-only compliance audit trail (no UPDATE/DELETE in production)
CREATE TABLE IF NOT EXISTS compliance_audit (
  audit_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id        TEXT NOT NULL,
  event_id        TEXT,
  actor_id        TEXT NOT NULL,
  action_type     TEXT NOT NULL,
  zone_id         TEXT,
  details         JSONB DEFAULT '{}',
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_audit_venue ON compliance_audit (venue_id, recorded_at DESC);

-- GDPR consent records
CREATE TABLE IF NOT EXISTS gdpr_consents (
  consent_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendee_id_hash TEXT NOT NULL UNIQUE,
  venue_id        TEXT NOT NULL,
  consent_given   BOOLEAN NOT NULL DEFAULT FALSE,
  consent_at      TIMESTAMPTZ,
  withdrawn_at    TIMESTAMPTZ,
  data_deleted_at TIMESTAMPTZ
);
