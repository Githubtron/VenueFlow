/**
 * AI incident prioritization engine.
 * Assigns priority score 1–5 based on incident type, zone density, and duplicate signals.
 * Validates: Requirements 23.2
 */

export type IncidentType = 'medical' | 'safety' | 'infrastructure' | 'suspicious' | 'other';

// Base priority by type (medical always highest)
const TYPE_BASE_PRIORITY: Record<IncidentType, number> = {
  medical: 5,
  safety: 4,
  suspicious: 3,
  infrastructure: 2,
  other: 1,
};

// Keywords that boost priority
const HIGH_PRIORITY_KEYWORDS = ['unconscious', 'fire', 'weapon', 'stampede', 'collapse', 'bleeding', 'attack', 'bomb'];
const MEDIUM_PRIORITY_KEYWORDS = ['fight', 'injury', 'stuck', 'smoke', 'crowd', 'pushing'];

/**
 * Compute AI priority score for an incident.
 * Returns 1–5 (5 = highest priority).
 */
export function computePriorityScore(
  type: IncidentType,
  description: string,
  zoneDensityPercent: number,
  duplicateCount: number,
): number {
  let score = TYPE_BASE_PRIORITY[type];
  const lowerDesc = description.toLowerCase();

  // Keyword boost
  if (HIGH_PRIORITY_KEYWORDS.some((kw) => lowerDesc.includes(kw))) {
    score = Math.min(score + 1, 5);
  } else if (MEDIUM_PRIORITY_KEYWORDS.some((kw) => lowerDesc.includes(kw))) {
    score = Math.min(score + 0.5, 5);
  }

  // High density zone boost
  if (zoneDensityPercent > 0.8) score = Math.min(score + 1, 5);
  else if (zoneDensityPercent > 0.6) score = Math.min(score + 0.5, 5);

  // Duplicate signal boost (multiple reports of same incident)
  if (duplicateCount >= 3) score = Math.min(score + 1, 5);
  else if (duplicateCount >= 2) score = Math.min(score + 0.5, 5);

  return Math.round(Math.min(score, 5));
}
