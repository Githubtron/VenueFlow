import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface GateFlowData {
  gateId: string;
  gateName: string;
  entryRate: number;  // people per minute
  exitRate: number;
  updatedAt: string;
}

interface GateFlowRatesProps {
  gates: GateFlowData[];
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#1a1d27',
    border: '1px solid #2d3148',
    borderRadius: 8,
    padding: 16,
  },
  title: { fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 16 },
  empty: { color: '#475569', fontSize: 13, textAlign: 'center', padding: 24 },
};

export function GateFlowRates({ gates }: GateFlowRatesProps) {
  if (gates.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.title}>Gate Flow Rates</div>
        <div style={styles.empty}>No gate data available</div>
      </div>
    );
  }

  const chartData = gates.map((g) => ({
    name: g.gateName,
    Entry: g.entryRate,
    Exit: g.exitRate,
  }));

  return (
    <section style={styles.container} aria-label="Gate entry and exit flow rates">
      <div style={styles.title}>Gate Flow Rates (per min)</div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" />
          <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: '#1e2235', border: '1px solid #2d3148', color: '#e2e8f0' }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
          <Bar dataKey="Entry" fill="#22c55e" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Exit" fill="#f59e0b" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
