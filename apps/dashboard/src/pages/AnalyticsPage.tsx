/**
 * AnalyticsPage — Tasks 31.1, 31.2, 31.3
 *
 * Tabs:
 *   Replay  — heatmap replay scrubber (Req 17.1)
 *   Trends  — congestion trend charts + incident analytics (Req 17.2, 17.3)
 *   Reports — post-event report download + ML model version table (Req 6.6, 26.2)
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import { useAuth } from '../auth/useAuth';
import { useApi, apiFetch } from '../hooks/useApi';
import { useEvent } from '../context/EventContext';
import { TopBar } from '../components/TopBar';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ZoneSnapshot {
  zoneId: string;
  zoneName: string;
  densityPercent: number;
  status: 'green' | 'yellow' | 'red' | 'unavailable';
  timestamp: string;
}

interface ReplayFrame {
  timestamp: string;
  zones: ZoneSnapshot[];
}

interface CongestionBucket {
  period: string;
  avgDensity: number;
  peakDensity: number;
  zoneId: string;
  zoneName: string;
}

interface IncidentStat {
  type: string;
  count: number;
  avgResolutionMinutes: number;
  zone: string;
}

interface MLModelVersion {
  modelId: string;
  serviceId: string;
  version: string;
  mape: number;
  isActive: boolean;
  promotedAt: string;
}

type Tab = 'replay' | 'trends' | 'reports';

// ─── Styles ───────────────────────────────────────────────────────────────────

const staticStyles = {
  page: { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#0f172a' } as const,
  body: { flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 } as const,
  tabs: { display: 'flex', gap: 4, borderBottom: '1px solid #334155', marginBottom: 16 } as const,
  card: { background: '#1e293b', borderRadius: 8, padding: 16 } as const,
  cardTitle: { color: '#e2e8f0', fontSize: 14, fontWeight: 600, marginBottom: 12 } as const,
  scrubber: { width: '100%', accentColor: '#3b82f6', cursor: 'pointer' } as const,
  zoneGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, marginTop: 12 } as const,
  zoneName: { color: '#e2e8f0', fontSize: 11, fontWeight: 600 } as const,
  zoneDensity: { color: '#94a3b8', fontSize: 10, marginTop: 2 } as const,
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { color: '#94a3b8', fontSize: 11, fontWeight: 600, textAlign: 'left' as const, padding: '6px 8px', borderBottom: '1px solid #334155' } as const,
  td: { color: '#cbd5e1', fontSize: 12, padding: '8px 8px', borderBottom: '1px solid #1e293b' } as const,
  btn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' } as const,
  activeBadge: { display: 'inline-block', borderRadius: 4, padding: '1px 8px', fontSize: 10, fontWeight: 700, background: '#14532d', color: '#86efac' } as const,
  emptyState: { color: '#64748b', fontSize: 13, textAlign: 'center', padding: '32px 0' } as const,
  feedback: { color: '#86efac', fontSize: 12, marginTop: 8 } as const,
} as const;

const dynamicStyles = {
  tab: (active: boolean): React.CSSProperties => ({
    padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
    background: 'transparent', color: active ? '#e2e8f0' : '#64748b',
    borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
  }),
  zoneCell: (status: ZoneSnapshot['status']): React.CSSProperties => ({
    borderRadius: 6, padding: '8px 10px', textAlign: 'center',
    background: status === 'green' ? '#14532d' : status === 'yellow' ? '#78350f' : status === 'red' ? '#7f1d1d' : '#1e293b',
    border: `1px solid ${status === 'green' ? '#22c55e' : status === 'yellow' ? '#f59e0b' : status === 'red' ? '#ef4444' : '#334155'}`,
  }),
};

const s: Record<string, any> = { ...staticStyles, ...dynamicStyles };

// ─── Replay Tab ───────────────────────────────────────────────────────────────

function ReplayTab({ venueId }: { venueId: string }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [frames, setFrames] = useState<ReplayFrame[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadReplay() {
    if (!from || !to) return;
    setLoading(true);
    try {
      const res = await apiFetch<{ frames: ReplayFrame[] }>(
        `/analytics/${venueId}/replay?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&interval=10`
      );
      setFrames(res.frames ?? []);
      setFrameIndex(0);
    } catch {
      // keep stale
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (playing && frames.length > 0) {
      intervalRef.current = setInterval(() => {
        setFrameIndex((i) => {
          if (i >= frames.length - 1) { setPlaying(false); return i; }
          return i + 1;
        });
      }, 500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, frames.length]);

  const currentFrame = frames[frameIndex];

  return (
    <div style={s.card}>
      <div style={s.cardTitle}>Heatmap Replay</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={{ color: '#94a3b8', fontSize: 11, display: 'block', marginBottom: 4 }}>From</label>
          <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)}
            style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 4, color: '#e2e8f0', fontSize: 12, padding: '6px 10px' }} />
        </div>
        <div>
          <label style={{ color: '#94a3b8', fontSize: 11, display: 'block', marginBottom: 4 }}>To</label>
          <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)}
            style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 4, color: '#e2e8f0', fontSize: 12, padding: '6px 10px' }} />
        </div>
        <button style={s.btn} onClick={loadReplay} disabled={loading} aria-label="Load replay">
          {loading ? 'Loading…' : 'Load Replay'}
        </button>
      </div>

      {frames.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <button style={{ ...s.btn, padding: '6px 14px' }} onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? 'Pause replay' : 'Play replay'}>
              {playing ? '⏸ Pause' : '▶ Play'}
            </button>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>
              Frame {frameIndex + 1} / {frames.length}
              {currentFrame && ` — ${new Date(currentFrame.timestamp).toLocaleTimeString()}`}
            </span>
          </div>
          <input type="range" min={0} max={frames.length - 1} value={frameIndex}
            onChange={(e) => { setPlaying(false); setFrameIndex(Number(e.target.value)); }}
            style={s.scrubber} aria-label="Replay scrubber" />
          {currentFrame && (
            <div style={s.zoneGrid}>
              {currentFrame.zones.map((z) => (
                <div key={z.zoneId} style={s.zoneCell(z.status)}>
                  <div style={s.zoneName}>{z.zoneName}</div>
                  <div style={s.zoneDensity}>{z.densityPercent}%</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {!loading && frames.length === 0 && (
        <div style={s.emptyState}>Select a time range and click Load Replay</div>
      )}
    </div>
  );
}

// ─── Trends Tab ───────────────────────────────────────────────────────────────

function TrendsTab({ venueId, eventId }: { venueId: string; eventId: string | null }) {
  const { data: trendsData } = useApi<{ buckets: CongestionBucket[] }>(
    venueId ? `/analytics/${venueId}/congestion-trends?period=day` : null
  );
  const { data: incidentData } = useApi<{ stats: IncidentStat[] }>(
    venueId && eventId ? `/analytics/${venueId}/incidents?eventId=${eventId}` : null
  );

  const chartData = (trendsData?.buckets ?? []).map((b) => ({
    period: b.period,
    avg: Math.round(b.avgDensity),
    peak: Math.round(b.peakDensity),
  }));

  const incidentStats = incidentData?.stats ?? [];

  return (
    <>
      <div style={s.card}>
        <div style={s.cardTitle}>Congestion Trends (Today)</div>
        {chartData.length === 0 ? (
          <div style={s.emptyState}>No trend data available</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="period" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit="%" />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
              <Line type="monotone" dataKey="avg" stroke="#3b82f6" name="Avg Density" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="peak" stroke="#ef4444" name="Peak Density" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={s.card}>
        <div style={s.cardTitle}>Incident Analytics</div>
        {incidentStats.length === 0 ? (
          <div style={s.emptyState}>{eventId ? 'No incidents for this event' : 'Select an event to view incident analytics'}</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={incidentStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="type" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} />
                <Bar dataKey="count" fill="#3b82f6" name="Count" />
              </BarChart>
            </ResponsiveContainer>
            <table style={{ ...s.table, marginTop: 16 }} aria-label="Incident analytics table">
              <thead>
                <tr>
                  <th style={s.th}>Type</th>
                  <th style={s.th}>Count</th>
                  <th style={s.th}>Avg Resolution</th>
                  <th style={s.th}>Zone</th>
                </tr>
              </thead>
              <tbody>
                {incidentStats.map((stat, i) => (
                  <tr key={i}>
                    <td style={s.td}>{stat.type}</td>
                    <td style={s.td}>{stat.count}</td>
                    <td style={s.td}>{stat.avgResolutionMinutes} min</td>
                    <td style={s.td}>{stat.zone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </>
  );
}

// ─── Reports Tab ──────────────────────────────────────────────────────────────

function ReportsTab({ venueId, eventId, isAdmin }: { venueId: string; eventId: string | null; isAdmin: boolean }) {
  const [reportFeedback, setReportFeedback] = useState('');
  const { data: mlData } = useApi<{ versions: MLModelVersion[] }>(
    isAdmin ? `/ml/models/queue-predictor` : null
  );
  const mlVersions = mlData?.versions ?? [];

  async function handleDownloadReport() {
    if (!eventId) return;
    try {
      const res = await apiFetch<{ reportUrl?: string; report?: unknown }>(
        `/analytics/${venueId}/events/${eventId}/report`
      );
      if (res.reportUrl) {
        window.open(res.reportUrl, '_blank');
      } else {
        const blob = new Blob([JSON.stringify(res.report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `event-report-${eventId}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
      setReportFeedback('Report downloaded.');
    } catch {
      setReportFeedback('Failed to generate report.');
    }
    setTimeout(() => setReportFeedback(''), 4000);
  }

  return (
    <>
      <div style={s.card}>
        <div style={s.cardTitle}>Post-Event Report</div>
        {eventId ? (
          <>
            <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>
              Generate and download the full post-event analytics report for event <code style={{ color: '#93c5fd' }}>{eventId}</code>.
            </p>
            <button style={s.btn} onClick={handleDownloadReport} aria-label="Download post-event report">
              ⬇ Download Report
            </button>
            {reportFeedback && <p style={s.feedback} role="status">{reportFeedback}</p>}
          </>
        ) : (
          <div style={s.emptyState}>Select an active event from the Event Switcher to generate a report</div>
        )}
      </div>

      {isAdmin && (
        <div style={s.card}>
          <div style={s.cardTitle}>ML Model Version History</div>
          {mlVersions.length === 0 ? (
            <div style={s.emptyState}>No model versions found</div>
          ) : (
            <table style={s.table} aria-label="ML model version history">
              <thead>
                <tr>
                  <th style={s.th}>Service</th>
                  <th style={s.th}>Version</th>
                  <th style={s.th}>MAPE</th>
                  <th style={s.th}>Promoted</th>
                  <th style={s.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {mlVersions.map((v) => (
                  <tr key={v.modelId}>
                    <td style={s.td}>{v.serviceId}</td>
                    <td style={s.td}><code style={{ color: '#93c5fd' }}>{v.version}</code></td>
                    <td style={s.td}>{(v.mape * 100).toFixed(1)}%</td>
                    <td style={s.td}>{new Date(v.promotedAt).toLocaleDateString()}</td>
                    <td style={s.td}>
                      {v.isActive && <span style={s.activeBadge}>ACTIVE</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function AnalyticsPage() {
  const { user } = useAuth();
  const { activeEventId } = useEvent();
  const venueId = user?.venueId ?? '';
  const isAdmin = user?.role === 'ADMIN';
  const [activeTab, setActiveTab] = useState<Tab>('replay');

  return (
    <div style={s.page}>
      <TopBar title="Analytics" connected={true} />
      <div style={s.body}>
        <div style={s.tabs}>
          {(['replay', 'trends', 'reports'] as Tab[]).map((tab) => (
            <button key={tab} style={s.tab(activeTab === tab)} onClick={() => setActiveTab(tab)}
              aria-selected={activeTab === tab} role="tab">
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'replay' && <ReplayTab venueId={venueId} />}
        {activeTab === 'trends' && <TrendsTab venueId={venueId} eventId={activeEventId} />}
        {activeTab === 'reports' && <ReportsTab venueId={venueId} eventId={activeEventId} isAdmin={isAdmin} />}
      </div>
    </div>
  );
}
