import React from 'react';

export interface StaffLocation {
  staffId: string;
  name: string;
  zoneId: string;
  zoneName?: string;
  specialization?: string;
  isAvailable: boolean;
  locationUpdatedAt?: string;
}

interface StaffPinsOverlayProps {
  staffLocations: StaffLocation[];
  highlightZoneId?: string;
}

const SPEC_COLORS: Record<string, string> = {
  first_aid: '#ef4444',
  security: '#3b82f6',
  operations: '#f59e0b',
  general: '#94a3b8',
};

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
  list: { maxHeight: 280, overflowY: 'auto' },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 16px',
    borderBottom: '1px solid #1e2235',
  },
  itemHighlighted: {
    background: 'rgba(124,106,247,0.08)',
  },
  pin: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  },
  name: { fontSize: 13, color: '#e2e8f0', flex: 1 },
  zone: { fontSize: 11, color: '#475569' },
  spec: { fontSize: 10, padding: '2px 6px', borderRadius: 10, fontWeight: 600 },
  empty: { padding: 24, textAlign: 'center', color: '#475569', fontSize: 13 },
};

export function StaffPinsOverlay({ staffLocations, highlightZoneId }: StaffPinsOverlayProps) {
  return (
    <section style={styles.container} aria-label="Staff locations">
      <div style={styles.header}>
        Staff Locations ({staffLocations.length})
      </div>
      {staffLocations.length === 0 ? (
        <div style={styles.empty}>No staff location data</div>
      ) : (
        <ul style={styles.list} role="list">
          {staffLocations.map((staff) => {
            const color = SPEC_COLORS[staff.specialization ?? 'general'] ?? '#94a3b8';
            const isHighlighted = highlightZoneId && staff.zoneId === highlightZoneId;
            return (
              <li
                key={staff.staffId}
                style={{
                  ...styles.item,
                  ...(isHighlighted ? styles.itemHighlighted : {}),
                }}
                role="listitem"
                aria-label={`${staff.name} in ${staff.zoneName ?? staff.zoneId}`}
              >
                <span
                  style={{ ...styles.pin, background: color }}
                  aria-hidden="true"
                />
                <span style={styles.name}>{staff.name}</span>
                <span style={styles.zone}>{staff.zoneName ?? staff.zoneId}</span>
                {staff.specialization && (
                  <span
                    style={{ ...styles.spec, background: color + '22', color }}
                  >
                    {staff.specialization.replace('_', ' ')}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
