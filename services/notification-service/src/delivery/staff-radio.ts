/**
 * Staff radio bridge — broadcasts plain-text messages to all STAFF-role
 * WebSocket connections for a venue.
 * Validates: Requirements 32.4
 */
import Redis from 'ioredis';

export interface StaffRadioMessage {
  venueId: string;
  message: string;
  senderStaffId: string;
  timestamp: string; // ISO 8601
}

export class StaffRadioBridge {
  private readonly redis: Redis;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
  }

  /** Broadcast a staff radio message to all STAFF connections for a venue. */
  async broadcast(venueId: string, message: string, senderStaffId: string): Promise<void> {
    const payload: StaffRadioMessage = {
      venueId,
      message,
      senderStaffId,
      timestamp: new Date().toISOString(),
    };
    await this.redis.publish(`staff-radio:${venueId}`, JSON.stringify(payload));
  }

  disconnect(): void {
    this.redis.disconnect();
  }
}
