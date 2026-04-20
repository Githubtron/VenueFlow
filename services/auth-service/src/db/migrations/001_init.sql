-- VenueFlow Auth Service — Initial Schema
-- Migration: 001_init.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  user_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_hash    TEXT NOT NULL UNIQUE,          -- bcrypt hash of lowercased email
  email_anon    TEXT NOT NULL UNIQUE,          -- anonymized display email (or deleted_{userId}@venueflow.invalid)
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'ATTENDEE'
                  CHECK (role IN ('ATTENDEE', 'STAFF', 'ADMIN', 'EMERGENCY')),
  venue_id      UUID,
  location_consent_given BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email_anon ON users (email_anon);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  token_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL UNIQUE,          -- SHA-256 hex of the raw refresh token
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens (token_hash);
