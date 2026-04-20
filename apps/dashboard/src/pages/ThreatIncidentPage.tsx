/**
 * ThreatIncidentPage — Task 26.2
 *
 * - Active threat alerts (suspicious movement, unauthorized access, watchlist match) (Req 18.1, 18.2)
 * - AI-prioritized incident report feed with real-time updates (Req 23.1, 23.2)
 */
import React, { useState, useCallback } from 'react';
import { useAuth } from '../auth/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';
import { useApi, apiFetch } from '../hooks/useApi';
import { TopBar } from '../components/TopBar';

type ThreatType = 'suspicious_movement' | 'unauthorized_access' | 'watchlist_match';
type ThreatStatus = 'active' | 'resolved' | 'investigating';
type IncidentPriority = 'critical' | 'high' | 'medium' | 'low';

interface ThreatAlert {
  alertId: string;
  type: ThreatType;
  zoneId: string;
  zoneName: string;
  description: string;
  timestamp: string;
  status: ThreatStatus;
  aiConfidence: number;
}

interface IncidentReport {
  reportId: string;
  title: string;
  description: string;
  priority: IncidentPriority;
  zoneId: string;
  zoneName: string;
  timestamp: string;
  reportedBy: string;
  aiSummary?: string;
}

interface ThreatUpdate {
  type: 'threat_new' | 'threat_update' | 'incident_new';
  alert?: ThreatAlert;
  incident?: IncidentReport;
}

const THREAT_LABELS: Record<ThreatType, string> = {
  suspicious_movement: 'Suspicious Movement',
  unauthorized_access: 'Unauthorized Access',
  watchlist_match: 'Watchlist Match',
};

const PRIORITY_COLORS: Record<IncidentPriority, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

const styles = {
  page: { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#0f172a' } as React.CSSProperties,
  body: { display: 'flex', flex: 1, overflow: 'hidden' } as React.CSSProperties,
  main: { flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 } as React.CSSProperties,
  sidebar: { width: 360, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16, borderLeft: '1px solid #2d3148' } as React.CSSProperties,
  card: { background: '#1e293b', borderRadius: 8, padding: 16 } as React.CSSProperties,
  cardTitle: { color: '#e2e8f0', fontSize: 14, fontWeight: 600, marginBottom: 12 } as React.CSSProperties,
  alertItem: { background: '#0f172a', borderRadius: 6, padding: 12, marginBottom: 8, borderLeft: '3px solid #ef4444' } as React.CSSProperties,
  alertHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 } as React.CSSProperties,
  alertType: { color: '#fca5a5', fontSize: 12, fontWeight: 600 } as React.CSSProperties,
  alertZone: { color: '#94a3b8', fontSize: 11 } as React.CSSProperties,
  alertDesc: { color: '#cbd5e1', fontSize: 12, marginTop: 4 } as React.CSSProperties,
  alertMeta: { color: '#64748b', fontSize: 11, marginTop: 4 } as React.CSSProperties,
  resolveBtn: { background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 10px', fontSize: 11, cursor: 'pointer' } as React.CSSProperties,
  investigateBtn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 10px', fontSize: 11, cursor: 'pointer', marginRight: 4 } as React.CSSProperties,
  incidentItem: { background: '#0f172a', borderRadius: 6, padding: 12, marginBottom: 8 } as React.CSSProperties,
  incidentHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 } as React.CSSProperties,
  incidentTitle: { color: '#f1f5f9', fontSize: 13, fontWeight: 500 } as React.CSSProperties,
  incidentDesc: { color: '#94a3b8', fontSize: 12, marginTop: 4 } as React.CSSProperties,
  aiSummary: { background: '#1e3a5f', borderRadius: 4, padding: '6px 8px', marginTop: 6, color: '#93c5fd', fontSize: 11 } as React.CSSProperties,
  emptyState: { color: '#64748b', fontSize: 13, textAlign: 'center', padding: '24px 0' } as React.CSSProperties,
  confidenceBadge: (confidence: number): React.CSSProperties => ({
    display: 'inline-block', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 600,
    background: confidence >= 0.8 ? '#7f1d1d' : confidence >= 0.5 ? '#78350f' : '#1e3a5f',
    color: '#fff',
  }),
  priorityDot: (priority: IncidentPriority): React.CSSProperties => ({
    display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
    background: PRIORITY_COLORS[priority], marginRight: 6,
  }),
} as const;

export function ThreatIncidentPage() {
  const { user } = useAuth();
  const venueId = user?.venueId ?? '';

  const [threats, setThreats] = useState<ThreatAlert[]>([]);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);

  // Initial load of incidents
  const { data: incidentData } = useApi<{ incidents: IncidentReport[] }>(
    venueId ? `/incidents?venueId=${venueId}&limit=50` : null
  );
  React.useEffect(() => {
    if (incidentData?.incidents) setIncidents(incidentData.incidents);
  }, [incidentData]);

  // Initial load of active threats
  const { data: threatData } = useApi<{ alerts: ThreatAlert[] }>(
    venueId ? `/threats?venueId=${venueId}&status=active` : null
  );
  React.useEffect(() => {
    if (threatData?.alerts) setThreats(threatData.alerts);
  }, [threatData]);

  const handleThreatMessage = useCallback((data: ThreatUpdate) => {
    if (data.type === 'threat_new' && data.alert) {
      setThreats((prev) => {
        const exists = prev.find((t) => t.alertId === data.alert!.alertId);
        return exists ? prev : [data.alert!, ...prev];
      });
    } else if (data.type === 'threat_update' && data.alert) {
      setThreats((prev) => prev.map((t) => t.alertId === data.alert!.alertId ? data.alert! : t));
    } else if (data.type === 'incident_new' && data.incident) {
      setIncidents((prev) => [data.incident!, ...prev]);
    }
  }, []);

  const { connected } = useWebSocket<ThreatUpdate>(`threats:${venueId}`, handleThreatMessage);

  function handleResolve(alertId: string) {
    setThreats((prev) => prev.map((t) => t.alertId === alertId ? { ...t, status: 'resolved' } : t));
    apiFetch(`/threats/${alertId}/resolve`, { method: 'POST' }).catch(() => {});
  }

  function handleInvestigate(alertId: string) {
    setThreats((prev) => prev.map((t) => t.alertId === alertId ? { ...t, status: 'investigating' } : t));
    apiFetch(`/threats/${alertId}/investigate`, { method: 'POST' }).catch(() => {});
  }

  const activeThreats = threats.filter((t) => t.status !== 'resolved');

  return (
    <div style={styles.page}>
      <TopBar title="Threat & Incident Feed" connected={connected} />
      <div style={styles.body}>
        <main style={styles.main} aria-label="Threat alerts panel">
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              Active Threat Alerts ({activeThreats.length})
            </div>
            {!connected && activeThreats.length === 0 ? (
              <div style={styles.emptyState}>
                ⏳ Connecting to threat feed…
              </div>
            ) : activeThreats.length === 0 ? (
              <div style={styles.emptyState}>No active threat alerts</div>
            ) : (
              activeThreats.map((alert) => (
                <div key={alert.alertId} style={styles.alertItem} role="listitem">
                  <div style={styles.alertHeader}>
                    <div>
                      <span style={styles.alertType}>{THREAT_LABELS[alert.type]}</span>
                      <span style={{ ...styles.confidenceBadge(alert.aiConfidence), marginLeft: 8 }}>
                        AI: {Math.round(alert.aiConfidence * 100)}%
                      </span>
                    </div>
                    <div>
                      {alert.status === 'active' && (
                        <button
                          style={styles.investigateBtn}
                          onClick={() => handleInvestigate(alert.alertId)}
                          aria-label={`Investigate threat in ${alert.zoneName}`}
                        >
                          Investigate
                        </button>
                      )}
                      <button
                        style={styles.resolveBtn}
                        onClick={() => handleResolve(alert.alertId)}
                        aria-label={`Resolve threat in ${alert.zoneName}`}
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                  <div style={styles.alertZone}>Zone: {alert.zoneName}</div>
                  <div style={styles.alertDesc}>{alert.description}</div>
                  <div style={styles.alertMeta}>
                    {new Date(alert.timestamp).toLocaleString()} ·{' '}
                    <span style={{ color: alert.status === 'investigating' ? '#fbbf24' : '#94a3b8' }}>
                      {alert.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>

        <aside style={styles.sidebar} aria-label="Incident report feed">
          <div style={styles.card}>
            <div style={styles.cardTitle}>AI-Prioritized Incident Feed</div>
            {incidents.length === 0 ? (
              <div style={styles.emptyState}>No incidents reported</div>
            ) : (
              incidents.map((inc) => (
                <div key={inc.reportId} style={styles.incidentItem} role="listitem">
                  <div style={styles.incidentHeader}>
                    <div style={styles.incidentTitle}>
                      <span style={styles.priorityDot(inc.priority)} aria-hidden="true" />
                      {inc.title}
                    </div>
                    <span style={{ color: PRIORITY_COLORS[inc.priority], fontSize: 11, fontWeight: 600 }}>
                      {inc.priority.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ color: '#64748b', fontSize: 11 }}>
                    {inc.zoneName} · {new Date(inc.timestamp).toLocaleTimeString()} · {inc.reportedBy}
                  </div>
                  <div style={styles.incidentDesc}>{inc.description}</div>
                  {inc.aiSummary && (
                    <div style={styles.aiSummary}>
                      🤖 {inc.aiSummary}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
