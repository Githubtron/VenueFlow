/**
 * Notification dispatcher — routes notifications to the correct delivery channels.
 * Handles WebSocket fan-out, FCM/APNs stubs, SMS fallback timer.
 */
import Redis from 'ioredis';
import {
  NotificationPayload,
  DeliveryResult,
  selectChannels,
  shouldScheduleSMSFallback,
  SMS_FALLBACK_TIMEOUT_MS,
} from './channels';

export interface SMSProvider {
  send(attendeeId: string, message: string): Promise<void>;
}

export class NotificationDispatcher {
  private readonly redis: Redis;
  private readonly smsProvider?: SMSProvider;
  private readonly pendingSMSTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(redisUrl: string, smsProvider?: SMSProvider) {
    this.redis = new Redis(redisUrl);
    this.smsProvider = smsProvider;
  }

  async dispatch(payload: NotificationPayload): Promise<DeliveryResult> {
    const channels = selectChannels(payload);
    let delivered = false;

    // WebSocket delivery via Redis pub/sub
    if (channels.includes('websocket')) {
      await this.redis.publish(payload.channel, JSON.stringify({
        type: payload.type,
        message: payload.message,
        data: payload.data,
        priority: payload.priority,
      }));
      delivered = true;
    }

    // FCM/APNs — stub (real implementation requires Firebase Admin SDK / APNs certs)
    if (channels.includes('fcm') || channels.includes('apns')) {
      // In production: call FCM/APNs APIs here
      // For now: log intent
      console.log(`[notification-service] Push notification queued for attendee ${payload.attendeeId} via FCM/APNs`);
    }

    // SMS fallback — schedule if FCM/APNs in channels and SMS provider available
    const smsScheduled = shouldScheduleSMSFallback(channels) && !!this.smsProvider;
    if (smsScheduled && this.smsProvider) {
      const timerId = setTimeout(async () => {
        this.pendingSMSTimers.delete(payload.attendeeId);
        try {
          await this.smsProvider!.send(payload.attendeeId, payload.message);
          console.log(`[notification-service] SMS fallback sent to ${payload.attendeeId}`);
        } catch (err) {
          console.error(`[notification-service] SMS fallback failed for ${payload.attendeeId}:`, err);
        }
      }, SMS_FALLBACK_TIMEOUT_MS);

      this.pendingSMSTimers.set(payload.attendeeId, timerId);
    }

    return { attendeeId: payload.attendeeId, channels, delivered, smsScheduled };
  }

  /** Call when FCM/APNs delivery is confirmed — cancels pending SMS fallback. */
  acknowledgePushDelivery(attendeeId: string): void {
    const timer = this.pendingSMSTimers.get(attendeeId);
    if (timer) {
      clearTimeout(timer);
      this.pendingSMSTimers.delete(attendeeId);
    }
  }

  /** Broadcast to all attendees in a zone (emergency use). */
  async broadcastToZone(
    venueId: string,
    message: string,
    type: NotificationPayload['type'] = 'emergency',
  ): Promise<void> {
    const channel = `emergency:${venueId}`;
    await this.redis.publish(channel, JSON.stringify({ type, message, venueId }));
  }

  disconnect(): void {
    this.redis.disconnect();
    for (const timer of this.pendingSMSTimers.values()) clearTimeout(timer);
    this.pendingSMSTimers.clear();
  }
}
