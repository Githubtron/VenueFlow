import { validateSensorReading } from '../validation/schema';

const validPayload = {
  sensorId: 'sensor-1',
  zoneId: 'zone-a',
  venueId: 'venue-1',
  count: 42,
  timestamp: '2024-01-15T10:30:00.000Z',
  sensorType: 'pressure' as const,
};

describe('validateSensorReading', () => {
  it('returns a SensorReading for a valid payload', () => {
    const result = validateSensorReading(validPayload);
    expect(result).not.toBeNull();
    expect(result).toEqual(validPayload);
  });

  it('returns null when sensorId is missing', () => {
    const { sensorId: _, ...rest } = validPayload;
    expect(validateSensorReading(rest)).toBeNull();
  });

  it('returns null when sensorId is empty string', () => {
    expect(validateSensorReading({ ...validPayload, sensorId: '' })).toBeNull();
  });

  it('returns null when count is missing', () => {
    const { count: _, ...rest } = validPayload;
    expect(validateSensorReading(rest)).toBeNull();
  });

  it('returns null when count is negative', () => {
    expect(validateSensorReading({ ...validPayload, count: -1 })).toBeNull();
  });

  it('returns null when count is not a number', () => {
    expect(validateSensorReading({ ...validPayload, count: '42' })).toBeNull();
  });

  it('returns null when count is NaN', () => {
    expect(validateSensorReading({ ...validPayload, count: NaN })).toBeNull();
  });

  it('returns null for an invalid sensorType', () => {
    expect(validateSensorReading({ ...validPayload, sensorType: 'ultrasonic' })).toBeNull();
  });

  it('accepts all valid sensorType values', () => {
    for (const sensorType of ['pressure', 'ir', 'ble'] as const) {
      expect(validateSensorReading({ ...validPayload, sensorType })).not.toBeNull();
    }
  });

  it('returns null when timestamp is missing', () => {
    const { timestamp: _, ...rest } = validPayload;
    expect(validateSensorReading(rest)).toBeNull();
  });

  it('returns null when timestamp is not a valid ISO 8601 string', () => {
    expect(validateSensorReading({ ...validPayload, timestamp: 'not-a-date' })).toBeNull();
  });

  it('returns null for a non-object payload', () => {
    expect(validateSensorReading(null)).toBeNull();
    expect(validateSensorReading('string')).toBeNull();
    expect(validateSensorReading(42)).toBeNull();
  });

  it('accepts count of 0', () => {
    const result = validateSensorReading({ ...validPayload, count: 0 });
    expect(result).not.toBeNull();
    expect(result?.count).toBe(0);
  });
});
