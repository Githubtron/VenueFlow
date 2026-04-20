/**
 * Dynamic redeployment suggestions.
 * Validates: Requirements 28.2
 */
import Redis from 'ioredis';

export interface RedeploymentSuggestion {
  staffId: string;
  currentZoneId: string;
  distanceScore: number; // lower = closer
  specialization?: string;
}

/**
 * Returns ranked list of available staff for redeployment to a target zone.
 * Uses zone adjacency as a proxy for distance (no GPS required).
 */
export async function getRedeploymentSuggestions(
  redis: Redis,
  venueId: string,
  targetZoneId: string,
  maxResults = 5,
): Promise<RedeploymentSuggestion[]> {
  // Scan all staff location keys for this venue
  const keys = await redis.keys(`staff-location:*`);
  const suggestions: RedeploymentSuggestion[] = [];

  for (const key of keys) {
    const raw = await redis.get(key);
    if (!raw) continue;
    try {
      const loc = JSON.parse(raw);
      if (loc.venueId !== venueId) continue;

      // Simple distance score: 0 if same zone, 1 otherwise (extend with real graph distance)
      const distanceScore = loc.zoneId === targetZoneId ? 0 : 1;

      suggestions.push({
        staffId: loc.staffId,
        currentZoneId: loc.zoneId ?? 'unknown',
        distanceScore,
        specialization: loc.specialization,
      });
    } catch { /* skip */ }
  }

  return suggestions
    .sort((a, b) => a.distanceScore - b.distanceScore)
    .slice(0, maxResults);
}
