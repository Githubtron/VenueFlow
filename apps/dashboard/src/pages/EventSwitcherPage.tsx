// EventSwitcherPage — VenueFlow Operations Dashboard
// ADMIN-only page for switching the active EventSession.
// Validates: Requirements 19.2

import React, { useEffect, useState } from 'react';
import { useEvent } from '../context/EventContext';
import { useAuth } from '../auth/useAuth';

interface EventSession {
  event_id: string;
  venue_id: string;
  name: string;
  status: string;
  start_time: string;
  end_time: string;
  expected_attendance: number;
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 32, color: '#e2e8f0', maxWidth: 640 },
  heading: { fontSize: 22, fontWeight: 600, marginBottom: 24, color: '#f1f5f9' },
  label: { display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 8 },
  select: {
    width: '100%',
    padding: '10px 12px',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 6,
    color: '#e2e8f0',
    fontSize: 14,
    cursor: 'pointer',
  },
  activeCard: {
    marginTop: 24,
    padding: 16,
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 8,
    fontSize: 13,
    lineHeight: 1.8,
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    background: '#166534',
    color: '#bbf7d0',
    marginLeft: 8,
  },
  error: { color: '#f87171', marginTop: 12, fontSize: 13 },
  empty: { color: '#64748b', marginTop: 16, fontSize: 13 },
};

export function EventSwitcherPage() {
  const { user } = useAuth();
  const { activeEventId, setActiveEventId } = useEvent();
  const [events, setEvents] = useState<EventSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const venueId = user?.venueId;

  useEffect(() => {
    if (!venueId) return;
    setLoading(true);
    fetch(`/api/events?venueId=${encodeURIComponent(venueId)}&status=active`, {
      headers: { Authorization: `Bearer ${user?.token ?? ''}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load events');
        const data = (await res.json()) as { events: EventSession[] };
        setEvents(data.events);
      })
      .catch((err: unknown) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [venueId, user?.token]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActiveEventId(e.target.value || null);
  };

  const activeEvent = events.find((ev) => ev.event_id === activeEventId);

  return (
    <main style={styles.page} role="main">
      <h1 style={styles.heading}>Event Switcher</h1>

      {loading && <p style={styles.empty}>Loading active events…</p>}
      {error && <p style={styles.error}>{error}</p>}

      {!loading && !error && events.length === 0 && (
        <p style={styles.empty}>No active events found for this venue.</p>
      )}

      {!loading && events.length > 0 && (
        <>
          <label htmlFor="event-select" style={styles.label}>
            Select active event
          </label>
          <select
            id="event-select"
            style={styles.select}
            value={activeEventId ?? ''}
            onChange={handleChange}
            aria-label="Select active event"
          >
            <option value="">— choose an event —</option>
            {events.map((ev) => (
              <option key={ev.event_id} value={ev.event_id}>
                {ev.name}
              </option>
            ))}
          </select>

          {activeEvent && (
            <div style={styles.activeCard} aria-live="polite">
              <strong>Active event:</strong> {activeEvent.name}
              <span style={styles.badge}>ACTIVE</span>
              <br />
              <span style={{ color: '#94a3b8' }}>ID:</span> {activeEvent.event_id}
              <br />
              <span style={{ color: '#94a3b8' }}>Start:</span>{' '}
              {new Date(activeEvent.start_time).toLocaleString()}
              <br />
              <span style={{ color: '#94a3b8' }}>End:</span>{' '}
              {new Date(activeEvent.end_time).toLocaleString()}
              <br />
              <span style={{ color: '#94a3b8' }}>Expected attendance:</span>{' '}
              {activeEvent.expected_attendance.toLocaleString()}
            </div>
          )}
        </>
      )}
    </main>
  );
}
