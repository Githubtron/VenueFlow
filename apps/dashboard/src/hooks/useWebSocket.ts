import { useEffect, useRef, useState, useCallback } from 'react';

const WS_BASE =
  (import.meta as unknown as { env: Record<string, string> }).env
    ?.VITE_WS_BASE ?? 'wss://ws.venueflow.app';

/**
 * Generic WebSocket hook with auto-reconnect.
 * Subscribes to a named channel and calls onMessage for each parsed JSON frame.
 */
export function useWebSocket<T>(
  channel: string,
  onMessage: (data: T) => void
): { connected: boolean } {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  // Keep a stable ref to the latest callback so reconnects don't re-subscribe
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    const ws = new WebSocket(`${WS_BASE}/${channel}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (mountedRef.current) setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as T;
        if (mountedRef.current) onMessageRef.current(data);
      } catch {
        // ignore malformed frames
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onclose = () => {
      if (mountedRef.current) {
        setConnected(false);
        reconnectTimer.current = setTimeout(connect, 3000);
      }
    };
  }, [channel]);

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
