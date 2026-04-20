/**
 * Wayfinding Engine — /navigate routes
 *
 * POST /navigate           — compute route
 * POST /navigate/recalculate — recalculate avoiding Red_Zones
 */
import { Router, Request, Response } from 'express';
import { computeRoute } from '../graph/dijkstra';
import { VenueGraph } from '../graph/types';

const router = Router();

// In production, graphs are loaded from S3 per venueId.
// For now, use an in-memory registry populated via /admin/graph.
const graphRegistry = new Map<string, VenueGraph>();

export function registerGraph(venueId: string, graph: VenueGraph): void {
  graphRegistry.set(venueId, graph);
}

router.post('/', (req: Request, res: Response): void => {
  const { venueId, fromNodeId, toNodeId, accessibility, redZoneIds } = req.body as {
    venueId?: string;
    fromNodeId?: string;
    toNodeId?: string;
    accessibility?: boolean;
    redZoneIds?: string[];
  };

  if (!venueId || !fromNodeId || !toNodeId) {
    res.status(400).json({ error: 'venueId, fromNodeId, and toNodeId are required' });
    return;
  }

  const graph = graphRegistry.get(venueId);
  if (!graph) {
    res.status(404).json({ error: `No venue graph found for venueId: ${venueId}` });
    return;
  }

  const route = computeRoute(graph, fromNodeId, toNodeId, {
    accessibilityMode: accessibility ?? false,
    redZoneIds: new Set(redZoneIds ?? []),
  });

  if (!route) {
    res.status(404).json({ error: 'No route found between the specified nodes' });
    return;
  }

  res.json(route);
});

router.post('/recalculate', (req: Request, res: Response): void => {
  const { venueId, fromNodeId, toNodeId, accessibility, redZoneIds } = req.body as {
    venueId?: string;
    fromNodeId?: string;
    toNodeId?: string;
    accessibility?: boolean;
    redZoneIds?: string[];
  };

  if (!venueId || !fromNodeId || !toNodeId) {
    res.status(400).json({ error: 'venueId, fromNodeId, and toNodeId are required' });
    return;
  }

  const graph = graphRegistry.get(venueId);
  if (!graph) {
    res.status(404).json({ error: `No venue graph found for venueId: ${venueId}` });
    return;
  }

  const route = computeRoute(graph, fromNodeId, toNodeId, {
    accessibilityMode: accessibility ?? false,
    redZoneIds: new Set(redZoneIds ?? []),
  });

  if (!route) {
    res.status(404).json({ error: 'No alternate route found avoiding Red_Zones' });
    return;
  }

  res.json(route);
});

export default router;
