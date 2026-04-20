import React from 'react';

export interface ZoneSnapshot {
  zoneId: string;
  name: string;
  currentCount: number;
  densityPercent: number;
  status: 'green' | 'amber' | 'red' | 'unavailable';
  capacity: number;
}

interface ZoneHeatmapProps {
  zones: ZoneSnapshot[];
  staffPins?: StaffPin[];
  onZoneClick?: (zoneId: string) => void;
}

export interface StaffPin {
  staffId: string;
  name: string;
  zoneId: string;
}

const STATUS_COLORS: Record<ZoneSnapshot['status'], string> = {
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
  unavailable: '#475569',
};

const STATUS_BG: Record<ZoneSnapshot['status'], string> = {
  green: 'rgba(34,197,94,0.12)',
  amber: 'rgba(245,158,11,0.12)',
  red: 'rgba(239,68,68,0.15)',
  unavailable: 'rgba(71,85,105,0.12)',
};

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 12,
    padding: 16,
  },
  cell: {
    borderRadius: 8,
    padding: '12px 14px',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'transform 0.1s',
    position: 'relative',
  },
  zoneName: { fontSize: 13, fontWeight: 600, marginBottom: 4 },
  count: { fontSize: 22, fontWeight: 700 },
  density: { fontSize: 11, marginTop: 2, opacity: 0.7 },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: 10,
    textTransform: 'uppercase',
  },
  staffCount: {
    marginTop: 6,
    fontSize: 11,
    color: '#94a3b8',
  },
};

export function ZoneHeatmap({ zones, staffPins = [], onZoneClick }: ZoneHeatmapProps) {
  if (zones.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#475569' }}>
        No zone data available
      </div>
    );
  }

  return (
    <div
      style={styles.grid}
      role="list"
      aria-label="Zone density heatmap"
    >
      {zones.map((zone) => {
        const color = STATUS_COLORS[zone.status];
        const bg = STATUS_BG[zone.status];
        const staffInZone = staffPins.filter((p) => p.zoneId === zone.zoneId);

        return (
          <div
            key={zone.zoneId}
            role="listitem"
            aria-label={`${zone.name}: ${zone.currentCount} people, ${zone.status}`}
            style={{
              ...styles.cell,
              background: bg,
              borderColor: color,
              color: '#e2e8f0',
            }}
            onClick={() => onZoneClick?.(zone.zoneId)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onZoneClick?.(zone.zoneId);
            }}
            tabIndex={0}
          >
            <div style={styles.zoneName}>{zone.name}</div>
            <div style={{ ...styles.count, color }}>{zone.currentCount}</div>
            <div style={styles.density}>
              {zone.status === 'unavailable'
                ? 'Data unavailable'
                : `${zone.densityPercent.toFixed(0)}% of ${zone.capacity}`}
            </div>
            <span
              style={{
                ...styles.badge,
                background: color,
                color: zone.status === 'amber' ? '#1a1d27' : '#fff',
              }}
            >
              {zone.status}
            </span>
            {staffInZone.length > 0 && (
              <div style={styles.staffCount}>
                👤 {staffInZone.length} staff
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
