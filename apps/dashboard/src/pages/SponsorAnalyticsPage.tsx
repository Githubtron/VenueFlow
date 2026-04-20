/**
 * SponsorAnalyticsPage — Task 31.4
 *
 * - Per-sponsor-zone footfall heatmap overlay (Req 34.1)
 * - Dwell time charts and offer performance metrics table (Req 34.2)
 * - Sponsor report download trigger (Req 34.3)
 */
import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';
import { useAuth } from '../auth/useAuth';
import { useApi, apiFetch } from '../hooks/useApi';
import { useEvent } from '../context/EventContext';
import { TopBar } from '../components/TopBar';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SponsorZone {
  sponsorZoneId: string;
  sponsorName: string;
  zoneId: string;
  zoneName: string;
}

interface SponsorAnalytics {
  sponsorZoneId: string;
  sponsorName: string;
  totalFootfall: number;
  avgDwellMinutes: number;
  peakFootfall: number;
  dwellHistogram: Array<{ bucket: string; count: number }>;
}

interface OfferMetric {
  offerId: string;
  message: string;
  deliveryCount: number;
  clickThroughRate: number;
  validUntil: string;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#0f172a' },
  body: { flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 },
  card: { background: '#1e293b', borderRadius: 8, padding: 16 },
  cardTitle: { color: '#e2e8f0', fontSize: 14, fontWeight: 600, marginBottom: 12 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 },
  sponsorCard: (selected: boolean): React.CSSProperties => ({
    background: selected ? '#1e3a5f' : '#0f172a', borderRadius: 8, padding: 14, cursor: 'pointer',
    border: `1px solid ${selected ? '#3b82f6' : '#334155'}`, transition: 'border-color 0.15s',
  }),
  sponsorName: { color: '#e2e8f0', fontSize: 13, fontWeight: 600 },
  sponsorZone: { color: '#64748b', fontSize: 11, marginTop: 2 },
  statRow: { display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' as const },
  statBox: { background: '#0f172a', borderRadius: 6, padding: '10px 16px', flex: 1, minWidth: 120 },
  statValue: { color: '#e2e8f0', fontSize: 22, fontWeight: 700 },
  statLabel: { color: '#64748b', fontSize: 11, marginTop: 2 },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { color: '#94a3b8', fontSize: 11, fontWeight: 600, textAlign: 'left' as const, padding: '6px 8px', borderBottom: '1px solid #334155' },
  td: { color: '#cbd5e1', fontSize: 12, padding: '8px 8px', borderBottom: '1px solid #1e293b' },
  btn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  emptyState: { color: '#64748b', fontSize: 13, textAlign: 'center', padding: '32px 0' },
  feedback: { color: '#86efac', fontSize: 12, marginTop: 8 },
  ctrBadge: (ctr: number): React.CSSProperties => ({
    display: 'inline-block', borderRadius: 4, padding: '1px 8px', fontSize: 11, fontWeight: 600,
    background: ctr >= 0.1 ? '#14532d' : ctr >= 0.05 ? '#78350f' : '#1e293b',
    color: ctr >= 0.1 ? '#86efac' : ctr >= 0.05 ? '#fcd34d' : '#94a3b8',
  }),
};

export function SponsorAnalyticsPage() {
  const { user } = useAuth();
  const { activeEventId } = useEvent();
  const venueId = user?.venueId ?? '';

  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [reportFeedback, setReportFeedback] = useState('');

  // Load sponsor zones for this venue
  const { data: zonesData } = useApi<{ zones: SponsorZone[] }>(
    venueId ? `/sponsors/${venueId}/zones` : null
  );
  const sponsorZones = zonesData?.zones ?? [];

  // Load analytics for selected sponsor zone
  const { data: analyticsData } = useApi<{ analytics: SponsorAnalytics }>(
    venueId && selectedZoneId && activeEventId
      ? `/sponsors/${venueId}/zones/${selectedZoneId}/analytics?eventId=${activeEventId}`
      : null
  );
  const analytics = analyticsData?.analytics ?? null;

  // Load offer metrics for selected sponsor zone
  const { data: offersData } = useApi<{ offers: OfferMetric[] }>(
    venueId && selectedZoneId && activeEventId
      ? `/sponsors/${venueId}/zones/${selectedZoneId}/offers?eventId=${activeEventId}`
      : null
  );
  const offers = offersData?.offers ?? [];

  async function handleDownloadReport() {
    if (!selectedZoneId || !activeEventId) return;
    try {
      const res = await apiFetch<{ reportUrl?: string; report?: unknown }>(
        `/sponsors/${venueId}/reports/${selectedZoneId}?eventId=${activeEventId}`
      );
      if (res.reportUrl) {
        window.open(res.reportUrl, '_blank');
      } else {
        const blob = new Blob([JSON.stringify(res.report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sponsor-report-${selectedZoneId}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
      setReportFeedback('Report downloaded.');
    } catch {
      setReportFeedback('Failed to download report.');
    }
    setTimeout(() => setReportFeedback(''), 4000);
  }

  return (
    <div style={s.page}>
      <TopBar title="Sponsor Analytics" connected={true} />
      <div style={s.body}>

        {/* Sponsor zone selector */}
        <div style={s.card}>
          <div style={s.cardTitle}>Sponsor Zones</div>
          {sponsorZones.length === 0 ? (
            <div style={s.emptyState}>No sponsor zones configured for this venue</div>
          ) : (
            <div style={s.grid}>
              {sponsorZones.map((z) => (
                <div
                  key={z.sponsorZoneId}
                  style={s.sponsorCard(selectedZoneId === z.sponsorZoneId)}
                  onClick={() => setSelectedZoneId(z.sponsorZoneId)}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selectedZoneId === z.sponsorZoneId}
                  aria-label={`Select ${z.sponsorName}`}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedZoneId(z.sponsorZoneId)}
                >
                  <div style={s.sponsorName}>{z.sponsorName}</div>
                  <div style={s.sponsorZone}>Zone: {z.zoneName}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Analytics for selected zone */}
        {selectedZoneId && !activeEventId && (
          <div style={{ ...s.card, color: '#f59e0b', fontSize: 13 }}>
            ⚠ Select an active event from the Event Switcher to view analytics
          </div>
        )}

        {analytics && (
          <>
            {/* KPI stats */}
            <div style={s.card}>
              <div style={s.cardTitle}>{analytics.sponsorName} — Performance</div>
              <div style={s.statRow}>
                <div style={s.statBox}>
                  <div style={s.statValue}>{analytics.totalFootfall.toLocaleString()}</div>
                  <div style={s.statLabel}>Total Footfall</div>
                </div>
                <div style={s.statBox}>
                  <div style={s.statValue}>{analytics.avgDwellMinutes.toFixed(1)} min</div>
                  <div style={s.statLabel}>Avg Dwell Time</div>
                </div>
                <div style={s.statBox}>
                  <div style={s.statValue}>{analytics.peakFootfall.toLocaleString()}</div>
                  <div style={s.statLabel}>Peak Footfall</div>
                </div>
              </div>

              {/* Dwell time histogram */}
              {analytics.dwellHistogram.length > 0 && (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={analytics.dwellHistogram}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="bucket" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} />
                    <Bar dataKey="count" fill="#3b82f6" name="Visitors" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Offer performance */}
            <div style={s.card}>
              <div style={s.cardTitle}>Offer Performance</div>
              {offers.length === 0 ? (
                <div style={s.emptyState}>No offers for this sponsor zone</div>
              ) : (
                <table style={s.table} aria-label="Offer performance metrics">
                  <thead>
                    <tr>
                      <th style={s.th}>Offer</th>
                      <th style={s.th}>Delivered</th>
                      <th style={s.th}>CTR</th>
                      <th style={s.th}>Valid Until</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offers.map((o) => (
                      <tr key={o.offerId}>
                        <td style={s.td}>{o.message}</td>
                        <td style={s.td}>{o.deliveryCount.toLocaleString()}</td>
                        <td style={s.td}>
                          <span style={s.ctrBadge(o.clickThroughRate)}>
                            {(o.clickThroughRate * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td style={s.td}>{new Date(o.validUntil).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Report download */}
            <div style={s.card}>
              <div style={s.cardTitle}>Sponsor Report</div>
              <button style={s.btn} onClick={handleDownloadReport} aria-label="Download sponsor report">
                ⬇ Download Sponsor Report
              </button>
              {reportFeedback && <p style={s.feedback} role="status">{reportFeedback}</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
