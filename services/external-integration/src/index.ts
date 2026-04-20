// External Integration Service — VenueFlow
// Maps/traffic, weather, parking, shuttle, ride-hailing adapters.
// Validates: Requirements 25.1, 25.2, 31.1, 31.2, 31.3, 31.4

import express from 'express';
import Redis from 'ioredis';
import {
  fetchAndCacheTraffic,
  fetchAndCacheWeather,
  startPollingTimers,
  TRAFFIC_TTL,
  WEATHER_TTL,
} from './adapters/trafficWeather';

const redis = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379');
const app = express();
app.use(express.json());

const PARKING_TTL = 60; // 1 min

// ── GET /external/traffic/:venueId ────────────────────────────────────────────

app.get('/external/traffic/:venueId', async (req, res) => {
  const { venueId } = req.params;
  const cached = await redis.get(`traffic:${venueId}`);
  if (cached) { res.json(JSON.parse(cached)); return; }

  const data = await fetchAndCacheTraffic(redis, venueId);
  res.json(data);
});

// ── GET /external/weather/:venueId ────────────────────────────────────────────

app.get('/external/weather/:venueId', async (req, res) => {
  const { venueId } = req.params;
  const cached = await redis.get(`weather:${venueId}`);
  if (cached) { res.json(JSON.parse(cached)); return; }

  const data = await fetchAndCacheWeather(redis, venueId);
  res.json(data);
});

// ── GET /transport/parking/:venueId ──────────────────────────────────────────

app.get('/transport/parking/:venueId', async (req, res) => {
  const { venueId } = req.params;
  const cached = await redis.get(`parking:${venueId}`);
  if (cached) { res.json(JSON.parse(cached)); return; }

  // TODO: Integrate with venue parking sensor API
  const data = {
    venueId,
    zones: [
      { zoneId: 'parking-a', name: 'Parking A', totalSpaces: 500, availableSpaces: 120, updatedAt: new Date().toISOString() },
      { zoneId: 'parking-b', name: 'Parking B', totalSpaces: 300, availableSpaces: 45, updatedAt: new Date().toISOString() },
    ],
  };
  await redis.setex(`parking:${venueId}`, PARKING_TTL, JSON.stringify(data));
  res.json(data);
});

// ── GET /transport/shuttles/:venueId ─────────────────────────────────────────

app.get('/transport/shuttles/:venueId', async (req, res) => {
  const { venueId } = req.params;
  // TODO: Integrate with transit API for live shuttle tracking
  res.json({
    venueId,
    shuttles: [
      { shuttleId: 'shuttle-1', route: 'Station → Gate A', nextArrivalMinutes: 5, capacity: 50, currentOccupancy: 30 },
      { shuttleId: 'shuttle-2', route: 'Parking B → Gate C', nextArrivalMinutes: 12, capacity: 50, currentOccupancy: 15 },
    ],
  });
});

// ── GET /transport/exit-recommendations/:venueId ──────────────────────────────

app.get('/transport/exit-recommendations/:venueId', async (req, res) => {
  const { venueId } = req.params;
  const { seatSection } = req.query as { seatSection?: string };

  // Staggered exit windows based on seat section to reduce gate crush
  const exitWindows: Record<string, { recommendedExitMinutes: number; gate: string }> = {
    'A': { recommendedExitMinutes: 0, gate: 'Gate A' },
    'B': { recommendedExitMinutes: 5, gate: 'Gate B' },
    'C': { recommendedExitMinutes: 10, gate: 'Gate C' },
    'D': { recommendedExitMinutes: 15, gate: 'Gate D' },
  };

  const recommendation = seatSection
    ? (exitWindows[seatSection] ?? { recommendedExitMinutes: 10, gate: 'Nearest Gate' })
    : { recommendedExitMinutes: 10, gate: 'Nearest Gate' };

  res.json({
    venueId,
    seatSection,
    ...recommendation,
    rideHailingDeepLinks: {
      uber: `uber://venue-exit?venueId=${venueId}`,
      ola: `ola://venue-exit?venueId=${venueId}`,
    },
  });
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = parseInt(process.env['PORT'] ?? '3011', 10);

if (require.main === module) {
  app.listen(PORT, () => console.log(`[external-integration] Listening on port ${PORT}`));

  // Start background polling for a default set of venues.
  // In production, venue IDs would be loaded from the database.
  const venueIds = (process.env['VENUE_IDS'] ?? '').split(',').filter(Boolean);

  // Attempt to connect Kafka producer for enrichment publishing
  let producer: { send: (args: { topic: string; messages: Array<{ value: string }> }) => Promise<void> } | null = null;

  (async () => {
    const brokers = (process.env['KAFKA_BROKERS'] ?? '').split(',').filter(Boolean);
    if (brokers.length > 0) {
      try {
        const { Kafka } = await import('kafkajs');
        const kafka = new Kafka({ clientId: 'external-integration', brokers });
        producer = kafka.producer();
        await (producer as import('kafkajs').Producer).connect();
        console.log('[external-integration] Kafka producer connected');
      } catch (err) {
        console.warn('[external-integration] Kafka unavailable — enrichment publishing disabled:', err);
      }
    }

    if (venueIds.length > 0) {
      startPollingTimers(redis, producer, venueIds);
      console.log(`[external-integration] Polling started for venues: ${venueIds.join(', ')}`);
    }
  })().catch(console.error);
}

export { TRAFFIC_TTL, WEATHER_TTL, PARKING_TTL };
export default app;
