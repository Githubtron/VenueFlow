/**
 * SQLite schema initialization using expo-sqlite.
 * Tables: sync_queue, venue_graph, emergency_exits, tickets
 * Requirements: 10.1, 10.3
 */
import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('venueflow.db');
  await initSchema(db);
  return db;
}

async function initSchema(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('entry_event', 'sos_signal', 'incident_report')),
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      retry_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'failed'))
    );

    CREATE TABLE IF NOT EXISTS venue_graph (
      edge_id TEXT PRIMARY KEY,
      from_node_id TEXT NOT NULL,
      to_node_id TEXT NOT NULL,
      distance_meters REAL NOT NULL,
      floor_level INTEGER NOT NULL,
      is_accessible INTEGER NOT NULL DEFAULT 0,
      zone_id TEXT NOT NULL,
      venue_id TEXT NOT NULL,
      cached_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS emergency_exits (
      zone_id TEXT PRIMARY KEY,
      exit_node_ids TEXT NOT NULL,
      instructions TEXT NOT NULL,
      estimated_minutes REAL NOT NULL,
      venue_id TEXT NOT NULL,
      cached_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS tickets (
      ticket_id TEXT PRIMARY KEY,
      attendee_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      seat_section TEXT NOT NULL,
      seat_row TEXT NOT NULL,
      seat_number TEXT NOT NULL,
      jwt TEXT NOT NULL,
      venue_public_key TEXT,
      cached_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS ble_mesh_payloads (
      payload_id TEXT PRIMARY KEY,
      alert_type TEXT NOT NULL,
      zone_id TEXT NOT NULL,
      message TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS ble_mesh_seen (
      payload_id TEXT PRIMARY KEY,
      seen_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status, type);
    CREATE INDEX IF NOT EXISTS idx_venue_graph_venue ON venue_graph(venue_id);
    CREATE INDEX IF NOT EXISTS idx_emergency_exits_venue ON emergency_exits(venue_id);
    CREATE INDEX IF NOT EXISTS idx_ble_mesh_payloads_zone ON ble_mesh_payloads(zone_id);
  `);
}

// ─── Sync Queue ───────────────────────────────────────────────────────────────

export type SyncItemType = 'entry_event' | 'sos_signal' | 'incident_report';

export interface SyncQueueItem {
  id: number;
  type: SyncItemType;
  payload: string;
  created_at: number;
  retry_count: number;
  status: 'pending' | 'processing' | 'failed';
}

export async function enqueueSyncItem(
  type: SyncItemType,
  payload: object
): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    'INSERT INTO sync_queue (type, payload) VALUES (?, ?)',
    [type, JSON.stringify(payload)]
  );
}

export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  const database = await getDb();
  return database.getAllAsync<SyncQueueItem>(
    "SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY type DESC, created_at ASC"
  );
}

export async function markSyncItemProcessing(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    "UPDATE sync_queue SET status = 'processing' WHERE id = ?",
    [id]
  );
}

export async function deleteSyncItem(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
}

export async function incrementSyncRetry(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    "UPDATE sync_queue SET retry_count = retry_count + 1, status = 'pending' WHERE id = ?",
    [id]
  );
}

// ─── Venue Graph ──────────────────────────────────────────────────────────────

export interface VenueGraphEdgeRow {
  edge_id: string;
  from_node_id: string;
  to_node_id: string;
  distance_meters: number;
  floor_level: number;
  is_accessible: number;
  zone_id: string;
  venue_id: string;
}

export async function saveVenueGraph(
  venueId: string,
  edges: VenueGraphEdgeRow[]
): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM venue_graph WHERE venue_id = ?', [venueId]);
  for (const edge of edges) {
    await database.runAsync(
      `INSERT INTO venue_graph
        (edge_id, from_node_id, to_node_id, distance_meters, floor_level, is_accessible, zone_id, venue_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        edge.edge_id,
        edge.from_node_id,
        edge.to_node_id,
        edge.distance_meters,
        edge.floor_level,
        edge.is_accessible,
        edge.zone_id,
        edge.venue_id,
      ]
    );
  }
}

export async function getVenueGraph(venueId: string): Promise<VenueGraphEdgeRow[]> {
  const database = await getDb();
  return database.getAllAsync<VenueGraphEdgeRow>(
    'SELECT * FROM venue_graph WHERE venue_id = ?',
    [venueId]
  );
}

// ─── Emergency Exits ──────────────────────────────────────────────────────────

export interface EmergencyExitRow {
  zone_id: string;
  exit_node_ids: string;
  instructions: string;
  estimated_minutes: number;
  venue_id: string;
}

export async function saveEmergencyExits(
  venueId: string,
  exits: Array<{ zoneId: string; exitNodeIds: string[]; instructions: string[]; estimatedMinutes: number }>
): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM emergency_exits WHERE venue_id = ?', [venueId]);
  for (const exit of exits) {
    await database.runAsync(
      `INSERT INTO emergency_exits (zone_id, exit_node_ids, instructions, estimated_minutes, venue_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        exit.zoneId,
        JSON.stringify(exit.exitNodeIds),
        JSON.stringify(exit.instructions),
        exit.estimatedMinutes,
        venueId,
      ]
    );
  }
}

export async function getEmergencyExit(zoneId: string): Promise<EmergencyExitRow | null> {
  const database = await getDb();
  return database.getFirstAsync<EmergencyExitRow>(
    'SELECT * FROM emergency_exits WHERE zone_id = ?',
    [zoneId]
  );
}

// ─── Tickets ──────────────────────────────────────────────────────────────────

export interface TicketRow {
  ticket_id: string;
  attendee_id: string;
  event_id: string;
  seat_section: string;
  seat_row: string;
  seat_number: string;
  jwt: string;
  venue_public_key: string | null;
}

export async function saveTicket(ticket: TicketRow): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `INSERT OR REPLACE INTO tickets
      (ticket_id, attendee_id, event_id, seat_section, seat_row, seat_number, jwt, venue_public_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ticket.ticket_id,
      ticket.attendee_id,
      ticket.event_id,
      ticket.seat_section,
      ticket.seat_row,
      ticket.seat_number,
      ticket.jwt,
      ticket.venue_public_key,
    ]
  );
}

export async function getTicketByEvent(eventId: string): Promise<TicketRow | null> {
  const database = await getDb();
  return database.getFirstAsync<TicketRow>(
    'SELECT * FROM tickets WHERE event_id = ?',
    [eventId]
  );
}

export async function getAllTickets(): Promise<TicketRow[]> {
  const database = await getDb();
  return database.getAllAsync<TicketRow>('SELECT * FROM tickets');
}
