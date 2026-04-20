import React from 'react';

export interface InventoryAlert {
  alertId: string;
  kioskId: string;
  kioskName: string;
  itemName: string;
  currentStock: number;
  minThreshold: number;
  severity: 'low' | 'critical';
  detectedAt: string;
}

interface InventoryAlertFeedProps {
  alerts: InventoryAlert[];
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#1a1d27',
    border: '1px solid #2d3148',
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    padding: '12px 16px',
    background: '#1e2235',
    borderBottom: '1px solid #2d3148',
    fontSize: 14,
    fontWeight: 600,
    color: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    background: '#ef4444',
    color: '#fff',
    borderRadius: 10,
    padding: '2px 8px',
    fontSize: 11,
    fontWeight: 700,
  },
  empty: { padding: 24, textAlign: 'center', color: '#475569', fontSize: 13 },
  item: {
    padding: '12px 16px',
    borderBottom: '1px solid #1e2235',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  },
  icon: { fontSize: 16, flexShrink: 0, marginTop: 1 },
  content: { flex: 1 },
  kioskName: { fontSize: 13, fontWeight: 600, color: '#e2e8f0' },
  itemName: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  stock: { fontSize: 11, marginTop: 4 },
  time: { fontSize: 11, color: '#475569', flexShrink: 0 },
};

export function InventoryAlertFeed({ alerts }: InventoryAlertFeedProps) {
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical');

  return (
    <section style={styles.container} aria-label="Inventory depletion alerts" aria-live="polite">
      <div style={styles.header}>
        <span style={{ flex: 1 }}>Inventory Alerts</span>
        {criticalAlerts.length > 0 && (
          <span style={styles.badge} role="status">
            {criticalAlerts.length} critical
          </span>
        )}
      </div>
      {alerts.length === 0 ? (
        <div style={styles.empty}>No inventory alerts</div>
      ) : (
        <ul style={{ listStyle: 'none' }}>
          {alerts.map((alert) => (
            <li key={alert.alertId} style={styles.item} role="listitem">
              <span style={styles.icon} aria-hidden="true">
                {alert.severity === 'critical' ? '🔴' : '🟡'}
              </span>
              <div style={styles.content}>
                <div style={styles.kioskName}>{alert.kioskName}</div>
                <div style={styles.itemName}>{alert.itemName}</div>
                <div
                  style={{
                    ...styles.stock,
                    color: alert.severity === 'critical' ? '#ef4444' : '#f59e0b',
                  }}
                >
                  Stock: {alert.currentStock} (min: {alert.minThreshold})
                </div>
              </div>
              <span style={styles.time}>
                {new Date(alert.detectedAt).toLocaleTimeString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
