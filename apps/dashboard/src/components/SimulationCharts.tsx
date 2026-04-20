import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface GateForecastPoint {
  time: string;
  [gateId: string]: number | string;
}

export interface StaffDeploymentPlan {
  zoneId: string;
  zoneName: string;
  recommendedHeadcount: number;
  currentHeadcount: number;
  gateStaffingLevel: string;
}

interface SimulationChartsProps {
  forecastData: GateForecastPoint[];
  gateIds: string[];
  staffPlan: StaffDeploymentPlan[];
}

const COLORS = ['#7c6af7', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 16 },
  card: {
    background: '#1a1d27',
    border: '1px solid #2d3148',
    borderRadius: 8,
    padding: 16,
  },
  title: { fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 16 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    textAlign: 'left',
    padding: '8px 12px',
    color: '#94a3b8',
    borderBottom: '1px solid #2d3148',
    fontWeight: 600,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  td: { padding: '10px 12px', color: '#e2e8f0', borderBottom: '1px solid #1e2235' },
  over: { color: '#ef4444', fontWeight: 600 },
  ok: { color: '#22c55e' },
};

export function SimulationCharts({ forecastData, gateIds, staffPlan }: SimulationChartsProps) {
  return (
    <div style={styles.container}>
      {/* Gate load forecast chart */}
      <section style={styles.card} aria-label="Gate load forecast">
        <div style={styles.title}>Gate Load Forecast</div>
        {forecastData.length === 0 ? (
          <div style={{ color: '#475569', fontSize: 13 }}>No forecast data</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={forecastData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" />
              <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: '#1e2235',
                  border: '1px solid #2d3148',
                  color: '#e2e8f0',
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              {gateIds.map((gateId, i) => (
                <Line
                  key={gateId}
                  type="monotone"
                  dataKey={gateId}
                  stroke={COLORS[i % COLORS.length]}
                  dot={false}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Staff deployment plan table */}
      <section style={styles.card} aria-label="Recommended staff deployment plan">
        <div style={styles.title}>Recommended Staff Deployment Plan</div>
        {staffPlan.length === 0 ? (
          <div style={{ color: '#475569', fontSize: 13 }}>No deployment plan available</div>
        ) : (
          <table style={styles.table} aria-label="Staff deployment plan">
            <thead>
              <tr>
                <th style={styles.th}>Zone</th>
                <th style={styles.th}>Recommended</th>
                <th style={styles.th}>Current</th>
                <th style={styles.th}>Gate Staffing</th>
              </tr>
            </thead>
            <tbody>
              {staffPlan.map((row) => {
                const isOver = row.currentHeadcount < row.recommendedHeadcount;
                return (
                  <tr key={row.zoneId}>
                    <td style={styles.td}>{row.zoneName}</td>
                    <td style={styles.td}>{row.recommendedHeadcount}</td>
                    <td style={{ ...styles.td, ...(isOver ? styles.over : styles.ok) }}>
                      {row.currentHeadcount}
                    </td>
                    <td style={styles.td}>{row.gateStaffingLevel}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
