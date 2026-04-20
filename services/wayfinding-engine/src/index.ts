// Wayfinding Engine — VenueFlow
// Dijkstra routing on venue floor graph, Red_Zone avoidance, accessibility mode.

import express from 'express';
import navigateRouter from './routes/navigate';

const app = express();
app.use(express.json());
app.use('/navigate', navigateRouter);
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = parseInt(process.env['PORT'] ?? '3004', 10);

if (require.main === module) {
  app.listen(PORT, () => console.log(`[wayfinding-engine] Listening on port ${PORT}`));
}

export default app;
