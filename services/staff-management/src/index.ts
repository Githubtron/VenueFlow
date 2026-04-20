// Staff & Resource Management Service — VenueFlow
// Live location tracking, dynamic redeployment, shift scheduling, incident SLA.

import express from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { updateStaffLocation, getStaffLocations } from './location';
import { getRedeploymentSuggestions } from './redeployment';
import { createShift, getShifts, updateShift } from './shifts';
import { assignIncident, resolveIncident, getStaffIncidents } from './incidents';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] ?? 'postgresql://venueflow:venueflow_dev@localhost:5432/venueflow' });
const redis = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379');

const app = express();
app.use(express.json());

// Staff location
app.post('/staff/location', async (req, res) => {
  const { staffId, venueId, zoneId, latitude, longitude } = req.body;
  if (!staffId || !venueId || !zoneId) { res.status(400).json({ error: 'staffId, venueId, zoneId required' }); return; }
  try {
    await updateStaffLocation(pool, redis, staffId, venueId, zoneId, latitude, longitude);
    res.json({ status: 'updated' });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

app.get('/staff/locations', async (req, res) => {
  const { venueId, staffIds } = req.query as { venueId?: string; staffIds?: string };
  if (!venueId) { res.status(400).json({ error: 'venueId required' }); return; }
  const ids = staffIds ? staffIds.split(',') : [];
  const locations = await getStaffLocations(redis, venueId, ids);
  res.json({ venueId, locations });
});

// Redeployment suggestions
app.get('/staff/redeployment-suggestions', async (req, res) => {
  const { venueId, zoneId } = req.query as { venueId?: string; zoneId?: string };
  if (!venueId || !zoneId) { res.status(400).json({ error: 'venueId and zoneId required' }); return; }
  const suggestions = await getRedeploymentSuggestions(redis, venueId, zoneId);
  res.json({ venueId, zoneId, suggestions });
});

// Shifts
app.post('/staff/shifts', async (req, res) => {
  const { staffId, venueId, eventId, assignedZoneId, startTime, endTime, role } = req.body;
  if (!staffId || !venueId || !eventId || !assignedZoneId || !startTime || !endTime) {
    res.status(400).json({ error: 'Missing required shift fields' }); return;
  }
  try {
    const shift = await createShift(pool, staffId, venueId, eventId, assignedZoneId, startTime, endTime, role);
    res.status(201).json(shift);
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

app.get('/staff/shifts', async (req, res) => {
  const { venueId, date } = req.query as { venueId?: string; date?: string };
  if (!venueId || !date) { res.status(400).json({ error: 'venueId and date required' }); return; }
  const shifts = await getShifts(pool, venueId, date);
  res.json({ venueId, date, shifts });
});

app.patch('/staff/shifts/:shiftId', async (req, res) => {
  const { shiftId } = req.params;
  await updateShift(pool, shiftId, req.body);
  res.json({ status: 'updated', shiftId });
});

// Incident assignment
app.post('/incidents/:incidentId/assign', async (req, res) => {
  const { incidentId } = req.params;
  const { staffId, venueId, slaThresholdSeconds } = req.body;
  if (!staffId || !venueId) { res.status(400).json({ error: 'staffId and venueId required' }); return; }
  const assignment = await assignIncident(pool, incidentId, staffId, venueId, slaThresholdSeconds);
  res.status(201).json(assignment);
});

app.patch('/incidents/:incidentId/resolve', async (req, res) => {
  const { incidentId } = req.params;
  const result = await resolveIncident(pool, incidentId);
  if (!result) { res.status(404).json({ error: 'Incident not found' }); return; }
  res.json(result);
});

app.get('/staff/:staffId/incidents', async (req, res) => {
  const { staffId } = req.params;
  const incidents = await getStaffIncidents(pool, staffId);
  res.json({ staffId, incidents });
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = parseInt(process.env['PORT'] ?? '3007', 10);
if (require.main === module) {
  app.listen(PORT, () => console.log(`[staff-management] Listening on port ${PORT}`));
}

export default app;
