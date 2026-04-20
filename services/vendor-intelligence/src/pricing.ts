/**
 * Dynamic pricing suggestion engine.
 * Validates: Requirements 30.3
 */

export interface PricingSuggestion {
  kioskId: string;
  itemName: string;
  currentPrice: number;
  suggestedPrice: number;
  demandScore: number;
  reason: string;
}

const SURGE_THRESHOLD = 0.7;      // demand score above this triggers surge pricing
const MAX_SURGE_MULTIPLIER = 1.3; // max 30% price increase

/**
 * Compute demand surge score from queue wait time and footfall.
 * Score 0-1: higher = more demand.
 */
export function computeDemandScore(
  predictedWaitMinutes: number,
  footfallCount: number,
  baselineFootfall: number,
): number {
  const waitScore = Math.min(predictedWaitMinutes / 30.0, 1.0);
  const footfallScore = baselineFootfall > 0
    ? Math.min(footfallCount / baselineFootfall, 1.0)
    : 0;
  return Math.round(((waitScore + footfallScore) / 2) * 100) / 100;
}

/**
 * Generate pricing suggestions for a kiosk based on demand score.
 */
export function generatePricingSuggestions(
  kioskId: string,
  items: { itemName: string; currentPrice: number }[],
  demandScore: number,
): PricingSuggestion[] {
  if (demandScore < SURGE_THRESHOLD) return [];

  const multiplier = 1 + (demandScore - SURGE_THRESHOLD) * (MAX_SURGE_MULTIPLIER - 1) / (1 - SURGE_THRESHOLD);

  return items.map((item) => ({
    kioskId,
    itemName: item.itemName,
    currentPrice: item.currentPrice,
    suggestedPrice: Math.round(item.currentPrice * multiplier * 100) / 100,
    demandScore,
    reason: `High demand (score: ${demandScore.toFixed(2)}) — surge pricing suggested`,
  }));
}
