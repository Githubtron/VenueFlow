

export interface StaffMember {
  staffId: string;
  name: string;
  specialization: 'security' | 'first_aid' | 'operations' | 'general';
  currentZone: string;
  zoneName?: string;
  isAvailable: boolean;
  status: 'active' | 'idle' | 'unresponsive';
  lastUpdatedAt: string;
}

interface StaffPanelProps {
  staff: StaffMember[];
  onRedeploy?: (staffId: string, targetZoneId?: string) => void;
  filterBy?: 'all' | 'security' | 'first_aid' | 'operations';
}

const SPEC_CONFIG: Record<string, { color: string; label: string; darkBg: string }> = {
  security: { color: '#adc6ff', label: 'Security', darkBg: 'rgba(173,198,255,0.15)' },
  first_aid: { color: '#4ae176', label: 'Medical', darkBg: 'rgba(74,225,118,0.1)' },
  operations: { color: '#ffb786', label: 'Operations', darkBg: 'rgba(255,183,134,0.15)' },
  general: { color: '#8c909f', label: 'Staff', darkBg: 'rgba(140,144,159,0.1)' },
};

const STATUS_CONFIG: Record<string, { color: string; bgColor: string }> = {
  active: { color: '#4ae176', bgColor: 'rgba(74,225,118,0.15)' },
  idle: { color: '#ffb347', bgColor: 'rgba(255,179,71,0.15)' },
  unresponsive: { color: '#ff5451', bgColor: 'rgba(255,84,81,0.15)' },
};

function getSpecConfig(spec: string) {
  return SPEC_CONFIG[spec] || SPEC_CONFIG['general'];
}

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG['active'];
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export function StaffPanel({ staff, onRedeploy, filterBy = 'all' }: StaffPanelProps) {
  const filteredStaff = filterBy === 'all' 
    ? staff 
    : staff.filter(s => s.specialization === filterBy);

  const specCounts = {
    security: staff.filter(s => s.specialization === 'security').length,
    first_aid: staff.filter(s => s.specialization === 'first_aid').length,
    operations: staff.filter(s => s.specialization === 'operations').length,
    general: staff.filter(s => s.specialization === 'general').length,
  };

  const securityCoverage = specCounts.security > 0 ? Math.round((specCounts.security / 120) * 100) : 0;
  const medicalReady = specCounts.first_aid > 0 ? 100 : 0;
  const activeStaff = staff.filter(s => s.status === 'active').length;
  const criticalAlerts = 0;

  return (
    <section aria-label="Staff management panel" aria-live="polite" aria-atomic="false">
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <h2 style={{ fontSize: 38, fontWeight: 900, color: '#e2e2eb', letterSpacing: '-0.02em', margin: 0 }}>
            Staff On Ground
          </h2>
          <span style={{
            background: '#282a30',
            color: '#4ae176',
            borderRadius: 20,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}>
            {staff.length} Total
          </span>
        </div>
        <p style={{ fontSize: 14, color: '#c2c6d6', margin: 0, maxWidth: 600 }}>
          Real-time personnel monitoring and deployment across all active zones. Optimized for immediate response logistics.
        </p>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32, background: '#191b22', padding: '4px', borderRadius: 8, width: 'fit-content' }}>
        {['all', 'security', 'first_aid', 'operations'].map(filter => {
          const isActive = filter === filterBy;
          const count = filter === 'all' ? staff.length : specCounts[filter as keyof typeof specCounts];
          const label = filter === 'all' ? 'All' : SPEC_CONFIG[filter]?.label || 'All';

          return (
            <button
              key={filter}
              aria-pressed={isActive}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                background: isActive ? '#282a30' : 'transparent',
                border: 'none',
                borderRadius: 6,
                color: isActive ? '#adc6ff' : '#c2c6d6',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {label}
              {count > 0 && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 900,
                  background: isActive ? 'rgba(173,198,255,0.15)' : 'rgba(173,198,255,0.1)',
                  color: '#adc6ff',
                  padding: '1px 6px',
                  borderRadius: 3,
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Staff Grid */}
      {filteredStaff.length === 0 ? (
        <div style={{
          background: '#191b22',
          borderRadius: 12,
          padding: '40px 24px',
          textAlign: 'center',
          color: '#424754',
          fontSize: 13,
          fontWeight: 600,
        }}>
          No staff members found
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 16,
        }}>
          {filteredStaff.map(member => {
            const specConfig = getSpecConfig(member.specialization);
            const statusConfig = getStatusConfig(member.status);
            const isUnresponsive = member.status === 'unresponsive';

            return (
              <div
                key={member.staffId}
                role="article"
                aria-label={`${member.name}, ${specConfig.label}`}
                style={{
                  background: '#191b22',
                  borderRadius: 12,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  border: '1px solid rgba(255,255,255,0.05)',
                  transition: 'background 0.15s, border 0.15s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#1e2025';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#191b22';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                }}
              >
                {/* Header with name and menu */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                    {/* Avatar */}
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        background: specConfig.darkBg,
                        border: `1px solid ${specConfig.color}40`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                        fontWeight: 900,
                        color: specConfig.color,
                        flexShrink: 0,
                      }}
                    >
                      {member.name[0].toUpperCase()}
                    </div>

                    {/* Name and specialization */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e2e2eb', margin: 0, lineHeight: 1.2 }}>
                        {member.name}
                      </h3>
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: 10,
                          fontWeight: 900,
                          background: specConfig.darkBg,
                          color: specConfig.color,
                          padding: '2px 8px',
                          borderRadius: 4,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          marginTop: 6,
                          border: `1px solid ${specConfig.color}40`,
                        }}
                      >
                        {specConfig.label}
                      </span>
                    </div>
                  </div>

                  {/* Menu button */}
                  <button
                    aria-label={`More options for ${member.name}`}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#c2c6d6',
                      fontSize: 18,
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'color 0.15s',
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#e2e2eb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#c2c6d6';
                    }}
                  >
                    ⋮
                  </button>
                </div>

                {/* Location info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#c2c6d6' }}>
                  <span style={{ fontSize: 16 }}>📍</span>
                  <span>{member.zoneName || member.currentZone}</span>
                </div>

                {/* Status row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: statusConfig.color,
                        display: 'inline-block',
                        boxShadow: `0 0 8px ${statusConfig.color}60`,
                      }}
                    />
                    <span style={{ fontSize: 12, fontWeight: 600, color: statusConfig.color, textTransform: 'capitalize' }}>
                      {member.status}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: '#8c909f', marginLeft: 'auto' }}>
                    {timeAgo(member.lastUpdatedAt)}
                  </span>
                </div>

                {/* Action button */}
                {onRedeploy && (
                  <button
                    onClick={() => onRedeploy(member.staffId)}
                    aria-label={isUnresponsive ? `Emergency contact for ${member.name}` : `Redeploy ${member.name}`}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 6,
                      border: isUnresponsive ? `1px solid ${statusConfig.color}` : '1px solid rgba(255,255,255,0.1)',
                      background: isUnresponsive ? statusConfig.bgColor : 'transparent',
                      color: isUnresponsive ? statusConfig.color : '#c2c6d6',
                      fontSize: 10,
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: '0.15em',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (isUnresponsive) {
                        e.currentTarget.style.background = statusConfig.color;
                        e.currentTarget.style.color = '#fff';
                      } else {
                        e.currentTarget.style.background = 'rgba(173,198,255,0.1)';
                        e.currentTarget.style.borderColor = '#adc6ff';
                        e.currentTarget.style.color = '#adc6ff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (isUnresponsive) {
                        e.currentTarget.style.background = statusConfig.bgColor;
                        e.currentTarget.style.color = statusConfig.color;
                      } else {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.color = '#c2c6d6';
                      }
                    }}
                  >
                    {isUnresponsive ? 'Emergency Contact' : 'Redeploy'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Stats - matches Stitch density footer */}
      <div style={{
        marginTop: 48,
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
      }}>
        <div style={{
          background: '#191b22',
          padding: 24,
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <p style={{ fontSize: 10, fontWeight: 900, color: '#c2c6d6', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>
            Security Coverage
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 30, fontWeight: 900, color: '#e2e2eb', lineHeight: 1 }}>{securityCoverage}%</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#4ae176', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 14 }}>trending_up</span>
              Optimal
            </span>
          </div>
          <div style={{ width: '100%', height: 6, background: '#0c0e14', borderRadius: 3, marginTop: 16, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(securityCoverage, 100)}%`, background: '#adc6ff', borderRadius: 3 }} />
          </div>
        </div>

        <div style={{
          background: '#191b22',
          padding: 24,
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <p style={{ fontSize: 10, fontWeight: 900, color: '#c2c6d6', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>
            Medical Readiness
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 30, fontWeight: 900, color: '#e2e2eb', lineHeight: 1 }}>{medicalReady}%</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#4ae176' }}>Standing By</span>
          </div>
          <div style={{ width: '100%', height: 6, background: '#0c0e14', borderRadius: 3, marginTop: 16, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${medicalReady}%`, background: '#4ae176', borderRadius: 3 }} />
          </div>
        </div>

        <div style={{
          background: '#191b22',
          padding: 24,
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <p style={{ fontSize: 10, fontWeight: 900, color: '#c2c6d6', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>
            Active Staff
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 30, fontWeight: 900, color: '#e2e2eb', lineHeight: 1 }}>{activeStaff}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#c2c6d6' }}>On Duty</span>
          </div>
          <div style={{ width: '100%', height: 6, background: '#0c0e14', borderRadius: 3, marginTop: 16, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(activeStaff / staff.length) * 100}%`, background: '#4ae176', borderRadius: 3 }} />
          </div>
        </div>

        <div style={{
          background: '#191b22',
          padding: 24,
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <p style={{ fontSize: 10, fontWeight: 900, color: '#c2c6d6', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>
            Critical Alerts
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 30, fontWeight: 900, color: '#ffb3ad', lineHeight: 1 }}>{criticalAlerts}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#4ae176' }}>Clear</span>
          </div>
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, color: '#4ae176' }}>check_circle</span>
            <span style={{ fontSize: 9, fontWeight: 600, color: '#c2c6d6' }}>All systems operational</span>
          </div>
        </div>
      </div>
    </section>
  );
}
