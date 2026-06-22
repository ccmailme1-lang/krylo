// WO-1720 — EDGAR Form D Feed (Shared Pool)
// Fetches live SEC Form D private placement filings from EDGAR full-text search.
// Normalizes filing volume + raise amount to 0–100 pressure score.
// Dispatches via surfaceRouter.dispatchBatch(). No auth required.
// Shared pool contract: no direct cone wiring — router owns domain assignment.

import { useState, useEffect, useRef } from 'react';
import { surfaceRouter } from '../engine/surfacerouter.js';

const POLL_MS    = 900_000; // 15-min refresh — Form D filings are not real-time
const EDGAR_BASE = '/api/edgar';

// ── Normalization ─────────────────────────────────────────────────────────────
// Filing volume: 0–50 filings in window → 0–100 pressure score
function normalizeVolume(count, max = 50) {
  return Math.round(Math.min(100, (count / max) * 100));
}

// Raise amount: $0–$500M → 0–100 confidence weight
function normalizeAmount(amountUSD) {
  const floor   = 0;
  const ceiling = 500_000_000;
  return Math.min(1.0, amountUSD / ceiling);
}

// ── EDGAR fetch — Form D filings, last 7 days ────────────────────────────────
async function fetchFormD() {
  const params = new URLSearchParams({
    q:          '"Form D"',
    dateRange:  'custom',
    startdt:    new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10),
    enddt:      new Date().toISOString().slice(0, 10),
    forms:      'D',
    hits:       '20',
  });

  const res = await fetch(`${EDGAR_BASE}?${params}`);
  if (!res.ok) throw new Error(`EDGAR: ${res.status}`);
  const json = await res.json();

  const hits   = json.hits?.hits ?? [];
  const count  = json.hits?.total?.value ?? hits.length;
  const signal = normalizeVolume(count);

  // Derive confidence from filing density — more filings = more conviction
  const confidence = Math.min(0.90, 0.50 + (count / 100) * 0.40);

  // Build one aggregate signal per domain + individual filing signals
  const aggregate = {
    id:         `edgar-formd-${Date.now()}`,
    source:     'EDGAR',
    label:      'PE_DEAL_FLOW',
    domain:     'ownership',
    signal,
    raw:        count,
    count,
    confidence,
    fs:         0.72,
    origin:     'EDGAR',
    ts:         Date.now(),
    zone:       'national',
  };

  // Secondary CAPITAL signal — PE deal volume implies capital deployment pressure
  const capitalSignal = {
    id:         `edgar-formd-capital-${Date.now()}`,
    source:     'EDGAR',
    label:      'PE_CAPITAL_DEPLOYMENT',
    domain:     'capital',
    signal:     Math.round(signal * 0.65), // attenuated — indirect signal
    raw:        count,
    confidence: confidence * 0.80,
    fs:         0.65,
    origin:     'EDGAR',
    ts:         Date.now(),
    zone:       'national',
  };

  return [aggregate, capitalSignal];
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useEdgarSignals() {
  const [signals,   setSignals]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const timerRef = useRef(null);

  async function poll() {
    try {
      const batch = await fetchFormD();
      setSignals(batch);
      setLastFetch(Date.now());
      setError(null);
      surfaceRouter.dispatchBatch(batch);
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
  }, []);

  return { signals, loading, error, lastFetch };
}
