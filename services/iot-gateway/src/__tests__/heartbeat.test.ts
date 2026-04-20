import { HeartbeatMonitor } from '../heartbeat/monitor';
import { SensorReading } from '@venueflow/shared-types';
import { SensorFailureEvent } from '../types';

const makeReading = (sensorId = 'sensor-1'): SensorReading => ({
  sensorId,
  zoneId: 'zone-a',
  venueId: 'venue-1',
  count: 10,
  timestamp: new Date().toISOString(),
  sensorType: 'pressure',
});

describe('HeartbeatMonitor', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('tracks a sensor after update()', () => {
    const monitor = new HeartbeatMonitor(30_000, jest.fn());
    monitor.update(makeReading('sensor-1'));
    expect(monitor.isTracked('sensor-1')).toBe(true);
    expect(monitor.trackedCount).toBe(1);
  });

  it('emits a failure event after the heartbeat interval is exceeded', async () => {
    const failures: SensorFailureEvent[] = [];
    const onFailure = jest.fn(async (e: SensorFailureEvent) => { failures.push(e); });
    const monitor = new HeartbeatMonitor(30_000, onFailure);

    monitor.update(makeReading('sensor-1'));

    // Advance time past the heartbeat interval
    jest.advanceTimersByTime(31_000);

    await monitor.check();

    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(failures[0].sensorId).toBe('sensor-1');
    expect(failures[0].zoneId).toBe('zone-a');
    expect(failures[0].venueId).toBe('venue-1');
  });

  it('removes a sensor from tracking after failure is emitted', async () => {
    const onFailure = jest.fn(async () => {});
    const monitor = new HeartbeatMonitor(30_000, onFailure);

    monitor.update(makeReading('sensor-1'));
    jest.advanceTimersByTime(31_000);
    await monitor.check();

    expect(monitor.isTracked('sensor-1')).toBe(false);
    expect(monitor.trackedCount).toBe(0);
  });

  it('re-adds a sensor to tracking after a new reading arrives', async () => {
    const onFailure = jest.fn(async () => {});
    const monitor = new HeartbeatMonitor(30_000, onFailure);

    monitor.update(makeReading('sensor-1'));
    jest.advanceTimersByTime(31_000);
    await monitor.check();

    expect(monitor.isTracked('sensor-1')).toBe(false);

    // New reading arrives
    monitor.update(makeReading('sensor-1'));
    expect(monitor.isTracked('sensor-1')).toBe(true);
  });

  it('does not emit a failure when the interval has not been exceeded', async () => {
    const onFailure = jest.fn(async () => {});
    const monitor = new HeartbeatMonitor(30_000, onFailure);

    monitor.update(makeReading('sensor-1'));

    // Advance time but stay within the interval
    jest.advanceTimersByTime(15_000);
    await monitor.check();

    expect(onFailure).not.toHaveBeenCalled();
    expect(monitor.isTracked('sensor-1')).toBe(true);
  });

  it('start() triggers periodic checks and stop() halts them', async () => {
    const onFailure = jest.fn(async () => {});
    const monitor = new HeartbeatMonitor(5_000, onFailure);

    monitor.update(makeReading('sensor-1'));
    monitor.start();

    // Advance past heartbeat interval + one check cycle (10s)
    jest.advanceTimersByTime(16_000);
    // Allow microtasks to flush
    await Promise.resolve();

    monitor.stop();

    expect(onFailure).toHaveBeenCalled();
  });
});
