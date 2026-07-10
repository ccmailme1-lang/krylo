// KRYL-1010 — Observation tap (SES live wiring, slice 2).
//
// A PASSIVE tap on the §16 shared pool. Every connector dispatches through
// surfaceRouter.dispatchBatch(); as those batches flow, this maintains a short rolling
// window and writes the derived GROUNDED observables into the runtime store for SES to
// read. Write-only — it never alters routing, signals, or confidence.
//
// Covers three SES fields from one place: signalDensity, sourceIntegrity, evidenceFreshness.
// Convergence / drift / narrativeVolatility live in the HP engine / React and stay ABSENT
// until separately wired (§22 honest partial) — SES reports them as unobserved, not zero.

import { setObservation } from './runtimeobservablestore.js';

const WINDOW_MS         = 5 * 60 * 1000; // 5-min rolling window
const DENSITY_SATURATION = 40;           // in-window signal count that reads as 100 density
const _recent = [];                      // { source, confidence, ts }

export function recordObservationBatch(events = []) {
  const now = Date.now();
  for (const e of events) {
    _recent.push({ source: e.source ?? 'UNKNOWN', confidence: e.confidence ?? 0, ts: e.ts ?? now });
  }
  while (_recent.length && (now - _recent[0].ts) > WINDOW_MS) _recent.shift();
  if (_recent.length === 0) return;

  const density = Math.min(100, (_recent.length / DENSITY_SATURATION) * 100);

  // sourceIntegrity: distinct healthy vs errored sources (confidence 0 = failed/errored read).
  const bySource = new Map();
  let newest = 0;
  for (const s of _recent) {
    const cur = bySource.get(s.source) ?? { healthy: false };
    if (s.confidence > 0) cur.healthy = true;
    bySource.set(s.source, cur);
    if (s.ts > newest) newest = s.ts;
  }
  let active = 0, errored = 0;
  for (const v of bySource.values()) v.healthy ? active++ : errored++;

  setObservation({
    signalDensity:   { value: Math.round(density) },
    sourceIntegrity: { activeSources: active, erroredSources: errored },
    evidenceTs:      newest,
  });
}

// test-only
export function _resetTap() { _recent.length = 0; }
