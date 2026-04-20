/**
 * MedicalTriagePage — Task 26.3
 *
 * - Real-time triage queue from GET /medical/triage/{venueId}, sorted by priority (Req 29.1)
 * - Dispatch action button; resolve action with notes field (Req 29.2)
 * - AED and first-aid station map overlay (Req 29.4)
 */
import React, { useState, useCallback } from 'react';
import { useAuth } from '../auth/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';
import { useApi, apiFetch } from '../hooks/useApi';
import { TopBar } from '../components/TopBar';

type TriagePriority = 1 | 2 | 3 | 4; // 1=immediate, 2=delayed, 3=minimal, 4=expectant
type PatientStatus = 'waiting' | 'dispatched' | 'resolved';

interface TriagePatient {
  patientId: string;
  priority: TriagePriority;
  condition: string;
  zoneId: string;
  zoneName: string;
  timestamp: string;
  status: PatientStatus;
  assignedResponder?: string;
}

interface MedicalStation {
  stationId: string;
  type: 'aed' | 'first_aid';
  zoneId: string;
  zoneName: string;
  available: boolean;
}

interface TriageUpdate {
  type: 'patient_new' | 'patient_update';
  patient: TriagePatient;
}

const PRIORITY_LABELS: Record<TriagePriority, string> = {
  1: 'Immediate',
  2: 'Delayed',
  3: 'Minimal',
  4: 'Expectant',
};

const PRIORITY_COLORS: Record<TriagePriority, string> = {
  1: '#ef4444',
  2: '#f97316',
  3: '#22c55e',
  4: '#6b7280',
};

const styles: Record<string, React.CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#0f172a' },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  main: { flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 },
  sidebar: { width: 300, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16, borderLeft: '1px solid #2d3148' },
  card: { background: '#1e293b', borderRadius: 8, padding: 16 },
  cardTitle: { color: '#e2e8f0', fontSize: 14, fontWeight: 600, marginBottom: 12 },
  patientItem: { background: '#0f172a', borderRadius: 6, padding: 12, marginBottom: 8 },
  patientHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  patientCondition: { color: '#f1f5f9', fontSize: 13, fontWeight: 500 },
  patientMeta: { color: '#64748b', fontSize: 11, marginTop: 2 },
  actions: { display: 'flex', gap: 6, marginTop: 8 },
  dispatchBtn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', fontSize: 12, cursor: 'pointer' },
  resolveBtn: { background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', fontSize: 12, cursor: 'pointer' },
  notesInput: { background: '#1e293b', border: '1px solid #334155', borderRadius: 4, color: '#e2e8f0', fontSize: 12, padding: '4px 8px', width: '100%', marginTop: 6 },
  stationItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1e293b' },
  stationName: { color: '#cbd5e1', fontSize: 12 },
  stationZone: { color: '#64748b', fontSize: 11 },
  availableDot: (available: boolean): React.CSSProperties => ({
    width: 8, height: 8, borderRadius: '50%', background: available ? '#22c55e' : '#ef4444',
    display: 'inline-block', marginRight: 6,
  }),
  emptyState: { color: '#64748b', fontSize: 13, textAlign: 'center', padding: '24px 0' },
  priorityTag: (priority: TriagePriority): React.CSSProperties => ({
    display: 'inline-block', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700,
    background: PRIORITY_COLORS[priority], color: '#fff',
  }),
};

export function MedicalTriagePage() {
  const { user } = useAuth();
  const venueId = user?.venueId ?? '';

  const [patients, setPatients] = useState<TriagePatient[]>([]);
  const [resolveNotes, setResolveNotes] = useState<Record<string, string>>({});
  const [showNotesFor, setShowNotesFor] = useState<string | null>(null);

  const { data: triageData, loading } = useApi<{ patients: TriagePatient[] }>(
    venueId ? `/medical/triage/${venueId}` : null
  );
  React.useEffect(() => {
    if (triageData?.patients) {
      const sorted = [...triageData.patients].sort((a, b) => a.priority - b.priority);
      setPatients(sorted);
    }
  }, [triageData]);

  const { data: stationsData } = useApi<{ stations: MedicalStation[] }>(
    venueId ? `/medical/stations/${venueId}` : null
  );
  const stations = stationsData?.stations ?? [];

  const handleTriageMessage = useCallback((data: TriageUpdate) => {
    setPatients((prev) => {
      let updated: TriagePatient[];
      if (data.type === 'patient_new') {
        const exists = prev.find((p) => p.patientId === data.patient.patientId);
        updated = exists ? prev : [...prev, data.patient];
      } else {
        updated = prev.map((p) => p.patientId === data.patient.patientId ? data.patient : p);
      }
      return [...updated].sort((a, b) => a.priority - b.priority);
    });
  }, []);

  const { connected } = useWebSocket<TriageUpdate>(`medical:${venueId}`, handleTriageMessage);

  function handleDispatch(patientId: string) {
    setPatients((prev) => prev.map((p) => p.patientId === patientId ? { ...p, status: 'dispatched' } : p));
    apiFetch(`/medical/triage/${patientId}/dispatch`, { method: 'POST' }).catch(() => {});
  }

  function handleResolve(patientId: string) {
    const notes = resolveNotes[patientId] ?? '';
    setPatients((prev) => prev.map((p) => p.patientId === patientId ? { ...p, status: 'resolved' } : p));
    apiFetch(`/medical/triage/${patientId}/resolve`, { method: 'POST', body: JSON.stringify({ notes }) }).catch(() => {});
    setShowNotesFor(null);
  }

  const activePatients = patients.filter((p) => p.status !== 'resolved');

  return (
    <div style={styles.page}>
      <TopBar title="Medical Triage" connected={connected} />
      <div style={styles.body}>
        <main style={styles.main} aria-label="Medical triage queue">
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              Triage Queue ({activePatients.length} active)
            </div>
            {loading && <div style={styles.emptyState}>Loading triage queue…</div>}
            {!loading && activePatients.length === 0 && (
              <div style={styles.emptyState}>No active patients in queue</div>
            )}
            {activePatients.map((patient) => (
              <div key={patient.patientId} style={styles.patientItem} role="listitem">
                <div style={styles.patientHeader}>
                  <div style={styles.patientCondition}>{patient.condition}</div>
                  <span style={styles.priorityTag(patient.priority)}>
                    P{patient.priority} — {PRIORITY_LABELS[patient.priority]}
                  </span>
                </div>
                <div style={styles.patientMeta}>
                  Zone: {patient.zoneName} · {new Date(patient.timestamp).toLocaleTimeString()}
                  {patient.assignedResponder && ` · Responder: ${patient.assignedResponder}`}
                </div>
                <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
                  Status: {patient.status}
                </div>
                <div style={styles.actions}>
                  {patient.status === 'waiting' && (
                    <button
                      style={styles.dispatchBtn}
                      onClick={() => handleDispatch(patient.patientId)}
                      aria-label={`Dispatch responder for patient in ${patient.zoneName}`}
                    >
                      Dispatch
                    </button>
                  )}
                  <button
                    style={styles.resolveBtn}
                    onClick={() => setShowNotesFor(showNotesFor === patient.patientId ? null : patient.patientId)}
                    aria-label={`Resolve patient in ${patient.zoneName}`}
                  >
                    Resolve
                  </button>
                </div>
                {showNotesFor === patient.patientId && (
                  <div>
                    <input
                      style={styles.notesInput}
                      type="text"
                      placeholder="Resolution notes (optional)"
                      value={resolveNotes[patient.patientId] ?? ''}
                      onChange={(e) => setResolveNotes((prev) => ({ ...prev, [patient.patientId]: e.target.value }))}
                      aria-label="Resolution notes"
                    />
                    <button
                      style={{ ...styles.resolveBtn, marginTop: 6 }}
                      onClick={() => handleResolve(patient.patientId)}
                    >
                      Confirm Resolve
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>

        <aside style={styles.sidebar} aria-label="Medical stations map">
          <div style={styles.card}>
            <div style={styles.cardTitle}>AED & First-Aid Stations</div>
            {stations.length === 0 ? (
              <div style={styles.emptyState}>No stations data</div>
            ) : (
              stations.map((station) => (
                <div key={station.stationId} style={styles.stationItem}>
                  <div>
                    <div style={styles.stationName}>
                      <span style={styles.availableDot(station.available)} aria-hidden="true" />
                      {station.type === 'aed' ? '⚡ AED' : '🩹 First Aid'} — {station.zoneName}
                    </div>
                    <div style={styles.stationZone}>
                      {station.available ? 'Available' : 'In Use'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
