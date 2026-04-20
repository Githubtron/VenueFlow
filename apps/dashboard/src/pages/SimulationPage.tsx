/**
 * SimulationPage — Task 15.7
 *
 * Pre-event simulation dashboard: gate load forecast charts, staff deployment plan.
 * Trigger simulation run (ADMIN role). Requirements 27.1, 27.2, 27.3.
 */
import React, { useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { useApi, apiFetch } from '../hooks/useApi';
import { TopBar } from '../components/TopBar';
import { SimulationCharts, GateForecastPoint, StaffDeploymentPlan } from '../components/SimulationCharts';

interface SimulationRun {
  simulationRunId: string;
  venueId: string;
  eventId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  gateForecast?: GateForecastPoint[];
  gateIds?: string[];
  staffPlan?: StaffDeploymentPlan[];
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' },
  body: { flex: 1, overflowY: 'auto', padding: 24 },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  select: {
    background: '#1a1d27',
    border: '1px solid #2d3148',
    borderRadius: 6,
    padding: '8px 12px',
    color: '#e2e8f0',
    fontSize: 13,
    outline: 'none',
  },
  runBtn: {
    background: '#7c6af7',
    border: 'none',
    color: '#fff',
    padding: '9px 20px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  },
  runBtnDisabled: {
    background: '#334155',
    cursor: 'not-allowed',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 600,
  },
  runList: {
    background: '#1a1d27',
    border: '1px solid #2d3148',
    borderRadius: 8,
    marginBottom: 20,
    overflow: 'hidden',
  },
  runListHeader: {
    padding: '12px 16px',
    background: '#1e2235',
    borderBottom: '1px solid #2d3148',
    fontSize: 14,
    fontWeight: 600,
    color: '#e2e8f0',
  },
  runItem: {
    padding: '10px 16px',
    borderBottom: '1px solid #1e2235',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer',
  },
  runItemActive: { background: 'rgba(124,106,247,0.08)' },
  runId: { fontSize: 12, color: '#94a3b8', fontFamily: 'monospace', flex: 1 },
  runTime: { fontSize: 11, color: '#475569' },
  error: {
    padding: '10px 14px',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid #ef4444',
    borderRadius: 6,
    color: '#fca5a5',
    fontSize: 13,
    marginBottom: 16,
  },
};

const STATUS_COLORS: Record<SimulationRun['status'], string> = {
  pending: '#f59e0b',
  running: '#3b82f6',
  completed: '#22c55e',
  failed: '#ef4444',
};

export function SimulationPage() {
  const { user } = useAuth();
  const venueId = user?.venueId ?? '';

  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [triggerError, setTriggerError] = useState('');

  const { data: eventsData } = useApi<{ events: { eventId: string; name: string }[] }>(
    venueId ? `/events?venueId=${venueId}&status=scheduled` : null
  );
  const events = eventsData?.events ?? [];

  const { data: runsData, refetch: refetchRuns } = useApi<{ runs: SimulationRun[] }>(
    venueId && selectedEventId
      ? `/simulation/${venueId}/runs?eventId=${selectedEventId}`
      : null
  );
  const runs = runsData?.runs ?? [];

  const { data: runDetail } = useApi<SimulationRun>(
    selectedRunId ? `/simulation/${venueId}/runs/${selectedRunId}` : null
  );

  async function triggerSimulation() {
    if (!venueId || !selectedEventId) return;
    setTriggering(true);
    setTriggerError('');
    try {
      const result = await apiFetch<{ simulationRunId: string }>(
        `/simulation/${venueId}/run?eventId=${selectedEventId}`,
        { method: 'POST' }
      );
      setSelectedRunId(result.simulationRunId);
      refetchRuns();
    } catch (err) {
      setTriggerError((err as Error).message);
    } finally {
      setTriggering(false);
    }
  }

  return (
    <div style={styles.page}>
      <TopBar title="Pre-Event Simulation" />
      <div style={styles.body}>
        {/* Toolbar */}
        <div style={styles.toolbar}>
          <label htmlFor="event-select" style={{ fontSize: 13, color: '#94a3b8' }}>
            Event:
          </label>
          <select
            id="event-select"
            style={styles.select}
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value);
              setSelectedRunId(null);
            }}
            aria-label="Select event for simulation"
          >
            <option value="">— Select event —</option>
            {events.map((ev) => (
              <option key={ev.eventId} value={ev.eventId}>
                {ev.name}
              </option>
            ))}
          </select>

          <button
            style={{
              ...styles.runBtn,
              ...(triggering || !selectedEventId ? styles.runBtnDisabled : {}),
            }}
            onClick={triggerSimulation}
            disabled={triggering || !selectedEventId}
            aria-busy={triggering}
            aria-label="Trigger simulation run"
          >
            {triggering ? 'Running…' : '▶ Run Simulation'}
          </button>
        </div>

        {triggerError && (
          <div style={styles.error} role="alert">
            {triggerError}
          </div>
        )}

        {/* Simulation runs list */}
        {runs.length > 0 && (
          <section style={styles.runList} aria-label="Simulation runs">
            <div style={styles.runListHeader}>Simulation Runs</div>
            <ul style={{ listStyle: 'none' }}>
              {runs.map((run) => (
                <li
                  key={run.simulationRunId}
                  style={{
                    ...styles.runItem,
                    ...(selectedRunId === run.simulationRunId ? styles.runItemActive : {}),
                  }}
                  onClick={() => setSelectedRunId(run.simulationRunId)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setSelectedRunId(run.simulationRunId);
                  }}
                  aria-label={`Simulation run ${run.simulationRunId}, status: ${run.status}`}
                  aria-pressed={selectedRunId === run.simulationRunId}
                >
                  <span style={styles.runId}>{run.simulationRunId}</span>
                  <span
                    style={{
                      ...styles.statusBadge,
                      background: STATUS_COLORS[run.status] + '22',
                      color: STATUS_COLORS[run.status],
                    }}
                  >
                    {run.status}
                  </span>
                  <span style={styles.runTime}>
                    {new Date(run.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Simulation results */}
        {runDetail && runDetail.status === 'completed' && (
          <SimulationCharts
            forecastData={runDetail.gateForecast ?? []}
            gateIds={runDetail.gateIds ?? []}
            staffPlan={runDetail.staffPlan ?? []}
          />
        )}

        {runDetail && runDetail.status === 'running' && (
          <div style={{ color: '#3b82f6', fontSize: 14, padding: 24 }} role="status" aria-live="polite">
            ⏳ Simulation in progress…
          </div>
        )}

        {runDetail && runDetail.status === 'failed' && (
          <div style={styles.error} role="alert">
            Simulation failed. Please try again.
          </div>
        )}

        {!selectedEventId && (
          <div style={{ color: '#475569', fontSize: 14, padding: 24 }}>
            Select an event to view or run simulations.
          </div>
        )}
      </div>
    </div>
  );
}
