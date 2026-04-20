/**
 * Generic WebSocket hook with auto-reconnect and offline awareness.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { isOnline } from '../sync/connectivityManager';

const WS_BASE = 'wss://ws.venueflow.app';

export function useWebSocket<T>(
  channel: string,
  onMessage: (data: T) => void
): { connected: boolean } {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!isOnline() || !mountedRef.current) return;

    const ws = new WebSocket(`${WS_BASE}/${channel}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (mountedRef.current) setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data: T = JSON.parse(event.data);
        if (mountedRef.current) onMessage(data);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onclose = () => {
      if (mountedRef.current) {
        setConnected(false);
        // Reconnect after 3s
        reconnectTimer.current = setTimeout(connect, 3000);
      }
    };
  }, [channel, onMessage]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected };
}
