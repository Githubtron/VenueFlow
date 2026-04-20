import { SensorReading } from '@venueflow/shared-types';

const VALID_SENSOR_TYPES = new Set<string>(['pressure', 'ir', 'ble']);

/**
 * Validates a raw payload against the SensorReading schema.
 * Returns a typed SensorReading or null if any field is invalid/missing.
 */
export function validateSensorReading(payload: unknown): SensorReading | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }

  const p = payload as Record<string, unknown>;

  if (typeof p['sensorId'] !== 'string' || p['sensorId'] === '') return null;
  if (typeof p['zoneId'] !== 'string' || p['zoneId'] === '') return null;
  if (typeof p['venueId'] !== 'string' || p['venueId'] === '') return null;

  if (typeof p['count'] !== 'number' || !isFinite(p['count']) || p['count'] < 0) return null;

  if (typeof p['timestamp'] !== 'string' || p['timestamp'] === '') return null;
  // Validate ISO 8601 — must parse to a valid date
  if (isNaN(Date.parse(p['timestamp']))) return null;

  if (typeof p['sensorType'] !== 'string' || !VALID_SENSOR_TYPES.has(p['sensorType'])) return null;

  return {
    sensorId: p['sensorId'] as string,
    zoneId: p['zoneId'] as string,
    venueId: p['venueId'] as string,
    count: p['count'] as number,
    timestamp: p['timestamp'] as string,
    sensorType: p['sensorType'] as SensorReading['sensorType'],
  };
}
