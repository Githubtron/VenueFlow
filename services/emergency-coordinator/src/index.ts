// Emergency Coordinator — VenueFlow
// Handles SOS signal ingestion, zone evacuation orchestration, PA system integration,
// medical SOS, and offline evacuation route delivery.

import express from 'express';
import emergencyRouter from './routes/emergency';
import medicalRouter from './routes/medical';

const app = express();
app.use(express.json());
app.use('/emergency', emergencyRouter);
app.use('/medical', medicalRouter);
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = parseInt(process.env['PORT'] ?? '3008', 10);

if (require.main === module) {
  app.listen(PORT, () => console.log(`[emergency-coordinator] Listening on port ${PORT}`));
}

export default app;
