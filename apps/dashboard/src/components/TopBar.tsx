import React from 'react';

interface TopBarProps {
  title: string;
  connected?: boolean;
  children?: React.ReactNode;
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    height: 56,
    background: '#1a1d27',
    borderBottom: '1px solid #2d3148',
    display: 'flex',
    alignItems: 'center',
    padding: '0 24px',
    gap: 16,
  },
  title: { fontSize: 16, fontWeight: 600, color: '#e2e8f0', flex: 1 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    display: 'inline-block',
    marginRight: 6,
  },
  status: { fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center' },
};

export function TopBar({ title, connected, children }: TopBarProps) {
  return (
    <header style={styles.bar} role="banner">
      <h1 style={styles.title}>{title}</h1>
      {connected !== undefined && (
        <span style={styles.status} aria-live="polite">
          <span
            style={{
              ...styles.dot,
              background: connected ? '#22c55e' : '#ef4444',
            }}
            aria-hidden="true"
          />
          {connected ? 'Live' : 'Reconnecting…'}
        </span>
      )}
      {children}
    </header>
  );
}
