

// ─── Interfaces — UNCHANGED ───────────────────────────────────────────────────

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

// ─── Stitch design tokens ─────────────────────────────────────────────────────
// Mapped from live_heatmap/code.html color palette

const TOKEN = {
  // surfaces
  surfaceContainerHigh:   '#282a30',
  surfaceContainerLowest: '#0c0e14',
  surfaceContainerLow:    '#191b22',
  // status colors
  secondary:              '#4ae176',   // green / safe
  amber:                  '#f59e0b',   // busy / monitoring
  tertiaryContainer:      '#ff5451',   // critical border / bar
  tertiary:               '#ffb3ad',   // critical text
  outline:                '#8c909f',   // unavailable
  outlineVariant:         '#424754',   // unavailable border
  // text
  onSurface:              '#e2e2eb',
  onSurfaceVariant:       '#c2c6d6',
} as const;

// Per-status visual config — mirrors Stitch zone card variants
const STATUS_CONFIG: Record<ZoneSnapshot['status'], {
  borderColor: string;
  barColor:    string;
  textColor:   string;
  glow:        string;
  icon:        string;   // Material Symbol name
  iconFilled:  boolean;
}> = {
  green: {
    borderColor: TOKEN.secondary,
    barColor:    TOKEN.secondary,
    textColor:   TOKEN.secondary,
    glow:        'none',
    icon:        'verified',
    iconFilled:  false,
  },
  amber: {
    borderColor: TOKEN.amber,
    barColor:    TOKEN.amber,
    textColor:   TOKEN.amber,
    glow:        'none',
    icon:        'group',
    iconFilled:  false,
  },
  red: {
    borderColor: TOKEN.tertiaryContainer,
    barColor:    TOKEN.tertiaryContainer,
    textColor:   TOKEN.tertiary,
    glow:        '0 0 20px rgba(255,84,81,0.05)',
    icon:        'warning',
    iconFilled:  true,
  },
  unavailable: {
    borderColor: TOKEN.outlineVariant,
    barColor:    TOKEN.outlineVariant,
    textColor:   TOKEN.outline,
    glow:        'none',
    icon:        'sensors_off',
    iconFilled:  false,
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ZoneHeatmap({ zones, staffPins = [], onZoneClick }: ZoneHeatmapProps) {

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (zones.length === 0) {
    return (
      <div style={{
        padding: '48px 0',
        textAlign: 'center',
        color: TOKEN.outlineVariant,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
      }}>
        No zone data available
      </div>
    );
  }

  const now = new Date().toLocaleTimeString('en-GB', { hour12: false });

  return (
    <section aria-label="Zone density heatmap">

      {/* ── Zone grid — matches Stitch lg:grid-cols-6 gap-5 ─────────────── */}
      <div
        role="list"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 20,
        }}
      >
        {zones.map((zone) => {
          const cfg = STATUS_CONFIG[zone.status];
          const staffInZone = staffPins.filter(p => p.zoneId === zone.zoneId);
          const barWidth = zone.status === 'unavailable'
            ? 0
            : Math.min(zone.densityPercent, 100);

          return (
            <div
              key={zone.zoneId}
              role="listitem"
              tabIndex={onZoneClick ? 0 : undefined}
              aria-label={`${zone.name}: ${zone.currentCount} people, ${zone.status}`}
              onClick={() => onZoneClick?.(zone.zoneId)}
              onKeyDown={e => {
                if (onZoneClick && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onZoneClick(zone.zoneId);
                }
              }}
              className={zone.status === 'red' ? 'animate-glow-red' : ''}
              style={{
                // Stitch: bg-surface-container-high p-5 rounded-xl border-l-4 h-40
                background:   TOKEN.surfaceContainerHigh,
                borderRadius: 12,
                padding:      20,
                borderLeft:   `4px solid ${cfg.borderColor}`,
                boxShadow:    cfg.glow,
                display:      'flex',
                flexDirection:'column',
                justifyContent: 'space-between',
                height:       160,
                cursor:       onZoneClick ? 'pointer' : 'default',
                transition:   'background 0.2s, transform 0.15s',
                outline:      'none',
              }}
              onMouseEnter={e => {
                if (onZoneClick) (e.currentTarget as HTMLDivElement).style.background = '#33343b';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.background = TOKEN.surfaceContainerHigh;
              }}
            >
              {/* ── Card header ─────────────────────────────────────────── */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  {/* Zone ID — text-[10px] font-black tracking-widest uppercase */}
                  <span style={{
                    display:       'block',
                    fontSize:      10,
                    fontWeight:    900,
                    color:         TOKEN.onSurfaceVariant,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    lineHeight:    1,
                    marginBottom:  4,
                  }}>
                    {zone.zoneId}
                  </span>
                  {/* Zone name — text-lg font-bold */}
                  <h3 style={{
                    fontSize:   16,
                    fontWeight: 700,
                    color:      TOKEN.onSurface,
                    lineHeight: 1.2,
                    margin:     0,
                  }}>
                    {zone.name}
                  </h3>
                </div>

                {/* Status icon — Material Symbol */}
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 20,
                    color:    cfg.textColor,
                    fontVariationSettings: cfg.iconFilled
                      ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
                      : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                >
                  {cfg.icon}
                </span>
              </div>

              {/* ── Card footer: count + bar ─────────────────────────────── */}
              <div>
                {/* Count + density % */}
                <div style={{
                  display:        'flex',
                  justifyContent: 'space-between',
                  alignItems:     'flex-end',
                  marginBottom:   6,
                }}>
                  {/* text-3xl font-black */}
                  <span style={{
                    fontSize:   30,
                    fontWeight: 900,
                    color:      TOKEN.onSurface,
                    lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {zone.currentCount.toLocaleString()}
                  </span>

                  {/* Density % — text-sm font-bold in status color */}
                  <span style={{
                    fontSize:    13,
                    fontWeight:  700,
                    color:       cfg.textColor,
                    marginBottom: 2,
                  }}>
                    {zone.status === 'unavailable'
                      ? '—'
                      : `${zone.densityPercent.toFixed(0)}%`}
                  </span>
                </div>

                {/* Progress bar — h-1.5 bg-surface-container-lowest rounded-full */}
                <div style={{
                  width:        '100%',
                  height:       6,
                  background:   TOKEN.surfaceContainerLowest,
                  borderRadius: 999,
                  overflow:     'hidden',
                }}>
                  <div style={{
                    height:       '100%',
                    width:        `${barWidth}%`,
                    background:   cfg.barColor,
                    borderRadius: 999,
                    boxShadow:    zone.status === 'red'
                      ? '0 0 8px rgba(255,84,81,0.5)'
                      : 'none',
                    transition:   'width 0.4s ease',
                  }} />
                </div>

                {/* Staff count badge */}
                {staffInZone.length > 0 && (
                  <div style={{
                    marginTop:  6,
                    fontSize:   10,
                    fontWeight: 600,
                    color:      TOKEN.outline,
                    letterSpacing: '0.05em',
                  }}>
                    {staffInZone.length} staff on ground
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer legend — matches Stitch footer strip ──────────────────── */}
      <footer style={{
        marginTop:      32,
        display:        'flex',
        flexWrap:       'wrap',
        justifyContent: 'space-between',
        alignItems:     'center',
        background:     TOKEN.surfaceContainerLow,
        borderRadius:   16,
        padding:        '16px 24px',
        gap:            16,
      }}>
        {/* Legend swatches */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
          {[
            { color: TOKEN.secondary,         label: 'Safe Capacity' },
            { color: TOKEN.amber,             label: 'Busy / Monitoring' },
            { color: TOKEN.tertiaryContainer, label: 'Critical Alert' },
            { color: TOKEN.outlineVariant,    label: 'Unavailable' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 10, height: 10, borderRadius: 2,
                background: color, flexShrink: 0,
              }} />
              <span style={{
                fontSize:      10,
                fontWeight:    700,
                color:         TOKEN.onSurfaceVariant,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
              }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Last update + sync status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{
              display:       'block',
              fontSize:      9,
              fontWeight:    700,
              color:         TOKEN.onSurfaceVariant,
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              lineHeight:    1,
              marginBottom:  3,
            }}>
              Last Update
            </span>
            <span style={{
              fontSize:           12,
              fontWeight:         500,
              color:              TOKEN.onSurface,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {now}
            </span>
          </div>

          <div style={{
            width: 1, height: 28,
            background: 'rgba(66,71,84,0.4)',
          }} />

          {/* Sync active pill */}
          <div style={{
            display:      'flex',
            alignItems:   'center',
            gap:          6,
            background:   TOKEN.surfaceContainerHigh,
            borderRadius: 6,
            padding:      '6px 12px',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: TOKEN.secondary,
              display: 'inline-block',
              boxShadow: '0 0 6px rgba(74,225,118,0.6)',
            }} />
            <span style={{
              fontSize:      9,
              fontWeight:    700,
              color:         TOKEN.onSurface,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
            }}>
              Sync Active
            </span>
          </div>
        </div>
      </footer>
    </section>
  );
}
