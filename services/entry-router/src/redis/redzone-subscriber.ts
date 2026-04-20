/**
 * Red_Zone Gate Reassignment Subscriber
 *
 * Subscribes to Redis `heatmap:{venueId}` pub/sub channel.
 * When a gate zone transitions to Red_Zone status, pushes a revised
 * gate recommendation to the affected Attendee via WebSocket.
 *
 * Requirements: 1.5
 */
import Redis from 'ioredis';
import { WebSocketServer, WebSocket } from 'ws';
import pool from '../db/client';
import { scoreGatesExcluding, GateState } from '../gate/scorer';

// Map of attendeeId → WebSocket connection
const attendeeConnections = new Map<string, WebSocket>();

/**
 * Register a WebSocket connection for an attendee.
 * Called when a client connects and identifies itself.
 */
export function registerAttendeeConnection(attendeeId: string, ws: WebSocket): void {
  attendeeConnections.set(attendeeId, ws);
  ws.on('close', () => attendeeConnections.delete(attendeeId));
}

/**
 * Start the Red_Zone subscriber for a given venueId.
 * Subscribes to `heatmap:{venueId}` Redis channel and pushes
 * reassignment messages to affected attendees.
 */
export function startRedZoneSubscriber(venueId: string, redisUrl: string): void {
  // Use a dedicated subscriber connection (ioredis requires separate client for subscribe)
  const subscriber = new Redis(redisUrl);
  // Use a separate client for hgetall queries
  const queryClient = new Redis(redisUrl);

  subscriber.subscribe(`heatmap:${venueId}`, (err) => {
    if (err) {
      console.error(`[entry-router] Failed to subscribe to heatmap:${venueId}:`, err);
    } else {
      console.log(`[entry-router] Subscribed to heatmap:${venueId} for Red_Zone reassignment`);
    }
  });

  subscriber.on('message', async (_channel: string, message: string) => {
    try {
      const delta = JSON.parse(message) as Record<string, unknown>;

      // Check if any zone in the delta has transitioned to red
      const redZoneIds: string[] = [];
      for (const [zoneId, data] of Object.entries(delta)) {
        const snap = data as { status?: string };
        if (snap.status === 'red') {
          redZoneIds.push(zoneId);
        }
      }

      if (redZoneIds.length === 0) return;

      // For each red zone, find attendees assigned to that gate and push reassignment
      for (const redGateId of redZoneIds) {
        await handleRedZoneTransition(redGateId, venueId, queryClient);
      }
    } catch (err) {
      console.error('[entry-router] Error processing heatmap message:', err);
    }
  });
}

async function handleRedZoneTransition(
  redGateId: string,
  venueId: string,
  queryClient: Redis,
): Promise<void> {
  try {
    // Find all attendees currently assigned to this gate
    const { rows } = await pool.query<{ attendee_id: string }>(
      `SELECT attendee_id FROM gate_assignments WHERE gate_id = $1 AND venue_id = $2`,
      [redGateId, venueId],
    );

    if (rows.length === 0) return;

    // Fetch current gate states from Redis
    const raw = await queryClient.hgetall(`heatmap:${venueId}`);
    const gates: GateState[] = Object.entries(raw)
      .filter(([field]) => field.startsWith('zone:gate-'))
      .map(([, value]) => {
        const snap = JSON.parse(value) as {
          zone_id?: string;
          current_count?: number;
          capacity?: number;
          density_percent?: number;
          status?: string;
        };
        return {
          gateId: snap.zone_id ?? '',
          zoneId: snap.zone_id ?? '',
          currentCount: snap.current_count ?? 0,
          capacity: snap.capacity ?? 500,
          densityPercent: snap.density_percent ?? 0,
          status: (snap.status ?? 'green') as GateState['status'],
        };
      });

    const newRecommendation = scoreGatesExcluding(gates, redGateId);
    if (!newRecommendation) return;

    const message = JSON.stringify({
      type: 'GATE_REASSIGNMENT',
      reason: 'RED_ZONE',
      previousGateId: redGateId,
      newGateId: newRecommendation.gateId,
      predictedWaitMinutes: newRecommendation.predictedWaitMinutes,
      updatedAt: new Date().toISOString(),
    });

    // Push to all affected attendees via WebSocket
    for (const row of rows) {
      const ws = attendeeConnections.get(row.attendee_id);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  } catch (err) {
    console.error('[entry-router] handleRedZoneTransition error:', err);
  }
}

/**
 * Attach WebSocket upgrade handler to an HTTP server.
 * Clients connect and send { type: 'IDENTIFY', attendeeId } to register.
 */
export function attachWebSocketServer(server: import('http').Server): WebSocketServer {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as { type?: string; attendeeId?: string };
        if (msg.type === 'IDENTIFY' && msg.attendeeId) {
          registerAttendeeConnection(msg.attendeeId, ws);
          ws.send(JSON.stringify({ type: 'IDENTIFIED', attendeeId: msg.attendeeId }));
        }
      } catch {
        // ignore malformed messages
      }
    });
  });

  return wss;
}
