/**
 * BLE Mesh Alert Delivery — Notification Service
 *
 * Constructs and encodes 31-byte BLE advertisement payloads for offline
 * alert delivery when internet connectivity is severed in a venue zone.
 *
 * Payload layout (31 bytes total):
 *   Bytes  0–15  : payloadId  (UUID v4, 16 bytes binary)
 *   Byte   16    : alertType  (1 byte, enum-encoded)
 *   Bytes 17–30  : zoneId     (14 bytes, UTF-8, null-padded)
 *
 * Requirements: 20.2
 */

import { randomBytes } from 'crypto';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BLEAlertType =
  | 'evacuation'
  | 'emergency'
  | 'zone_alert'
  | 'general';

export interface BLEMeshPayload {
  /** UUID v4 string — used as deduplication key on receiver side */
  payloadId: string;
  alertType: BLEAlertType;
  zoneId: string;
  /** Full human-readable message stored in SQLite cache by payloadId */
  message: string;
  /** Unix timestamp (seconds) when payload was created */
  createdAt: number;
}

// ─── Alert type encoding (1 byte) ────────────────────────────────────────────

const ALERT_TYPE_ENCODE: Record<BLEAlertType, number> = {
  evacuation: 0x01,
  emergency:  0x02,
  zone_alert: 0x03,
  general:    0x04,
};

const ALERT_TYPE_DECODE: Record<number, BLEAlertType> = Object.fromEntries(
  Object.entries(ALERT_TYPE_ENCODE).map(([k, v]) => [v, k as BLEAlertType])
);

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYLOAD_ID_BYTES = 16;
const ALERT_TYPE_BYTES = 1;
const ZONE_ID_BYTES    = 14;
const ADVERTISEMENT_SIZE = PAYLOAD_ID_BYTES + ALERT_TYPE_BYTES + ZONE_ID_BYTES; // 31

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a UUID v4 string (with hyphens) to a 16-byte Buffer. */
function uuidToBytes(uuid: string): Buffer {
  const hex = uuid.replace(/-/g, '');
  if (hex.length !== 32) {
    throw new Error(`Invalid UUID: ${uuid}`);
  }
  return Buffer.from(hex, 'hex');
}

/** Convert a 16-byte Buffer back to a UUID v4 string. */
function bytesToUuid(buf: Buffer): string {
  const hex = buf.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}

/** Generate a UUID v4 string using crypto.randomBytes. */
function generateUuidV4(): string {
  const bytes = randomBytes(16);
  // Set version bits (4) and variant bits (RFC 4122)
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  return bytesToUuid(bytes);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Build a BLEMeshPayload for the given alert type and zone.
 * The full payload (including message) should be stored in SQLite by payloadId
 * so receivers can look it up after parsing the compact advertisement.
 */
export function buildBLEMeshPayload(
  alertType: BLEAlertType,
  zoneId: string,
  message = ''
): BLEMeshPayload {
  if (!zoneId || zoneId.trim().length === 0) {
    throw new Error('zoneId must be a non-empty string');
  }
  if (!(alertType in ALERT_TYPE_ENCODE)) {
    throw new Error(`Unknown alertType: ${alertType}`);
  }

  return {
    payloadId: generateUuidV4(),
    alertType,
    zoneId: zoneId.trim(),
    message,
    createdAt: Math.floor(Date.now() / 1000),
  };
}

/**
 * Encode a BLEMeshPayload into a 31-byte BLE advertisement Buffer.
 *
 * Layout:
 *   [0..15]  payloadId (16 bytes, UUID binary)
 *   [16]     alertType (1 byte)
 *   [17..30] zoneId    (14 bytes, UTF-8, null-padded / truncated)
 */
export function encodeBLEAdvertisement(payload: BLEMeshPayload): Buffer {
  const buf = Buffer.alloc(ADVERTISEMENT_SIZE, 0);

  // payloadId → bytes 0–15
  const idBytes = uuidToBytes(payload.payloadId);
  idBytes.copy(buf, 0, 0, PAYLOAD_ID_BYTES);

  // alertType → byte 16
  const typeCode = ALERT_TYPE_ENCODE[payload.alertType];
  if (typeCode === undefined) {
    throw new Error(`Cannot encode unknown alertType: ${payload.alertType}`);
  }
  buf.writeUInt8(typeCode, PAYLOAD_ID_BYTES);

  // zoneId → bytes 17–30 (UTF-8, truncated to 14 bytes, null-padded)
  const zoneBytes = Buffer.from(payload.zoneId, 'utf8');
  zoneBytes.copy(buf, PAYLOAD_ID_BYTES + ALERT_TYPE_BYTES, 0, ZONE_ID_BYTES);

  return buf;
}

/**
 * Decode a 31-byte BLE advertisement Buffer back into its constituent fields.
 * Returns null if the buffer is malformed.
 */
export function decodeBLEAdvertisement(
  raw: Buffer
): { payloadId: string; alertType: BLEAlertType; zoneId: string } | null {
  if (raw.length < ADVERTISEMENT_SIZE) return null;

  const idBuf = raw.subarray(0, PAYLOAD_ID_BYTES);
  const payloadId = bytesToUuid(Buffer.from(idBuf));

  const typeCode = raw.readUInt8(PAYLOAD_ID_BYTES);
  const alertType = ALERT_TYPE_DECODE[typeCode];
  if (!alertType) return null;

  const zoneRaw = raw.subarray(PAYLOAD_ID_BYTES + ALERT_TYPE_BYTES, ADVERTISEMENT_SIZE);
  // Trim null bytes from padding
  const nullIdx = zoneRaw.indexOf(0);
  const zoneId = zoneRaw.subarray(0, nullIdx === -1 ? ZONE_ID_BYTES : nullIdx).toString('utf8');

  return { payloadId, alertType, zoneId };
}
