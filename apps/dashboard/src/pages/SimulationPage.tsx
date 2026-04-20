/**
 * SimulationPage — Crowd Simulation Dashboard
 *
 * Real-time crowd density simulation with configurable event types and durations.
 */
import { useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { TopBar } from '../components/TopBar';
import { SimulationLive } from '../components/SimulationLive';
import { ZoneSnapshot } from '../components/ZoneHeatmap';

// Demo zones
const DEMO_ZONES: ZoneSnapshot[] = [
  { zoneId: 'z1', name: 'Main Stage', currentCount: 0, densityPercent: 0, status: 'green', capacity: 5000 },
  { zoneId: 'z2', name: 'North Stand', currentCount: 0, densityPercent: 0, status: 'green', capacity: 4000 },
  { zoneId: 'z3', name: 'South Stand', currentCount: 0, densityPercent: 0, status: 'green', capacity: 4000 },
  { zoneId: 'z4', name: 'East Concourse', currentCount: 0, densityPercent: 0, status: 'green', capacity: 2500 },
  { zoneId: 'z5', name: 'West Concourse', currentCount: 0, densityPercent: 0, status: 'green', capacity: 2500 },
  { zoneId: 'z6', name: 'Gate A Entry', currentCount: 0, densityPercent: 0, status: 'green', capacity: 500 },
  { zoneId: 'z7', name: 'Gate B Entry', currentCount: 0, densityPercent: 0, status: 'green', capacity: 500 },
  { zoneId: 'z8', name: 'Food Court', currentCount: 0, densityPercent: 0, status: 'green', capacity: 1000 },
  { zoneId: 'z9', name: 'VIP Lounge', currentCount: 0, densityPercent: 0, status: 'green', capacity: 500 },
  { zoneId: 'z10', name: 'Parking Zone A', currentCount: 0, densityPercent: 0, status: 'unavailable', capacity: 800 },
  { zoneId: 'z11', name: 'Medical Bay', currentCount: 0, densityPercent: 0, status: 'green', capacity: 100 },
  { zoneId: 'z12', name: 'Press Area', currentCount: 0, densityPercent: 0, status: 'green', capacity: 200 },
];

export default function SimulationPage() {
  const { isAuthenticated } = useAuth();
  const [eventType, setEventType] = useState<'concert' | 'sports' | 'gathering' | 'festival'>('concert');
  const [duration, setDuration] = useState(120);

  if (!isAuthenticated) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: '#8c909f' }}>
        Please log in to access simulations.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#0c0e14' }}>
      <TopBar title="Crowd Simulation" />

      <div style={{ flex: 1, padding: '20px 24px', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#e2e2eb', marginBottom: 8 }}>
            Crowd Density Simulation
          </h1>
          <p style={{ fontSize: 13, color: '#8c909f' }}>
            Run realistic crowd movement simulations for event planning and safety validation
          </p>
        </div>

        {/* Event Type and Duration Config */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              background: '#191b22',
              padding: '16px 20px',
              borderRadius: 12,
              borderLeft: '3px solid #adc6ff',
            }}
          >
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8c909f', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.1em' }}>
              Event Type
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as any)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#0c0e14',
                color: '#e2e2eb',
                border: '1px solid #424754',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <option value="concert">🎵 Concert</option>
              <option value="sports">🏟️ Sports Event</option>
              <option value="gathering">👥 Gathering</option>
              <option value="festival">🎉 Festival</option>
            </select>
            <p style={{ fontSize: 11, color: '#6b7284', marginTop: 8 }}>
              {eventType === 'concert' && 'Simulate concert crowd: buildup → peak → decline'}
              {eventType === 'sports' && 'Simulate sports event: pre-event → halftime rush → post-event'}
              {eventType === 'gathering' && 'Simulate steady gathering: gradual buildup and decline'}
              {eventType === 'festival' && 'Simulate festival: multiple waves of activity throughout day'}
            </p>
          </div>

          <div
            style={{
              background: '#191b22',
              padding: '16px 20px',
              borderRadius: 12,
              borderLeft: '3px solid #f59e0b',
            }}
          >
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8c909f', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.1em' }}>
              Duration (seconds)
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Math.max(30, Math.min(600, Number(e.target.value))))}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#0c0e14',
                color: '#e2e2eb',
                border: '1px solid #424754',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'monospace',
              }}
              min="30"
              max="600"
              step="10"
            />
            <p style={{ fontSize: 11, color: '#6b7284', marginTop: 8 }}>
              Simulation duration in seconds (30-600). Run at 10x speed for realism.
            </p>
          </div>
        </div>

        {/* Simulation Component */}
        <SimulationLive
          initialZones={DEMO_ZONES}
          eventType={eventType}
          duration={duration * 1000}
        />
      </div>
    </div>
  );
}
