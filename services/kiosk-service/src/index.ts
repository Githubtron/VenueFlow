/**
 * Kiosk Service — VenueFlow
 *
 * Seat-to-kiosk ordering: create orders, advance status, notify on ready.
 *
 * Endpoints:
 *   POST   /orders                  — create order
 *   PATCH  /orders/:orderId/status  — update order status
 *   GET    /orders/:orderId         — fetch order
 *   GET    /health                  — health check
 *
 * Requirements: 3.4
 */
import express from 'express';
import ordersRouter from './routes/orders';

const app = express();
app.use(express.json());

app.use('/orders', ordersRouter);
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = parseInt(process.env['PORT'] ?? '3006', 10);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[kiosk-service] Listening on port ${PORT}`);
  });
}

export default app;
