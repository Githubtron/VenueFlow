/**
 * EmergencyPage — Task 26.1
 *
 * - SOS list with real-time updates via WebSocket `emergency:{venueId}` (Req 5.1)
 * - Evacuation trigger button (EMERGENCY role only) with 5-second press-and-hold (Req 5.2)
 * - PA trigger button (Req 5.3)
 * - Real-time bottleneck map during active evacuation (Req 5.5)
 */
import React, { useState, useCallback, useRef } from 'react';
import { useAuth } from '../auth/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';
import { apiFetch } from '../hooks/useApi';
import { TopBar } from '../components/TopBar';

interface SosEvent {
  sosId: string;
  userId: string;
  zoneId: string;
  zoneName: string;
  timestamp: string;
  status: 'active' | 'resolved';
  type: 'medical' | 'security' | 'general';
}

interface ZoneClearStatus {
  zoneId: string;
  zoneName: string;
  cleared: boolean;
  sosCount: number;
  bottleneck: boolean;
}

interface EmergencyUpdate {
  type: 'sos_new' | 'sos_update' | 'evacuation_status' | 'zone_status';
  sos?: SosEvent;
  evacuationActive?: boolean;
  zones?: ZoneClearStatus[];
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#0f172a' },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  main: { flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 },
  sidebar: { width: 340, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16, borderLeft: '1px solid #2d3148' },
  card: { background: '#1e293b', borderRadius: 8, padding: 16 },
  cardTitle: { color: '#e2e8f0', fontSize: 14, fontWeight: 600, marginBottom: 12 },
  sosList: { display: 'flex', flexDirection: 'column', gap: 8 },
  sosItem: { background: '#0f172a', borderRadius: 6, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '3px solid #ef4444' },
  sosInfo: { display: 'flex', flexDirection: 'column', gap: 2 },
  sosId: { color: '#f1f5f9', fontSize: 13, fontWeight: 500 },
  sosMeta: { color: '#94a3b8', fontSize: 11 },
  resolveBtn: { background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 12, cursor: 'pointer' },
  emptyState: { color: '#64748b', fontSize: 13, textAlign: 'center', padding: '24px 0' },
  holdBtn: {
    position: 'relative', overflow: 'hidden', background: '#dc2626', color: '#fff',
    border: 'none', borderRadius: 8, padding: '14px 24px', fontSize: 15, fontWeight: 700,
    cursor: 'pointer', width: '100%', userSelect: 'none',
  },
  holdBtnDisabled: {
    position: 'relative', overflow: 'hidden', background: '#374151', color: '#6b7280',
    border: 'none', borderRadius: 8, padding: '14px 24px', fontSize: 15, fontWeight: 700,
    cursor: 'not-allowed', width: '100%', userSelect: 'none',
  },
  holdProgress: {
    position: 'absolute', left: 0, top: 0, bottom: 0, background: 'rgba(255,255,255,0.25)',
    transition: 'width 0.1s linear', pointerEvents: 'none',
  },
  paBtn: { background: '#d97706', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%' },
  zoneGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  zoneCard: (cleared: boolean, bottleneck: boolean): React.CSSProperties => ({
    background: bottleneck ? '#7f1d1d' : cleared ? '#14532d' : '#1e3a5f',
    borderRadius: 6, padding: 10, border: `1px solid ${bottleneck ? '#ef4444' : cleared ? '#22c55e' : '#3b82f6'}`,
  }),
  zoneName: { color: '#f1f5f9', fontSize: 12, fontWeight: 600 },
  zoneStatus: (cleared: boolean, bottleneck: boolean): React.CSSProperties => ({
    color: bottleneck ? '#fca5a5' : cleared ? '#86efac' : '#93c5fd', fontSize: 11, marginTop: 2,
  }),
  badge: (type: SosEvent['type']): React.CSSProperties => ({
    display: 'inline-block', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 600,
    background: type === 'medical' ? '#7c3aed' : type === 'security' ? '#dc2626' : '#d97706',
    color: '#fff', marginLeft: 6,
  }),
  evacuationBanner: {
    background: '#7f1d1d', border: '1px solid #ef4444', borderRadius: 8, padding: '12px 16px',
    color: '#fca5a5', fontWeight: 700, fontSize: 14, textAlign: 'center',
  },
};

const HOLD_DURATION_MS = 5000;

export function EmergencyPage() {
  const { user } = useAuth();
  const venueId = user?.venueId ?? '';
  const isEmergencyRole = user?.role === 'EMERGENCY' || user?.role === 'ADMIN';

  const [sosList, setSosList] = useState<SosEvent[]>([]);
  const [evacuationActive, setEvacuationActive] = useState(false);
  const [zones, setZones] = useState<ZoneClearStatus[]>([]);
  const [holdProgress, setHoldProgress] = useState(0);
  const [paFeedback, setPaFeedback] = useState('');

  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef = useRef<number>(0);

  const handleEmergencyMessage = useCallback((data: EmergencyUpdate) => {
    if (data.type === 'sos_new' && data.sos) {
      setSosList((prev) => {
        const exists = prev.find((s) => s.sosId === data.sos!.sosId);
        return exists ? prev : [data.sos!, ...prev];
      });
    } else if (data.type === 'sos_update' && data.sos) {
      setSosList((prev) => prev.map((s) => s.sosId === data.sos!.sosId ? data.sos! : s));
    } else if (data.type === 'evacuation_status') {
      setEvacuationActive(data.evacuationActive ?? false);
    } else if (data.type === 'zone_status' && data.zones) {
      setZones(data.zones);
    }
  }, []);

  const { connected } = useWebSocket<EmergencyUpdate>(`emergency:${venueId}`, handleEmergencyMessage);

  function handleResolveSos(sosId: string) {
    setSosList((prev) => prev.map((s) => s.sosId === sosId ? { ...s, status: 'resolved' } : s));
    apiFetch(`/emergency/sos/${sosId}/resolve`, { method: 'POST' }).catch(() => {});
  }

  function startHold() {
    if (!isEmergencyRole) return;
    holdStartRef.current = Date.now();
    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current;
      const pct = Math.min((elapsed / HOLD_DURATION_MS) * 100, 100);
      setHoldProgress(pct);
      if (elapsed >= HOLD_DURATION_MS) {
        clearInterval(holdIntervalRef.current!);
        setHoldProgress(0);
        triggerEvacuation();
      }
    }, 50);
  }

  function cancelHold() {
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    setHoldProgress(0);
  }

  function triggerEvacuation() {
    apiFetch(`/emergency/evacuation/${venueId}/trigger`, { method: 'POST' })
      .then(() => setEvacuationActive(true))
      .catch(() => {});
  }

  function triggerPA() {
    apiFetch(`/emergency/pa/${venueId}/trigger`, { method: 'POST' })
      .then(() => {
        setPaFeedback('PA announcement triggered');
        setTimeout(() => setPaFeedback(''), 3000);
      })
      .catch(() => setPaFeedback('PA trigger failed'));
  }

  const activeSos = sosList.filter((s) => s.status === 'active');

  return (
    <div style={styles.page}>
      <TopBar title="Emergency Control" connected={connected} />
      <div style={styles.body}>
        <main style={styles.main} aria-label="Emergency control panel">
          {evacuationActive && (
            <div style={styles.evacuationBanner} role="alert">
              🚨 EVACUATION IN PROGRESS
            </div>
          )}

          {/* SOS List */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              Active SOS Events ({activeSos.length})
            </div>
            {activeSos.length === 0 ? (
              <div style={styles.emptyState}>No active SOS events</div>
            ) : (
              <div style={styles.sosList}>
                {activeSos.map((sos) => (
                  <div key={sos.sosId} style={styles.sosItem} role="listitem">
                    <div style={styles.sosInfo}>
                      <div style={styles.sosId}>
                        Zone: {sos.zoneName}
                        <span style={styles.badge(sos.type)}>{sos.type}</span>
                      </div>
                      <div style={styles.sosMeta}>
                        User: {sos.userId} · {new Date(sos.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    <button
                      style={styles.resolveBtn}
                      onClick={() => handleResolveSos(sos.sosId)}
                      aria-label={`Resolve SOS from zone ${sos.zoneName}`}
                    >
                      Resolve
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottleneck map during evacuation */}
          {evacuationActive && zones.length > 0 && (
            <div style={styles.card}>
              <div style={styles.cardTitle}>Zone Evacuation Status</div>
              <div style={styles.zoneGrid}>
                {zones.map((z) => (
                  <div key={z.zoneId} style={styles.zoneCard(z.cleared, z.bottleneck)}>
                    <div style={styles.zoneName}>{z.zoneName}</div>
                    <div style={styles.zoneStatus(z.cleared, z.bottleneck)}>
                      {z.bottleneck ? '⚠ Bottleneck' : z.cleared ? '✓ Cleared' : '⏳ Evacuating'}
                    </div>
                    {z.sosCount > 0 && (
                      <div style={{ color: '#fca5a5', fontSize: 11 }}>
                        {z.sosCount} SOS active
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        <aside style={styles.sidebar} aria-label="Emergency actions">
          {/* Evacuation trigger */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>Evacuation Control</div>
            {isEmergencyRole ? (
              <>
                <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>
                  Hold button for 5 seconds to trigger evacuation
                </p>
                <button
                  style={evacuationActive ? styles.holdBtnDisabled : styles.holdBtn}
                  disabled={evacuationActive}
                  onMouseDown={startHold}
                  onMouseUp={cancelHold}
                  onMouseLeave={cancelHold}
                  onTouchStart={startHold}
                  onTouchEnd={cancelHold}
                  aria-label="Hold to trigger evacuation"
                >
                  <div style={{ ...styles.holdProgress, width: `${holdProgress}%` }} aria-hidden="true" />
                  <span style={{ position: 'relative' }}>
                    {evacuationActive ? 'Evacuation Active' : holdProgress > 0 ? `Hold… ${Math.round((holdProgress / 100) * 5)}s` : '🚨 Trigger Evacuation'}
                  </span>
                </button>
              </>
            ) : (
              <p style={{ color: '#64748b', fontSize: 13 }}>
                EMERGENCY role required to trigger evacuation.
              </p>
            )}
          </div>

          {/* PA trigger */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>PA System</div>
            <button style={styles.paBtn} onClick={triggerPA} aria-label="Trigger PA announcement">
              📢 Trigger PA Announcement
            </button>
            {paFeedback && (
              <p style={{ color: '#86efac', fontSize: 12, marginTop: 8 }} role="status">
                {paFeedback}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
