
import { NavLink } from 'react-router-dom';
import { useAuth, hasPermission } from '../auth/useAuth';

// ─── Nav items — all routing and RBAC feature keys unchanged ─────────────────
const NAV_ITEMS = [
  { label: 'Live Map',      path: '/live-map',       feature: 'heatmap' as const,            icon: 'grid_view' },
  { label: 'Emergency',    path: '/emergency',      feature: 'emergency_panel' as const,     icon: 'sos' },
  { label: 'Threats',      path: '/threats',        feature: 'threat_alerts' as const,       icon: 'warning' },
  { label: 'Medical',      path: '/medical/triage', feature: 'medical_triage' as const,      icon: 'medical_services' },
  { label: 'Analytics',    path: '/analytics',      feature: 'analytics' as const,           icon: 'analytics' },
  { label: 'Vendors',      path: '/vendors',        feature: 'vendor_intelligence' as const, icon: 'storefront' },
  { label: 'Simulation',   path: '/simulation',     feature: 'simulation' as const,          icon: 'model_training' },
  { label: 'Compliance',   path: '/compliance',     feature: 'venue_config' as const,        icon: 'verified_user' },
  { label: 'Venue Config', path: '/venue-config',   feature: 'venue_config' as const,        icon: 'tune' },
  { label: 'Events',       path: '/events/switch',  feature: 'event_switcher' as const,      icon: 'event' },
  { label: 'Sponsors',     path: '/sponsors',       feature: 'vendor_intelligence' as const, icon: 'diamond' },
] as const;

// Material Symbols icon rendered as a span (loaded via Google Fonts in index.html)
function Icon({ name, filled = false }: { name: string; filled?: boolean }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{
        fontSize: 20,
        fontVariationSettings: filled ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
        lineHeight: 1,
        userSelect: 'none',
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}

export function Sidebar() {
  const { user, logout } = useAuth();
  const permitted = NAV_ITEMS.filter(item => user && hasPermission(user.role, item.feature));

  return (
    <>
      {/* Google Fonts — Material Symbols (injected once here as fallback) */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
        .material-symbols-outlined { font-family: 'Material Symbols Outlined'; font-style: normal; display: inline-block; }
        .vf-nav-link:hover { background: #282a30 !important; color: #e2e2eb !important; }
        .vf-nav-link:hover .vf-nav-icon { color: #e2e2eb !important; }
        .vf-nav-link:active { transform: scale(0.98); }
      `}</style>

      <aside
        role="navigation"
        aria-label="Main navigation"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: 256,
          zIndex: 40,
          background: '#191b22',
          display: 'flex',
          flexDirection: 'column',
          padding: '0 16px',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* ── Logo ─────────────────────────────────────────────────────── */}
        <div style={{ padding: '28px 8px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 8,
            background: '#adc6ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon name="dataset" filled />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#e2e2eb', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              VenueFlow
            </div>
            <div style={{ fontSize: 9, color: '#c2c6d6', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 3 }}>
              Command Center
            </div>
          </div>
        </div>

        {/* ── Nav items ─────────────────────────────────────────────────── */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {permitted.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className="vf-nav-link"
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 8,
                textDecoration: 'none',
                color: isActive ? '#adc6ff' : '#c2c6d6',
                background: isActive ? '#282a30' : 'transparent',
                transition: 'all 0.2s',
                position: 'relative',
                cursor: 'pointer',
              })}
            >
              {({ isActive }) => (
                <>
                  <span
                    className="vf-nav-icon material-symbols-outlined"
                    style={{
                      fontSize: 20,
                      color: isActive ? '#adc6ff' : '#8c909f',
                      fontVariationSettings: isActive
                        ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
                        : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    lineHeight: 1,
                  }}>
                    {item.label}
                  </span>
                  {/* Active right-edge indicator */}
                  {isActive && (
                    <span style={{
                      position: 'absolute',
                      right: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 3,
                      height: 20,
                      background: '#adc6ff',
                      borderRadius: '2px 0 0 2px',
                    }} />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div style={{ paddingTop: 16, paddingBottom: 20, borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 8 }}>
          {/* User info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px', marginBottom: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#282a30',
              border: '1px solid rgba(173,198,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 900, color: '#adc6ff', flexShrink: 0,
            }}>
              {user?.email?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: 11, color: '#e2e2eb', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </div>
              <div style={{ fontSize: 9, color: '#adc6ff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: 1 }}>
                {user?.role}
              </div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="vf-nav-link"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '9px 12px',
              borderRadius: 8,
              background: 'transparent',
              border: 'none',
              color: '#c2c6d6',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              transition: 'all 0.2s',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 20, color: '#8c909f', lineHeight: 1, flexShrink: 0 }}
              aria-hidden="true"
            >
              logout
            </span>
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
