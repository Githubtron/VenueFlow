/**
 * LiveMapPage — Tasks 15.1, 15.2, 15.6
 */
import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../auth/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';
import { TopBar } from '../components/TopBar';
import { ZoneHeatmap, ZoneSnapshot } from '../components/ZoneHeatmap';
import { AnomalyAlertPanel, AnomalyAlert } from '../components/AnomalyAlertPanel';
import { GateFlowRates, GateFlowData } from '../components/GateFlowRates';
import { StaffPinsOverlay, StaffLocation } from '../components/StaffPinsOverlay';
import { RedeploymentPanel } from '../components/RedeploymentPanel';

interface HeatmapUpdate {
  venueId: string;
  zones: ZoneSnapshot[];
  gates: GateFlowData[];
  timestamp: string;
}

interface AlertUpdate {
  type: 'anomaly_alert';
  alert: AnomalyAlert;
}

// ─── Demo seed data (shown when no live backend is connected) ─────────────────

const DEMO_ZONES: ZoneSnapshot[] = [
  { zoneId: 'z1', name: 'Main Stage', currentCount: 4200, densityPercent: 84, status: 'red', capacity: 5000 },
  { zoneId: 'z2', name: 'North Stand', currentCount: 2100, densityPercent: 52, status: 'amber', capacity: 4000 },
  { zoneId: 'z3', name: 'South Stand', currentCount: 1800, densityPercent: 45, status: 'green', capacity: 4000 },
  { zoneId: 'z4', name: 'East Concourse', currentCount: 950, densityPercent: 38, status: 'green', capacity: 2500 },
  { zoneId: 'z5', name: 'West Concourse', currentCount: 1400, densityPercent: 56, status: 'amber', capacity: 2500 },
  { zoneId: 'z6', name: 'Gate A Entry', currentCount: 320, densityPercent: 64, status: 'amber', capacity: 500 },
  { zoneId: 'z7', name: 'Gate B Entry', currentCount: 180, densityPercent: 36, status: 'green', capacity: 500 },
  { zoneId: 'z8', name: 'Food Court', currentCount: 780, densityPercent: 78, status: 'red', capacity: 1000 },
  { zoneId: 'z9', name: 'VIP Lounge', currentCount: 210, densityPercent: 42, status: 'green', capacity: 500 },
  { zoneId: 'z10', name: 'Parking Zone A', currentCount: 0, densityPercent: 0, status: 'unavailable', capacity: 800 },
  { zoneId: 'z11', name: 'Medical Bay', currentCount: 12, densityPercent: 12, status: 'green', capacity: 100 },
  { zoneId: 'z12', name: 'Press Area', currentCount: 95, densityPercent: 47, status: 'green', capacity: 200 },
];

const DEMO_GATES: GateFlowData[] = [
  { gateId: 'gate-a', gateName: 'Gate A', entryRate: 42, exitRate: 8, updatedAt: new Date().toISOString() },
  { gateId: 'gate-b', gateName: 'Gate B', entryRate: 28, exitRate: 5, updatedAt: new Date().toISOString() },
  { gateId: 'gate-c', gateName: 'Gate C', entryRate: 61, exitRate: 12, updatedAt: new Date().toISOString() },
  { gateId: 'gate-d', gateName: 'Gate D', entryRate: 15, exitRate: 3, updatedAt: new Date().toISOString() },
];

const DEMO_ALERTS: AnomalyAlert[] = [
  {
    alertId: 'alert-1',
    venueId: 'venue-1',
    zoneId: 'z1',
    zoneName: 'Main Stage',
    eventId: 'event-ipl-2026',
    currentDensityPercent: 84,
    threshold: 80,
    status: 'active',
    detectedAt: new Date(Date.now() - 3 * 60_000).toISOString(),
    deploymentRecommendation: 'Deploy 3 additional staff to Main Stage — nearest available: Raj Kumar, Vikram Rao',
  },
  {
    alertId: 'alert-2',
    venueId: 'venue-1',
    zoneId: 'z8',
    zoneName: 'Food Court',
    eventId: 'event-ipl-2026',
    currentDensityPercent: 78,
    threshold: 75,
    status: 'active',
    detectedAt: new Date(Date.now() - 8 * 60_000).toISOString(),
    deploymentRecommendation: 'Open additional serving counter. Redirect attendees to Kiosk B7.',
  },
];

const DEMO_STAFF: StaffLocation[] = [
  { staffId: 's1', name: 'Raj Kumar', zoneId: 'z2', zoneName: 'North Stand', specialization: 'crowd_control', isAvailable: true },
  { staffId: 's2', name: 'Priya Singh', zoneId: 'z3', zoneName: 'South Stand', specialization: 'first_aid', isAvailable: true },
  { staffId: 's3', name: 'Amit Sharma', zoneId: 'z6', zoneName: 'Gate A Entry', specialization: 'crowd_control', isAvailable: true },
  { staffId: 's4', name: 'Neha Patel', zoneId: 'z8', zoneName: 'Food Court', specialization: 'crowd_control', isAvailable: false },
  { staffId: 's5', name: 'Vikram Rao', zoneId: 'z1', zoneName: 'Main Stage', specialization: 'security', isAvailable: true },
];

// ─── Simulate live density fluctuations ──────────────────────────────────────

function jitter(zones: ZoneSnapshot[]): ZoneSnapshot[] {
  return zones.map(z => {
    if (z.status === 'unavailable') return z;
    const delta = Math.floor(Math.random() * 40) - 20;
    const newCount = Math.max(0, Math.min(z.capacity, z.currentCount + delta));
    const newDensity = Math.round((newCount / z.capacity) * 100);
    const newStatus: ZoneSnapshot['status'] =
      newDensity >= 80 ? 'red' : newDensity >= 50 ? 'amber' : 'green';
    return { ...z, currentCount: newCount, densityPercent: newDensity, status: newStatus };
  });
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#111319' },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  main: { flex: 1, overflowY: 'auto', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20, background: '#111319' },
  sidebar: {
    width: 340, overflowY: 'auto', padding: '20px 18px',
    display: 'flex', flexDirection: 'column', gap: 20,
    background: '#111319',
    borderLeft: '1px solid rgba(255,255,255,0.05)',
  },
  eventBanner: {
    background: '#191b22',
    borderRadius: 10,
    padding: '12px 18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventName: { color: '#e2e2eb', fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' },
  eventMeta: { color: '#8c909f', fontSize: 11, marginTop: 2 },
  statRow: { display: 'flex', gap: 12 },
  statBox: {
    flex: 1, background: '#191b22', borderRadius: 10,
    padding: '14px 16px',
  },
  statVal: { color: '#e2e2eb', fontSize: 26, fontWeight: 900, lineHeight: 1 },
  statLabel: { color: '#8c909f', fontSize: 10, marginTop: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' },
};

export function LiveMapPage() {
  const { user } = useAuth();
  const venueId = user?.venueId ?? 'venue-1';

  const [zones, setZones] = useState<ZoneSnapshot[]>(DEMO_ZONES);
  const [gates] = useState<GateFlowData[]>(DEMO_GATES);
  const [alerts, setAlerts] = useState<AnomalyAlert[]>(DEMO_ALERTS);
  const [staffLocations] = useState<StaffLocation[]>(DEMO_STAFF);

  // Try live WebSocket — falls back to demo data if not connected
  const handleHeatmapMessage = useCallback((data: HeatmapUpdate) => {
    if (data.zones?.length) setZones(data.zones);
  }, []);

  const { connected } = useWebSocket<HeatmapUpdate>(
    `heatmap:${venueId}`,
    handleHeatmapMessage
  );

  const handleAlertMessage = useCallback((data: AlertUpdate) => {
    if (data.type === 'anomaly_alert') {
      setAlerts(prev => {
        const exists = prev.find(a => a.alertId === data.alert.alertId);
        return exists ? prev.map(a => a.alertId === data.alert.alertId ? data.alert : a) : [data.alert, ...prev];
      });
    }
  }, []);

  useWebSocket<AlertUpdate>(`alerts:${venueId}`, handleAlertMessage);

  // Simulate live updates every 5s when not connected to real backend
  useEffect(() => {
    if (connected) return;
    const interval = setInterval(() => setZones(prev => jitter(prev)), 5000);
    return () => clearInterval(interval);
  }, [connected]);

  const activeAlert = alerts.find(a => a.status === 'active') ?? null;
  const totalAttendees = zones.reduce((s, z) => s + z.currentCount, 0);
  const redZones = zones.filter(z => z.status === 'red').length;
  const activeStaff = staffLocations.length;

  function handleAcknowledge(alertId: string) {
    setAlerts(prev => prev.map(a => a.alertId === alertId ? { ...a, status: 'acknowledged' as const } : a));
  }

  return (
    <div style={styles.page}>
      <TopBar title="Live Map" connected={connected} />
      <div style={styles.body}>
        <main style={styles.main} aria-label="Live venue heatmap">

          {/* Connection Status Banner */}
          {!connected && (
            <div style={{
              background: 'rgba(255,180,0,0.1)',
              border: '1px solid #ffb180',
              borderRadius: 8,
              padding: '12px 16px',
              color: '#ffb180',
              fontSize: 12,
              fontWeight: 600,
              textAlign: 'center',
              marginBottom: 12,
            }}>
              ⏳ Connecting to live heatmap data…
            </div>
          )}

          {/* Event banner */}
          <div className="animate-fade-in-1" style={styles.eventBanner}>
            <div>
              <div style={styles.eventName}>🎵 IPL Finals 2026 — Narendra Modi Stadium</div>
              <div style={styles.eventMeta}>Event in progress · {new Date().toLocaleTimeString()}</div>
            </div>
            <div style={{ color: '#4ae176', fontSize: 11, fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="animate-pulse-green" style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ae176', display: 'inline-block', boxShadow: '0 0 6px rgba(74,225,118,0.7)' }} />
              Live Operation
            </div>
          </div>

          {/* KPI stats */}
          <div className="animate-fade-in-2" style={styles.statRow}>
            <div style={styles.statBox}>
              <div style={{ fontSize: 9, fontWeight: 900, color: '#c2c6d6', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>Total Attendees</div>
              <div style={{ ...styles.statVal, color: '#e2e2eb' }}>{totalAttendees.toLocaleString()}</div>
            </div>
            <div style={{ ...styles.statBox, borderLeft: '3px solid #ff5451' }}>
              <div style={{ fontSize: 9, fontWeight: 900, color: '#c2c6d6', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>Red Zones</div>
              <div style={{ ...styles.statVal, color: '#ffb3ad' }}>{redZones}</div>
            </div>
            <div style={styles.statBox}>
              <div style={{ fontSize: 9, fontWeight: 900, color: '#c2c6d6', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>Active Staff</div>
              <div style={{ ...styles.statVal, color: '#adc6ff' }}>{activeStaff}</div>
            </div>
            <div style={styles.statBox}>
              <div style={{ fontSize: 9, fontWeight: 900, color: '#c2c6d6', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>Active Alerts</div>
              <div style={{ ...styles.statVal, color: '#ffb786' }}>{alerts.filter(a => a.status === 'active').length}</div>
            </div>
          </div>

          {/* Section label */}
          <div className="animate-fade-in-3" style={{ fontSize: 9, fontWeight: 900, color: '#424754', letterSpacing: '0.25em', textTransform: 'uppercase' }}>
            Zone Density — {zones.length} Monitored Zones
          </div>

          <div className="animate-fade-in-3">
            <ZoneHeatmap zones={zones} staffPins={staffLocations.map(s => ({ staffId: s.staffId, name: s.name, zoneId: s.zoneId }))} />
          </div>

          {/* Section label */}
          <div className="animate-fade-in-4" style={{ fontSize: 9, fontWeight: 900, color: '#424754', letterSpacing: '0.25em', textTransform: 'uppercase', marginTop: 4 }}>
            Gate Control
          </div>

          <div className="animate-fade-in-4">
            <GateFlowRates gates={gates} />
          </div>
        </main>

        <aside className="animate-fade-in-5" style={styles.sidebar} aria-label="Alerts and staff panel">
          <AnomalyAlertPanel alerts={alerts} onAcknowledge={handleAcknowledge} />
          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />
          <StaffPinsOverlay staffLocations={staffLocations} highlightZoneId={activeAlert?.zoneId} />
          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />
          <RedeploymentPanel activeAlert={activeAlert} availableStaff={staffLocations} />
        </aside>
      </div>
    </div>
  );
}
