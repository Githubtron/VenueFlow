/**
 * LiveMapPage — Tasks 15.1, 15.2, 15.6
 *
 * - WebSocket subscription to `heatmap:{venueId}` (Req 6.1, 6.2)
 * - Anomaly alert panel with deployment recommendations (Req 6.3, 6.4)
 * - Staff location overlay and redeployment panel (Req 28.1, 28.2)
 */
import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../auth/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';
import { useApi } from '../hooks/useApi';
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

const styles: Record<string, React.CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  main: { flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 },
  sidebar: { width: 320, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16, borderLeft: '1px solid #2d3148' },
};

export function LiveMapPage() {
  const { user } = useAuth();
  const venueId = user?.venueId ?? '';

  const [zones, setZones] = useState<ZoneSnapshot[]>([]);
  const [gates, setGates] = useState<GateFlowData[]>([]);
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);

  // Fetch staff locations via REST (Req 28.1)
  const { data: staffData } = useApi<{ staff: StaffLocation[] }>(
    venueId ? `/staff/locations?venueId=${venueId}` : null
  );
  const staffLocations = staffData?.staff ?? [];

  // Subscribe to heatmap WebSocket channel (Req 6.1, 6.2)
  const handleHeatmapMessage = useCallback((data: HeatmapUpdate) => {
    if (data.zones) setZones(data.zones);
    if (data.gates) setGates(data.gates);
  }, []);

  const { connected } = useWebSocket<HeatmapUpdate>(
    `heatmap:${venueId}`,
    handleHeatmapMessage
  );

  // Subscribe to anomaly alerts WebSocket channel (Req 6.3)
  const handleAlertMessage = useCallback((data: AlertUpdate) => {
    if (data.type === 'anomaly_alert') {
      setAlerts((prev) => {
        const exists = prev.find((a) => a.alertId === data.alert.alertId);
        if (exists) {
          return prev.map((a) => (a.alertId === data.alert.alertId ? data.alert : a));
        }
        return [data.alert, ...prev];
      });
    }
  }, []);

  useWebSocket<AlertUpdate>(`alerts:${venueId}`, handleAlertMessage);

  // Poll staff locations every 10s
  useEffect(() => {
    if (!venueId) return;
    const interval = setInterval(() => {
      // useApi handles refetch; this is a placeholder for polling logic
    }, 10_000);
    return () => clearInterval(interval);
  }, [venueId]);

  const activeAlert = alerts.find((a) => a.status === 'active') ?? null;

  function handleAcknowledge(alertId: string) {
    setAlerts((prev) =>
      prev.map((a) => (a.alertId === alertId ? { ...a, status: 'acknowledged' } : a))
    );
    // Fire-and-forget API call
    fetch(`/api/alerts/${alertId}/acknowledge`, { method: 'POST' }).catch(() => {});
  }

  return (
    <div style={styles.page}>
      <TopBar title="Live Map" connected={connected} />
      <div style={styles.body}>
        <main style={styles.main} aria-label="Live venue heatmap">
          <ZoneHeatmap
            zones={zones}
            staffPins={staffLocations.map((s) => ({
              staffId: s.staffId,
              name: s.name,
              zoneId: s.zoneId,
            }))}
          />
          <GateFlowRates gates={gates} />
        </main>
        <aside style={styles.sidebar} aria-label="Alerts and staff panel">
          <AnomalyAlertPanel alerts={alerts} onAcknowledge={handleAcknowledge} />
          <StaffPinsOverlay
            staffLocations={staffLocations}
            highlightZoneId={activeAlert?.zoneId}
          />
          <RedeploymentPanel
            activeAlert={activeAlert}
            availableStaff={staffLocations}
          />
        </aside>
      </div>
    </div>
  );
}
