// Vendor & Concession Intelligence Service — VenueFlow
// Per-kiosk analytics, inventory alerts, dynamic pricing, SLA tracking.

import express from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { createVendorRouter } from './routes/vendor';

const pool = new Pool({
  connectionString: process.env['DATABASE_URL'] ?? 'postgresql://venueflow:venueflow_dev@localhost:5432/venueflow',
});
const redis = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379');

const app = express();
app.use(express.json());
app.use('/vendors', createVendorRouter(pool, redis));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = parseInt(process.env['PORT'] ?? '3006', 10);
if (require.main === module) {
  app.listen(PORT, () => console.log(`[vendor-intelligence] Listening on port ${PORT}`));
}

export default app;
