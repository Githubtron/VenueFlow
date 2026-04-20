/**
 * Connectivity detection and sync queue replay.
 * Uses NetInfo to detect connectivity changes.
 * On reconnect, replays sync queue in order: entry events → SOS signals → incident reports.
 * Server-wins for heatmap/routes; client-wins for pending entry events.
 * Requirements: 10.4
 */
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { apiClient } from '../api/client';
import {
  getPendingSyncItems,
  markSyncItemProcessing,
  deleteSyncItem,
  incrementSyncRetry,
  SyncQueueItem,
} from '../storage/db';

export type ConnectivityStatus = 'online' | 'offline' | 'unknown';

type ConnectivityListener = (status: ConnectivityStatus) => void;
type BannerListener = (message: string) => void;

let currentStatus: ConnectivityStatus = 'unknown';
const connectivityListeners = new Set<ConnectivityListener>();
const bannerListeners = new Set<BannerListener>();
let unsubscribe: (() => void) | null = null;
let isSyncing = false;

const SYNC_TIMEOUT_MS = 30_000;

// Priority order for replay
const REPLAY_ORDER: SyncQueueItem['type'][] = [
  'entry_event',
  'sos_signal',
  'incident_report',
];

export function startConnectivityMonitoring(): void {
  if (unsubscribe) return;

  unsubscribe = NetInfo.addEventListener(handleNetInfoChange);

  // Check initial state
  NetInfo.fetch().then(handleNetInfoChange);
}

export function stopConnectivityMonitoring(): void {
  unsubscribe?.();
  unsubscribe = null;
}

export function isOnline(): boolean {
  return currentStatus === 'online';
}

export function addConnectivityListener(listener: ConnectivityListener): () => void {
  connectivityListeners.add(listener);
  return () => connectivityListeners.delete(listener);
}

export function addBannerListener(listener: BannerListener): () => void {
  bannerListeners.add(listener);
  return () => bannerListeners.delete(listener);
}

function handleNetInfoChange(state: NetInfoState): void {
  const newStatus: ConnectivityStatus =
    state.isConnected && state.isInternetReachable !== false ? 'online' : 'offline';

  const wasOffline = currentStatus === 'offline' || currentStatus === 'unknown';
  const isNowOnline = newStatus === 'online';

  currentStatus = newStatus;
  connectivityListeners.forEach((l) => l(newStatus));

  if (wasOffline && isNowOnline) {
    handleReconnect();
  }
}

async function handleReconnect(): Promise<void> {
  if (isSyncing) return;
  isSyncing = true;

  const syncStart = Date.now();

  try {
    await replaySyncQueue();

    const elapsed = Date.now() - syncStart;
    if (elapsed <= SYNC_TIMEOUT_MS) {
      bannerListeners.forEach((l) =>
        l("You're back online — app updated")
      );
    }
  } catch {
    // Sync failed — will retry on next reconnect
  } finally {
    isSyncing = false;
  }
}

async function replaySyncQueue(): Promise<void> {
  const items = await getPendingSyncItems();

  // Sort by priority: entry_event first, then sos_signal, then incident_report
  const sorted = [...items].sort((a, b) => {
    const ai = REPLAY_ORDER.indexOf(a.type);
    const bi = REPLAY_ORDER.indexOf(b.type);
    if (ai !== bi) return ai - bi;
    return a.created_at - b.created_at;
  });

  for (const item of sorted) {
    await replaySyncItem(item);
  }
}

async function replaySyncItem(item: SyncQueueItem): Promise<void> {
  await markSyncItemProcessing(item.id);

  try {
    const payload = JSON.parse(item.payload);

    switch (item.type) {
      case 'entry_event':
        // Client-wins: always submit the local entry event
        await apiClient.post('/entry/events', payload);
        break;

      case 'sos_signal':
        // Submit SOS — idempotent on server side
        await apiClient.post('/emergency/sos', payload);
        break;

      case 'incident_report':
        // Submit incident report
        await apiClient.post('/incidents', payload);
        break;
    }

    await deleteSyncItem(item.id);
  } catch {
    await incrementSyncRetry(item.id);
  }
}

export function getCurrentConnectivityStatus(): ConnectivityStatus {
  return currentStatus;
}
