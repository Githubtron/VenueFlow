/**
 * Notification delivery channel selector.
 *
 * Strategy:
 *   - Foregrounded app  → WebSocket (via Redis pub/sub)
 *   - Background/terminated → FCM (Android) / APNs (iOS)
 *   - Emergency broadcasts → WebSocket + FCM/APNs + SMS simultaneously
 *   - SMS fallback → triggered if FCM/APNs receipt not received within 30s
 */

export type DeliveryChannel = 'websocket' | 'fcm' | 'apns' | 'sms';

export interface NotificationPayload {
  attendeeId: string;
  channel: string;       // Redis pub/sub channel e.g. alerts:{attendeeId}
  type: 'alert' | 'emergency' | 'order_ready' | 'evacuation' | 'general';
  message: string;
  data?: Record<string, unknown>;
  priority: 'normal' | 'high';
}

export interface DeliveryResult {
  attendeeId: string;
  channels: DeliveryChannel[];
  delivered: boolean;
  smsScheduled: boolean;
}

const SMS_FALLBACK_TIMEOUT_MS = 30_000;

/**
 * Selects delivery channels based on notification type and priority.
 */
export function selectChannels(payload: NotificationPayload): DeliveryChannel[] {
  if (payload.type === 'emergency' || payload.type === 'evacuation') {
    // Emergency: all channels simultaneously
    return ['websocket', 'fcm', 'apns', 'sms'];
  }
  if (payload.priority === 'high') {
    return ['websocket', 'fcm', 'apns'];
  }
  return ['websocket'];
}

/**
 * Determines if SMS fallback should be scheduled for a notification.
 * SMS is scheduled when FCM/APNs are in the channel list.
 */
export function shouldScheduleSMSFallback(channels: DeliveryChannel[]): boolean {
  return channels.includes('fcm') || channels.includes('apns');
}

export { SMS_FALLBACK_TIMEOUT_MS };
