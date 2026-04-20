import React from 'react';
import { AnomalyAlert } from './AnomalyAlertPanel';
import { StaffLocation } from './StaffPinsOverlay';

interface RedeploymentPanelProps {
  activeAlert: AnomalyAlert | null;
  availableStaff: StaffLocation[];
  onRedeploy?: (staffId: string, targetZoneId: string) => void;
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
    fontSize: 14,
    fontWeight: 600,
    color: '#e2e8f0',
  },
  inactive: { padding: 24, textAlign: 'center', color: '#475569', fontSize: 13 },
  body: { padding: 16 },
  alertInfo: {
    padding: '10px 12px',
    background: 'rgba(239,68,68,0.1)',
    borderRadius: 6,
    borderLeft: '3px solid #ef4444',
    marginBottom: 12,
    fontSize: 13,
    color: '#fca5a5',
  },
  recommendation: {
    padding: '10px 12px',
    background: 'rgba(124,106,247,0.1)',
    borderRadius: 6,
    borderLeft: '3px solid #7c6af7',
    marginBottom: 16,
    fontSize: 13,
    color: '#a78bfa',
  },
  staffTitle: { fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600 },
  staffItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 0',
    borderBottom: '1px solid #1e2235',
  },
  staffName: { fontSize: 13, color: '#e2e8f0', flex: 1 },
  redeployBtn: {
    background: '#7c6af7',
    border: 'none',
    color: '#fff',
    padding: '4px 10px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 600,
  },
};

export function RedeploymentPanel({
  activeAlert,
  availableStaff,
  onRedeploy,
}: RedeploymentPanelProps) {
  if (!activeAlert) {
    return (
      <section style={styles.panel} aria-label="Redeployment panel">
        <div style={styles.header}>Redeployment Suggestions</div>
        <div style={styles.inactive}>No active anomaly — all clear</div>
      </section>
    );
  }

  const nearbyStaff = availableStaff
    .filter((s) => s.isAvailable && s.zoneId !== activeAlert.zoneId)
    .slice(0, 5);

  return (
    <section style={styles.panel} aria-label="Redeployment suggestions panel" aria-live="polite">
      <div style={styles.header}>Redeployment Suggestions</div>
      <div style={styles.body}>
        <div style={styles.alertInfo}>
          ⚠ Alert: {activeAlert.zoneName ?? activeAlert.zoneId} at{' '}
          {activeAlert.currentDensityPercent.toFixed(0)}% density
        </div>
        {activeAlert.deploymentRecommendation && (
          <div style={styles.recommendation}>
            📋 {activeAlert.deploymentRecommendation}
          </div>
        )}
        <div style={styles.staffTitle}>Available staff to redeploy:</div>
        {nearbyStaff.length === 0 ? (
          <div style={{ color: '#475569', fontSize: 13 }}>No available staff found</div>
        ) : (
          <ul style={{ listStyle: 'none' }}>
            {nearbyStaff.map((staff) => (
              <li key={staff.staffId} style={styles.staffItem}>
                <span style={styles.staffName}>{staff.name}</span>
                <span style={{ fontSize: 11, color: '#475569' }}>
                  {staff.zoneName ?? staff.zoneId}
                </span>
                {onRedeploy && (
                  <button
                    style={styles.redeployBtn}
                    onClick={() => onRedeploy(staff.staffId, activeAlert.zoneId)}
                    aria-label={`Redeploy ${staff.name} to ${activeAlert.zoneName ?? activeAlert.zoneId}`}
                  >
                    Deploy
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
