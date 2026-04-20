/**
 * RBAC middleware for VenueFlow Auth Service.
 *
 * Permission matrix defines which (role, action) pairs are authorized.
 * STAFF has explicit access to analytics views per design spec.
 */
import { Response, NextFunction } from 'express';
import { Role, Action } from '../types';
import { AuthRequest } from './auth';

// ─── Permission Matrix ────────────────────────────────────────────────────────

/**
 * Maps each role to the set of actions it is authorized to perform.
 * This is the single source of truth for RBAC checks.
 */
export const PERMISSION_MATRIX: Record<Role, Set<Action>> = {
  ATTENDEE: new Set<Action>([
    'view_own_profile',
    'delete_own_account',
  ]),

  STAFF: new Set<Action>([
    'view_own_profile',
    'delete_own_account',
    // Analytics views — explicitly granted per design RBAC table
    'view_heatmap',
    'view_analytics',
    'view_congestion_trends',
    'view_incident_analytics',
    'resolve_incidents',
    'view_threat_alerts',
    'view_staff_locations',
  ]),

  ADMIN: new Set<Action>([
    'view_own_profile',
    'delete_own_account',
    'view_heatmap',
    'view_analytics',
    'view_congestion_trends',
    'view_incident_analytics',
    'resolve_incidents',
    'view_threat_alerts',
    'view_staff_locations',
    'manage_staff',
    'manage_venue',
    'manage_users',
    'view_vendor_analytics',
    'manage_sponsors',
  ]),

  EMERGENCY: new Set<Action>([
    'view_own_profile',
    'delete_own_account',
    'view_heatmap',
    'view_threat_alerts',
    'view_staff_locations',
    'trigger_evacuation',
    'trigger_pa',
    'resolve_incidents',
  ]),
};

// ─── Pure helper ─────────────────────────────────────────────────────────────

/**
 * Pure function — returns true iff the given role is authorized for the action.
 * Used directly in property tests (no Express dependency).
 */
export function checkPermission(role: Role, action: string): boolean {
  const allowed = PERMISSION_MATRIX[role];
  if (!allowed) return false;
  return allowed.has(action as Action);
}

// ─── Middleware factory ───────────────────────────────────────────────────────

/**
 * Express middleware factory.
 * Usage: router.get('/admin/thing', requireAuth, requireRole('ADMIN'), handler)
 */
export function requireRole(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Unauthenticated' });
      return;
    }
    if (!roles.includes(user.role)) {
      res.status(403).json({ error: 'Forbidden: insufficient role' });
      return;
    }
    next();
  };
}
