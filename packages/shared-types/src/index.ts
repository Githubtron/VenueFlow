// VenueFlow Shared TypeScript Interfaces
// Used across all Node.js/TypeScript services

// ─── Venue & Zone ────────────────────────────────────────────────────────────

export interface Zone {
  zoneId: string;
  venueId: string;
  name: string;
  floorLevel: number;
  polygon: GeoJSONPolygon;
  capacity: number;
  redZoneThreshold: number;
  sensorIds: string[];
  isAccessible: boolean;
  isRestrictedAccess?: boolean; // BACKEND-STRUCTURE.md §14 — restricted zones for threat detection
}

/** Minimal GeoJSON Polygon type (avoids external @types/geojson dependency) */
export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface ZoneDensitySnapshot {
  zoneId: string;
  venueId: string;
  currentCount: number;
  densityPercent: number;
  /** amber = moderate density (was 'yellow' — aligned with FRONTEND-GUIDELINES color tokens) */
  status: 'green' | 'amber' | 'red' | 'unavailable';
  lastUpdated: Date;
  dataAvailable: boolean;
}

// ─── IoT Sensors ─────────────────────────────────────────────────────────────

export interface SensorReading {
  sensorId: string;
  zoneId: string;
  venueId: string;
  count: number;
  timestamp: string; // ISO 8601
  sensorType: 'pressure' | 'ir' | 'ble';
}

// ─── Queue Prediction ─────────────────────────────────────────────────────────

export interface QueuePrediction {
  locationId: string;
  locationType: 'kiosk' | 'restroom' | 'exit';
  venueId: string;
  predictedWaitMinutes: number;
  confidenceScore: number;
  generatedAt: Date;
  modelVersion: string;
}

// ─── Navigation & Wayfinding ──────────────────────────────────────────────────

export interface NavigationRoute {
  routeId: string;
  fromLocation: GeoJSONPoint;
  toDestination: string;
  steps: RouteStep[];
  totalDistanceMeters: number;
  estimatedMinutes: number;
  avoidedZones: string[];
  isAccessible: boolean;
  generatedAt: Date;
}

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  beaconId?: string;
  floorLevel: number;
  audioInstruction?: string;
}

export interface VenueGraphEdge {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  distanceMeters: number;
  floorLevel: number;
  isAccessible: boolean;
  zoneId: string;
}

/** Minimal GeoJSON Point type */
export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

// ─── Entry & Ticketing ────────────────────────────────────────────────────────

export interface AttendeeTicket {
  ticketId: string;
  attendeeId: string;
  eventId: string;
  seatSection: string;
  seatRow: string;
  seatNumber: string;
  qrPayload: string;
  entryRecorded: boolean;
  entryTimestamp?: Date;
  entryGateId?: string;
}

// ─── Users & Auth ─────────────────────────────────────────────────────────────

export interface User {
  userId: string;
  email: string;
  role: 'ATTENDEE' | 'STAFF' | 'ADMIN' | 'EMERGENCY';
  venueId?: string;
  locationConsentGiven: boolean;
  deletedAt?: Date;
}

// ─── Emergency ────────────────────────────────────────────────────────────────

export interface EmergencyEvent {
  eventId: string;
  venueId: string;
  type: 'sos' | 'evacuation' | 'pa_trigger';
  initiatorId: string;
  zoneId: string;
  timestamp: Date;
  status: 'active' | 'resolved';
  metadata: Record<string, unknown>;
}

export interface MedicalSOS {
  sosId: string;
  attendeeId: string;
  venueId: string;
  zoneId: string;
  description: string;
  location: GeoJSONPoint;
  timestamp: Date;
  status: 'pending' | 'dispatched' | 'resolved';
  assignedStaffId?: string;
  dispatchTimestamp?: Date;
  resolvedAt?: Date;
  priority: 1 | 2 | 3 | 4 | 5; // 1 = highest
}

// ─── Events & Sessions ────────────────────────────────────────────────────────

export interface EventSession {
  sessionId: string;
  venueId: string;
  name: string;
  startTime: Date;
  endTime: Date;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  expectedAttendance: number;
  ticketTiers: string[];
}

// ─── Staff & Scheduling ───────────────────────────────────────────────────────

export interface StaffMember {
  staffId: string;
  userId: string;
  venueId: string;
  name: string;
  specialization?: 'first_aid' | 'security' | 'operations' | 'general';
  currentZoneId?: string;
  currentLocation?: GeoJSONPoint;
  locationUpdatedAt?: Date;
  isAvailable: boolean;
}

export interface ShiftSchedule {
  shiftId: string;
  staffId: string;
  venueId: string;
  eventId: string;
  assignedZoneId: string;
  startTime: Date;
  endTime: Date;
  role: 'STAFF' | 'ADMIN' | 'EMERGENCY';
}

// ─── Transport & Parking ──────────────────────────────────────────────────────

export interface ParkingZone {
  parkingZoneId: string;
  venueId: string;
  name: string;
  totalSpaces: number;
  availableSpaces: number;
  location: GeoJSONPolygon;
  lastUpdated: Date;
}

// ─── Vendors & Kiosks ─────────────────────────────────────────────────────────

export interface VendorKiosk {
  kioskId: string;
  venueId: string;
  zoneId: string;
  name: string;
  vendorName: string;
  location: GeoJSONPoint;
  isActive: boolean;
  currentQueueLength: number;
  predictedWaitMinutes?: number;
}

// ─── Sponsors ─────────────────────────────────────────────────────────────────

export interface SponsorZone {
  sponsorZoneId: string;
  venueId: string;
  zoneId: string;
  sponsorName: string;
  boothCoordinates: GeoJSONPolygon;
  activeOffers: SponsorOffer[];
}

export interface SponsorOffer {
  offerId: string;
  sponsorZoneId: string;
  message: string;
  deepLink: string;
  validUntil: Date;
}

// ─── Venue ────────────────────────────────────────────────────────────────────

export interface Venue {
  venueId: string;
  name: string;
  address: string;
  totalCapacity: number;
  floorCount: number;
  timezone: string;
}

// ─── Threat Detection ─────────────────────────────────────────────────────────

export interface ThreatAlert {
  alertId: string;
  venueId: string;
  eventId: string;
  zoneId: string;
  alertType: 'suspicious_movement' | 'unauthorized_access' | 'watchlist_match';
  sessionToken: string;
  anomalyScore: number;
  modelVersion: string;
  detectedAt: Date;
  status: 'active' | 'resolved';
  resolvedBy?: string;
  resolvedAt?: Date;
}

// ─── Incident Reports ─────────────────────────────────────────────────────────

export interface IncidentReport {
  incidentId: string;
  venueId: string;
  eventId: string;
  reporterId: string;
  zoneId: string;
  type: 'medical' | 'safety' | 'infrastructure' | 'suspicious' | 'other';
  description: string;
  photoUrl?: string;
  priorityScore: number; // 1–5, AI-assigned
  status: 'open' | 'assigned' | 'resolved';
  submittedAt: Date;
  resolvedAt?: Date;
  assignedStaffId?: string;
}

// ─── Anomaly Alerts ───────────────────────────────────────────────────────────

export interface AnomalyAlert {
  alertId: string;
  venueId: string;
  zoneId: string;
  eventId: string;
  currentDensityPercent: number;
  threshold: number;
  detectedAt: Date;
  status: 'active' | 'acknowledged' | 'resolved';
  deploymentRecommendation?: string;
}

// ─── ML Model Versioning ──────────────────────────────────────────────────────

export interface MLModelVersion {
  versionId: string;
  serviceId: string; // e.g. 'queue-predictor', 'threat-detection'
  trainedAt: Date;
  trainingEventIds: string[];
  mape: number;
  isActive: boolean;
  s3ModelPath: string;
  promotedAt?: Date;
  promotedBy?: string;
}

// ─── Notification Dispatch ────────────────────────────────────────────────────

/** Internal API contract — published to Redis channel notifications:dispatch */
export interface NotificationDispatch {
  channel: 'websocket' | 'fcm' | 'apns' | 'sms' | 'ble';
  audience: {
    type: 'zone' | 'attendee' | 'staff' | 'broadcast';
    id?: string;
  };
  eventId: string;
  payload: {
    title: string;
    body: string;
    data?: Record<string, string>;
    priority: 'normal' | 'high';
  };
  fallbackChannels?: ('sms' | 'ble')[];
  smsTimeoutMs?: number; // default 30000
}

// ─── Standard Error Response ──────────────────────────────────────────────────

/** BACKEND-STRUCTURE.md §15 — all services return errors in this format */
export interface ErrorResponse {
  error: {
    code: string;       // e.g. "TICKET_INVALID", "ZONE_UNAVAILABLE"
    message: string;
    requestId: string;
    timestamp: string;  // ISO 8601
  };
}

// ─── Gate Recommendation ──────────────────────────────────────────────────────

export interface GateRecommendation {
  gateId: string;
  gateName: string;
  predictedWaitMinutes: number;
  reason: string;
  updatedAt: string; // ISO 8601
}

// ─── Evacuation ───────────────────────────────────────────────────────────────

export interface CachedExitRoute {
  zoneId: string;
  exitNodeIds: string[];
  instructions: string[];
  estimatedMinutes: number;
}

export interface EvacuationStatus {
  evacuationId: string;
  venueId: string;
  eventId: string;
  scope: 'zone' | 'full';
  affectedZones: string[];
  initiatedAt: Date;
  status: 'active' | 'completed';
}
