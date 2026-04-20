/**
 * VenueConfigPage — Task 15.4
 *
 * Zone editor: define zones, set Red_Zone thresholds, map sensor assignments.
 * Accessible to ADMIN role only (Req 6.7).
 */
import React, { useState, FormEvent } from 'react';
import { useAuth } from '../auth/useAuth';
import { useApi, apiFetch } from '../hooks/useApi';
import { TopBar } from '../components/TopBar';

interface ZoneConfig {
  zoneId: string;
  name: string;
  capacity: number;
  redZoneThreshold: number;
  sensorIds: string[];
  floorLevel: number;
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' },
  body: { flex: 1, overflowY: 'auto', padding: 24 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 1100 },
  card: {
    background: '#1a1d27',
    border: '1px solid #2d3148',
    borderRadius: 8,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '12px 16px',
    background: '#1e2235',
    borderBottom: '1px solid #2d3148',
    fontSize: 14,
    fontWeight: 600,
    color: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  addBtn: {
    marginLeft: 'auto',
    background: '#7c6af7',
    border: 'none',
    color: '#fff',
    padding: '4px 12px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
  },
  zoneList: { maxHeight: 400, overflowY: 'auto' },
  zoneItem: {
    padding: '12px 16px',
    borderBottom: '1px solid #1e2235',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  zoneName: { fontSize: 13, fontWeight: 600, color: '#e2e8f0', flex: 1 },
  zoneMeta: { fontSize: 11, color: '#475569' },
  editBtn: {
    background: 'none',
    border: '1px solid #334155',
    color: '#94a3b8',
    padding: '3px 8px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 11,
  },
  form: { padding: 16, display: 'flex', flexDirection: 'column', gap: 14 },
  label: { fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 4, display: 'block' },
  input: {
    width: '100%',
    background: '#0f1117',
    border: '1px solid #2d3148',
    borderRadius: 6,
    padding: '8px 10px',
    color: '#e2e8f0',
    fontSize: 13,
    outline: 'none',
  },
  row: { display: 'flex', gap: 12 },
  saveBtn: {
    background: '#7c6af7',
    border: 'none',
    color: '#fff',
    padding: '9px 20px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    alignSelf: 'flex-start',
  },
  cancelBtn: {
    background: 'none',
    border: '1px solid #334155',
    color: '#94a3b8',
    padding: '9px 20px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
  },
  success: {
    padding: '10px 14px',
    background: 'rgba(34,197,94,0.1)',
    border: '1px solid #22c55e',
    borderRadius: 6,
    color: '#86efac',
    fontSize: 13,
  },
  error: {
    padding: '10px 14px',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid #ef4444',
    borderRadius: 6,
    color: '#fca5a5',
    fontSize: 13,
  },
};

const EMPTY_ZONE: Omit<ZoneConfig, 'zoneId'> = {
  name: '',
  capacity: 500,
  redZoneThreshold: 80,
  sensorIds: [],
  floorLevel: 1,
};

export function VenueConfigPage() {
  const { user } = useAuth();
  const venueId = user?.venueId ?? '';

  const { data, refetch } = useApi<{ zones: ZoneConfig[] }>(
    venueId ? `/venues/${venueId}/zones` : null
  );
  const zones = data?.zones ?? [];

  const [editing, setEditing] = useState<ZoneConfig | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [formData, setFormData] = useState<Omit<ZoneConfig, 'zoneId'>>(EMPTY_ZONE);
  const [sensorInput, setSensorInput] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);

  function startNew() {
    setIsNew(true);
    setEditing(null);
    setFormData(EMPTY_ZONE);
    setSensorInput('');
    setStatus(null);
  }

  function startEdit(zone: ZoneConfig) {
    setIsNew(false);
    setEditing(zone);
    setFormData({
      name: zone.name,
      capacity: zone.capacity,
      redZoneThreshold: zone.redZoneThreshold,
      sensorIds: zone.sensorIds,
      floorLevel: zone.floorLevel,
    });
    setSensorInput(zone.sensorIds.join(', '));
    setStatus(null);
  }

  function cancel() {
    setEditing(null);
    setIsNew(false);
    setStatus(null);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);

    const payload: Omit<ZoneConfig, 'zoneId'> & { venueId: string } = {
      ...formData,
      sensorIds: sensorInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      venueId,
    };

    try {
      if (isNew) {
        await apiFetch(`/venues/${venueId}/zones`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } else if (editing) {
        await apiFetch(`/venues/${venueId}/zones/${editing.zoneId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      setStatus({ type: 'success', msg: 'Zone saved successfully.' });
      refetch();
      cancel();
    } catch (err) {
      setStatus({ type: 'error', msg: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  const showForm = isNew || editing !== null;

  return (
    <div style={styles.page}>
      <TopBar title="Venue Configuration" />
      <div style={styles.body}>
        <div style={styles.grid}>
          {/* Zone list */}
          <section style={styles.card} aria-label="Zone list">
            <div style={styles.cardHeader}>
              Zones
              <button style={styles.addBtn} onClick={startNew} aria-label="Add new zone">
                + Add Zone
              </button>
            </div>
            {zones.length === 0 ? (
              <div style={{ padding: 24, color: '#475569', fontSize: 13 }}>
                No zones configured
              </div>
            ) : (
              <ul style={styles.zoneList} role="list">
                {zones.map((zone) => (
                  <li key={zone.zoneId} style={styles.zoneItem} role="listitem">
                    <div style={{ flex: 1 }}>
                      <div style={styles.zoneName}>{zone.name}</div>
                      <div style={styles.zoneMeta}>
                        Cap: {zone.capacity} · Red: {zone.redZoneThreshold}% · Floor{' '}
                        {zone.floorLevel} · {zone.sensorIds.length} sensors
                      </div>
                    </div>
                    <button
                      style={styles.editBtn}
                      onClick={() => startEdit(zone)}
                      aria-label={`Edit zone ${zone.name}`}
                    >
                      Edit
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Zone editor form */}
          <section style={styles.card} aria-label="Zone editor">
            <div style={styles.cardHeader}>
              {isNew ? 'New Zone' : editing ? `Edit: ${editing.name}` : 'Zone Editor'}
            </div>
            {!showForm ? (
              <div style={{ padding: 24, color: '#475569', fontSize: 13 }}>
                Select a zone to edit or click "+ Add Zone"
              </div>
            ) : (
              <form style={styles.form} onSubmit={handleSave} noValidate>
                {status && (
                  <div style={status.type === 'success' ? styles.success : styles.error} role="alert">
                    {status.msg}
                  </div>
                )}

                <div>
                  <label htmlFor="zone-name" style={styles.label}>Zone Name</label>
                  <input
                    id="zone-name"
                    style={styles.input}
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    required
                    aria-required="true"
                  />
                </div>

                <div style={styles.row}>
                  <div style={{ flex: 1 }}>
                    <label htmlFor="zone-capacity" style={styles.label}>Capacity</label>
                    <input
                      id="zone-capacity"
                      type="number"
                      min={1}
                      style={styles.input}
                      value={formData.capacity}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, capacity: Number(e.target.value) }))
                      }
                      required
                      aria-required="true"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label htmlFor="zone-threshold" style={styles.label}>
                      Red Zone Threshold (%)
                    </label>
                    <input
                      id="zone-threshold"
                      type="number"
                      min={1}
                      max={100}
                      style={styles.input}
                      value={formData.redZoneThreshold}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          redZoneThreshold: Number(e.target.value),
                        }))
                      }
                      required
                      aria-required="true"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="zone-floor" style={styles.label}>Floor Level</label>
                  <input
                    id="zone-floor"
                    type="number"
                    min={0}
                    style={styles.input}
                    value={formData.floorLevel}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, floorLevel: Number(e.target.value) }))
                    }
                  />
                </div>

                <div>
                  <label htmlFor="zone-sensors" style={styles.label}>
                    Sensor IDs (comma-separated)
                  </label>
                  <input
                    id="zone-sensors"
                    style={styles.input}
                    value={sensorInput}
                    onChange={(e) => setSensorInput(e.target.value)}
                    placeholder="sensor-001, sensor-002"
                    aria-describedby="sensor-hint"
                  />
                  <span id="sensor-hint" style={{ fontSize: 11, color: '#475569' }}>
                    Enter sensor IDs separated by commas
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="submit" style={styles.saveBtn} disabled={saving} aria-busy={saving}>
                    {saving ? 'Saving…' : 'Save Zone'}
                  </button>
                  <button type="button" style={styles.cancelBtn} onClick={cancel}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
