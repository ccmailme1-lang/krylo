// WO-1102 — Signal Stream Hook (Phase B)
// WebSocket to /api/stream (Vite proxy → localhost:4000).
// Exponential backoff reconnect (max 5 retries).
// Returns live payload; falls back to DEFAULT_SIGNAL when offline.

import { useState, useEffect, useRef } from 'react';

const DEFAULT_SIGNAL = {
  score:       0.88,
  sourceCount: 6,
  ltv:         450,
  cac:         120,
  uIsUnicorn:  false,
  uUnicornPos: [-1.2, 0, 1.8],
};

export function useSignalStream() {
  const [signal, setSignal]   = useState(DEFAULT_SIGNAL);
  const wsRef                  = useRef(null);
  const reconnectCount         = useRef(0);
  const unmountedRef           = useRef(false);

  useEffect(() => {
    unmountedRef.current = false;

    function connect() {
      if (unmountedRef.current) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws       = new WebSocket(`${protocol}//${window.location.host}/api/stream`);
      wsRef.current  = ws;

      ws.onmessage = (e) => {
        try {
          const msg  = JSON.parse(e.data);
          // WO-1031/1102: unwrap REVENUE_SIGNAL envelope
          const data = msg.type === 'REVENUE_SIGNAL' ? msg.payload : msg;
          if (
            typeof data.score       === 'number' &&
            typeof data.sourceCount === 'number' &&
            Array.isArray(data.uUnicornPos)
          ) {
            setSignal(data);
          }
        } catch (_) {}
      };

      ws.onclose = () => {
        if (unmountedRef.current) return;
        if (reconnectCount.current < 5) {
          const delay = Math.pow(2, reconnectCount.current) * 1000;
          setTimeout(() => {
            reconnectCount.current++;
            connect();
          }, delay);
        }
      };

      ws.onerror = () => {};
    }

    connect();

    return () => {
      unmountedRef.current = true;
      wsRef.current?.close();
    };
  }, []);

  return signal;
}
