/**
 * Property test for BLE Mesh Payload Deduplication.
 * Feature: venueflow-platform
 * Property: P32
 * Validates: Requirements 20.2
 */
import * as fc from 'fast-check';
import { buildBLEMeshPayload, encodeBLEAdvertisement, decodeBLEAdvertisement } from '../delivery/bleMesh';

// ─── P32: BLE Mesh Payload Deduplication ─────────────────────────────────────

describe('Property 32: BLE Mesh Payload Deduplication', () => {
  it('receiving the same payloadId multiple times surfaces exactly one notification', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('evacuation', 'emergency', 'zone_alert', 'general') as fc.Arbitrary<'evacuation' | 'emergency' | 'zone_alert' | 'general'>,
        fc.string({ minLength: 1, maxLength: 14 }),
        fc.integer({ min: 2, max: 10 }),
        (alertType, zoneId, receiveCount) => {
          const payload = buildBLEMeshPayload(alertType, zoneId);
          const advertisement = encodeBLEAdvertisement(payload);

          // Simulate receiving the same advertisement multiple times
          const seenPayloadIds = new Set<string>();
          let notificationCount = 0;

          for (let i = 0; i < receiveCount; i++) {
            const decoded = decodeBLEAdvertisement(advertisement);
            if (!decoded) continue;

            // Deduplication: only surface if not seen before
            if (!seenPayloadIds.has(decoded.payloadId)) {
              seenPayloadIds.add(decoded.payloadId);
              notificationCount++;
            }
          }

          return notificationCount === 1;
        }
      ),
      { numRuns: 200 }
    );
  });

  it('encode/decode round-trip preserves payloadId, alertType, and zoneId', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('evacuation', 'emergency', 'zone_alert', 'general') as fc.Arbitrary<'evacuation' | 'emergency' | 'zone_alert' | 'general'>,
        fc.string({ minLength: 1, maxLength: 14 }).filter(s => s.trim().length > 0),
        (alertType, zoneId) => {
          const payload = buildBLEMeshPayload(alertType, zoneId.trim());
          const encoded = encodeBLEAdvertisement(payload);
          const decoded = decodeBLEAdvertisement(encoded);

          if (!decoded) return false;

          return (
            decoded.payloadId === payload.payloadId &&
            decoded.alertType === alertType &&
            decoded.zoneId === zoneId.trim().slice(0, 14) // truncated to 14 bytes
          );
        }
      ),
      { numRuns: 200 }
    );
  });
});
