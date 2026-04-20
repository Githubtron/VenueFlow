/**
 * Unit tests for NotificationDispatcher.
 * Tests: delivery channel selection, SMS fallback timer, broadcast.
 * Validates: Requirements 2.4, 5.2, 5.3
 */
import { NotificationDispatcher } from '../delivery/dispatcher';
import { NotificationPayload } from '../delivery/channels';

// Mock ioredis
const mockPublish = jest.fn().mockResolvedValue(1);
const mockDisconnect = jest.fn();

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    publish: mockPublish,
    disconnect: mockDisconnect,
  }));
});

function makePayload(overrides: Partial<NotificationPayload> = {}): NotificationPayload {
  return {
    attendeeId: 'attendee-1',
    channel: 'alerts:attendee-1',
    type: 'alert',
    message: 'Test',
    priority: 'normal',
    ...overrides,
  };
}

describe('NotificationDispatcher', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockPublish.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('publishes to Redis for websocket delivery', async () => {
    const dispatcher = new NotificationDispatcher('redis://localhost:6379');
    const result = await dispatcher.dispatch(makePayload());
    expect(mockPublish).toHaveBeenCalledWith('alerts:attendee-1', expect.any(String));
    expect(result.delivered).toBe(true);
    dispatcher.disconnect();
  });

  it('schedules SMS fallback for high-priority notifications', async () => {
    const smsSend = jest.fn().mockResolvedValue(undefined);
    const dispatcher = new NotificationDispatcher('redis://localhost:6379', { send: smsSend });

    const result = await dispatcher.dispatch(makePayload({ priority: 'high' }));
    expect(result.smsScheduled).toBe(true);

    // SMS should not fire immediately
    expect(smsSend).not.toHaveBeenCalled();

    // Advance past 30s fallback window
    jest.advanceTimersByTime(31_000);
    await Promise.resolve();

    expect(smsSend).toHaveBeenCalledWith('attendee-1', 'Test');
    dispatcher.disconnect();
  });

  it('cancels SMS fallback when push delivery is acknowledged', async () => {
    const smsSend = jest.fn().mockResolvedValue(undefined);
    const dispatcher = new NotificationDispatcher('redis://localhost:6379', { send: smsSend });

    await dispatcher.dispatch(makePayload({ priority: 'high' }));
    dispatcher.acknowledgePushDelivery('attendee-1');

    jest.advanceTimersByTime(31_000);
    await Promise.resolve();

    expect(smsSend).not.toHaveBeenCalled();
    dispatcher.disconnect();
  });

  it('broadcasts emergency to zone channel', async () => {
    const dispatcher = new NotificationDispatcher('redis://localhost:6379');
    await dispatcher.broadcastToZone('venue-1', 'Evacuate now!', 'evacuation');
    expect(mockPublish).toHaveBeenCalledWith(
      'emergency:venue-1',
      expect.stringContaining('Evacuate now!'),
    );
    dispatcher.disconnect();
  });

  it('emergency dispatch publishes to Redis and schedules SMS', async () => {
    const smsSend = jest.fn().mockResolvedValue(undefined);
    const dispatcher = new NotificationDispatcher('redis://localhost:6379', { send: smsSend });

    const result = await dispatcher.dispatch(
      makePayload({ type: 'emergency', priority: 'high' }),
    );

    expect(result.channels).toContain('websocket');
    expect(result.channels).toContain('sms');
    expect(mockPublish).toHaveBeenCalled();
    dispatcher.disconnect();
  });
});
