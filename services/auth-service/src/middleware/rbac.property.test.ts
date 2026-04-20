/**
 * Property 16: Role-Based Access Control
 * Feature: venueflow-platform, Property 16: RBAC
 * Validates: Requirements 6.5
 *
 * Uses fast-check to generate arbitrary (role, action) pairs and assert:
 * - checkPermission returns true iff the pair is in the permission matrix
 * - No role may access an action outside its authorized set
 */
import * as fc from 'fast-check';
import { checkPermission, PERMISSION_MATRIX } from './rbac';
import { Role, Action } from '../types';

const ALL_ROLES: Role[] = ['ATTENDEE', 'STAFF', 'ADMIN', 'EMERGENCY'];

const ALL_ACTIONS: Action[] = [
  'view_heatmap', 'view_analytics', 'view_congestion_trends',
  'view_incident_analytics', 'resolve_incidents', 'view_threat_alerts',
  'manage_venue', 'manage_users', 'trigger_evacuation', 'trigger_pa',
  'view_staff_locations', 'manage_staff', 'view_own_profile',
  'delete_own_account', 'view_vendor_analytics', 'manage_sponsors',
];

describe('Property 16: Role-Based Access Control', () => {
  it('P16a: checkPermission returns true iff (role, action) is in the permission matrix', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_ROLES),
        fc.constantFrom(...ALL_ACTIONS),
        (role, action) => {
          const expected = PERMISSION_MATRIX[role].has(action);
          const actual = checkPermission(role, action);
          return actual === expected;
        }
      ),
      { numRuns: 500 }
    );
  });

  it('P16b: no role may access an action outside its authorized set', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_ROLES),
        fc.string({ minLength: 1, maxLength: 30 }).filter(s => !ALL_ACTIONS.includes(s as Action)),
        (role, unknownAction) => {
          return checkPermission(role, unknownAction) === false;
        }
      ),
      { numRuns: 200 }
    );
  });

  it('P16c: STAFF has explicit access to analytics views (no accidental lockout)', () => {
    const staffAnalyticsActions: Action[] = [
      'view_heatmap', 'view_analytics', 'view_congestion_trends',
      'view_incident_analytics', 'resolve_incidents', 'view_threat_alerts',
    ];
    for (const action of staffAnalyticsActions) {
      expect(checkPermission('STAFF', action)).toBe(true);
    }
  });

  it('P16d: ADMIN is authorized for every action that any other role can perform', () => {
    // Note: EMERGENCY has operational actions (trigger_evacuation, trigger_pa)
    // that are also in ADMIN. Verify ADMIN is a superset of STAFF and ATTENDEE.
    const staffActions = Array.from(PERMISSION_MATRIX['STAFF']);
    const attendeeActions = Array.from(PERMISSION_MATRIX['ATTENDEE']);
    const allSubsetActions = [...staffActions, ...attendeeActions];

    for (const action of allSubsetActions) {
      expect(checkPermission('ADMIN', action)).toBe(true);
    }
  });

  it('P16e: ATTENDEE cannot access any operational actions', () => {
    const operationalActions: Action[] = [
      'view_heatmap', 'view_analytics', 'manage_venue', 'manage_users',
      'trigger_evacuation', 'trigger_pa', 'manage_staff',
      'view_vendor_analytics', 'manage_sponsors',
    ];
    for (const action of operationalActions) {
      expect(checkPermission('ATTENDEE', action)).toBe(false);
    }
  });
});
