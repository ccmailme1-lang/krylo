// WO-1719 — FRED Capital Feed (Shared Pool)
// Fetches macro capital pressure series from FRED public API (no auth required).
// Normalizes to 0–100 signal scale. Dispatches via surfaceRouter.dispatchBatch().
// Shared pool contract: no direct cone wiring — router owns domain assignment.

import { useState, useEffect, useRef } from 'react';
import { surfaceRouter } from '../engine/surfacerouter.js';

const POLL_MS   = 300_000; // 5-min refresh — matches SURFACE_TTL.oracle
const FRED_BASE = '/api/fred';
// Free API key required: https://fred.stlouisfed.org/docs/api/api_key.html
// Set VITE_FRED_API_KEY in .env
const API_KEY   = import.meta.env.VITE_FRED_API_KEY ?? null;

// ── Series definitions ────────────────────────────────────────────────────────
// Each series: id, domain assignment, normalization floor/ceiling, invert flag
const SERIES = [
  {
    id:      'BAMLH0A0HYM2',       // ICE BofA HY OAS credit spread (%)
    label:   'HY_CREDIT_SPREAD',
    domain:  'capital',
    floor:   2.0,   // tight spread = low pressure
    ceiling: 12.0,  // stressed spread = max pressure
    invert:  false, // high spread = high signal
  },
  {
    id:      'T10Y2Y',             // 10Y–2Y Treasury yield curve spread (%)
    label:   'YIELD_CURVE',
    domain:  'capital',
    floor:   -1.5,  // deep inversion = extreme pressure
    ceiling:  2.5,  // steep = low pressure
    invert:  true,  // inversion = stress signal (inverted)
  },
  {
    id:      'M2V',                // M2 money velocity
    label:   'MONEY_VELOCITY',
    domain:  'ownership',
    floor:   1.0,
    ceiling: 2.2,
    invert:  false,
  },
];

// ── Normalization ─────────────────────────────────────────────────────────────
function normalize(value, floor, ceiling, invert) {
  const clamped = Math.max(floor, Math.min(ceiling, value));
  const score   = ((clamped - floor) / (ceiling - floor)) * 100;
  return Math.round(invert ? 100 - score : score);
}

// ── FRED fetch — last observation only ───────────────────────────────────────
async function fetchSeries(series) {
  if (!API_KEY) throw new Error('VITE_FRED_API_KEY not set — get a free key at fred.stlouisfed.org');
  const url = `${FRED_BASE}?series_id=${series.id}&api_key=${API_KEY}&sort_order=desc&limit=1&file_type=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED ${series.id}: ${res.status}`);
  const json = await res.json();
  const obs  = json.observations?.[0];
  if (!obs || obs.value === '.') return null;
  const raw   = parseFloat(obs.value);
  const signal = normalize(raw, series.floor, series.ceiling, series.invert);
  return {
    id:         `fred-${series.id}-${obs.date}`,
    source:     'FRED',
    label:      series.label,
    domain:     series.domain,
    signal,
    raw,
    date:       obs.date,
    confidence: 0.82,           // FRED is authoritative — high confidence
    fs:         0.78,           // Estimated tier — no Mchecksum without context
    origin:     'FRED',
    ts:         Date.now(),
    zone:       'national',
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useFredSignals() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const timerRef = useRef(null);

  async function poll() {
    try {
      const results = await Promise.allSettled(SERIES.map(fetchSeries));
      const valid   = results
        .filter(r => r.status === 'fulfilled' && r.value !== null)
        .map(r => r.value);

      if (valid.length) {
        setSignals(valid);
        setLastFetch(Date.now());
        setError(null);
        surfaceRouter.dispatchBatch(valid);
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
  }, []);

  return { signals, loading, error, lastFetch };
}
