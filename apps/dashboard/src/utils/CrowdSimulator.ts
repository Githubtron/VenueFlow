import { ZoneSnapshot } from '../components/ZoneHeatmap';

/**
 * Simulation engine for generating realistic crowd density patterns
 */

export interface SimulationConfig {
  duration: number; // milliseconds
  tickInterval: number; // milliseconds between updates
  eventType: 'concert' | 'sports' | 'gathering' | 'festival';
  peakTime: number; // 0-1, when peak crowd happens
  initialAttendance: number; // percentage of capacity
}

export class CrowdSimulator {
  private zones: Map<string, ZoneSnapshot> = new Map();
  private config: SimulationConfig;
  private startTime: number = 0;
  private elapsedTime: number = 0;
  private onUpdate: ((zones: ZoneSnapshot[]) => void) | null = null;
  private animationFrameId: number | null = null;

  constructor(initialZones: ZoneSnapshot[], config: SimulationConfig) {
    this.config = config;
    initialZones.forEach(zone => {
      this.zones.set(zone.zoneId, { ...zone });
    });
  }

  /**
   * Start the simulation
   */
  start(onUpdate: (zones: ZoneSnapshot[]) => void) {
    this.onUpdate = onUpdate;
    this.startTime = Date.now();
    this.elapsedTime = 0;
    this.tick();
  }

  /**
   * Stop the simulation
   */
  stop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Core simulation tick
   */
  private tick = () => {
    this.elapsedTime = Date.now() - this.startTime;
    const progress = Math.min(this.elapsedTime / this.config.duration, 1);

    // Update all zones
    this.updateAllZones(progress);

    if (this.onUpdate) {
      this.onUpdate(Array.from(this.zones.values()));
    }

    // Continue if not finished
    if (progress < 1) {
      this.animationFrameId = requestAnimationFrame(this.tick);
    }
  };

  /**
   * Update all zones based on event type and simulation progress
   */
  private updateAllZones(progress: number) {
    const zones = Array.from(this.zones.values());

    zones.forEach((zone, index) => {
      const baseCapacity = zone.capacity;

      // Calculate density based on event type and time
      let density = this.calculateZoneDensity(zone, progress, index);

      // Add some organic variation
      density = this.addNoise(density, progress);

      // Clamp to 0-100
      density = Math.max(0, Math.min(100, density));

      // Calculate actual count
      const newCount = Math.round((density / 100) * baseCapacity);

      // Determine status
      const status: ZoneSnapshot['status'] =
        density >= 80 ? 'red' :
        density >= 50 ? 'amber' :
        zone.status === 'unavailable' ? 'unavailable' :
        'green';

      // Update zone
      this.zones.set(zone.zoneId, {
        ...zone,
        currentCount: newCount,
        densityPercent: Math.round(density),
        status,
      });
    });
  }

  /**
   * Calculate base density for a zone based on event progression
   */
  private calculateZoneDensity(zone: ZoneSnapshot, progress: number, zoneIndex: number): number {
    if (zone.status === 'unavailable') return 0;

    const { eventType, peakTime, initialAttendance } = this.config;

    // Different patterns for different event types
    let densityFactor = 0;

    switch (eventType) {
      case 'concert':
        // Slow buildup, peak at peakTime, decline
        densityFactor = this.concertPattern(progress, peakTime, zoneIndex);
        break;
      case 'sports':
        // Two peaks (pre-game and post-game), lull at halftime
        densityFactor = this.sportsPattern(progress, peakTime);
        break;
      case 'gathering':
        // Steady increase then plateau
        densityFactor = this.gatheringPattern(progress, peakTime);
        break;
      case 'festival':
        // Multiple waves with varying intensity
        densityFactor = this.festivalPattern(progress, peakTime, zoneIndex);
        break;
    }

    // Zone-specific multipliers
    const zoneMultiplier = this.getZoneMultiplier(zone.name);

    // Initial attendance baseline
    const baseDensity = initialAttendance + (densityFactor * (100 - initialAttendance));

    return baseDensity * zoneMultiplier;
  }

  /**
   * Concert pattern: slow buildup, peak, decline
   */
  private concertPattern(progress: number, peakTime: number, zoneIndex: number): number {
    const zoneOffset = (zoneIndex * 0.05) % 1; // Stagger zones
    const adjustedProgress = (progress + zoneOffset) % 1;

    if (adjustedProgress < peakTime) {
      // Buildup phase
      return (adjustedProgress / peakTime) * (0.8 + (zoneIndex % 3) * 0.1);
    } else {
      // Decline phase
      const declineProgress = (adjustedProgress - peakTime) / (1 - peakTime);
      return (1 - declineProgress) * (0.8 + (zoneIndex % 3) * 0.1);
    }
  }

  /**
   * Sports pattern: peaks before and after event
   */
  private sportsPattern(progress: number, peakTime: number): number {
    const firstPeak = peakTime * 0.4;
    const secondPeak = peakTime * 1.2;

    let density = 0;

    if (progress < firstPeak) {
      // Pre-event buildup
      density = (progress / firstPeak) * 0.6;
    } else if (progress < peakTime) {
      // Halftime lull
      density = 0.6 - ((progress - firstPeak) / (peakTime - firstPeak)) * 0.3;
    } else if (progress < secondPeak) {
      // Post-event peak
      density = 0.3 + ((progress - peakTime) / (secondPeak - peakTime)) * 0.7;
    } else {
      // Exit phase
      density = Math.max(0, 1 - (progress - secondPeak) / (1 - secondPeak));
    }

    return density;
  }

  /**
   * Gathering pattern: steady increase then plateau
   */
  private gatheringPattern(progress: number, peakTime: number): number {
    if (progress < peakTime) {
      return (progress / peakTime) * 0.9;
    } else {
      // Plateau with slight decay
      const decay = (progress - peakTime) / (1 - peakTime);
      return 0.9 - decay * 0.2;
    }
  }

  /**
   * Festival pattern: multiple waves
   */
  private festivalPattern(progress: number, peakTime: number, zoneIndex: number): number {
    const wave1 = Math.sin(progress * Math.PI * 2) * 0.3 + 0.3;
    const wave2 = Math.sin(progress * Math.PI * 4 + zoneIndex) * 0.2 + 0.2;
    const trend = progress < peakTime ? (progress / peakTime) : 1 - ((progress - peakTime) / (1 - peakTime));

    return Math.min(1, (wave1 + wave2) * trend);
  }

  /**
   * Get zone-specific crowd multiplier based on zone characteristics
   */
  private getZoneMultiplier(zoneName: string): number {
    // Certain zones attract more or less crowds
    if (zoneName.includes('Stage') || zoneName.includes('Main')) return 1.2;
    if (zoneName.includes('VIP')) return 0.4;
    if (zoneName.includes('Food') || zoneName.includes('Bar')) return 0.8;
    if (zoneName.includes('Gate') || zoneName.includes('Entry')) return 1.1;
    if (zoneName.includes('Park') || zoneName.includes('Parking')) return 0.3;
    if (zoneName.includes('Medical')) return 0.1;
    if (zoneName.includes('Press')) return 0.2;
    return 1;
  }

  /**
   * Add organic noise/variation
   */
  private addNoise(density: number, progress: number): number {
    // Perlin-like noise using sine waves
    const noise1 = Math.sin(progress * 12.5) * 0.05;
    const noise2 = Math.sin(progress * 23.7 + Math.random()) * 0.03;
    return density + (density * (noise1 + noise2));
  }

  /**
   * Get current simulation progress (0-1)
   */
  getProgress(): number {
    return Math.min(this.elapsedTime / this.config.duration, 1);
  }

  /**
   * Check if simulation is complete
   */
  isComplete(): boolean {
    return this.getProgress() >= 1;
  }
}

/**
 * Helper to create a simulation config based on event type
 */
export function createSimulationConfig(
  eventType: SimulationConfig['eventType'],
  duration: number = 60000 // 60 seconds
): SimulationConfig {
  const configs: Record<SimulationConfig['eventType'], Partial<SimulationConfig>> = {
    concert: {
      eventType: 'concert',
      duration,
      tickInterval: 100,
      peakTime: 0.6,
      initialAttendance: 10,
    },
    sports: {
      eventType: 'sports',
      duration,
      tickInterval: 100,
      peakTime: 0.5,
      initialAttendance: 15,
    },
    gathering: {
      eventType: 'gathering',
      duration,
      tickInterval: 100,
      peakTime: 0.7,
      initialAttendance: 5,
    },
    festival: {
      eventType: 'festival',
      duration,
      tickInterval: 100,
      peakTime: 0.5,
      initialAttendance: 20,
    },
  };

  return configs[eventType] as SimulationConfig;
}
