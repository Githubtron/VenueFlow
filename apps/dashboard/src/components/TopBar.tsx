import React from 'react';

interface TopBarProps {
  title: string;
  connected?: boolean;
  children?: React.ReactNode;
  onSOS?: () => void;
  liveCount?: number;
}

/**
 * TopBar — matches Stitch fixed topbar pattern.
 * Fixed at top, offset left by 256px (sidebar width).
 * bg-[#111319]/80 backdrop-blur-xl, h-16.
 */
export function TopBar({ title, connected, children, onSOS, liveCount }: TopBarProps) {
  return (
    <>
      <header
        role="banner"
        style={{
          position: 'fixed',
          top: 0,
          left: 256,
          right: 0,
          height: 64,
          zIndex: 50,
          background: 'rgba(17,19,25,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          gap: 16,
        }}
      >
        {/* Left: page title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#e2e2eb',
            letterSpacing: '-0.01em',
            margin: 0,
            borderBottom: '2px solid #adc6ff',
            paddingBottom: 2,
            lineHeight: 1.4,
          }}>
            {title}
          </h1>
          {children}
        </div>

        {/* Right: live status pill + SOS button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {connected !== undefined && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#282a30',
              borderRadius: 999,
              padding: '5px 14px',
            }}>
              <span
                aria-hidden="true"
                className="animate-pulse-green"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: connected ? '#4ae176' : '#ffb3ad',
                  display: 'inline-block',
                }}
              />
              <span
                aria-live="polite"
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#e2e2eb',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                {connected ? (liveCount ? `${liveCount.toLocaleString()}` : 'Live') : 'Reconnecting…'}
              </span>
            </div>
          )}
          
          {/* SOS Button - matches Stitch design */}
          {onSOS && (
            <button
              onClick={onSOS}
              aria-label="Trigger SOS emergency"
              style={{
                background: '#ff5451',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '6px 16px',
                fontSize: 10,
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              SOS
            </button>
          )}
          
          {/* Notification and Settings icons - matches Stitch */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: 20,
                color: '#8c909f',
                cursor: 'pointer',
                transition: 'color 0.15s',
              }}
              role="button"
              aria-label="Notifications"
            >
              notifications
            </span>
            <span
              style={{
                fontSize: 20,
                color: '#8c909f',
                cursor: 'pointer',
                transition: 'color 0.15s',
              }}
              role="button"
              aria-label="Settings"
            >
              settings
            </span>
          </div>
        </div>
      </header>

      {/* Spacer so page content starts below the fixed topbar */}
      <div style={{ height: 64, flexShrink: 0 }} aria-hidden="true" />
    </>
  );
}
