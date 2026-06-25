// WO-1869 — Path Memory Store
// Records emission → outcome → Leverage Realization.
// Evidence accumulation only. Not prediction. Builds on convictionstore.js.
//
// Decisions locked 2026-06-25 (§19 / spec):
//   Outcome capture : manual "Log Outcome" on conviction + time-horizon prompt
//   Attribution     : followed (full/partial/none); attributionConfidence low until N builds
//   Route similarity: exact {domain|band|lens} key; no ML
//   Sample threshold: record from n=1; surface LR-prior only at N≥5
//   Earliness weight: rank = LR × f(earlyRatio); 3-tier tag early/mid/late at emission

import { useState, useCallback } from 'react';

const STORE_KEY = 'krylo_path_memory_v1';
const MIN_N     = 5; // withhold LR-prior below this — accepted decision 4

// Convergence state → coarse band (3-tier)
const BAND = {
  'INSUFFICIENT SIGNAL':   'LOW',
  'LOW SIGNAL YIELD':      'LOW',
  'BUILDING CONVERGENCE':  'MID',
  'TURBULENT CONVERGENCE': 'MID',
  'HIGH CONVERGENCE':      'HIGH',
};

// Earliness tag: inverse of consensus at emission (accepted decision 5)
// LOW signal = non-obvious early → 'early'; HIGH convergence = broad awareness → 'late'
const EARLINESS = {
  'INSUFFICIENT SIGNAL':   'early',
  'LOW SIGNAL YIELD':      'early',
  'BUILDING CONVERGENCE':  'mid',
  'TURBULENT CONVERGENCE': 'mid',
  'HIGH CONVERGENCE':      'late',
};

export function makeRouteKey({ domain, stateLabel, lens }) {
  const band = BAND[stateLabel] ?? 'MID';
  return `${domain ?? 'UNKNOWN'}|${band}|${(lens ?? 'GENERAL').toUpperCase()}`;
}

// ── Persistence ───────────────────────────────────────────────────────────────

function load() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]'); }
  catch { return []; }
}

function persist(records) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(records)); }
  catch {}
}

// ── Core API (pure, imperative) ───────────────────────────────────────────────

export function logEmission({ convictionId, domain, stateLabel, lens, projectedValue }) {
  const records = load();
  const band    = BAND[stateLabel] ?? 'MID';
  const route   = { domain: domain ?? 'UNKNOWN', convergenceBand: band, lens: (lens ?? 'GENERAL').toUpperCase() };
  const record  = {
    id:                  crypto.randomUUID(),
    convictionId:        convictionId ?? null,
    routeKey:            makeRouteKey({ domain, stateLabel, lens }),
    route,
    earlinessTag:        EARLINESS[stateLabel] ?? 'mid',
    projectedValue:      projectedValue ?? 0,
    emittedAt:           Date.now(),
    followed:            null,
    observedValue:       null,
    lr:                  null,
    attributionConfidence: null,
    outcomeLoggedAt:     null,
  };
  persist([record, ...records]);
  return record.id;
}

export function logOutcome({ pathId, observedValue, followed }) {
  const records = load();
  // Attribution discipline: only claim LR when route was actually followed.
  // Coincidence ≠ causation — none/partial routes get low attributionConfidence.
  const attrConf = followed === 'full' ? 0.70 : followed === 'partial' ? 0.40 : 0.05;
  const updated  = records.map(r => {
    if (r.id !== pathId) return r;
    const lr = (followed !== 'none' && r.projectedValue > 0)
      ? parseFloat((observedValue / r.projectedValue).toFixed(3))
      : null;
    return { ...r, followed, observedValue, lr, attributionConfidence: attrConf, outcomeLoggedAt: Date.now() };
  });
  persist(updated);
}

export function getByConvictionId(convictionId) {
  return load().filter(r => r.convictionId === convictionId);
}

// getLRPrior — returns historical track record for a matching route, or null if N<MIN_N.
// WITHHOLD discipline: never surface a claim without N ≥ MIN_N + actual attribution.
export function getLRPrior({ domain, stateLabel, lens }) {
  const key        = makeRouteKey({ domain, stateLabel, lens });
  const records    = load();
  // Only counted when: route was followed (attribution) AND LR was computed
  const attributed = records.filter(r => r.routeKey === key && r.followed !== 'none' && r.lr !== null);
  if (attributed.length < MIN_N) return null;

  const avgLR      = attributed.reduce((s, r) => s + r.lr, 0) / attributed.length;
  const earlyCount = attributed.filter(r => r.earlinessTag === 'early').length;
  const earlyRatio = earlyCount / attributed.length;
  // rank = LR × earlinessFactor — rewards routes that paid off before they became obvious
  const earlinessFactor = 0.5 + earlyRatio * 0.5; // 0.5–1.0
  return {
    routeKey:  key,
    avgLR:     parseFloat(avgLR.toFixed(2)),
    rank:      parseFloat((avgLR * earlinessFactor).toFixed(2)),
    n:         attributed.length,
    earlyRatio: parseFloat(earlyRatio.toFixed(2)),
  };
}

export function getAllRecords() { return load(); }

// ── React hook ────────────────────────────────────────────────────────────────
// revision counter triggers re-render after store mutation; localStorage is the source of truth.

export function usePathStore() {
  const [, setRev] = useState(0);
  const refresh    = useCallback(() => setRev(v => v + 1), []);

  return {
    logEmission: (params)  => { const id = logEmission(params); refresh(); return id; },
    logOutcome:  (params)  => { logOutcome(params);  refresh(); },
    getByConvictionId,
    getLRPrior,
    getAllRecords,
  };
}
