import { SensorReading } from '@venueflow/shared-types';
import { SensorFailureEvent } from '../types';

interface SensorMeta {
  zoneId: string;
  venueId: string;
  lastSeenAt: Date;
}

export class HeartbeatMonitor {
  private readonly sensors = new Map<string, SensorMeta>();
  private readonly intervalMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly onFailure: (event: SensorFailureEvent) => Promise<void>;

  constructor(
    intervalMs: number,
    onFailure: (event: SensorFailureEvent) => Promise<void>,
  ) {
    this.intervalMs = intervalMs;
    this.onFailure = onFailure;
  }

  /** Record last-seen timestamp for a sensor on every valid reading. */
  update(reading: SensorReading): void {
    this.sensors.set(reading.sensorId, {
      zoneId: reading.zoneId,
      venueId: reading.venueId,
      lastSeenAt: new Date(),
    });
  }

  /** Start the periodic check loop (every 10 seconds). */
  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.check().catch((err) =>
        console.error('[iot-gateway] Heartbeat check error:', err),
      );
    }, 10_000);
  }

  /** Stop the periodic check loop. */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Check all tracked sensors; emit failure events for stale ones and remove them. */
  async check(): Promise<void> {
    const now = new Date();
    const stale: string[] = [];

    for (const [sensorId, meta] of this.sensors.entries()) {
      if (now.getTime() - meta.lastSeenAt.getTime() > this.intervalMs) {
        stale.push(sensorId);
        await this.onFailure({
          sensorId,
          zoneId: meta.zoneId,
          venueId: meta.venueId,
          lastSeenAt: meta.lastSeenAt.toISOString(),
          detectedAt: now.toISOString(),
        });
      }
    }

    for (const id of stale) {
      this.sensors.delete(id);
    }
  }

  /** Exposed for testing. */
  isTracked(sensorId: string): boolean {
    return this.sensors.has(sensorId);
  }

  get trackedCount(): number {
    return this.sensors.size;
  }
}
