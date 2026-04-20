/**
 * Dijkstra shortest-path routing on venue floor graph.
 *
 * Red_Zone nodes are assigned infinite weight (Property 11).
 * Accessibility mode removes non-accessible edges (Property 12).
 */
import { VenueGraph, GraphEdge, ComputedRoute, RouteStep } from './types';
import { v4 as uuidv4 } from 'uuid';

const INFINITY = Number.MAX_SAFE_INTEGER;
const WALK_SPEED_MPS = 1.2; // metres per second

export interface RouteOptions {
  accessibilityMode?: boolean;
  redZoneIds?: Set<string>;
}

/**
 * Compute shortest path from source to destination using Dijkstra.
 * Returns null if no path exists.
 */
export function computeRoute(
  graph: VenueGraph,
  fromNodeId: string,
  toNodeId: string,
  options: RouteOptions = {},
): ComputedRoute | null {
  const { accessibilityMode = false, redZoneIds = new Set<string>() } = options;

  const nodes = graph.nodes;
  if (!nodes[fromNodeId] || !nodes[toNodeId]) return null;

  // Build adjacency list, filtering edges based on options
  const adj = new Map<string, { toNodeId: string; edge: GraphEdge }[]>();
  for (const nodeId of Object.keys(nodes)) adj.set(nodeId, []);

  for (const edge of graph.edges) {
    // Skip non-accessible edges in accessibility mode (Property 12)
    if (accessibilityMode && (!edge.isAccessible || edge.isStairs)) continue;

    const fromList = adj.get(edge.fromNodeId);
    if (fromList) fromList.push({ toNodeId: edge.toNodeId, edge });

    // Undirected graph — add reverse edge too
    const toList = adj.get(edge.toNodeId);
    if (toList) toList.push({ toNodeId: edge.fromNodeId, edge });
  }

  // Dijkstra
  const dist = new Map<string, number>();
  const prev = new Map<string, { nodeId: string; edge: GraphEdge } | null>();
  const visited = new Set<string>();

  for (const nodeId of Object.keys(nodes)) dist.set(nodeId, INFINITY);
  dist.set(fromNodeId, 0);
  prev.set(fromNodeId, null);

  const queue = new Set<string>(Object.keys(nodes));

  while (queue.size > 0) {
    // Find unvisited node with minimum distance
    let u: string | null = null;
    let minDist = INFINITY;
    for (const nodeId of queue) {
      const d = dist.get(nodeId) ?? INFINITY;
      if (d < minDist) { minDist = d; u = nodeId; }
    }

    if (u === null || minDist === INFINITY) break;
    if (u === toNodeId) break;

    queue.delete(u);
    visited.add(u);

    const neighbors = adj.get(u) ?? [];
    for (const { toNodeId: v, edge } of neighbors) {
      if (visited.has(v)) continue;

      const node = nodes[v];
      // Red_Zone nodes get infinite weight (Property 11)
      const zoneWeight = redZoneIds.has(node?.zoneId ?? '') ? INFINITY : 0;
      const edgeCost = edge.distanceMeters + zoneWeight;

      const alt = (dist.get(u) ?? INFINITY) + edgeCost;
      if (alt < (dist.get(v) ?? INFINITY)) {
        dist.set(v, alt);
        prev.set(v, { nodeId: u, edge });
      }
    }
  }

  if ((dist.get(toNodeId) ?? INFINITY) === INFINITY) return null;

  // Reconstruct path
  const path: { nodeId: string; edge: GraphEdge | null }[] = [];
  let current: string | null = toNodeId;
  while (current !== null) {
    const p = prev.get(current);
    path.unshift({ nodeId: current, edge: p?.edge ?? null });
    current = p?.nodeId ?? null;
  }

  // Build steps
  const avoidedZones: string[] = [];
  const steps: RouteStep[] = [];
  let totalDistance = 0;

  for (let i = 1; i < path.length; i++) {
    const { nodeId, edge } = path[i];
    const node = nodes[nodeId];
    if (!edge) continue;

    totalDistance += edge.distanceMeters;

    const instruction = `Head to node ${nodeId} (floor ${node.floorLevel})`;
    const audioInstruction = `In ${Math.round(edge.distanceMeters)} metres, continue to floor ${node.floorLevel}`;

    steps.push({
      instruction,
      distanceMeters: edge.distanceMeters,
      floorLevel: node.floorLevel,
      audioInstruction,
      nodeId,
      zoneId: node.zoneId,
    });
  }

  return {
    routeId: uuidv4(),
    fromNodeId,
    toNodeId,
    steps,
    totalDistanceMeters: totalDistance,
    estimatedMinutes: Math.ceil(totalDistance / WALK_SPEED_MPS / 60),
    avoidedZones,
    isAccessible: accessibilityMode,
  };
}
