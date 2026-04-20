

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
  priority?: 'high' | 'medium' | 'low';
  alertType?: string;
}

interface AnomalyAlertPanelProps {
  alerts: AnomalyAlert[];
  onAcknowledge?: (alertId: string) => void;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

const getAlertIcon = (type?: string, priority?: string) => {
  if (priority === 'high' || type?.includes('access')) return 'sos';
  if (type?.includes('crowd') || priority === 'high') return 'groups';
  if (type?.includes('sensor') || type?.includes('equipment')) return 'warning';
  if (type?.includes('medical') || type?.includes('aid')) return 'medical_services';
  if (type?.includes('supply') || type?.includes('low')) return 'info';
  return 'stadium';
};

const getPriorityColor = (priority?: string, isActive?: boolean) => {
  if (priority === 'high' || (isActive && priority !== 'low')) return { bg: '#93000a', text: '#ffdad6', border: '#ff5451', label: 'HIGH' };
  if (priority === 'medium' || !priority) return { bg: 'rgba(255,179,71,0.2)', text: '#ffb347', border: '#ffb347', label: 'MEDIUM' };
  return { bg: '#282a30', text: '#8c909f', border: '#8c909f', label: 'LOW' };
};

export function AnomalyAlertPanel({ alerts, onAcknowledge }: AnomalyAlertPanelProps) {
  const active = alerts.filter(a => a.status === 'active');
  const acked  = alerts.filter(a => a.status === 'acknowledged');
  const sorted = [...active, ...acked];

  const responseTeams = 8;
  const avgResolution = '4m 22s';
  const riskIndex = 'STABLE';

  return (
    <section aria-label="Anomaly alerts" aria-live="polite" aria-atomic="false">
      {/* Header - matches Stitch design */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ fontSize: 38, fontWeight: 900, color: '#e2e2eb', letterSpacing: '-0.02em', margin: 0, lineHeight: 1 }}>
            Live Alerts
          </h2>
          {active.length > 0 && (
            <span style={{
              background: '#ff5451', color: '#fff',
              borderRadius: 4, padding: '2px 8px',
              fontSize: 14, fontWeight: 900,
            }} role="status" aria-label={`${active.length} active alerts`}>
              {active.length}
            </span>
          )}
        </div>
        <p style={{ fontSize: 13, color: '#c2c6d6', margin: 0 }}>
          Monitoring 24 sectors across Main Arena and Concourse
        </p>
      </div>

      {sorted.length === 0 ? (
        <div style={{
          background: '#191b22', borderRadius: 10, padding: '24px 16px',
          textAlign: 'center', color: '#424754', fontSize: 12,
          fontWeight: 600, letterSpacing: '0.05em',
        }}>
          No active alerts
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sorted.map(alert => {
            const isActive = alert.status === 'active';
            const priorityCfg = getPriorityColor(alert.priority, isActive);
            const alertIcon = getAlertIcon(alert.alertType, alert.priority);

            return (
              <div
                key={alert.alertId}
                role="alert"
                className="animate-slide-in"
                style={{
                  background: '#1a1d27',
                  borderRadius: 8,
                  borderLeft: `4px solid ${priorityCfg.border}`,
                  padding: '20px 20px',
                  opacity: isActive ? 1 : 0.7,
                  boxShadow: isActive ? '0 0 15px rgba(255,179,173,0.05)' : 'none',
                  transition: 'background 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                }}
              >
                {/* Icon container */}
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: `${priorityCfg.border}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: 28,
                      color: priorityCfg.border,
                      fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                    }}
                  >
                    {alertIcon}
                  </span>
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#e2e2eb', margin: 0, lineHeight: 1.2 }}>
                      {alert.zoneName ?? alert.zoneId}
                    </h3>
                    <span style={{
                      fontSize: 9, fontWeight: 900,
                      background: priorityCfg.bg,
                      color: priorityCfg.text,
                      padding: '2px 8px', borderRadius: 4,
                      textTransform: 'uppercase', letterSpacing: '0.1em',
                    }}>
                      {priorityCfg.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, color: '#c2c6d6' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 14 }}>location_on</span>
                      {alert.zoneName || 'Zone ' + alert.zoneId}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 14 }}>schedule</span>
                      {timeAgo(alert.detectedAt)}
                    </span>
                  </div>
                </div>

                {/* Resolve button */}
                {isActive && onAcknowledge && (
                  <button
                    onClick={() => onAcknowledge(alert.alertId)}
                    aria-label={`Acknowledge alert for ${alert.zoneName ?? alert.zoneId}`}
                    style={{
                      background: '#282a30',
                      border: 'none',
                      color: '#c2c6d6',
                      padding: '8px 16px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 10,
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: '0.15em',
                      transition: 'all 0.15s',
                      flexShrink: 0,
                    }}
                  >
                    Resolve
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Stats - matches Stitch insight bar */}
      {sorted.length > 0 && (
        <div style={{
          marginTop: 32,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24,
          background: '#1a1d27',
          padding: 24,
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ fontSize: 9, fontWeight: 900, color: '#c2c6d6', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>
              Active Response Teams
            </p>
            <p style={{ fontSize: 24, fontWeight: 900, color: '#4ae176' }}>{responseTeams} / 12</p>
          </div>
          <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ fontSize: 9, fontWeight: 900, color: '#c2c6d6', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>
              Avg Resolution Time
            </p>
            <p style={{ fontSize: 24, fontWeight: 900, color: '#adc6ff' }}>{avgResolution}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 9, fontWeight: 900, color: '#c2c6d6', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>
              Risk Index
            </p>
            <p style={{ fontSize: 24, fontWeight: 900, color: '#ffb3ad' }}>{riskIndex}</p>
          </div>
        </div>
      )}
    </section>
  );
}
