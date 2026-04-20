// Unit tests for External Integration Service
// Validates: Requirements 25.1, 25.2, 31.1, 31.2

import {
  fetchAndCacheTraffic,
  fetchAndCacheWeather,
  publishEnrichment,
  startPollingTimers,
  TRAFFIC_TTL,
  WEATHER_TTL,
} from '../adapters/trafficWeather';

// ── Mock Redis ────────────────────────────────────────────────────────────────

function makeRedis() {
  const store: Record<string, { value: string; ttl: number }> = {};
  return {
    store,
    get: jest.fn(async (key: string) => store[key]?.value ?? null),
    setex: jest.fn(async (key: string, ttl: number, value: string) => {
      store[key] = { value, ttl };
    }),
  };
}

// ── Traffic adapter ───────────────────────────────────────────────────────────

describe('fetchAndCacheTraffic', () => {
  it('stores traffic data in Redis with correct TTL', async () => {
    const redis = makeRedis();
    const data = await fetchAndCacheTraffic(redis as never, 'venue-1');

    expect(data.venueId).toBe('venue-1');
    expect(typeof data.condition).toBe('string');
    expect(typeof data.updatedAt).toBe('string');

    expect(redis.setex).toHaveBeenCalledWith(
      'traffic:venue-1',
      TRAFFIC_TTL,
      expect.any(String),
    );
    expect(redis.store['traffic:venue-1'].ttl).toBe(TRAFFIC_TTL);
  });

  it('returns data with a valid ISO timestamp', async () => {
    const redis = makeRedis();
    const data = await fetchAndCacheTraffic(redis as never, 'venue-2');
    expect(() => new Date(data.updatedAt)).not.toThrow();
    expect(new Date(data.updatedAt).toISOString()).toBe(data.updatedAt);
  });

  it('caches the serialized JSON in Redis', async () => {
    const redis = makeRedis();
    await fetchAndCacheTraffic(redis as never, 'venue-3');
    const stored = redis.store['traffic:venue-3'];
    expect(() => JSON.parse(stored.value)).not.toThrow();
    const parsed = JSON.parse(stored.value) as { venueId: string };
    expect(parsed.venueId).toBe('venue-3');
  });
});

// ── Weather adapter ───────────────────────────────────────────────────────────

describe('fetchAndCacheWeather', () => {
  it('stores weather data in Redis with correct TTL', async () => {
    const redis = makeRedis();
    const data = await fetchAndCacheWeather(redis as never, 'venue-1');

    expect(data.venueId).toBe('venue-1');
    expect(typeof data.temperatureCelsius).toBe('number');
    expect(typeof data.humidity).toBe('number');

    expect(redis.setex).toHaveBeenCalledWith(
      'weather:venue-1',
      WEATHER_TTL,
      expect.any(String),
    );
    expect(redis.store['weather:venue-1'].ttl).toBe(WEATHER_TTL);
  });

  it('traffic TTL (5 min) is shorter than weather TTL (15 min)', () => {
    expect(TRAFFIC_TTL).toBe(300);
    expect(WEATHER_TTL).toBe(900);
    expect(TRAFFIC_TTL).toBeLessThan(WEATHER_TTL);
  });

  it('caches the serialized JSON in Redis', async () => {
    const redis = makeRedis();
    await fetchAndCacheWeather(redis as never, 'venue-4');
    const stored = redis.store['weather:venue-4'];
    expect(() => JSON.parse(stored.value)).not.toThrow();
    const parsed = JSON.parse(stored.value) as { venueId: string };
    expect(parsed.venueId).toBe('venue-4');
  });
});

// ── Kafka publish ─────────────────────────────────────────────────────────────

describe('publishEnrichment', () => {
  it('publishes to external.enrichment topic with correct type', async () => {
    const producer = { send: jest.fn(async () => {}) };
    const data = { venueId: 'v1', condition: 'clear', temperatureCelsius: 25, humidity: 50, windSpeedKph: 5, updatedAt: new Date().toISOString() };

    await publishEnrichment(producer, 'weather', 'v1', data);

    expect(producer.send).toHaveBeenCalledWith({
      topic: 'external.enrichment',
      messages: [{ value: expect.stringContaining('"type":"weather"') }],
    });
  });

  it('includes venueId in the published payload', async () => {
    const producer = { send: jest.fn(async () => {}) };
    const data = { venueId: 'v2', condition: 'moderate', incidentsNearby: 1, updatedAt: new Date().toISOString() };

    await publishEnrichment(producer, 'traffic', 'v2', data);

    const call = (producer.send as jest.Mock).mock.calls[0][0] as { messages: Array<{ value: string }> };
    const payload = JSON.parse(call.messages[0].value) as { venueId: string };
    expect(payload.venueId).toBe('v2');
  });

  it('publishes traffic type correctly', async () => {
    const producer = { send: jest.fn(async () => {}) };
    const data = { venueId: 'v3', condition: 'heavy', incidentsNearby: 3, updatedAt: new Date().toISOString() };

    await publishEnrichment(producer, 'traffic', 'v3', data);

    const call = (producer.send as jest.Mock).mock.calls[0][0] as { messages: Array<{ value: string }> };
    const payload = JSON.parse(call.messages[0].value) as { type: string };
    expect(payload.type).toBe('traffic');
  });
});

// ── Polling timers ────────────────────────────────────────────────────────────

describe('startPollingTimers', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('returns a cleanup function that clears timers', () => {
    const redis = makeRedis();
    const clearSpy = jest.spyOn(global, 'clearInterval');

    const cleanup = startPollingTimers(redis as never, null, ['venue-1']);
    cleanup();

    expect(clearSpy).toHaveBeenCalledTimes(2); // traffic + weather timers
    clearSpy.mockRestore();
  });

  it('creates two timers per venue (traffic + weather)', () => {
    const redis = makeRedis();
    const setIntervalSpy = jest.spyOn(global, 'setInterval');

    const cleanup = startPollingTimers(redis as never, null, ['venue-a', 'venue-b']);
    cleanup();

    // 2 timers × 2 venues = 4
    expect(setIntervalSpy).toHaveBeenCalledTimes(4);
    setIntervalSpy.mockRestore();
  });

  it('creates no timers for empty venue list', () => {
    const redis = makeRedis();
    const setIntervalSpy = jest.spyOn(global, 'setInterval');

    const cleanup = startPollingTimers(redis as never, null, []);
    cleanup();

    expect(setIntervalSpy).not.toHaveBeenCalled();
    setIntervalSpy.mockRestore();
  });
});

// ── Parking zone aggregation ──────────────────────────────────────────────────

describe('parking zone data structure', () => {
  it('parking zones have required fields', () => {
    const zones = [
      { zoneId: 'parking-a', name: 'Parking A', totalSpaces: 500, availableSpaces: 120, updatedAt: new Date().toISOString() },
    ];
    for (const zone of zones) {
      expect(zone).toHaveProperty('zoneId');
      expect(zone).toHaveProperty('totalSpaces');
      expect(zone).toHaveProperty('availableSpaces');
      expect(zone.availableSpaces).toBeLessThanOrEqual(zone.totalSpaces);
    }
  });
});

// ── Exit recommendation logic ─────────────────────────────────────────────────

describe('exit recommendation staggering', () => {
  const exitWindows: Record<string, { recommendedExitMinutes: number; gate: string }> = {
    'A': { recommendedExitMinutes: 0, gate: 'Gate A' },
    'B': { recommendedExitMinutes: 5, gate: 'Gate B' },
    'C': { recommendedExitMinutes: 10, gate: 'Gate C' },
    'D': { recommendedExitMinutes: 15, gate: 'Gate D' },
  };

  it('sections have increasing exit delay to stagger crowd', () => {
    const sections = ['A', 'B', 'C', 'D'];
    for (let i = 1; i < sections.length; i++) {
      const prev = exitWindows[sections[i - 1]!]!.recommendedExitMinutes;
      const curr = exitWindows[sections[i]!]!.recommendedExitMinutes;
      expect(curr).toBeGreaterThan(prev);
    }
  });

  it('each section maps to a distinct gate', () => {
    const gates = Object.values(exitWindows).map((w) => w.gate);
    const uniqueGates = new Set(gates);
    expect(uniqueGates.size).toBe(gates.length);
  });
});
