/**
 * Pre-event sync checklist.
 * Downloads: venue graph, QR ticket JWT, emergency exit routes, venue public key,
 * audio instructions, reward catalog (7 items).
 * Retries every 30s on failure; warns if incomplete 30 min before event.
 * Requirements: 10.1, 10.4
 */
import { apiClient } from '../api/client';
import {
  saveVenueGraph,
  saveEmergencyExits,
  saveTicket,
  getDb,
  VenueGraphEdgeRow,
} from '../storage/db';
import {
  setSyncComplete,
  setVenuePublicKey,
  isSyncComplete,
  getLastSyncAt,
  storage,
} from '../storage/mmkv';

export type SyncStatus =
  | 'idle'
  | 'in_progress'
  | 'complete'
  | 'partial'
  | 'failed';

export interface SyncProgress {
  status: SyncStatus;
  completedSteps: string[];
  failedSteps: string[];
  totalSteps: number;
}

const SYNC_STEPS = [
  'venue_graph',
  'ticket_jwt',
  'emergency_exits',
  'venue_public_key',
  'audio_instructions',
  'reward_catalog',
  'mapbox_tiles',
] as const;

type SyncStep = (typeof SYNC_STEPS)[number];

let retryTimer: ReturnType<typeof setTimeout> | null = null;
const RETRY_INTERVAL_MS = 30_000;
const WARN_BEFORE_EVENT_MS = 30 * 60 * 1000; // 30 minutes

export async function runPreEventSync(
  venueId: string,
  eventId: string,
  attendeeId: string,
  eventStartTime: Date,
  onProgress?: (progress: SyncProgress) => void
): Promise<SyncProgress> {
  const completedSteps: SyncStep[] = [];
  const failedSteps: SyncStep[] = [];

  const report = (): SyncProgress => ({
    status:
      failedSteps.length === 0
        ? 'complete'
        : completedSteps.length > 0
        ? 'partial'
        : 'failed',
    completedSteps: [...completedSteps],
    failedSteps: [...failedSteps],
    totalSteps: SYNC_STEPS.length,
  });

  const attempt = async (step: SyncStep, fn: () => Promise<void>): Promise<void> => {
    try {
      await fn();
      completedSteps.push(step);
    } catch {
      failedSteps.push(step);
    }
    onProgress?.(report());
  };

  // 1. Venue graph
  await attempt('venue_graph', async () => {
    const res = await apiClient.get<{ edges: VenueGraphEdgeRow[] }>(
      `/venues/${venueId}/graph`
    );
    await saveVenueGraph(venueId, res.data.edges);
  });

  // 2. QR ticket JWT
  await attempt('ticket_jwt', async () => {
    const res = await apiClient.get<{
      ticketId: string;
      jwt: string;
      seatSection: string;
      seatRow: string;
      seatNumber: string;
    }>(`/tickets/${attendeeId}/event/${eventId}`);
    await saveTicket({
      ticket_id: res.data.ticketId,
      attendee_id: attendeeId,
      event_id: eventId,
      seat_section: res.data.seatSection,
      seat_row: res.data.seatRow,
      seat_number: res.data.seatNumber,
      jwt: res.data.jwt,
      venue_public_key: null,
    });
  });

  // 3. Emergency exit routes
  await attempt('emergency_exits', async () => {
    const res = await apiClient.get<{
      exits: Array<{
        zoneId: string;
        exitNodeIds: string[];
        instructions: string[];
        estimatedMinutes: number;
      }>;
    }>(`/venues/${venueId}/emergency-exits`);
    await saveEmergencyExits(venueId, res.data.exits);
  });

  // 4. Venue public key (for offline RS256 validation)
  await attempt('venue_public_key', async () => {
    const res = await apiClient.get<{ publicKey: string }>(
      `/venues/${venueId}/public-key`
    );
    setVenuePublicKey(res.data.publicKey);
    // Also update tickets with the public key
    const db = await getDb();
    await db.runAsync(
      'UPDATE tickets SET venue_public_key = ? WHERE event_id = ?',
      [res.data.publicKey, eventId]
    );
  });

  // 5. Pre-generated audio instructions
  await attempt('audio_instructions', async () => {
    const res = await apiClient.get<{ instructions: Record<string, string> }>(
      `/venues/${venueId}/audio-instructions`
    );
    storage.set('sync.audioInstructions', JSON.stringify(res.data.instructions));
    storage.set('sync.audioInstructionsCached', true);
  });

  // 6. Reward catalog (7 items)
  await attempt('reward_catalog', async () => {
    const res = await apiClient.get<{ rewards: unknown[] }>(
      `/rewards/catalog?eventId=${eventId}&limit=7`
    );
    storage.set('sync.rewardCatalog', JSON.stringify(res.data.rewards));
    storage.set('sync.rewardCatalogCached', true);
  });

  // 7. Mapbox offline tile pack (fire-and-forget download trigger)
  await attempt('mapbox_tiles', async () => {
    // Trigger tile pack download via Mapbox SDK
    // In production this would call MapboxOfflineManager.downloadRegion(...)
    // Here we record the intent so the native module can pick it up
    storage.set('sync.mapboxTilePackRequested', true);
    storage.set('sync.mapboxVenueId', venueId);
  });

  const progress = report();
  const allComplete = failedSteps.length === 0;
  setSyncComplete(allComplete);

  // Schedule retry if incomplete
  if (!allComplete) {
    scheduleRetry(venueId, eventId, attendeeId, eventStartTime, onProgress);
  }

  // Warn if incomplete and event is within 30 minutes
  const msUntilEvent = eventStartTime.getTime() - Date.now();
  if (!allComplete && msUntilEvent <= WARN_BEFORE_EVENT_MS) {
    storage.set('sync.incompleteWarning', true);
  }

  return progress;
}

function scheduleRetry(
  venueId: string,
  eventId: string,
  attendeeId: string,
  eventStartTime: Date,
  onProgress?: (progress: SyncProgress) => void
): void {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = setTimeout(async () => {
    if (!isSyncComplete()) {
      await runPreEventSync(venueId, eventId, attendeeId, eventStartTime, onProgress);
    }
  }, RETRY_INTERVAL_MS);
}

export function cancelSyncRetry(): void {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

export function isSyncIncompleteWarning(): boolean {
  return storage.getBoolean('sync.incompleteWarning') ?? false;
}

export function getLastSyncTimestamp(): number | undefined {
  return getLastSyncAt();
}
