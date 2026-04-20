/**
 * Property test for Anomaly Alert and Deployment Recommendation.
 * Feature: venueflow-platform
 * Property: P15
 * Validates: Requirements 6.3, 6.4
 */
import * as fc from 'fast-check';

interface ZoneDensity {
  zoneId: string;
  densityPercent: number;
  threshold: number;
}

interface AnomalyAlert {
  zoneId: string;
  densityPercent: number;
}

interface DeploymentRecommendation {
  zoneId: string;
  suggestedStaffCount: number;
}

/** Generates anomaly alert when density exceeds threshold */
function generateAnomalyAlert(zone: ZoneDensity): AnomalyAlert | null {
  if (zone.densityPercent > zone.threshold) {
    return { zoneId: zone.zoneId, densityPercent: zone.densityPercent };
  }
  return null;
}

/** Generates deployment recommendation for an anomaly alert */
function generateDeploymentRecommendation(alert: AnomalyAlert): DeploymentRecommendation {
  return {
    zoneId: alert.zoneId,
    suggestedStaffCount: Math.ceil(alert.densityPercent / 20),
  };
}

// ─── P15: Anomaly Alert and Deployment Recommendation ────────────────────────

describe('Property 15: Anomaly Alert and Deployment Recommendation', () => {
  it('generates both anomaly alert and deployment recommendation when density exceeds threshold', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 50 }),
        (zoneId, densityInt, offsetInt) => {
          const density = densityInt;
          const threshold = Math.max(0, density - offsetInt - 1);
          const zone: ZoneDensity = { zoneId, densityPercent: density, threshold };

          const alert = generateAnomalyAlert(zone);

          if (density > threshold) {
            // Must generate alert
            if (!alert) return false;
            if (alert.zoneId !== zoneId) return false;

            // Must generate deployment recommendation referencing the zone
            const recommendation = generateDeploymentRecommendation(alert);
            return recommendation.zoneId === zoneId && recommendation.suggestedStaffCount > 0;
          }

          return true;
        }
      ),
      { numRuns: 300 }
    );
  });

  it('no alert generated when density is at or below threshold', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 0, max: 80 }),
        fc.integer({ min: 0, max: 20 }),
        (zoneId, density, extra) => {
          const threshold = density + extra;
          const zone: ZoneDensity = { zoneId, densityPercent: density, threshold };
          const alert = generateAnomalyAlert(zone);
          return alert === null;
        }
      ),
      { numRuns: 200 }
    );
  });
});
