
import { AnomalyAlert } from './AnomalyAlertPanel';
import { StaffLocation } from './StaffPinsOverlay';

interface RedeploymentPanelProps {
  activeAlert: AnomalyAlert | null;
  availableStaff: StaffLocation[];
  onRedeploy?: (staffId: string, targetZoneId: string) => void;
}

export function RedeploymentPanel({ activeAlert, availableStaff, onRedeploy }: RedeploymentPanelProps) {
  if (!activeAlert) {
    return (
      <section aria-label="Redeployment panel">
        <div style={{ fontSize: 10, fontWeight: 900, color: '#c2c6d6', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10 }}>
          Redeployment
        </div>
        <div style={{
          background: '#191b22', borderRadius: 10, padding: '20px 16px',
          textAlign: 'center', color: '#424754', fontSize: 12,
          fontWeight: 600, letterSpacing: '0.05em',
        }}>
          All clear — no active anomaly
        </div>
      </section>
    );
  }

  const nearbyStaff = availableStaff
    .filter(s => s.isAvailable && s.zoneId !== activeAlert.zoneId)
    .slice(0, 4);

  return (
    <section aria-label="Redeployment suggestions panel" aria-live="polite">
      <div style={{ fontSize: 10, fontWeight: 900, color: '#ffb3ad', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10 }}>
        Urgent Action
      </div>

      {/* Alert info */}
      <div style={{
        background: 'rgba(255,84,81,0.08)',
        borderLeft: '3px solid #ff5451',
        borderRadius: '0 8px 8px 0',
        padding: '10px 12px',
        marginBottom: 10,
        fontSize: 12, color: '#ffb3ad', fontWeight: 600,
      }}>
        ⚠ {activeAlert.zoneName ?? activeAlert.zoneId} at {activeAlert.currentDensityPercent.toFixed(0)}% density
      </div>

      {/* Recommendation */}
      {activeAlert.deploymentRecommendation && (
        <div style={{
          background: 'rgba(77,142,255,0.08)',
          borderLeft: '3px solid #4d8eff',
          borderRadius: '0 8px 8px 0',
          padding: '10px 12px',
          marginBottom: 14,
          fontSize: 11, color: '#adc6ff',
        }}>
          {activeAlert.deploymentRecommendation}
        </div>
      )}

      {/* Staff to redeploy */}
      <div style={{ fontSize: 9, fontWeight: 900, color: '#8c909f', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
        Available to redeploy
      </div>

      {nearbyStaff.length === 0 ? (
        <div style={{ color: '#424754', fontSize: 12 }}>No available staff found</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {nearbyStaff.map(staff => (
            <div key={staff.staffId} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: '#191b22', borderRadius: 8, padding: '9px 12px',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 6,
                background: '#282a30',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 900, color: '#adc6ff', flexShrink: 0,
              }}>
                {staff.name[0]}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e2eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {staff.name}
                </div>
                <div style={{ fontSize: 10, color: '#8c909f' }}>{staff.zoneName ?? staff.zoneId}</div>
              </div>
              {onRedeploy && (
                <button
                  onClick={() => onRedeploy(staff.staffId, activeAlert.zoneId)}
                  aria-label={`Redeploy ${staff.name} to ${activeAlert.zoneName ?? activeAlert.zoneId}`}
                  style={{
                    background: '#adc6ff',
                    border: 'none',
                    color: '#001a42',
                    padding: '5px 10px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 9,
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    flexShrink: 0,
                    transition: 'all 0.15s',
                  }}
                >
                  Deploy
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
