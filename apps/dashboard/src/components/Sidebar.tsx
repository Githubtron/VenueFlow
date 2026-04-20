import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth, hasPermission } from '../auth/useAuth';

const NAV_ITEMS = [
  { label: 'Live Map', path: '/live-map', feature: 'heatmap' as const },
  { label: 'Venue Config', path: '/venue-config', feature: 'venue_config' as const },
  { label: 'Simulation', path: '/simulation', feature: 'simulation' as const },
  { label: 'Vendors', path: '/vendors', feature: 'vendor_intelligence' as const },
] as const;

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 220,
    minHeight: '100vh',
    background: '#1a1d27',
    borderRight: '1px solid #2d3148',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 0',
  },
  logo: {
    padding: '0 20px 24px',
    fontSize: 18,
    fontWeight: 700,
    color: '#7c6af7',
    letterSpacing: 1,
  },
  nav: { flex: 1 },
  link: {
    display: 'block',
    padding: '10px 20px',
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: 14,
    borderLeft: '3px solid transparent',
    transition: 'all 0.15s',
  },
  activeLink: {
    color: '#e2e8f0',
    borderLeftColor: '#7c6af7',
    background: 'rgba(124,106,247,0.08)',
  },
  footer: {
    padding: '16px 20px',
    fontSize: 12,
    color: '#475569',
  },
};

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside style={styles.sidebar} role="navigation" aria-label="Main navigation">
      <div style={styles.logo}>VenueFlow</div>
      <nav style={styles.nav}>
        {NAV_ITEMS.filter(
          (item) => user && hasPermission(user.role, item.feature)
        ).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              ...styles.link,
              ...(isActive ? styles.activeLink : {}),
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div style={styles.footer}>
        <div>{user?.email}</div>
        <div style={{ color: '#7c6af7', marginTop: 2 }}>{user?.role}</div>
        <button
          onClick={logout}
          style={{
            marginTop: 8,
            background: 'none',
            border: '1px solid #334155',
            color: '#94a3b8',
            padding: '4px 10px',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
