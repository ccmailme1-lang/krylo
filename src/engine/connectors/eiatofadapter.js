// eiatofadapter.js — KRYL-1075 connector slice 1: EIA WPSR → Temporal Observation Fabric.
//
// The first external feed for TOF. Present/absent is DATA-DEFINED, not an invented threshold:
//   DRAWDOWN  (weekly inventory delta < 0 → demand > supply = pressure)  → present
//   BUILD     (delta >= 0 → supply > demand = relief)                    → absent
// The zero-crossing is the physical sign of the delta, so it records the NEGATIVE state (BUILD weeks)
// the invariance test requires — not just "an event happened." Reuses the EIA v2 series shape and the
// thousand-barrels scaling from eiaconnector.js (WO-1877). No forecasting, no smoothing.

import { observe } from '../temporalobservationfabric.js';

const EIA_BASE = '/api/eia';

// WPSR weekly stock series → TOF signal names (one present/absent series each).
export const EIA_WPSR_SERIES = {
  EIA_CRUDE_DRAWDOWN:      'PET.WCRSTUS1.W',
  EIA_GASOLINE_DRAWDOWN:   'PET.WGTSTUS1.W',
  EIA_DISTILLATE_DRAWDOWN: 'PET.WDISTUS1.W',
};

/**
 * deltasToObservations(data, opts) — EIA v2 data [{period, value}] (sorted DESC, most recent first)
 * → TOF observations, one per week that has a prior week. present = week-over-week drawdown.
 * @returns {Array} [{ signal, ts, present, confidence, provenance, context }]
 */
export function deltasToObservations(data, { signal, series = null, source = 'EIA', confidence = 85 } = {}) {
  const rows = Array.isArray(data) ? data : [];
  const obs = [];
  for (let i = 0; i < rows.length - 1; i++) {
    const cur = Number(rows[i]?.value), prior = Number(rows[i + 1]?.value);
    if (!Number.isFinite(cur) || !Number.isFinite(prior) || rows[i].period == null) continue;
    const delta = (cur - prior) * 1000; // thousand barrels → barrels (match eiaconnector)
    obs.push({
      signal,
      ts: rows[i].period,
      present: delta < 0, // DRAWDOWN present / BUILD absent — data-defined, no invented threshold
      confidence,
      provenance: { source, series, period: rows[i].period },
      context: { delta, value: cur * 1000, direction: delta < 0 ? 'DRAWDOWN' : 'BUILD' },
    });
  }
  return obs;
}

/** ingestEiaSeries(fabric, data, opts) — pure ingest of an EIA series into the fabric. */
export function ingestEiaSeries(fabric, data, opts = {}) {
  for (const o of deltasToObservations(data, opts)) observe(fabric, o);
  return fabric;
}

/** fetchAndIngestEia — live path (needs /api/eia proxy + server-side key). Fetches `length` weeks. */
export async function fetchAndIngestEia(fabric, { signal, series, length = 52 }) {
  const url = `${EIA_BASE}?series_id=${encodeURIComponent(series)}&length=${length}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`EIA ${series} → ${res.status}`);
  const json = await res.json();
  const data = json?.response?.data ?? [];
  return ingestEiaSeries(fabric, data, { signal, series });
}

/** ingestWpsr — pull the full WPSR set into a fabric so invariance can be tested across the series. */
export async function ingestWpsr(fabric, { length = 52 } = {}) {
  for (const [signal, series] of Object.entries(EIA_WPSR_SERIES)) {
    try { await fetchAndIngestEia(fabric, { signal, series, length }); } catch { /* skip a failed series (§22 absence, not fabricated) */ }
  }
  return fabric;
}
