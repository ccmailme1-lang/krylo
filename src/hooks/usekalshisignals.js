// WO-1721 — Kalshi Live Endpoint (Shared Pool)
// Polls /api/kalshi/signals every 60s. Dispatches via surfaceRouter.dispatchBatch().
// Shared pool contract: normalize → dispatchBatch(). No direct cone wiring.

import { useState, useEffect, useRef } from 'react';
import { surfaceRouter } from '../engine/surfacerouter.js';

const POLL_MS = 60_000;

export function useKalshiSignals(domain = 'ALL') {
  const [signals, setSignals]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const timerRef = useRef(null);

  async function poll() {
    try {
      const q   = domain !== 'ALL' ? `?domain=${domain.toLowerCase()}` : '';
      const res = await fetch(`/api/kalshi/signals${q}`);
      if (!res.ok) throw new Error(`Kalshi proxy: ${res.status}`);
      const { signals: fresh = [] } = await res.json();
      if (fresh.length) {
        setSignals(fresh);
        setLastFetch(Date.now());
        setError(null);
        surfaceRouter.dispatchBatch(fresh);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    poll();
    timerRef.current = setInterval(poll, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [domain]);

  return { signals, loading, error, lastFetch };
}
