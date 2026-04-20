/**
 * Staff live location tracking.
 * Validates: Requirements 28.1
 */
import { Pool } from 'pg';
import Redis from 'ioredis';

export interface StaffLocation {
  staffId: string;
  venueId: string;
  zoneId?: string;
  latitude?: number;
  longitude?: number;
  updatedAt: string;
}

const LOCATION_TTL_SECONDS = 60;

export async function updateStaffLocation(
  pool: Pool,
  redis: Redis,
  staffId: string,
  venueId: string,
  zoneId: string,
  latitude?: number,
  longitude?: number,
): Promise<void> {
  const now = new Date().toISOString();

  // Persist to PostgreSQL for audit
  await pool.query(
    `INSERT INTO staff_locations (staff_id, venue_id, zone_id, latitude, longitude, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (staff_id) DO UPDATE
     SET venue_id = $2, zone_id = $3, latitude = $4, longitude = $5, updated_at = NOW()`,
    [staffId, venueId, zoneId, latitude ?? null, longitude ?? null],
  );

  // Cache in Redis with TTL for live dashboard
  const payload = JSON.stringify({ staffId, venueId, zoneId, latitude, longitude, updatedAt: now });
  await redis.setex(`staff-location:${staffId}`, LOCATION_TTL_SECONDS, payload);
  await redis.publish(`staff-locations:${venueId}`, payload);
}

export async function getStaffLocations(
  redis: Redis,
  venueId: string,
  staffIds: string[],
): Promise<StaffLocation[]> {
  const results: StaffLocation[] = [];
  for (const staffId of staffIds) {
    const raw = await redis.get(`staff-location:${staffId}`);
    if (raw) {
      try {
        const loc = JSON.parse(raw) as StaffLocation;
        if (loc.venueId === venueId) results.push(loc);
      } catch { /* skip */ }
    }
  }
  return results;
}
