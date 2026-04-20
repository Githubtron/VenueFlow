import { useState, useEffect, useRef } from 'react';
import { ZoneSnapshot } from './ZoneHeatmap';
import { CrowdSimulator, createSimulationConfig } from '../utils/CrowdSimulator';

interface SimulationLiveProps {
  initialZones: ZoneSnapshot[];
  eventType?: 'concert' | 'sports' | 'gathering' | 'festival';
  duration?: number;
}

export function SimulationLive({ initialZones, eventType = 'concert', duration = 120000 }: SimulationLiveProps) {
  const [zones, setZones] = useState<ZoneSnapshot[]>(initialZones);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const simulatorRef = useRef<CrowdSimulator | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleStart = () => {
    if (isRunning) return;

    const config = createSimulationConfig(eventType, duration);
    const simulator = new CrowdSimulator(initialZones, config);

    simulatorRef.current = simulator;
    setIsRunning(true);
    setProgress(0);

    simulator.start((updatedZones) => {
      setZones(updatedZones);
      setProgress(simulator.getProgress());

      // Stop if complete
      if (simulator.isComplete()) {
        setIsRunning(false);
      }
    });

    // Update progress bar more frequently for smooth visual feedback
    progressIntervalRef.current = setInterval(() => {
      if (simulatorRef.current) {
        setProgress(simulatorRef.current.getProgress());
      }
    }, 100);
  };

  const handleStop = () => {
    if (simulatorRef.current) {
      simulatorRef.current.stop();
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    setIsRunning(false);
    setProgress(0);
    setZones(initialZones);
  };

  const handleReset = () => {
    handleStop();
  };

  useEffect(() => {
    return () => {
      if (simulatorRef.current) {
        simulatorRef.current.stop();
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const totalAttendees = zones.reduce((sum, z) => sum + z.currentCount, 0);
  const criticalZones = zones.filter(z => z.status === 'red').length;
  const busyZones = zones.filter(z => z.status === 'amber').length;
  const avgDensity = Math.round(
    zones.reduce((sum, z) => sum + z.densityPercent, 0) / zones.filter(z => z.status !== 'unavailable').length
  );

  const progressPercent = Math.round(progress * 100);
  const timeElapsed = Math.round((progress * duration) / 1000);
  const totalTime = Math.round(duration / 1000);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Controls */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          padding: '16px 20px',
          background: '#191b22',
          borderRadius: 12,
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={handleStart}
          disabled={isRunning}
          style={{
            padding: '10px 20px',
            background: isRunning ? '#424754' : '#4ae176',
            color: isRunning ? '#8c909f' : '#000',
            border: 'none',
            borderRadius: 6,
            fontWeight: 700,
            cursor: isRunning ? 'not-allowed' : 'pointer',
            fontSize: 13,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          {isRunning ? '⏸ Running' : '▶ Start Simulation'}
        </button>

        <button
          onClick={handleStop}
          disabled={!isRunning}
          style={{
            padding: '10px 20px',
            background: !isRunning ? '#424754' : '#ff5451',
            color: !isRunning ? '#8c909f' : '#fff',
            border: 'none',
            borderRadius: 6,
            fontWeight: 700,
            cursor: !isRunning ? 'not-allowed' : 'pointer',
            fontSize: 13,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          ⏹ Stop
        </button>

        <button
          onClick={handleReset}
          style={{
            padding: '10px 20px',
            background: '#282a30',
            color: '#adc6ff',
            border: '1px solid #424754',
            borderRadius: 6,
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: 13,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          ↻ Reset
        </button>

        {/* Time display */}
        <div
          style={{
            marginLeft: 'auto',
            fontSize: 13,
            fontWeight: 600,
            color: '#c2c6d6',
            fontFamily: 'monospace',
          }}
        >
          {timeElapsed}s / {totalTime}s
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#8c909f', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Simulation Progress
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#adc6ff' }}>
            {progressPercent}%
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: 8,
            background: '#0c0e14',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, #4ae176, #f59e0b, #ff5451)',
              transition: 'width 0.1s linear',
            }}
          />
        </div>
      </div>

      {/* Live Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 12,
        }}
      >
        <div
          style={{
            background: '#191b22',
            padding: '14px 16px',
            borderRadius: 10,
            borderLeft: '3px solid #adc6ff',
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 700, color: '#8c909f', textTransform: 'uppercase', marginBottom: 6 }}>
            Total Attendees
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#e2e2eb' }}>
            {totalAttendees.toLocaleString()}
          </div>
        </div>

        <div
          style={{
            background: '#191b22',
            padding: '14px 16px',
            borderRadius: 10,
            borderLeft: '3px solid #f59e0b',
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 700, color: '#8c909f', textTransform: 'uppercase', marginBottom: 6 }}>
            Avg Density
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#ffc689' }}>
            {avgDensity}%
          </div>
        </div>

        <div
          style={{
            background: '#191b22',
            padding: '14px 16px',
            borderRadius: 10,
            borderLeft: '3px solid #ff5451',
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 700, color: '#8c909f', textTransform: 'uppercase', marginBottom: 6 }}>
            Critical Zones
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#ffb3ad' }}>
            {criticalZones}
          </div>
        </div>

        <div
          style={{
            background: '#191b22',
            padding: '14px 16px',
            borderRadius: 10,
            borderLeft: '3px solid #f59e0b',
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 700, color: '#8c909f', textTransform: 'uppercase', marginBottom: 6 }}>
            Busy Zones
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#ffc689' }}>
            {busyZones}
          </div>
        </div>
      </div>

      {/* Zone Density Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 12,
        }}
      >
        {zones.map((zone) => {
          let borderColor = '#4ae176';
          if (zone.status === 'red') borderColor = '#ff5451';
          else if (zone.status === 'amber') borderColor = '#f59e0b';
          else if (zone.status === 'unavailable') borderColor = '#424754';

          return (
            <div
              key={zone.zoneId}
              style={{
                background: '#191b22',
                padding: '12px 14px',
                borderRadius: 8,
                borderLeft: `3px solid ${borderColor}`,
              }}
            >
              <div style={{ fontSize: 9, fontWeight: 700, color: '#8c909f', textTransform: 'uppercase', marginBottom: 4 }}>
                {zone.zoneId}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e2eb', marginBottom: 8 }}>
                {zone.name}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 900, color: '#e2e2eb' }}>
                  {zone.currentCount}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: borderColor }}>
                  {zone.densityPercent}%
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: 4,
                  background: '#0c0e14',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${zone.densityPercent}%`,
                    background: borderColor,
                    transition: 'width 0.1s linear',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
