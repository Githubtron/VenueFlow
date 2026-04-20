
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

export interface GateFlowData {
  gateId: string;
  gateName: string;
  entryRate: number;
  exitRate: number;
  updatedAt: string;
}

interface GateFlowRatesProps {
  gates: GateFlowData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#282a30', border: 'none',
      borderRadius: 8, padding: '10px 14px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
    }}>
      <div style={{ fontSize: 10, fontWeight: 900, color: '#c2c6d6', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>
        {label}
      </div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.fill, display: 'inline-block' }} />
          <span style={{ fontSize: 11, color: '#e2e2eb', fontWeight: 600 }}>{p.name}: {p.value} ppm</span>
        </div>
      ))}
    </div>
  );
};

export function GateFlowRates({ gates }: GateFlowRatesProps) {
  if (gates.length === 0) {
    return (
      <div style={{
        background: '#191b22', borderRadius: 10, padding: '24px 20px',
      }}>
        <div style={{ fontSize: 10, fontWeight: 900, color: '#c2c6d6', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
          Gate Throughput
        </div>
        <div style={{ color: '#424754', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>
          No gate data available
        </div>
      </div>
    );
  }

  const chartData = gates.map(g => ({
    name: g.gateName,
    Entry: g.entryRate,
    Exit: g.exitRate,
  }));

  return (
    <section style={{ background: '#191b22', borderRadius: 10, padding: '20px 20px 16px' }}
      aria-label="Gate entry and exit flow rates">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 900, color: '#c2c6d6', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Gate Throughput
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#e2e2eb', marginTop: 2 }}>
            {gates.reduce((s, g) => s + g.entryRate, 0).toLocaleString()}
            <span style={{ fontSize: 13, fontWeight: 500, color: '#4ae176', marginLeft: 6 }}>/ min</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#4ae176', display: 'inline-block' }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: '#c2c6d6', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Entry</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#adc6ff', display: 'inline-block' }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: '#c2c6d6', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Exit</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barGap={4}>
          <CartesianGrid strokeDasharray="2 4" stroke="rgba(66,71,84,0.4)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: '#8c909f', fontSize: 10, fontWeight: 700, letterSpacing: 1 }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            tick={{ fill: '#8c909f', fontSize: 10 }}
            axisLine={false} tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="Entry" fill="#4ae176" radius={[3, 3, 0, 0]} maxBarSize={28} />
          <Bar dataKey="Exit"  fill="#adc6ff" radius={[3, 3, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
