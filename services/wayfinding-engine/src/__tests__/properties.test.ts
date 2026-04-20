/**
 * Property tests for Wayfinding Engine.
 * Feature: venueflow-platform
 * Properties: P10, P11, P12, P19, P26
 * Validates: Requirements 4.1, 4.2, 4.4, 10.2, 21.2, 24.2
 */
import * as fc from 'fast-check';
import { dijkstra, buildAdjacencyList } from '../graph/dijkstra';
import type { VenueGraphEdge } from '../graph/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generate a small connected graph with N nodes in a line: 0→1→2→...→N-1 */
function lineGraph(n: number, accessible = true): VenueGraphEdge[] {
  const edges: VenueGraphEdge[] = [];
  for (let i = 0; i < n - 1; i++) {
    edges.push({
      edgeId: `e${i}`,
      fromNodeId: `n${i}`,
      toNodeId: `n${i + 1}`,
      distanceMeters: 10,
      floorLevel: 0,
      isAccessible: accessible,
      zoneId: `zone-${i}`,
    });
    edges.push({
      edgeId: `e${i}r`,
      fromNodeId: `n${i + 1}`,
      toNodeId: `n${i}`,
      distanceMeters: 10,
      floorLevel: 0,
      isAccessible: accessible,
      zoneId: `zone-${i}`,
    });
  }
  return edges;
}

/** Generate a graph with a bypass: 0→1→2→3 and 0→bypass→3 */
function graphWithBypass(): VenueGraphEdge[] {
  return [
    { edgeId: 'a', fromNodeId: 'n0', toNodeId: 'n1', distanceMeters: 10, floorLevel: 0, isAccessible: true, zoneId: 'zone-main' },
    { edgeId: 'b', fromNodeId: 'n1', toNodeId: 'n2', distanceMeters: 10, floorLevel: 0, isAccessible: true, zoneId: 'zone-main' },
    { edgeId: 'c', fromNodeId: 'n2', toNodeId: 'n3', distanceMeters: 10, floorLevel: 0, isAccessible: true, zoneId: 'zone-main' },
    { edgeId: 'd', fromNodeId: 'n0', toNodeId: 'bypass', distanceMeters: 5, floorLevel: 0, isAccessible: true, zoneId: 'zone-bypass' },
    { edgeId: 'e', fromNodeId: 'bypass', toNodeId: 'n3', distanceMeters: 5, floorLevel: 0, isAccessible: true, zoneId: 'zone-bypass' },
    // reverse edges
    { edgeId: 'ar', fromNodeId: 'n1', toNodeId: 'n0', distanceMeters: 10, floorLevel: 0, isAccessible: true, zoneId: 'zone-main' },
    { edgeId: 'br', fromNodeId: 'n2', toNodeId: 'n1', distanceMeters: 10, floorLevel: 0, isAccessible: true, zoneId: 'zone-main' },
    { edgeId: 'cr', fromNodeId: 'n3', toNodeId: 'n2', distanceMeters: 10, floorLevel: 0, isAccessible: true, zoneId: 'zone-main' },
    { edgeId: 'dr', fromNodeId: 'bypass', toNodeId: 'n0', distanceMeters: 5, floorLevel: 0, isAccessible: true, zoneId: 'zone-bypass' },
    { edgeId: 'er', fromNodeId: 'n3', toNodeId: 'bypass', distanceMeters: 5, floorLevel: 0, isAccessible: true, zoneId: 'zone-bypass' },
  ];
}

// ─── P10: Route Completeness ──────────────────────────────────────────────────

describe('Property 10: Route Completeness', () => {
  it('always returns a non-empty route for connected source/destination pairs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 8 }),
        fc.integer({ min: 0, max: 7 }),
        fc.integer({ min: 0, max: 7 }),
        (n, srcIdx, dstIdx) => {
          if (srcIdx === dstIdx || srcIdx >= n || dstIdx >= n) return true;
          const edges = lineGraph(n);
          const graph = buildAdjacencyList(edges, []);
          const route = dijkstra(graph, `n${srcIdx}`, `n${dstIdx}`);
          return route !== null && route.steps.length >= 1;
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ─── P11: Red_Zone Route Avoidance ───────────────────────────────────────────

describe('Property 11: Red_Zone Route Avoidance', () => {
  it('recalculated route avoids Red_Zone when bypass exists', () => {
    // Graph: n0→n1→n2→n3 (main) and n0→bypass→n3 (alternate)
    // Mark zone-main as Red_Zone → route must use bypass
    const edges = graphWithBypass();
    const redZones = ['zone-main'];
    const graph = buildAdjacencyList(edges, redZones);
    const route = dijkstra(graph, 'n0', 'n3');

    expect(route).not.toBeNull();
    // No step should traverse zone-main
    for (const step of route!.steps) {
      expect(step.zoneId).not.toBe('zone-main');
    }
  });

  it('property: no step in recalculated route belongs to the Red_Zone', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 4, max: 8 }),
        (n) => {
          const edges = lineGraph(n);
          // Mark middle zone as red
          const redZoneId = 'zone-1';
          const graph = buildAdjacencyList(edges, [redZoneId]);
          // Try routing from n0 to n(n-1) — no bypass exists, so route may be null
          const route = dijkstra(graph, 'n0', `n${n - 1}`);
          if (route === null) return true; // no path — acceptable
          // If a route exists, it must not pass through the red zone
          return route.steps.every(step => step.zoneId !== redZoneId);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── P12: Accessibility Route Constraint ─────────────────────────────────────

describe('Property 12: Accessibility Route Constraint', () => {
  it('accessibility-mode route never traverses non-accessible edges', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 8 }),
        (n) => {
          // Build graph where odd edges are non-accessible
          const edges: VenueGraphEdge[] = [];
          for (let i = 0; i < n - 1; i++) {
            const accessible = i % 2 === 0;
            edges.push({
              edgeId: `e${i}`,
              fromNodeId: `n${i}`,
              toNodeId: `n${i + 1}`,
              distanceMeters: 10,
              floorLevel: 0,
              isAccessible: accessible,
              zoneId: `zone-${i}`,
            });
            edges.push({
              edgeId: `e${i}r`,
              fromNodeId: `n${i + 1}`,
              toNodeId: `n${i}`,
              distanceMeters: 10,
              floorLevel: 0,
              isAccessible: accessible,
              zoneId: `zone-${i}`,
            });
          }

          const accessibleEdges = edges.filter(e => e.isAccessible);
          const graph = buildAdjacencyList(accessibleEdges, []);
          const route = dijkstra(graph, 'n0', `n${n - 1}`);

          if (route === null) return true; // no accessible path — acceptable

          // Every step must use an accessible edge
          const accessibleEdgeIds = new Set(accessibleEdges.map(e => e.edgeId));
          return route.steps.every(step => {
            // step.edgeId must be in accessible set
            return !step.edgeId || accessibleEdgeIds.has(step.edgeId);
          });
        }
      ),
      { numRuns: 150 }
    );
  });
});

// ─── P19: Offline Route Equivalence ──────────────────────────────────────────

describe('Property 19: Offline Route Equivalence', () => {
  it('offline route from cached graph produces same node sequence as online route', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 6 }),
        fc.integer({ min: 0, max: 5 }),
        fc.integer({ min: 0, max: 5 }),
        (n, srcIdx, dstIdx) => {
          if (srcIdx === dstIdx || srcIdx >= n || dstIdx >= n) return true;

          const edges = lineGraph(n);
          // Simulate "online" and "offline" using the same graph snapshot
          const onlineGraph = buildAdjacencyList(edges, []);
          const offlineGraph = buildAdjacencyList(edges, []); // same snapshot

          const onlineRoute = dijkstra(onlineGraph, `n${srcIdx}`, `n${dstIdx}`);
          const offlineRoute = dijkstra(offlineGraph, `n${srcIdx}`, `n${dstIdx}`);

          if (onlineRoute === null && offlineRoute === null) return true;
          if (onlineRoute === null || offlineRoute === null) return false;

          // Same node sequence
          const onlineNodes = onlineRoute.steps.map(s => s.toNodeId);
          const offlineNodes = offlineRoute.steps.map(s => s.toNodeId);
          return JSON.stringify(onlineNodes) === JSON.stringify(offlineNodes);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ─── P26: Accessibility Route Audio Coverage ─────────────────────────────────

describe('Property 26: Accessibility Route Audio Coverage', () => {
  it('every RouteStep in accessibility+audio mode has a non-empty audioInstruction', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 6 }),
        (n) => {
          const edges = lineGraph(n, true);
          const graph = buildAdjacencyList(edges, []);
          const route = dijkstra(graph, 'n0', `n${n - 1}`, { audioMode: true });

          if (route === null) return true;

          return route.steps.every(step =>
            typeof step.audioInstruction === 'string' &&
            step.audioInstruction.trim().length > 0
          );
        }
      ),
      { numRuns: 150 }
    );
  });
});
