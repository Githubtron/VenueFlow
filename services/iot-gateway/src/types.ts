export interface SensorFailureEvent {
  sensorId: string;
  zoneId: string;
  venueId: string;
  lastSeenAt: string; // ISO 8601
  detectedAt: string; // ISO 8601
}
