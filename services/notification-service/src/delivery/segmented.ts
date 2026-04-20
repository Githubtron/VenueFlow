/**
 * Segmented push notification targeting.
 * Supports audience segmentation by zone, ticket tier, and language.
 * Validates: Requirements 32.1, 32.2, 32.3
 */

export type SegmentType = 'zone' | 'tier' | 'language';

export interface BroadcastRequest {
  venueId: string;
  segmentType: SegmentType;
  segmentValue: string;
  message: string;
  scheduledAt?: string; // ISO 8601 — if set, schedule for later delivery
  locale?: string;
}

export interface ScheduledAnnouncement {
  id: string;
  venueId: string;
  segmentType: SegmentType;
  segmentValue: string;
  message: string;
  scheduledAt: Date;
  locale?: string;
  dispatched: boolean;
}

/**
 * Resolves the Redis pub/sub channel for a given segment.
 * zone    → zone:{venueId}:{zoneId}
 * tier    → tier:{venueId}:{tierName}
 * language → lang:{venueId}:{locale}
 */
export function resolveSegmentChannel(
  venueId: string,
  segmentType: SegmentType,
  segmentValue: string,
): string {
  switch (segmentType) {
    case 'zone':     return `zone:${venueId}:${segmentValue}`;
    case 'tier':     return `tier:${venueId}:${segmentValue}`;
    case 'language': return `lang:${venueId}:${segmentValue}`;
  }
}

/** Fallback locale when a template is not found for the requested locale. */
export const DEFAULT_LOCALE = 'en';

/**
 * Resolves a message for a given locale.
 * Falls back to English if the locale template is not found.
 */
export function resolveLocaleMessage(
  templates: Record<string, string>,
  locale: string,
): string {
  return templates[locale] ?? templates[DEFAULT_LOCALE] ?? '';
}
