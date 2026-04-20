/**
 * MMKV instance and typed accessors for fast key-value state.
 * Stores: current zone state, user preferences, auth tokens, sync metadata.
 * Requirements: 10.1, 10.3
 */
import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({ id: 'venueflow-storage' });

// ─── Auth Tokens ──────────────────────────────────────────────────────────────

const KEYS = {
  ACCESS_TOKEN: 'auth.accessToken',
  REFRESH_TOKEN: 'auth.refreshToken',
  USER_ID: 'auth.userId',
  USER_EMAIL: 'auth.userEmail',
  USER_ROLE: 'auth.userRole',

  // Location consent
  LOCATION_CONSENT: 'prefs.locationConsent',

  // Current zone / venue context
  CURRENT_ZONE_ID: 'state.currentZoneId',
  CURRENT_VENUE_ID: 'state.currentVenueId',
  CURRENT_EVENT_ID: 'state.currentEventId',

  // Pre-event sync metadata
  LAST_SYNC_AT: 'sync.lastSyncAt',
  SYNC_COMPLETE: 'sync.complete',
  VENUE_PUBLIC_KEY: 'sync.venuePublicKey',
  AUDIO_INSTRUCTIONS_CACHED: 'sync.audioInstructionsCached',
  REWARD_CATALOG_CACHED: 'sync.rewardCatalogCached',

  // User preferences
  ACCESSIBILITY_MODE: 'prefs.accessibilityMode',
  PREFERRED_LANGUAGE: 'prefs.language',

  // Points balance (cached)
  POINTS_BALANCE: 'rewards.pointsBalance',
} as const;

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function setTokens(accessToken: string, refreshToken: string): void {
  storage.set(KEYS.ACCESS_TOKEN, accessToken);
  storage.set(KEYS.REFRESH_TOKEN, refreshToken);
}

export function getAccessToken(): string | undefined {
  return storage.getString(KEYS.ACCESS_TOKEN);
}

export function getRefreshToken(): string | undefined {
  return storage.getString(KEYS.REFRESH_TOKEN);
}

export function clearTokens(): void {
  storage.delete(KEYS.ACCESS_TOKEN);
  storage.delete(KEYS.REFRESH_TOKEN);
}

export function setUserInfo(userId: string, email: string, role: string): void {
  storage.set(KEYS.USER_ID, userId);
  storage.set(KEYS.USER_EMAIL, email);
  storage.set(KEYS.USER_ROLE, role);
}

export function getUserId(): string | undefined {
  return storage.getString(KEYS.USER_ID);
}

export function getUserEmail(): string | undefined {
  return storage.getString(KEYS.USER_EMAIL);
}

export function getUserRole(): string | undefined {
  return storage.getString(KEYS.USER_ROLE);
}

// ─── Location Consent ─────────────────────────────────────────────────────────

export function setLocationConsent(granted: boolean): void {
  storage.set(KEYS.LOCATION_CONSENT, granted);
}

export function getLocationConsent(): boolean {
  return storage.getBoolean(KEYS.LOCATION_CONSENT) ?? false;
}

// ─── Current Zone / Venue State ───────────────────────────────────────────────

export function setCurrentZone(zoneId: string): void {
  storage.set(KEYS.CURRENT_ZONE_ID, zoneId);
}

export function getCurrentZoneId(): string | undefined {
  return storage.getString(KEYS.CURRENT_ZONE_ID);
}

export function setCurrentVenue(venueId: string): void {
  storage.set(KEYS.CURRENT_VENUE_ID, venueId);
}

export function getCurrentVenueId(): string | undefined {
  return storage.getString(KEYS.CURRENT_VENUE_ID);
}

export function setCurrentEvent(eventId: string): void {
  storage.set(KEYS.CURRENT_EVENT_ID, eventId);
}

export function getCurrentEventId(): string | undefined {
  return storage.getString(KEYS.CURRENT_EVENT_ID);
}

// ─── Sync Metadata ────────────────────────────────────────────────────────────

export function setSyncComplete(complete: boolean): void {
  storage.set(KEYS.SYNC_COMPLETE, complete);
  if (complete) {
    storage.set(KEYS.LAST_SYNC_AT, Date.now());
  }
}

export function isSyncComplete(): boolean {
  return storage.getBoolean(KEYS.SYNC_COMPLETE) ?? false;
}

export function getLastSyncAt(): number | undefined {
  return storage.getNumber(KEYS.LAST_SYNC_AT);
}

export function setVenuePublicKey(pem: string): void {
  storage.set(KEYS.VENUE_PUBLIC_KEY, pem);
}

export function getVenuePublicKey(): string | undefined {
  return storage.getString(KEYS.VENUE_PUBLIC_KEY);
}

// ─── User Preferences ─────────────────────────────────────────────────────────

export function setAccessibilityMode(enabled: boolean): void {
  storage.set(KEYS.ACCESSIBILITY_MODE, enabled);
}

export function isAccessibilityMode(): boolean {
  return storage.getBoolean(KEYS.ACCESSIBILITY_MODE) ?? false;
}

export function setPreferredLanguage(lang: string): void {
  storage.set(KEYS.PREFERRED_LANGUAGE, lang);
}

export function getPreferredLanguage(): string {
  return storage.getString(KEYS.PREFERRED_LANGUAGE) ?? 'en';
}

// ─── Rewards ──────────────────────────────────────────────────────────────────

export function setPointsBalance(points: number): void {
  storage.set(KEYS.POINTS_BALANCE, points);
}

export function getPointsBalance(): number {
  return storage.getNumber(KEYS.POINTS_BALANCE) ?? 0;
}
