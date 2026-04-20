/**
 * Fire-code capacity checker.
 * Validates: Requirements 33.1
 */
import Redis from 'ioredis';

export interface CapacityStatus {
  zoneId: string;
  venueId: string;
  currentOccupancy: number;
  fireCodeLimit: number;
  utilizationPercent: number;
  compliant: boolean;
  alertTriggered: boolean;
}

// Zone fire-code limits (configured per venue — stored in Redis)
export async function getCapacityStatus(
  redis: Redis,
  venueId: string,
  fireLimits: Record<string, number>,
): Promise<CapacityStatus[]> {
  const raw = await redis.hgetall(`heatmap:${venueId}`);
  const statuses: CapacityStatus[] = [];

  for (const [field, value] of Object.entries(raw)) {
    if (!field.startsWith('zone:')) continue;
    const zoneId = field.replace('zone:', '');

    try {
      const snap = JSON.parse(value);
      const currentOccupancy = snap.current_count ?? 0;
      const fireCodeLimit = fireLimits[zoneId] ?? snap.capacity ?? 1000;
      const utilizationPercent = fireCodeLimit > 0 ? currentOccupancy / fireCodeLimit : 0;
      const compliant = currentOccupancy <= fireCodeLimit;

      statuses.push({
        zoneId,
        venueId,
        currentOccupancy,
        fireCodeLimit,
        utilizationPercent: Math.round(utilizationPercent * 100) / 100,
        compliant,
        alertTriggered: !compliant,
      });
    } catch { /* skip malformed */ }
  }

  return statuses;
}
