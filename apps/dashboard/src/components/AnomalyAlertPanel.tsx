import React from 'react';

export interface AnomalyAlert {
  alertId: string;
  venueId: string;
  zoneId: string;
  zoneName?: string;
  eventId: string;
  currentDensityPercent: number;
  threshold: number;
  detectedAt: string;
  status: 'active' | 'acknowledged' | 'resolved';
  deploymentRecommendation?: string;
}

interface AnomalyAlertPanelProps {
  alerts: AnomalyAlert[];
  onAcknowledge?: (alertId: string) => void;
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    background: '#1a1d27',
    border: '1px solid #2d3148',
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    padding: '12px 16px',
    background: '#1e2235',
    borderBottom: '1px solid #2d3148',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  title: { fontSize: 14, fontWeight: 600, color: '#e2e8f0', flex: 1 },
  badge: {
    background: '#ef4444',
    color: '#fff',
    borderRadius: 10,
    padding: '2px 8px',
    fontSize: 11,
    fontWeight: 700,
  },
  empty: { padding: 24, textAlign: 'center', color: '#475569', fontSize: 13 },
  alert: {
    padding: '14px 16px',
    borderBottom: '1px solid #2d3148',
    borderLeft: '4px solid #ef4444',
  },
  alertAck: {
    padding: '14px 16px',
    borderBottom: '1px solid #2d3148',
    borderLeft: '4px solid #f59e0b',
    opacity: 0.7,
  },
  alertTop: { display: 'flex', alignItems: 'flex-start', gap: 8 },
  zoneName: { fontSize: 14, fontWeight: 600, color: '#ef4444', flex: 1 },
  time: { fontSize: 11, color: '#475569' },
  density: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  recommendation: {
    marginTop: 8,
    padding: '8px 10px',
    background: 'rgba(124,106,247,0.1)',
    borderRadius: 6,
    fontSize: 12,
    color: '#a78bfa',
    borderLeft: '3px solid #7c6af7',
  },
  ackBtn: {
    marginTop: 8,
    background: 'none',
    border: '1px solid #334155',
    color: '#94a3b8',
    padding: '4px 10px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 11,
  },
};

export function AnomalyAlertPanel({ alerts, onAcknowledge }: AnomalyAlertPanelProps) {
  const activeAlerts = alerts.filter((a) => a.status === 'active');
  const otherAlerts = alerts.filter((a) => a.status !== 'active' && a.status !== 'resolved');

  return (
    <section
      style={styles.panel}
      aria-label="Anomaly alerts"
      aria-live="polite"
      aria-atomic="false"
    >
      <div style={styles.header}>
        <span style={styles.title}>Anomaly Alerts</span>
        {activeAlerts.length > 0 && (
          <span style={styles.badge} role="status" aria-label={`${activeAlerts.length} active alerts`}>
            {activeAlerts.length}
          </span>
        )}
      </div>

      {alerts.length === 0 ? (
        <div style={styles.empty}>No active anomaly alerts</div>
      ) : (
        <ul style={{ listStyle: 'none' }}>
          {[...activeAlerts, ...otherAlerts].map((alert) => (
            <li
              key={alert.alertId}
              style={alert.status === 'active' ? styles.alert : styles.alertAck}
              role="alert"
            >
              <div style={styles.alertTop}>
                <span style={styles.zoneName}>
                  ⚠ {alert.zoneName ?? alert.zoneId}
                </span>
                <span style={styles.time}>
                  {new Date(alert.detectedAt).toLocaleTimeString()}
                </span>
              </div>
              <div style={styles.density}>
                Density: {alert.currentDensityPercent.toFixed(0)}% (threshold:{' '}
                {alert.threshold}%)
              </div>
              {alert.deploymentRecommendation && (
                <div style={styles.recommendation}>
                  📋 {alert.deploymentRecommendation}
                </div>
              )}
              {alert.status === 'active' && onAcknowledge && (
                <button
                  style={styles.ackBtn}
                  onClick={() => onAcknowledge(alert.alertId)}
                  aria-label={`Acknowledge alert for ${alert.zoneName ?? alert.zoneId}`}
                >
                  Acknowledge
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
