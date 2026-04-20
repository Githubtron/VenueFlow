import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { getKioskAnalytics, recordTransaction } from '../analytics';
import { updateInventory, getInventory } from '../inventory';
import { getKioskSLAReport, createOrder, recordOrderFulfillment } from '../sla';
import { computeDemandScore, generatePricingSuggestions } from '../pricing';

export function createVendorRouter(pool: Pool, redis: Redis): Router {
  const router = Router();

  // GET /vendors/:venueId/kiosks/:kioskId/analytics
  router.get('/:venueId/kiosks/:kioskId/analytics', async (req: Request, res: Response): Promise<void> => {
    const { venueId, kioskId } = req.params;
    const { eventId } = req.query as { eventId?: string };
    if (!eventId) { res.status(400).json({ error: 'eventId is required' }); return; }
    try {
      const analytics = await getKioskAnalytics(pool, venueId, kioskId, eventId);
      res.json(analytics);
    } catch (err) {
      console.error('[vendor-intelligence] analytics error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /vendors/:venueId/kiosks/:kioskId/transactions
  router.post('/:venueId/kiosks/:kioskId/transactions', async (req: Request, res: Response): Promise<void> => {
    const { venueId, kioskId } = req.params;
    const { eventId, amount } = req.body as { eventId?: string; amount?: number };
    if (!eventId || amount === undefined) { res.status(400).json({ error: 'eventId and amount are required' }); return; }
    try {
      await recordTransaction(pool, kioskId, venueId, eventId, amount);
      res.status(201).json({ status: 'recorded' });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /vendors/kiosks/:kioskId/inventory
  router.post('/kiosks/:kioskId/inventory', async (req: Request, res: Response): Promise<void> => {
    const { kioskId } = req.params;
    const { venueId, itemName, currentStock } = req.body as { venueId?: string; itemName?: string; currentStock?: number };
    if (!venueId || !itemName || currentStock === undefined) { res.status(400).json({ error: 'venueId, itemName, currentStock required' }); return; }
    try {
      const result = await updateInventory(pool, redis, kioskId, venueId, itemName, currentStock);
      res.json({ kioskId, itemName, currentStock, alertTriggered: result.depleted });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /vendors/kiosks/:kioskId/inventory
  router.get('/kiosks/:kioskId/inventory', async (req: Request, res: Response): Promise<void> => {
    const { kioskId } = req.params;
    try {
      const items = await getInventory(pool, kioskId);
      res.json({ kioskId, items });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /vendors/kiosks/:kioskId/pricing-suggestions
  router.get('/kiosks/:kioskId/pricing-suggestions', async (req: Request, res: Response): Promise<void> => {
    const { kioskId } = req.params;
    const { predictedWait, footfall, baselineFootfall } = req.query as Record<string, string>;
    const demandScore = computeDemandScore(
      parseFloat(predictedWait ?? '0'),
      parseInt(footfall ?? '0', 10),
      parseInt(baselineFootfall ?? '100', 10),
    );
    const suggestions = generatePricingSuggestions(kioskId, [], demandScore);
    res.json({ kioskId, demandScore, suggestions });
  });

  // GET /vendors/kiosks/:kioskId/sla
  router.get('/kiosks/:kioskId/sla', async (req: Request, res: Response): Promise<void> => {
    const { kioskId } = req.params;
    const { eventId } = req.query as { eventId?: string };
    if (!eventId) { res.status(400).json({ error: 'eventId is required' }); return; }
    try {
      const report = await getKioskSLAReport(pool, kioskId, eventId);
      res.json(report);
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
