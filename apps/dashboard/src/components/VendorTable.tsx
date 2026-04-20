import React from 'react';

export interface VendorKioskStats {
  kioskId: string;
  kioskName: string;
  vendorName: string;
  revenue: number;
  footfall: number;
  slaCompliant: boolean;
  avgWaitMinutes: number;
  zoneId: string;
  zoneName?: string;
}

interface VendorTableProps {
  kiosks: VendorKioskStats[];
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
  },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    textAlign: 'left',
    padding: '10px 14px',
    color: '#94a3b8',
    borderBottom: '1px solid #2d3148',
    fontWeight: 600,
    fontSize: 11,
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '10px 14px',
    color: '#e2e8f0',
    borderBottom: '1px solid #1e2235',
    whiteSpace: 'nowrap',
  },
  slaOk: {
    color: '#22c55e',
    fontWeight: 600,
    fontSize: 11,
    padding: '2px 8px',
    background: 'rgba(34,197,94,0.1)',
    borderRadius: 10,
  },
  slaFail: {
    color: '#ef4444',
    fontWeight: 600,
    fontSize: 11,
    padding: '2px 8px',
    background: 'rgba(239,68,68,0.1)',
    borderRadius: 10,
  },
  empty: { padding: 24, textAlign: 'center', color: '#475569', fontSize: 13 },
};

export function VendorTable({ kiosks }: VendorTableProps) {
  return (
    <section style={styles.container} aria-label="Vendor kiosk performance table">
      <div style={styles.header}>Kiosk Performance</div>
      {kiosks.length === 0 ? (
        <div style={styles.empty}>No kiosk data available</div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Kiosk</th>
                <th style={styles.th}>Vendor</th>
                <th style={styles.th}>Zone</th>
                <th style={styles.th}>Revenue</th>
                <th style={styles.th}>Footfall</th>
                <th style={styles.th}>Avg Wait</th>
                <th style={styles.th}>SLA</th>
              </tr>
            </thead>
            <tbody>
              {kiosks.map((k) => (
                <tr key={k.kioskId}>
                  <td style={styles.td}>{k.kioskName}</td>
                  <td style={styles.td}>{k.vendorName}</td>
                  <td style={styles.td}>{k.zoneName ?? k.zoneId}</td>
                  <td style={styles.td}>${k.revenue.toLocaleString()}</td>
                  <td style={styles.td}>{k.footfall.toLocaleString()}</td>
                  <td style={styles.td}>{k.avgWaitMinutes.toFixed(1)} min</td>
                  <td style={styles.td}>
                    <span style={k.slaCompliant ? styles.slaOk : styles.slaFail}>
                      {k.slaCompliant ? 'Compliant' : 'Breach'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
