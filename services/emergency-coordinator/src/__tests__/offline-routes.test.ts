/**
 * Tests for offline evacuation route cache.
 * Validates: Requirements 5.6, 10.5
 */
import { registerExitRoute, getExitRoute, getAllExitRoutes, seedDefaultRoutes } from '../offline-routes';

describe('offline exit routes', () => {
  it('registers and retrieves a route by venueId + zoneId', () => {
    registerExitRoute({
      zoneId: 'zone-a', venueId: 'venue-1',
      exitNodeIds: ['exit-1'], instructions: ['Go to exit 1'],
      estimatedMinutes: 3, lastUpdated: new Date().toISOString(),
    });
    const route = getExitRoute('venue-1', 'zone-a');
    expect(route).not.toBeNull();
    expect(route!.zoneId).toBe('zone-a');
    expect(route!.exitNodeIds).toContain('exit-1');
  });

  it('returns null for unknown zone', () => {
    expect(getExitRoute('venue-1', 'zone-unknown')).toBeNull();
  });

  it('getAllExitRoutes returns only routes for the specified venue', () => {
    registerExitRoute({ zoneId: 'zone-x', venueId: 'venue-2', exitNodeIds: [], instructions: [], estimatedMinutes: 2, lastUpdated: new Date().toISOString() });
    const routes = getAllExitRoutes('venue-2');
    expect(routes.every((r) => r.venueId === 'venue-2')).toBe(true);
  });

  it('seedDefaultRoutes creates routes for all provided zones', () => {
    seedDefaultRoutes('venue-seed', ['zone-1', 'zone-2', 'zone-3']);
    expect(getExitRoute('venue-seed', 'zone-1')).not.toBeNull();
    expect(getExitRoute('venue-seed', 'zone-2')).not.toBeNull();
    expect(getExitRoute('venue-seed', 'zone-3')).not.toBeNull();
  });

  it('seeded routes have non-empty instructions', () => {
    seedDefaultRoutes('venue-instr', ['zone-a']);
    const route = getExitRoute('venue-instr', 'zone-a');
    expect(route!.instructions.length).toBeGreaterThan(0);
  });
});
