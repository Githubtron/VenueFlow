// Traffic & Weather adapters — VenueFlow External Integration Service
// Fetches traffic every 5 min, weather every 15 min.
// Caches in Redis and publishes enrichment data to `external.enrichment` Kafka topic.
// Validates: Requirements 25.1, 25.2

import Redis from 'ioredis';

export const TRAFFIC_TTL = 300;  // 5 min
export const WEATHER_TTL = 900;  // 15 min

export interface TrafficData {
  venueId: string;
  condition: string;
  incidentsNearby: number;
  updatedAt: string;
}

export interface WeatherData {
  venueId: string;
  condition: string;
  temperatureCelsius: number;
  humidity: number;
  windSpeedKph: number;
  updatedAt: string;
}

/** Fetch (or stub) traffic data for a venue and cache it in Redis. */
export async function fetchAndCacheTraffic(redis: Redis, venueId: string): Promise<TrafficData> {
  // TODO: Replace stub with real Google Maps / HERE API call
  const data: TrafficData = {
    venueId,
    condition: 'moderate',
    incidentsNearby: 0,
    updatedAt: new Date().toISOString(),
  };
  await redis.setex(`traffic:${venueId}`, TRAFFIC_TTL, JSON.stringify(data));
  return data;
}

/** Fetch (or stub) weather data for a venue and cache it in Redis. */
export async function fetchAndCacheWeather(redis: Redis, venueId: string): Promise<WeatherData> {
  // TODO: Replace stub with real OpenWeatherMap API call
  const data: WeatherData = {
    venueId,
    condition: 'clear',
    temperatureCelsius: 28,
    humidity: 60,
    windSpeedKph: 10,
    updatedAt: new Date().toISOString(),
  };
  await redis.setex(`weather:${venueId}`, WEATHER_TTL, JSON.stringify(data));
  return data;
}

/** Publish enrichment payload to the `external.enrichment` Kafka topic. */
export async function publishEnrichment(
  producer: { send: (args: { topic: string; messages: Array<{ value: string }> }) => Promise<void> },
  type: 'traffic' | 'weather',
  venueId: string,
  data: TrafficData | WeatherData,
): Promise<void> {
  await producer.send({
    topic: 'external.enrichment',
    messages: [{ value: JSON.stringify({ type, venueId, data, eventId: venueId }) }],
  });
}

/**
 * Start background polling timers.
 * - Traffic: every 5 min per venue
 * - Weather: every 15 min per venue
 * Returns a cleanup function that clears all timers.
 */
export function startPollingTimers(
  redis: Redis,
  producer: { send: (args: { topic: string; messages: Array<{ value: string }> }) => Promise<void> } | null,
  venueIds: string[],
): () => void {
  const timers: ReturnType<typeof setInterval>[] = [];

  for (const venueId of venueIds) {
    // Traffic — every 5 min
    const trafficTimer = setInterval(async () => {
      try {
        const data = await fetchAndCacheTraffic(redis, venueId);
        if (producer) await publishEnrichment(producer, 'traffic', venueId, data);
      } catch (err) {
        console.error(`[external-integration] Traffic fetch failed for ${venueId}:`, err);
      }
    }, TRAFFIC_TTL * 1000);

    // Weather — every 15 min
    const weatherTimer = setInterval(async () => {
      try {
        const data = await fetchAndCacheWeather(redis, venueId);
        if (producer) await publishEnrichment(producer, 'weather', venueId, data);
      } catch (err) {
        console.error(`[external-integration] Weather fetch failed for ${venueId}:`, err);
      }
    }, WEATHER_TTL * 1000);

    timers.push(trafficTimer, weatherTimer);
  }

  return () => timers.forEach(clearInterval);
}
