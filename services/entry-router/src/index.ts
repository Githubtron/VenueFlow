/**
 * Entry Router — VenueFlow
 *
 * AI gate assignment, QR/face-scan ticket validation, Red_Zone reassignment.
 *
 * Endpoints:
 *   GET  /entry/recommendation/:attendeeId  — AI gate recommendation
 *   POST /entry/scan                        — QR ticket validation + entry recording
 *   POST /entry/face-scan                   — Face-scan entry (no biometric storage)
 *   GET  /health                            — Health check
 *
 * WebSocket: ws://host:PORT
 *   Send { type: 'IDENTIFY', attendeeId } to register for Red_Zone push notifications.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 1.8, 9.1
 */
import http from 'http';
import express from 'express';
import entryRouter from './routes/entry';
import { attachWebSocketServer, startRedZoneSubscriber } from './redis/redzone-subscriber';

const app = express();
app.use(express.json());

// Enforce Content-Type on POST endpoints
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.is('application/json')) {
    res.status(415).json({
      error: {
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Content-Type must be application/json',
        requestId: '',
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }
  next();
});

app.use('/entry', entryRouter);
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = parseInt(process.env['PORT'] ?? '3002', 10);
const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
const VENUE_IDS = (process.env['VENUE_IDS'] ?? '').split(',').filter(Boolean);

if (require.main === module) {
  const server = http.createServer(app);

  // Attach WebSocket server for Red_Zone push notifications (Requirement 1.5)
  attachWebSocketServer(server);

  // Subscribe to heatmap updates for each configured venue
  for (const venueId of VENUE_IDS) {
    startRedZoneSubscriber(venueId, REDIS_URL);
  }

  server.listen(PORT, () => {
    console.log(`[entry-router] Listening on port ${PORT}`);
    if (VENUE_IDS.length > 0) {
      console.log(`[entry-router] Red_Zone subscriber active for venues: ${VENUE_IDS.join(', ')}`);
    } else {
      console.log('[entry-router] No VENUE_IDS configured — Red_Zone subscriber inactive');
    }
  });
}

export default app;
