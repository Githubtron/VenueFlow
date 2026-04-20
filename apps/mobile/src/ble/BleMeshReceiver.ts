/**
 * BLE Mesh Receiver — Mobile App
 *
 * Receives a raw 31-byte BLE advertisement, looks up the full BLEMeshPayload
 * from the local SQLite cache (ble_mesh_payloads), deduplicates by payloadId
 * using the ble_mesh_seen table, and surfaces a local notification.
 *
 * Requirements: 20.2
 */

import * as Notifications from 'expo-notifications';
import { getDb } from '../storage/db';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BLEAlertType = 'evacuation' | 'emergency' | 'zone_alert' | 'general';

export interface BLEMeshPayload {
  payloadId: string;
  alertType: BLEAlertType;
  zoneId: string;
  message: string;
  createdAt: number;
}

// ─── Advertisement decoding ───────────────────────────────────────────────────

const PAYLOAD_ID_BYTES = 16;
const ALERT_TYPE_BYTES = 1;
const ZONE_ID_BYTES    = 14;
const ADVERTISEMENT_SIZE = PAYLOAD_ID_BYTES + ALERT_TYPE_BYTES + ZONE_ID_BYTES; // 31

const ALERT_TYPE_DECODE: Record<number, BLEAlertType> = {
  0x01: 'evacuation',
  0x02: 'emergency',
  0x03: 'zone_alert',
  0x04: 'general',
};

function bytesToUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}

/**
 * Decode a 31-byte BLE advertisement into its fields.
 * Returns null if the buffer is too short or contains an unknown alert type.
 */
function decodeAdvertisement(
  raw: Uint8Array
): { payloadId: string; alertType: BLEAlertType; zoneId: string } | null {
  if (raw.length < ADVERTISEMENT_SIZE) return null;

  const payloadId = bytesToUuid(raw.subarray(0, PAYLOAD_ID_BYTES));

  const typeCode = raw[PAYLOAD_ID_BYTES];
  const alertType = typeCode !== undefined ? ALERT_TYPE_DECODE[typeCode] : undefined;
  if (!alertType) return null;

  const zoneRaw = raw.subarray(PAYLOAD_ID_BYTES + ALERT_TYPE_BYTES, ADVERTISEMENT_SIZE);
  const nullIdx = zoneRaw.indexOf(0);
  const zoneBytes = nullIdx === -1 ? zoneRaw : zoneRaw.subarray(0, nullIdx);
  const zoneId = new TextDecoder().decode(zoneBytes);

  return { payloadId, alertType, zoneId };
}

// ─── Deduplication helpers ────────────────────────────────────────────────────

async function hasSeenPayload(payloadId: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ payload_id: string }>(
    'SELECT payload_id FROM ble_mesh_seen WHERE payload_id = ?',
    [payloadId]
  );
  return row !== null;
}

async function markPayloadSeen(payloadId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR IGNORE INTO ble_mesh_seen (payload_id) VALUES (?)',
    [payloadId]
  );
}

// ─── Payload cache lookup ─────────────────────────────────────────────────────

async function lookupCachedPayload(payloadId: string): Promise<BLEMeshPayload | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    payload_id: string;
    alert_type: string;
    zone_id: string;
    message: string;
    created_at: number;
  }>(
    'SELECT payload_id, alert_type, zone_id, message, created_at FROM ble_mesh_payloads WHERE payload_id = ?',
    [payloadId]
  );
  if (!row) return null;
  return {
    payloadId: row.payload_id,
    alertType: row.alert_type as BLEAlertType,
    zoneId: row.zone_id,
    message: row.message,
    createdAt: row.created_at,
  };
}

// ─── Local notification ───────────────────────────────────────────────────────

async function showLocalNotification(payload: BLEMeshPayload): Promise<void> {
  const titles: Record<BLEAlertType, string> = {
    evacuation: '🚨 EVACUATE NOW',
    emergency:  '⚠️ Emergency Alert',
    zone_alert: '⚠️ Zone Alert',
    general:    'Venue Alert',
  };

  await Notifications.scheduleNotificationAsync({
    content: {
      title: titles[payload.alertType],
      body: payload.message || `Alert for zone ${payload.zoneId}`,
      data: {
        payloadId: payload.payloadId,
        alertType: payload.alertType,
        zoneId: payload.zoneId,
      },
      priority:
        payload.alertType === 'evacuation' || payload.alertType === 'emergency'
          ? Notifications.AndroidNotificationPriority.MAX
          : Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: null, // deliver immediately
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Process a raw 31-byte BLE advertisement received from the mesh network.
 *
 * Steps:
 *  1. Decode the advertisement to extract payloadId, alertType, zoneId.
 *  2. Deduplicate: if payloadId already seen, do nothing.
 *  3. Look up the full BLEMeshPayload from the local SQLite cache.
 *  4. Mark payloadId as seen.
 *  5. Surface a local notification (using cached payload if available,
 *     falling back to decoded fields if not yet cached).
 */
export async function processBLEAdvertisement(rawBytes: Uint8Array): Promise<void> {
  const decoded = decodeAdvertisement(rawBytes);
  if (!decoded) return; // malformed advertisement — silently ignore

  const { payloadId, alertType, zoneId } = decoded;

  // Deduplicate — surface exactly one notification per unique payloadId
  if (await hasSeenPayload(payloadId)) return;

  // Look up full payload from cache (may be null if not yet synced)
  const cached = await lookupCachedPayload(payloadId);

  // Mark seen before surfacing to prevent races on rapid re-receipt
  await markPayloadSeen(payloadId);

  const payload: BLEMeshPayload = cached ?? {
    payloadId,
    alertType,
    zoneId,
    message: '',
    createdAt: Math.floor(Date.now() / 1000),
  };

  await showLocalNotification(payload);
}

// ─── Cache management (called during pre-event sync) ─────────────────────────

/**
 * Store a full BLEMeshPayload in the local SQLite cache so it can be
 * retrieved when the compact advertisement is received offline.
 */
export async function cacheBLEMeshPayload(payload: BLEMeshPayload): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO ble_mesh_payloads
       (payload_id, alert_type, zone_id, message, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [payload.payloadId, payload.alertType, payload.zoneId, payload.message, payload.createdAt]
  );
}
