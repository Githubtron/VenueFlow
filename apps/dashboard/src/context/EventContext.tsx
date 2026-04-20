// EventContext — VenueFlow Operations Dashboard
// Stores the active EventSession ID so all API calls are scoped to one event.
// Validates: Requirements 19.2

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'vf_active_event_id';

interface EventContextValue {
  activeEventId: string | null;
  setActiveEventId: (eventId: string | null) => void;
}

const EventContext = createContext<EventContextValue>({
  activeEventId: null,
  setActiveEventId: () => {},
});

export function EventProvider({ children }: { children: React.ReactNode }) {
  const [activeEventId, setActiveEventIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const setActiveEventId = useCallback((eventId: string | null) => {
    setActiveEventIdState(eventId);
    try {
      if (eventId) {
        localStorage.setItem(STORAGE_KEY, eventId);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // localStorage unavailable — state-only fallback
    }
  }, []);

  // Sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setActiveEventIdState(e.newValue);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return (
    <EventContext.Provider value={{ activeEventId, setActiveEventId }}>
      {children}
    </EventContext.Provider>
  );
}

export function useEvent(): EventContextValue {
  return useContext(EventContext);
}
