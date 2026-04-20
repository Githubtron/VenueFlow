import { createContext, useContext } from 'react';

export type Role = 'STAFF' | 'ADMIN' | 'EMERGENCY';

export interface AuthUser {
  userId: string;
  email: string;
  role: Role;
  venueId: string;
  token: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  login: async () => {},
  logout: () => {},
  isAuthenticated: false,
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

// ─── Permission Matrix ────────────────────────────────────────────────────────
// Requirements 6.5: RBAC per role/feature

export type DashboardFeature =
  | 'heatmap'
  | 'analytics'
  | 'incidents'
  | 'threat_alerts'
  | 'venue_config'
  | 'simulation'
  | 'vendor_intelligence'
  | 'emergency_panel'
  | 'medical_triage'
  | 'staff_management'
  | 'event_switcher';

const PERMISSION_MATRIX: Record<Role, DashboardFeature[]> = {
  STAFF: ['heatmap', 'analytics', 'incidents', 'threat_alerts'],
  ADMIN: [
    'heatmap',
    'analytics',
    'incidents',
    'threat_alerts',
    'venue_config',
    'simulation',
    'vendor_intelligence',
    'staff_management',
    'event_switcher',
    'emergency_panel',
    'medical_triage',
  ],
  EMERGENCY: ['heatmap', 'emergency_panel', 'medical_triage'],
};

export function hasPermission(role: Role, feature: DashboardFeature): boolean {
  return PERMISSION_MATRIX[role]?.includes(feature) ?? false;
}

export function getPermittedFeatures(role: Role): DashboardFeature[] {
  return PERMISSION_MATRIX[role] ?? [];
}
