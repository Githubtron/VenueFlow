-- VenueFlow PostgreSQL initialization
-- Schema migrations are managed per-service; this file handles DB-level setup only.

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
