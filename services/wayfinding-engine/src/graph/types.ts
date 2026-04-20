/** Venue floor graph types for Dijkstra routing. */

export interface GraphNode {
  nodeId: string;
  zoneId: string;
  floorLevel: number;
  isAccessible: boolean;
  x: number;
  y: number;
}

export interface GraphEdge {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  distanceMeters: number;
  floorLevel: number;
  isAccessible: boolean;
  zoneId: string;
  isStairs: boolean;
}

export interface VenueGraph {
  venueId: string;
  nodes: Record<string, GraphNode>;
  edges: GraphEdge[];
}

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  beaconId?: string;
  floorLevel: number;
  audioInstruction?: string;
  nodeId: string;
  zoneId: string;
}

export interface ComputedRoute {
  routeId: string;
  fromNodeId: string;
  toNodeId: string;
  steps: RouteStep[];
  totalDistanceMeters: number;
  estimatedMinutes: number;
  avoidedZones: string[];
  isAccessible: boolean;
}
