/**
 * Offline evacuation route cache.
 * Pre-loaded emergency exit routes keyed by zoneId.
 * Validates: Requirements 5.6, 10.5
 */

export interface OfflineExitRoute {
  zoneId: string;
  venueId: string;
  exitNodeIds: string[];
  instructions: string[];
  estimatedMinutes: number;
  lastUpdated: string;
}

// In-memory store — populated by admin at event setup
// In production: loaded from S3 and cached in Redis
const routeCache = new Map<string, OfflineExitRoute>();

export function registerExitRoute(route: OfflineExitRoute): void {
  routeCache.set(`${route.venueId}:${route.zoneId}`, route);
}

export function getExitRoute(venueId: string, zoneId: string): OfflineExitRoute | null {
  return routeCache.get(`${venueId}:${zoneId}`) ?? null;
}

export function getAllExitRoutes(venueId: string): OfflineExitRoute[] {
  const routes: OfflineExitRoute[] = [];
  for (const [key, route] of routeCache.entries()) {
    if (key.startsWith(`${venueId}:`)) routes.push(route);
  }
  return routes;
}

/** Seed default exit routes for a venue (called at event setup). */
export function seedDefaultRoutes(venueId: string, zoneIds: string[]): void {
  for (const zoneId of zoneIds) {
    if (!routeCache.has(`${venueId}:${zoneId}`)) {
      registerExitRoute({
        zoneId,
        venueId,
        exitNodeIds: [`exit-${zoneId}-1`, `exit-${zoneId}-2`],
        instructions: [
          `From ${zoneId}, proceed to the nearest marked exit`,
          'Follow green emergency exit signs',
          'Do not use elevators during evacuation',
          'Proceed to the assembly point outside',
        ],
        estimatedMinutes: 5,
        lastUpdated: new Date().toISOString(),
      });
    }
  }
}
