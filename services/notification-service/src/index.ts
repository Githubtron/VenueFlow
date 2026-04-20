// Notification Service — VenueFlow
// WebSocket Gateway (Redis pub/sub fan-out) + multi-channel notification dispatcher.
// Channels: heatmap:{venueId}, alerts:{attendeeId}, emergency:{venueId}

import express from 'express';
import { WebSocketGateway } from './ws/gateway';
import { NotificationDispatcher } from './delivery/dispatcher';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
const WS_PORT = parseInt(process.env['WS_PORT'] ?? '3010', 10);
const HTTP_PORT = parseInt(process.env['PORT'] ?? '3003', 10);

const gateway = new WebSocketGateway(WS_PORT, REDIS_URL);
const dispatcher = new NotificationDispatcher(REDIS_URL);

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', wsConnections: gateway.connectedCount });
});

app.post('/notify', async (req, res) => {
  try {
    const result = await dispatcher.dispatch(req.body);
    res.json(result);
  } catch (err) {
    console.error('[notification-service] dispatch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/broadcast', async (req, res) => {
  const { venueId, message, type } = req.body;
  if (!venueId || !message) {
    res.status(400).json({ error: 'venueId and message are required' });
    return;
  }
  try {
    await dispatcher.broadcastToZone(venueId, message, type);
    res.json({ status: 'broadcast_sent', venueId });
  } catch (err) {
    console.error('[notification-service] broadcast error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

if (require.main === module) {
  app.listen(HTTP_PORT, () => {
    console.log(`[notification-service] HTTP on port ${HTTP_PORT}, WS on port ${WS_PORT}`);
  });
}

export { app, gateway, dispatcher };
