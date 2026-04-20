

export interface GateStatus {
  gateId: string;
  gateName: string;
  description: string;
  type: string;
  entryRate: number;
  capacity: number;
  status: 'open' | 'busy' | 'closed';
  recommendation: string;
  updatedAt: string;
}

interface GateStatusPanelProps {
  gates: GateStatus[];
}

function calculateCapacityPercent(entryRate: number, capacity: number): number {
  if (capacity === 0) return 0;
  return Math.round((entryRate / capacity) * 100);
}

function getStatusColor(status: 'open' | 'busy' | 'closed'): string {
  switch (status) {
    case 'busy':
      return '#ff5451';
    case 'open':
      return '#4ae176';
    case 'closed':
      return '#424754';
    default:
      return '#8c909f';
  }
}

function getStatusBgColor(status: 'open' | 'busy' | 'closed'): string {
  switch (status) {
    case 'busy':
      return 'rgba(255,84,81,0.15)';
    case 'open':
      return 'rgba(74,225,118,0.1)';
    case 'closed':
      return 'rgba(66,71,84,0.15)';
    default:
      return 'rgba(140,144,159,0.1)';
  }
}

export function GateStatusPanel({ gates }: GateStatusPanelProps) {
  const activeGates = gates.filter(g => g.status !== 'closed');

  return (
    <section aria-label="Gate status and flow control" aria-live="polite" aria-atomic="false">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ fontSize: 12, fontWeight: 900, color: '#c2c6d6', letterSpacing: '0.3em', textTransform: 'uppercase', margin: 0 }}>
          Active Gate Control
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: '#c2c6d6' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ae176', display: 'inline-block' }} />
          {activeGates.length} Gates Active
        </div>
      </div>

      {gates.length === 0 ? (
        <div style={{
          background: '#191b22', borderRadius: 10, padding: '24px 16px',
          textAlign: 'center', color: '#424754', fontSize: 12,
          fontWeight: 600, letterSpacing: '0.05em',
        }}>
          No gate data available
        </div>
      ) : (
        <div style={{ borderRadius: 12, overflow: 'hidden', background: 'rgba(66,71,84,0.05)' }}>
          {gates.map((gate, idx) => {
            const capacityPercent = calculateCapacityPercent(gate.entryRate, gate.capacity);
            const statusColor = getStatusColor(gate.status);
            const statusBgColor = getStatusBgColor(gate.status);
            const isBusy = gate.status === 'busy';

            return (
              <div
                key={gate.gateId}
                role="row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 2fr 1.5fr 2fr 0.5fr',
                  alignItems: 'center',
                  padding: '20px 32px',
                  background: isBusy ? '#1a1d27' : '#191b22',
                  borderBottom: idx < gates.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  borderLeft: isBusy ? `4px solid ${statusColor}` : 'none',
                  paddingLeft: isBusy ? '28px' : '32px',
                  transition: 'background 0.15s, border 0.15s',
                }}
              >
                {/* Column 1: Gate ID & Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: isBusy ? 'rgba(255,84,81,0.2)' : '#282a30',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 900,
                      color: statusColor,
                      flexShrink: 0,
                    }}
                  >
                    {gate.gateName.split(' ').pop()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e2eb', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.3 }}>
                      {gate.gateName}
                    </div>
                    <div style={{ fontSize: 10, color: '#c2c6d6', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>
                      {gate.type}
                    </div>
                  </div>
                </div>

                {/* Column 2: Flow & Progress Bar */}
                <div style={{ paddingRight: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: isBusy ? statusColor : '#c2c6d6', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Flow: {gate.entryRate}/min
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: isBusy ? statusColor : '#e2e2eb' }}>
                      {capacityPercent}%
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: '#282a30', borderRadius: 3, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(capacityPercent, 100)}%`,
                        background: statusColor,
                        borderRadius: 3,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>

                {/* Column 3: Status Badge */}
                <div style={{ textAlign: 'center' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '6px 12px',
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: '0.15em',
                      background: statusBgColor,
                      color: statusColor,
                    }}
                  >
                    {gate.status === 'busy' ? 'BUSY' : gate.status === 'open' ? 'OPEN' : 'CLOSED'}
                  </span>
                </div>

                {/* Column 4: Recommendation */}
                <div style={{ paddingRight: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: isBusy ? statusColor : '#c2c6d6', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                    {isBusy ? 'URGENT ACTION' : 'RECOMMENDED ACTION'}
                  </div>
                  <div style={{ fontSize: 12, color: isBusy ? statusColor : '#e2e2eb', fontStyle: 'italic', fontWeight: isBusy ? 700 : 500 }}>
                    "{gate.recommendation}"
                  </div>
                </div>

                {/* Column 5: Menu Icon */}
                <div style={{ textAlign: 'right' }}>
                  <button
                    aria-label={`More options for ${gate.gateName}`}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: isBusy ? statusColor : '#c2c6d6',
                      fontSize: 20,
                      cursor: 'pointer',
                      padding: '4px 8px',
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#adc6ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = isBusy ? statusColor : '#c2c6d6';
                    }}
                  >
                    ⋮
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
