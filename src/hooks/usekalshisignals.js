// usekalshisignals.js — Kalshi prediction market bridge hook
// Polls /api/kalshi/signals every 60s. Returns normalized signal array.
import { useState, useEffect, useRef } from 'react';

const POLL_MS = 60_000;

export function useKalshiSignals(domain = 'ALL') {
  const [signals, setSignals]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [lastFetch, setLastFetch] = useState(null);
  const timerRef = useRef(null);

  async function fetch_() {
    try {
      const q   = domain !== 'ALL' ? `?domain=${domain}` : '';
      const res = await fetch(`/api/kalshi/signals${q}`);
      const j   = await res.json();
      if (j.signals?.length) {
        setSignals(j.signals);
        setLastFetch(Date.now());
      }
    } catch (_) {}
    finally { setLoading(false); }
  }

  useEffect(() => {
    fetch_();
    timerRef.current = setInterval(fetch_, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [domain]);

  return { signals, loading, lastFetch };
}
