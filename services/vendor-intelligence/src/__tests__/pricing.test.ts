import { computeDemandScore, generatePricingSuggestions } from '../pricing';

describe('computeDemandScore', () => {
  it('returns 0 for zero wait and zero footfall', () => {
    expect(computeDemandScore(0, 0, 100)).toBe(0);
  });

  it('returns value between 0 and 1', () => {
    const score = computeDemandScore(15, 80, 100);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('higher wait time increases demand score', () => {
    const low = computeDemandScore(5, 50, 100);
    const high = computeDemandScore(25, 50, 100);
    expect(high).toBeGreaterThan(low);
  });
});

describe('generatePricingSuggestions', () => {
  it('returns empty array when demand score is below threshold', () => {
    const suggestions = generatePricingSuggestions('k1', [{ itemName: 'Beer', currentPrice: 5.0 }], 0.3);
    expect(suggestions).toHaveLength(0);
  });

  it('returns suggestions when demand score exceeds threshold', () => {
    const suggestions = generatePricingSuggestions('k1', [{ itemName: 'Beer', currentPrice: 5.0 }], 0.85);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].suggestedPrice).toBeGreaterThan(5.0);
  });

  it('suggested price never exceeds 1.3x current price', () => {
    const suggestions = generatePricingSuggestions('k1', [{ itemName: 'Beer', currentPrice: 10.0 }], 1.0);
    for (const s of suggestions) {
      expect(s.suggestedPrice).toBeLessThanOrEqual(10.0 * 1.3 + 0.01);
    }
  });
});
