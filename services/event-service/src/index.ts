// Event Service — VenueFlow
// Manages EventSession lifecycle for multi-event support.
// Validates: Requirements 19.1

import express from 'express';
import eventsRouter from './routes/events';

const app = express();
app.use(express.json());

app.use('/events', eventsRouter);
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = parseInt(process.env['PORT'] ?? '3007', 10);
if (require.main === module) {
  app.listen(PORT, () => console.log(`[event-service] Listening on port ${PORT}`));
}

export default app;
