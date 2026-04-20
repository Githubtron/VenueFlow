
import { useMemo } from 'react';
import { ZoneSnapshot } from './ZoneHeatmap';

interface StadiumHeatmapProps {
  zones: ZoneSnapshot[];
  onZoneClick?: (zoneId: string) => void;
}

// Stadium layout: 6 columns × 4 rows of zones (24 zones total, matching demo data)
// This represents a generic large venue layout
const ZONE_POSITIONS: Record<string, { x: number; y: number; width: number; height: number; row: number; col: number }> = {
  'z1': { x: 50, y: 20, width: 150, height: 120, row: 0, col: 0 },   // Main Stage
  'z2': { x: 50, y: 180, width: 150, height: 120, row: 1, col: 0 },  // North Stand
  'z3': { x: 50, y: 340, width: 150, height: 120, row: 2, col: 0 },  // South Stand
  'z4': { x: 50, y: 500, width: 150, height: 80, row: 3, col: 0 },   // East Concourse
  'z5': { x: 220, y: 20, width: 150, height: 120, row: 0, col: 1 },  // West Concourse
  'z6': { x: 220, y: 180, width: 150, height: 120, row: 1, col: 1 }, // Gate A Entry
  'z7': { x: 220, y: 340, width: 150, height: 120, row: 2, col: 1 }, // Gate B Entry
  'z8': { x: 220, y: 500, width: 150, height: 80, row: 3, col: 1 },  // Food Court
  'z9': { x: 390, y: 20, width: 150, height: 120, row: 0, col: 2 },  // VIP Lounge
  'z10': { x: 390, y: 180, width: 150, height: 120, row: 1, col: 2 }, // Parking Zone A
  'z11': { x: 390, y: 340, width: 150, height: 120, row: 2, col: 2 }, // Medical Bay
  'z12': { x: 390, y: 500, width: 150, height: 80, row: 3, col: 2 },  // Press Area
};

function getColorByStatus(status: ZoneSnapshot['status']): string {
  if (status === 'red') return '#ff5451';      // Critical red
  if (status === 'amber') return '#f59e0b';   // Orange/amber
  if (status === 'green') return '#4ae176';   // Safe green
  return '#424754';                           // Unavailable gray
}

function getTextColorByDensity(density: number): string {
  if (density >= 80) return '#ffb3ad';  // Light red for critical
  if (density >= 50) return '#ffc689';  // Light orange for busy
  return '#e2e2eb';                     // Default light text
}

export function StadiumHeatmap({ zones, onZoneClick }: StadiumHeatmapProps) {
  const zoneMap = useMemo(() => {
    const map = new Map(zones.map(z => [z.zoneId, z]));
    return map;
  }, [zones]);

  const totalWidth = 560;
  const totalHeight = 600;

  if (zones.length === 0) {
    return (
      <div style={{
        padding: '48px 0',
        textAlign: 'center',
        color: '#424754',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
      }}>
        No zone data available
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
      aria-label="Stadium heatmap visualization"
    >
      {/* SVG Stadium Map */}
      <div
        style={{
          background: '#0c0e14',
          borderRadius: 16,
          padding: 20,
          border: '1px solid rgba(66, 71, 84, 0.2)',
        }}
      >
        <svg
          viewBox={`0 0 ${totalWidth} ${totalHeight}`}
          style={{
            width: '100%',
            height: 'auto',
            aspectRatio: `${totalWidth} / ${totalHeight}`,
          }}
          aria-label="Stadium layout with crowd density heatmap"
        >
          {/* Background */}
          <rect width={totalWidth} height={totalHeight} fill="#111319" rx="8" />

          {/* Zone rectangles */}
          {Object.entries(ZONE_POSITIONS).map(([zoneId, pos]) => {
            const zone = zoneMap.get(zoneId);
            if (!zone) return null;

            const color = getColorByStatus(zone.status);
            const opacity = zone.status === 'unavailable' ? 0.3 : 0.85;
            const isInteractive = !!onZoneClick;

            return (
              <g key={zoneId}>
                {/* Zone rectangle */}
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={pos.width}
                  height={pos.height}
                  fill={color}
                  opacity={opacity}
                  rx="6"
                  style={{
                    cursor: isInteractive ? 'pointer' : 'default',
                    transition: 'opacity 0.2s, stroke 0.2s',
                    stroke: zone.status === 'red' ? 'rgba(255, 84, 81, 0.6)' : 'rgba(66, 71, 84, 0.3)',
                    strokeWidth: zone.status === 'red' ? 2 : 1,
                    filter: zone.status === 'red' ? 'drop-shadow(0 0 8px rgba(255, 84, 81, 0.4))' : 'none',
                  }}
                  onClick={() => onZoneClick?.(zoneId)}
                  onMouseEnter={(e) => {
                    if (isInteractive) {
                      (e.target as SVGRectElement).style.opacity = String(Math.min(opacity + 0.2, 1));
                      (e.target as SVGRectElement).style.strokeWidth = '2';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isInteractive) {
                      (e.target as SVGRectElement).style.opacity = String(opacity);
                      (e.target as SVGRectElement).style.strokeWidth = zone.status === 'red' ? '2' : '1';
                    }
                  }}
                  role={isInteractive ? 'button' : undefined}
                  tabIndex={isInteractive ? 0 : -1}
                  aria-label={`${zone.name}: ${zone.currentCount} people, ${zone.densityPercent}% capacity`}
                />

                {/* Zone label - ID */}
                <text
                  x={pos.x + pos.width / 2}
                  y={pos.y + 16}
                  textAnchor="middle"
                  fontSize="8"
                  fontWeight="700"
                  fill="#8c909f"
                  letterSpacing="1"
                  style={{ pointerEvents: 'none', textTransform: 'uppercase' }}
                >
                  {zone.zoneId}
                </text>

                {/* Zone label - Name */}
                <text
                  x={pos.x + pos.width / 2}
                  y={pos.y + 32}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill={getTextColorByDensity(zone.densityPercent)}
                  style={{ pointerEvents: 'none' }}
                >
                  {zone.name.length > 14 ? zone.name.substring(0, 14) + '…' : zone.name}
                </text>

                {/* Density percentage */}
                <text
                  x={pos.x + pos.width / 2}
                  y={pos.y + pos.height - 12}
                  textAnchor="middle"
                  fontSize="14"
                  fontWeight="900"
                  fill="#e2e2eb"
                  style={{ pointerEvents: 'none', fontVariantNumeric: 'tabular-nums' }}
                >
                  {zone.status === 'unavailable' ? '—' : `${zone.densityPercent}%`}
                </text>

                {/* Count */}
                <text
                  x={pos.x + pos.width / 2}
                  y={pos.y + pos.height + 8}
                  textAnchor="middle"
                  fontSize="7"
                  fontWeight="600"
                  fill="#c2c6d6"
                  style={{ pointerEvents: 'none', fontVariantNumeric: 'tabular-nums' }}
                >
                  {zone.currentCount.toLocaleString()} people
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          padding: '14px 20px',
          background: '#191b22',
          borderRadius: 12,
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
        }}
      >
        {[
          { color: '#4ae176', label: 'Safe ≤50%' },
          { color: '#f59e0b', label: 'Busy 50-80%' },
          { color: '#ff5451', label: 'Critical ≥80%' },
          { color: '#424754', label: 'Unavailable' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                background: color,
              }}
            />
            <span style={{ color: '#c2c6d6' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 12,
        }}
      >
        {[
          { label: 'Total Occupancy', value: Math.round((zones.reduce((s, z) => s + z.densityPercent, 0) / zones.filter(z => z.status !== 'unavailable').length) || 0) + '%', color: '#adc6ff' },
          { label: 'Critical Zones', value: zones.filter(z => z.status === 'red').length, color: '#ffb3ad' },
          { label: 'Busy Zones', value: zones.filter(z => z.status === 'amber').length, color: '#ffc689' },
          { label: 'Safe Zones', value: zones.filter(z => z.status === 'green').length, color: '#4ae176' },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            style={{
              background: '#191b22',
              padding: '12px 16px',
              borderRadius: 10,
              borderLeft: `3px solid ${color}`,
            }}
          >
            <div style={{ fontSize: 9, color: '#8c909f', fontWeight: 600, marginBottom: 6 }}>
              {label}
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
