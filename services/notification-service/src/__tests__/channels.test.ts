/**
 * Tests for notification delivery channel selection.
 *
 * Property 7: Red_Zone Notification Dispatch
 * Feature: venueflow-platform, Property 7: Red_Zone Notification Dispatch
 * Validates: Requirements 2.4
 *
 * Property 25: SMS Fallback Delivery Trigger
 * Feature: venueflow-platform, Property 25: SMS Fallback Delivery Trigger
 * Validates: Requirements 20.1
 */
import * as fc from 'fast-check';
import {
  selectChannels,
  shouldScheduleSMSFallback,
  NotificationPayload,
  DeliveryChannel,
} from '../delivery/channels';

function makePayload(overrides: Partial<NotificationPayload> = {}): NotificationPayload {
  return {
    attendeeId: 'attendee-1',
    channel: 'alerts:attendee-1',
    type: 'alert',
    message: 'Test notification',
    priority: 'normal',
    ...overrides,
  };
}

// ── Unit tests ────────────────────────────────────────────────────────────────

describe('selectChannels — unit tests', () => {
  it('normal alert uses websocket only', () => {
    const channels = selectChannels(makePayload({ type: 'alert', priority: 'normal' }));
    expect(channels).toEqual(['websocket']);
  });

  it('high priority uses websocket + push', () => {
    const channels = selectChannels(makePayload({ priority: 'high' }));
    expect(channels).toContain('websocket');
    expect(channels).toContain('fcm');
    expect(channels).toContain('apns');
  });

  it('emergency uses all channels including SMS', () => {
    const channels = selectChannels(makePayload({ type: 'emergency', priority: 'high' }));
    expect(channels).toContain('websocket');
    expect(channels).toContain('fcm');
    expect(channels).toContain('apns');
    expect(channels).toContain('sms');
  });

  it('evacuation uses all channels', () => {
    const channels = selectChannels(makePayload({ type: 'evacuation' }));
    expect(channels).toContain('sms');
  });
});

describe('shouldScheduleSMSFallback', () => {
  it('returns true when FCM is in channels', () => {
    expect(shouldScheduleSMSFallback(['websocket', 'fcm'])).toBe(true);
  });

  it('returns true when APNs is in channels', () => {
    expect(shouldScheduleSMSFallback(['websocket', 'apns'])).toBe(true);
  });

  it('returns false for websocket-only', () => {
    expect(shouldScheduleSMSFallback(['websocket'])).toBe(false);
  });
});

// ── Property 7: Red_Zone Notification Dispatch ────────────────────────────────

describe('Property 7: Red_Zone Notification Dispatch', () => {
  it('emergency notifications always include websocket channel', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 50 }),
        (attendeeId, message) => {
          const payload = makePayload({ attendeeId, message, type: 'emergency', priority: 'high' });
          const channels = selectChannels(payload);
          return channels.includes('websocket');
        },
      ),
      { numRuns: 200 },
    );
  });

  it('emergency notifications always include SMS channel', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (attendeeId) => {
          const payload = makePayload({ attendeeId, type: 'emergency' });
          const channels = selectChannels(payload);
          return channels.includes('sms');
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ── Property 25: SMS Fallback Delivery Trigger ────────────────────────────────

describe('Property 25: SMS Fallback Delivery Trigger', () => {
  it('SMS fallback is scheduled whenever FCM or APNs is in the channel list', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom<DeliveryChannel>('websocket', 'fcm', 'apns', 'sms'),
          { minLength: 1, maxLength: 4 },
        ),
        (channels: DeliveryChannel[]) => {
          const hasPush = channels.includes('fcm') || channels.includes('apns');
          const result = shouldScheduleSMSFallback(channels);
          return result === hasPush;
        },
      ),
      { numRuns: 200 },
    );
  });
});
