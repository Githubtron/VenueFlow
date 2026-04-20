

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

const SPEC_CONFIG: Record<string, { color: string; label: string }> = {
  first_aid:     { color: '#4ae176', label: 'Medical' },
  security:      { color: '#adc6ff', label: 'Security' },
  crowd_control: { color: '#adc6ff', label: 'Security' },
  operations:    { color: '#ffb786', label: 'Ops' },
  general:       { color: '#8c909f', label: 'Staff' },
};

function getSpec(spec?: string) {
  return SPEC_CONFIG[spec ?? 'general'] ?? SPEC_CONFIG['general']!;
}

export function StaffPinsOverlay({ staffLocations, highlightZoneId }: StaffPinsOverlayProps) {
  return (
    <section aria-label="Staff locations">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 900, color: '#c2c6d6', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          Staff On Ground
        </span>
        <span style={{
          background: '#282a30', color: '#4ae176',
          borderRadius: 4, padding: '2px 8px',
          fontSize: 10, fontWeight: 900,
        }}>
          {staffLocations.length} Total
        </span>
      </div>

      {staffLocations.length === 0 ? (
        <div style={{
          background: '#191b22', borderRadius: 10, padding: '20px 16px',
          textAlign: 'center', color: '#424754', fontSize: 12,
        }}>
          No staff location data
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {staffLocations.map(staff => {
            const spec = getSpec(staff.specialization);
            const isHighlighted = highlightZoneId && staff.zoneId === highlightZoneId;

            return (
              <div
                key={staff.staffId}
                role="listitem"
                aria-label={`${staff.name} in ${staff.zoneName ?? staff.zoneId}`}
                style={{
                  background: isHighlighted ? '#282a30' : '#191b22',
                  borderRadius: 8,
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  transition: 'background 0.15s',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 32, height: 32, borderRadius: 6,
                  background: `${spec.color}18`,
                  border: `1px solid ${spec.color}33`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 900, color: spec.color, flexShrink: 0,
                }}>
                  {staff.name[0]}
                </div>

                {/* Info */}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e2eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {staff.name}
                  </div>
                  <div style={{ fontSize: 10, color: '#8c909f', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {staff.zoneName ?? staff.zoneId}
                  </div>
                </div>

                {/* Status + spec */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: staff.isAvailable ? '#4ae176' : '#ffb3ad',
                      display: 'inline-block',
                    }} />
                    <span style={{ fontSize: 9, fontWeight: 700, color: staff.isAvailable ? '#4ae176' : '#ffb3ad' }}>
                      {staff.isAvailable ? 'Active' : 'Busy'}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 8, fontWeight: 900,
                    color: spec.color,
                    background: `${spec.color}18`,
                    padding: '1px 5px', borderRadius: 3,
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                  }}>
                    {spec.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
