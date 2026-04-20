/**
 * Unit + Property tests for RBAC middleware.
 *
 * Property 16: Role-Based Access Control
 * Validates: Requirements 6.5
 *
 * Feature: venueflow-platform, Property 16: Role-Based Access Control
 */
import * as fc from 'fast-check';
import { checkPermission, PERMISSION_MATRIX } from './rbac';
import { Role, Action } from '../types';

const ALL_ROLES: Role[] = ['ATTENDEE', 'STAFF', 'ADMIN', 'EMERGENCY'];

// All actions defined in the permission matrix (union of all sets)
const ALL_ACTIONS: Action[] = Array.from(
  new Set(ALL_ROLES.flatMap((r) => Array.from(PERMISSION_MATRIX[r])))
) as Action[];

// ─── Unit tests ───────────────────────────────────────────────────────────────

describe('checkPermission — unit tests', () => {
  it('ATTENDEE can view own profile', () => {
    expect(checkPermission('ATTENDEE', 'view_own_profile')).toBe(true);
  });

  it('ATTENDEE cannot view heatmap', () => {
    expect(checkPermission('ATTENDEE', 'view_heatmap')).toBe(false);
  });

  it('ATTENDEE cannot manage venue', () => {
    expect(checkPermission('ATTENDEE', 'manage_venue')).toBe(false);
  });

  // STAFF analytics access — explicitly required by design spec
  it('STAFF can view heatmap', () => {
    expect(checkPermission('STAFF', 'view_heatmap')).toBe(true);
  });

  it('STAFF can view analytics', () => {
    expect(checkPermission('STAFF', 'view_analytics')).toBe(true);
  });

  it('STAFF can view congestion trends', () => {
    expect(checkPermission('STAFF', 'view_congestion_trends')).toBe(true);
  });

  it('STAFF can view incident analytics', () => {
    expect(checkPermission('STAFF', 'view_incident_analytics')).toBe(true);
  });

  it('STAFF can resolve incidents', () => {
    expect(checkPermission('STAFF', 'resolve_incidents')).toBe(true);
  });

  it('STAFF can view threat alerts', () => {
    expect(checkPermission('STAFF', 'view_threat_alerts')).toBe(true);
  });

  it('STAFF cannot manage venue', () => {
    expect(checkPermission('STAFF', 'manage_venue')).toBe(false);
  });

  it('STAFF cannot trigger evacuation', () => {
    expect(checkPermission('STAFF', 'trigger_evacuation')).toBe(false);
  });

  it('ADMIN can manage venue', () => {
    expect(checkPermission('ADMIN', 'manage_venue')).toBe(true);
  });

  it('ADMIN can manage users', () => {
    expect(checkPermission('ADMIN', 'manage_users')).toBe(true);
  });

  it('ADMIN cannot trigger evacuation', () => {
    expect(checkPermission('ADMIN', 'trigger_evacuation')).toBe(false);
  });

  it('EMERGENCY can trigger evacuation', () => {
    expect(checkPermission('EMERGENCY', 'trigger_evacuation')).toBe(true);
  });

  it('EMERGENCY can trigger PA', () => {
    expect(checkPermission('EMERGENCY', 'trigger_pa')).toBe(true);
  });

  it('EMERGENCY cannot manage users', () => {
    expect(checkPermission('EMERGENCY', 'manage_users')).toBe(false);
  });

  it('returns false for unknown role', () => {
    expect(checkPermission('UNKNOWN' as Role, 'view_heatmap')).toBe(false);
  });

  it('returns false for unknown action', () => {
    expect(checkPermission('ADMIN', 'fly_to_moon')).toBe(false);
  });
});

// ─── Property tests ───────────────────────────────────────────────────────────

/**
 * Property 16: Role-Based Access Control
 * Validates: Requirements 6.5
 *
 * For any (role, action) pair, checkPermission returns true iff the pair
 * is in the permission matrix. No role may access an action outside its set.
 */
describe('Property 16: Role-Based Access Control', () => {
  it('checkPermission returns true iff pair is in the permission matrix', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_ROLES),
        fc.constantFrom(...ALL_ACTIONS),
        (role: Role, action: Action) => {
          const expected = PERMISSION_MATRIX[role].has(action);
          const actual = checkPermission(role, action);
          return actual === expected;
        },
      ),
      { numRuns: 200 },
    );
  });

  it('no role may access an action outside its authorized set', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_ROLES),
        fc.string({ minLength: 1, maxLength: 30 }),
        (role: Role, randomAction: string) => {
          const inMatrix = PERMISSION_MATRIX[role].has(randomAction as Action);
          const result = checkPermission(role, randomAction);
          // result must equal whether it's in the matrix
          return result === inMatrix;
        },
      ),
      { numRuns: 500 },
    );
  });

  it('STAFF always has access to all analytics actions (explicit lockout guard)', () => {
    const staffAnalyticsActions: Action[] = [
      'view_heatmap',
      'view_analytics',
      'view_congestion_trends',
      'view_incident_analytics',
      'resolve_incidents',
      'view_threat_alerts',
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...staffAnalyticsActions),
        (action: Action) => checkPermission('STAFF', action) === true,
      ),
      { numRuns: 100 },
    );
  });

  it('ATTENDEE never accesses privileged actions', () => {
    const privilegedActions: Action[] = [
      'view_heatmap',
      'view_analytics',
      'manage_venue',
      'manage_users',
      'trigger_evacuation',
      'trigger_pa',
      'view_vendor_analytics',
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...privilegedActions),
        (action: Action) => checkPermission('ATTENDEE', action) === false,
      ),
      { numRuns: 100 },
    );
  });
});
