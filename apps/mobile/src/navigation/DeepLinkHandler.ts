/**
 * Deep link routing handler.
 * URI scheme: venueflow://
 * Handles:
 *   venueflow://event/{eventId}       → heatmap
 *   venueflow://entry/{eventId}       → entry routing
 *   venueflow://emergency/evacuate/{zoneId} → evacuation screen (full-screen takeover)
 * Push notification tap routing by notification type.
 * Requirements: 5.2, 5.6, 8.4
 */
import { Linking } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from './AppNavigator';

type NavigationRef = NavigationContainerRef<RootStackParamList>;

let navigationRef: NavigationRef | null = null;

export function setNavigationRef(ref: NavigationRef): void {
  navigationRef = ref;
}

const DEEP_LINK_PATTERNS: Array<{
  pattern: RegExp;
  handler: (match: RegExpMatchArray) => void;
}> = [
  {
    // venueflow://event/{eventId} → heatmap
    pattern: /^venueflow:\/\/event\/([^/]+)$/,
    handler: (match) => {
      navigationRef?.navigate('Main');
    },
  },
  {
    // venueflow://entry/{eventId} → entry routing / navigation
    pattern: /^venueflow:\/\/entry\/([^/]+)$/,
    handler: (match) => {
      const eventId = match[1];
      navigationRef?.navigate('Navigation', {
        destination: `Entry Gate — Event ${eventId}`,
        destinationType: 'entry',
      });
    },
  },
  {
    // venueflow://emergency/evacuate/{zoneId} → evacuation screen (full-screen takeover)
    pattern: /^venueflow:\/\/emergency\/evacuate\/([^/]+)$/,
    handler: (match) => {
      const zoneId = match[1];
      navigationRef?.navigate('Evacuation', { zoneId });
    },
  },
];

export function handleDeepLink(url: string): boolean {
  for (const { pattern, handler } of DEEP_LINK_PATTERNS) {
    const match = url.match(pattern);
    if (match) {
      handler(match);
      return true;
    }
  }
  return false;
}

// ─── Push notification routing ────────────────────────────────────────────────

export type NotificationType =
  | 'heatmap_alert'
  | 'order_ready'
  | 'sos_response'
  | 'evacuation'
  | 'gate_recommendation';

export interface PushNotificationData {
  type: NotificationType;
  zoneId?: string;
  orderId?: string;
  eventId?: string;
  venueId?: string;
}

export function handlePushNotificationTap(data: PushNotificationData): void {
  if (!navigationRef) return;

  switch (data.type) {
    case 'heatmap_alert':
      // Navigate to heatmap, highlight the zone
      navigationRef.navigate('Main');
      break;

    case 'order_ready':
      // Navigate to order status screen (not yet implemented — go to main)
      navigationRef.navigate('Main');
      break;

    case 'sos_response':
      // Navigate to SOS/emergency panel
      navigationRef.navigate('SOS');
      break;

    case 'evacuation':
      if (data.zoneId) {
        navigationRef.navigate('Evacuation', { zoneId: data.zoneId });
      }
      break;

    case 'gate_recommendation':
      navigationRef.navigate('Main');
      break;
  }
}

// ─── Initialize deep link listener ───────────────────────────────────────────

export function initDeepLinkListener(): () => void {
  // Handle app opened from deep link
  Linking.getInitialURL().then((url) => {
    if (url) handleDeepLink(url);
  });

  // Handle deep links while app is running
  const subscription = Linking.addEventListener('url', ({ url }) => {
    handleDeepLink(url);
  });

  return () => subscription.remove();
}
