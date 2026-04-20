/**
 * Unit tests for RBAC permission matrix.
 * Tests 15.5: RBAC-gated views per role/feature permission matrix.
 * Requirements 6.5
 */
import { describe, it, expect } from 'vitest';
import { hasPermission, getPermittedFeatures, type Role, type DashboardFeature } from './useAuth';

describe('hasPermission', () => {
  // STAFF role
  it('grants STAFF access to heatmap', () => {
    expect(hasPermission('STAFF', 'heatmap')).toBe(true);
  });

  it('grants STAFF access to analytics', () => {
    expect(hasPermission('STAFF', 'analytics')).toBe(true);
  });

  it('grants STAFF access to incidents', () => {
    expect(hasPermission('STAFF', 'incidents')).toBe(true);
  });

  it('grants STAFF access to threat_alerts', () => {
    expect(hasPermission('STAFF', 'threat_alerts')).toBe(true);
  });

  it('denies STAFF access to venue_config', () => {
    expect(hasPermission('STAFF', 'venue_config')).toBe(false);
  });

  it('denies STAFF access to simulation', () => {
    expect(hasPermission('STAFF', 'simulation')).toBe(false);
  });

  it('denies STAFF access to vendor_intelligence', () => {
    expect(hasPermission('STAFF', 'vendor_intelligence')).toBe(false);
  });

  // ADMIN role — full access
  const adminFeatures: DashboardFeature[] = [
    'heatmap', 'analytics', 'incidents', 'threat_alerts',
    'venue_config', 'simulation', 'vendor_intelligence',
    'staff_management', 'event_switcher', 'emergency_panel', 'medical_triage',
  ];

  adminFeatures.forEach((feature) => {
    it(`grants ADMIN access to ${feature}`, () => {
      expect(hasPermission('ADMIN', feature)).toBe(true);
    });
  });

  // EMERGENCY role
  it('grants EMERGENCY access to heatmap', () => {
    expect(hasPermission('EMERGENCY', 'heatmap')).toBe(true);
  });

  it('grants EMERGENCY access to emergency_panel', () => {
    expect(hasPermission('EMERGENCY', 'emergency_panel')).toBe(true);
  });

  it('grants EMERGENCY access to medical_triage', () => {
    expect(hasPermission('EMERGENCY', 'medical_triage')).toBe(true);
  });

  it('denies EMERGENCY access to venue_config', () => {
    expect(hasPermission('EMERGENCY', 'venue_config')).toBe(false);
  });

  it('denies EMERGENCY access to vendor_intelligence', () => {
    expect(hasPermission('EMERGENCY', 'vendor_intelligence')).toBe(false);
  });

  it('denies EMERGENCY access to simulation', () => {
    expect(hasPermission('EMERGENCY', 'simulation')).toBe(false);
  });
});

describe('getPermittedFeatures', () => {
  it('returns exactly 4 features for STAFF', () => {
    const features = getPermittedFeatures('STAFF');
    expect(features).toHaveLength(4);
    expect(features).toContain('heatmap');
    expect(features).toContain('analytics');
    expect(features).toContain('incidents');
    expect(features).toContain('threat_alerts');
  });

  it('returns exactly 3 features for EMERGENCY', () => {
    const features = getPermittedFeatures('EMERGENCY');
    expect(features).toHaveLength(3);
    expect(features).toContain('heatmap');
    expect(features).toContain('emergency_panel');
    expect(features).toContain('medical_triage');
  });

  it('returns all features for ADMIN', () => {
    const features = getPermittedFeatures('ADMIN');
    expect(features.length).toBeGreaterThan(8);
  });

  it('STAFF features are a strict subset of ADMIN features', () => {
    const staffFeatures = getPermittedFeatures('STAFF');
    const adminFeatures = getPermittedFeatures('ADMIN');
    staffFeatures.forEach((f) => {
      expect(adminFeatures).toContain(f);
    });
  });

  it('no role has access to an unknown feature', () => {
    const roles: Role[] = ['STAFF', 'ADMIN', 'EMERGENCY'];
    roles.forEach((role) => {
      expect(hasPermission(role, 'nonexistent_feature' as DashboardFeature)).toBe(false);
    });
  });
});
