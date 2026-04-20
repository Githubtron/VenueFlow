// Auth Service — local types
// Re-exports shared types and adds auth-specific extensions.

export type { User } from '@venueflow/shared-types';

export type Role = 'ATTENDEE' | 'STAFF' | 'ADMIN' | 'EMERGENCY';

/** Actions that can be checked against the RBAC permission matrix. */
export type Action =
  | 'view_heatmap'
  | 'view_analytics'
  | 'view_congestion_trends'
  | 'view_incident_analytics'
  | 'resolve_incidents'
  | 'view_threat_alerts'
  | 'manage_venue'
  | 'manage_users'
  | 'trigger_evacuation'
  | 'trigger_pa'
  | 'view_staff_locations'
  | 'manage_staff'
  | 'view_own_profile'
  | 'delete_own_account'
  | 'view_vendor_analytics'
  | 'manage_sponsors';

/** JWT access token payload (RS256). */
export interface AccessTokenPayload {
  sub: string;   // userId
  email: string; // anonymized email stored in DB
  role: Role;
  venueId?: string;
  iat?: number;
  exp?: number;
}

/** Refresh token payload stored in DB. */
export interface RefreshTokenRecord {
  tokenId: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revoked: boolean;
}

/** Row shape returned from the users table. */
export interface UserRow {
  user_id: string;
  email_hash: string;
  email_anon: string;
  password_hash: string;
  role: Role;
  venue_id: string | null;
  location_consent_given: boolean;
  created_at: Date;
  deleted_at: Date | null;
}
