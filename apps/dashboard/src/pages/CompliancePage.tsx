/**
 * CompliancePage — Task 26.4
 *
 * - Per-zone fire-code capacity status table with real-time updates (Req 33.1)
 * - Audit trail log viewer with date/time filter and CSV export (Req 33.2)
 * - Regulatory report generation trigger (ADMIN role) (Req 33.3)
 * - GDPR consent management view (ADMIN role) (Req 33.4)
 */
import React, { useState, useCallback } from 'react';
import { useAuth } from '../auth/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';
import { useApi, apiFetch } from '../hooks/useApi';
import { TopBar } from '../components/TopBar';

interface ZoneCapacity {
  zoneId: string;
  zoneName: string;
  currentOccupancy: number;
  fireCodeLimit: number;
  status: 'compliant' | 'warning' | 'violation';
}

interface AuditEntry {
  entryId: string;
  timestamp: string;
  userId: string;
  action: string;
  resource: string;
  details: string;
  ipAddress: string;
}

interface GdprConsent {
  userId: string;
  email: string;
  locationTracking: boolean;
  marketing: boolean;
  dataRetention: boolean;
  consentDate: string;
}

interface CapacityUpdate {
  type: 'capacity_update';
  zones: ZoneCapacity[];
}

const STATUS_COLORS: Record<ZoneCapacity['status'], string> = {
  compliant: '#22c55e',
  warning: '#eab308',
  violation: '#ef4444',
};

const styles = {
  page: { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#0f172a' } as React.CSSProperties,
  body: { display: 'flex', flex: 1, overflow: 'hidden' } as React.CSSProperties,
  main: { flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 } as React.CSSProperties,
  card: { background: '#1e293b', borderRadius: 8, padding: 16 } as React.CSSProperties,
  cardTitle: { color: '#e2e8f0', fontSize: 14, fontWeight: 600, marginBottom: 12 } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse' as const } as React.CSSProperties,
  th: { color: '#94a3b8', fontSize: 11, fontWeight: 600, textAlign: 'left' as const, padding: '6px 8px', borderBottom: '1px solid #334155' } as React.CSSProperties,
  td: { color: '#cbd5e1', fontSize: 12, padding: '8px 8px', borderBottom: '1px solid #1e293b' } as React.CSSProperties,
  filterRow: { display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' } as React.CSSProperties,
  input: { background: '#0f172a', border: '1px solid #334155', borderRadius: 4, color: '#e2e8f0', fontSize: 12, padding: '6px 10px' } as React.CSSProperties,
  exportBtn: { background: '#334155', color: '#e2e8f0', border: 'none', borderRadius: 4, padding: '6px 14px', fontSize: 12, cursor: 'pointer' } as React.CSSProperties,
  reportBtn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' } as React.CSSProperties,
  gdprRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1e293b' } as React.CSSProperties,
  gdprEmail: { color: '#cbd5e1', fontSize: 12 } as React.CSSProperties,
  gdprConsents: { display: 'flex', gap: 6 } as React.CSSProperties,
  emptyState: { color: '#64748b', fontSize: 13, textAlign: 'center', padding: '24px 0' } as React.CSSProperties,
  reportFeedback: { color: '#86efac', fontSize: 12, marginTop: 8 } as React.CSSProperties,
  statusBadge: (status: ZoneCapacity['status']): React.CSSProperties => ({
    display: 'inline-block', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600,
    background: STATUS_COLORS[status] + '22', color: STATUS_COLORS[status], border: `1px solid ${STATUS_COLORS[status]}`,
  }),
  consentTag: (granted: boolean): React.CSSProperties => ({
    display: 'inline-block', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 600,
    background: granted ? '#14532d' : '#7f1d1d', color: granted ? '#86efac' : '#fca5a5',
  }),
  capacityBar: (pct: number, status: ZoneCapacity['status']): React.CSSProperties => ({
    height: 4, borderRadius: 2, background: STATUS_COLORS[status],
    width: `${Math.min(pct, 100)}%`, transition: 'width 0.3s',
  }),
} as const;

function downloadCsv(entries: AuditEntry[]) {
  const header = 'Timestamp,User,Action,Resource,Details,IP\n';
  const rows = entries.map((e) =>
    [e.timestamp, e.userId, e.action, e.resource, `"${e.details}"`, e.ipAddress].join(',')
  ).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function CompliancePage() {
  const { user } = useAuth();
  const venueId = user?.venueId ?? '';

  const [zones, setZones] = useState<ZoneCapacity[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reportFeedback, setReportFeedback] = useState('');

  // Capacity data
  const { data: capacityData } = useApi<{ zones: ZoneCapacity[] }>(
    venueId ? `/compliance/capacity/${venueId}` : null
  );
  React.useEffect(() => {
    if (capacityData?.zones) setZones(capacityData.zones);
  }, [capacityData]);

  // Real-time capacity updates
  const handleCapacityMessage = useCallback((data: CapacityUpdate) => {
    if (data.type === 'capacity_update' && data.zones) {
      setZones(data.zones);
    }
  }, []);
  const { connected } = useWebSocket<CapacityUpdate>(`compliance:${venueId}`, handleCapacityMessage);

  // Audit log
  const auditUrl = venueId
    ? `/compliance/audit/${venueId}?${dateFrom ? `from=${dateFrom}&` : ''}${dateTo ? `to=${dateTo}` : ''}`
    : null;
  const { data: auditData, refetch: refetchAudit } = useApi<{ entries: AuditEntry[] }>(auditUrl);
  const auditEntries = auditData?.entries ?? [];

  // GDPR consents (ADMIN only)
  const { data: gdprData } = useApi<{ consents: GdprConsent[] }>(
    venueId ? `/compliance/gdpr/${venueId}` : null
  );
  const consents = gdprData?.consents ?? [];

  function handleGenerateReport() {
    apiFetch(`/compliance/reports/${venueId}/generate`, { method: 'POST' })
      .then(() => {
        setReportFeedback('Regulatory report generation started. You will be notified when ready.');
        setTimeout(() => setReportFeedback(''), 5000);
      })
      .catch(() => setReportFeedback('Failed to trigger report generation.'));
  }

  return (
    <div style={styles.page}>
      <TopBar title="Compliance & Audit" connected={connected} />
      <div style={styles.body}>
        <main style={styles.main} aria-label="Compliance and audit panel">

          {/* Fire-code capacity table */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>Fire-Code Capacity Status</div>
            {!connected && zones.length === 0 ? (
              <div style={styles.emptyState}>⏳ Loading capacity data…</div>
            ) : zones.length === 0 ? (
              <div style={styles.emptyState}>No capacity data available</div>
            ) : (
              <table style={styles.table} aria-label="Zone capacity status">
                <thead>
                  <tr>
                    <th style={styles.th}>Zone</th>
                    <th style={styles.th}>Occupancy</th>
                    <th style={styles.th}>Limit</th>
                    <th style={styles.th}>Usage</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {zones.map((zone) => {
                    const pct = Math.round((zone.currentOccupancy / zone.fireCodeLimit) * 100);
                    return (
                      <tr key={zone.zoneId}>
                        <td style={styles.td}>{zone.zoneName}</td>
                        <td style={styles.td}>{zone.currentOccupancy.toLocaleString()}</td>
                        <td style={styles.td}>{zone.fireCodeLimit.toLocaleString()}</td>
                        <td style={{ ...styles.td, minWidth: 80 }}>
                          <div style={{ background: '#0f172a', borderRadius: 2, height: 4, marginBottom: 2 }}>
                            <div style={styles.capacityBar(pct, zone.status)} />
                          </div>
                          <span style={{ fontSize: 10, color: '#94a3b8' }}>{pct}%</span>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.statusBadge(zone.status)}>
                            {zone.status.charAt(0).toUpperCase() + zone.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Audit trail */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>Audit Trail</div>
            <div style={styles.filterRow}>
              <label style={{ color: '#94a3b8', fontSize: 12 }}>From:</label>
              <input
                style={styles.input}
                type="datetime-local"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                aria-label="Filter from date"
              />
              <label style={{ color: '#94a3b8', fontSize: 12 }}>To:</label>
              <input
                style={styles.input}
                type="datetime-local"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                aria-label="Filter to date"
              />
              <button style={styles.exportBtn} onClick={refetchAudit} aria-label="Apply date filter">
                Filter
              </button>
              <button
                style={styles.exportBtn}
                onClick={() => downloadCsv(auditEntries)}
                disabled={auditEntries.length === 0}
                aria-label="Export audit log as CSV"
              >
                Export CSV
              </button>
            </div>
            {!connected && auditEntries.length === 0 ? (
              <div style={styles.emptyState}>⏳ Loading audit trail…</div>
            ) : auditEntries.length === 0 ? (
              <div style={styles.emptyState}>No audit entries for selected range</div>
            ) : (
              <table style={styles.table} aria-label="Audit log entries">
                <thead>
                  <tr>
                    <th style={styles.th}>Time</th>
                    <th style={styles.th}>User</th>
                    <th style={styles.th}>Action</th>
                    <th style={styles.th}>Resource</th>
                    <th style={styles.th}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditEntries.map((entry) => (
                    <tr key={entry.entryId}>
                      <td style={styles.td}>{new Date(entry.timestamp).toLocaleString()}</td>
                      <td style={styles.td}>{entry.userId}</td>
                      <td style={styles.td}>{entry.action}</td>
                      <td style={styles.td}>{entry.resource}</td>
                      <td style={{ ...styles.td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Regulatory report generation (ADMIN) */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>Regulatory Reports</div>
            <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>
              Generate a full regulatory compliance report for this venue. Available to ADMIN only.
            </p>
            <button style={styles.reportBtn} onClick={handleGenerateReport} aria-label="Generate regulatory report">
              Generate Regulatory Report
            </button>
            {reportFeedback && (
              <p style={styles.reportFeedback} role="status">{reportFeedback}</p>
            )}
          </div>

          {/* GDPR consent management (ADMIN) */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>GDPR Consent Management</div>
            {!connected && consents.length === 0 ? (
              <div style={styles.emptyState}>⏳ Loading consent records…</div>
            ) : consents.length === 0 ? (
              <div style={styles.emptyState}>No consent records found</div>
            ) : (
              consents.map((c) => (
                <div key={c.userId} style={styles.gdprRow}>
                  <div>
                    <div style={styles.gdprEmail}>{c.email}</div>
                    <div style={{ color: '#64748b', fontSize: 11 }}>
                      Consented: {new Date(c.consentDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={styles.gdprConsents}>
                    <span style={styles.consentTag(c.locationTracking)}>Location</span>
                    <span style={styles.consentTag(c.marketing)}>Marketing</span>
                    <span style={styles.consentTag(c.dataRetention)}>Retention</span>
                  </div>
                </div>
              ))
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
