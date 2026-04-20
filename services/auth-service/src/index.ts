// Auth Service — VenueFlow
// Handles JWT authentication (RS256), token refresh, RBAC middleware,
// and GDPR account deletion/anonymization.
//
// Endpoints:
//   POST   /auth/register
//   POST   /auth/login
//   POST   /auth/refresh
//   GET    /auth/me
//   DELETE /auth/account
//   GET    /auth/.well-known/jwks.json

import 'dotenv/config';
import express from 'express';
import { initKeys } from './keys';
import authRouter from './routes/auth';

initKeys();

const app = express();

app.use(express.json());

// Mount auth routes
app.use('/auth', authRouter);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = parseInt(process.env.PORT ?? '3001', 10);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[auth-service] Listening on port ${PORT}`);
  });
}

export default app;
