

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

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export function InventoryAlertFeed({ alerts }: InventoryAlertFeedProps) {
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical');

  return (
    <section aria-label="Inventory depletion alerts" aria-live="polite" aria-atomic="false">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: '#e2e2eb', letterSpacing: '-0.02em', margin: 0 }}>
            Inventory Alerts
          </h2>
          {criticalAlerts.length > 0 && (
            <span style={{
              background: '#ff5451', color: '#fff',
              borderRadius: 4, padding: '4px 8px',
              fontSize: 14, fontWeight: 900,
            }} role="status" aria-label={`${criticalAlerts.length} critical alerts`}>
              {criticalAlerts.length}
            </span>
          )}
        </div>
      </div>

      {alerts.length === 0 ? (
        <div style={{
          background: '#191b22', borderRadius: 10, padding: '24px 16px',
          textAlign: 'center', color: '#424754', fontSize: 12,
          fontWeight: 600, letterSpacing: '0.05em',
        }}>
          No inventory alerts
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {alerts.map(alert => {
            const isCritical = alert.severity === 'critical';
            const borderColor = isCritical ? '#ff5451' : '#f59e0b';
            const badgeBgColor = isCritical ? '#ff5451' : '#f59e0b';
            const badgeTextColor = isCritical ? '#ffdad6' : '#fff';
            const iconBgColor = isCritical ? 'rgba(255,84,81,0.15)' : 'rgba(245,158,11,0.15)';
            
            return (
              <div
                key={alert.alertId}
                role="alert"
                className="animate-slide-in"
                style={{
                  background: '#1a1d27',
                  borderRadius: 8,
                  borderLeft: `4px solid ${borderColor}`,
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  transition: 'background 0.15s',
                  boxShadow: isCritical ? '0 0 15px rgba(255,179,173,0.05)' : 'none',
                }}
              >
                {/* Icon box */}
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 8,
                    backgroundColor: iconBgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: 24,
                  }}
                  aria-hidden="true"
                >
                  {isCritical ? '🔴' : '🟡'}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#e2e2eb', margin: 0, lineHeight: 1.2 }}>
                      {alert.kioskName}
                    </h3>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 900,
                        background: badgeBgColor,
                        color: badgeTextColor,
                        padding: '2px 8px',
                        borderRadius: 4,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        flexShrink: 0,
                      }}
                    >
                      {isCritical ? 'CRITICAL' : 'LOW'}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: '#c2c6d6' }}>
                    <span>{alert.itemName}</span>
                    <span style={{ color: '#424754' }}>•</span>
                    <span>Stock: {alert.currentStock} (min: {alert.minThreshold})</span>
                    <span style={{ color: '#424754' }}>•</span>
                    <span style={{ color: '#424754' }}>{timeAgo(alert.detectedAt)}</span>
                  </div>
                </div>

                {/* Resolve button */}
                <button
                  aria-label={`Resolve alert for ${alert.kioskName}`}
                  style={{
                    background: '#282a30',
                    border: 'none',
                    color: '#c2c6d6',
                    padding: '8px 16px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 10,
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    transition: 'all 0.15s',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = borderColor;
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#282a30';
                    e.currentTarget.style.color = '#c2c6d6';
                  }}
                >
                  Resolve
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
