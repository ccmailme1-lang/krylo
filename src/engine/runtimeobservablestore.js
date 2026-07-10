// KRYL-1010 — SES runtime-observable store (slice 1).
//
// A headless-readable singleton snapshot of the live GROUNDED observables, so SES can
// read current environment state at query intake WITHOUT depending on React hooks
// (useframestream) or re-running pure classifiers with inputs it doesn't have.
//
// CONTRACT: sources WRITE their normalized reads here; SES READS. An unset field is
// null = ABSENCE (§22), never a fabricated zero. Every write carries a ts so SES can
// judge freshness. Nothing here scores or gates — it is a passive snapshot.

const _obs = {
  convergenceState: null, // { label, score(0-1), ts }
  drift:            null, // { value(0-1), ts }
  signalDensity:    null, // { value(0-100), ts }
  sourceIntegrity:  null, // { activeSources, erroredSources, ts }
  narrative:        null, // { volatility(0-100), ts }
  evidenceTs:       null, // number — newest evidence timestamp (ms)
};

// setObservation({ signalDensity: { value: 62 }, ... }) — shallow-merge normalized reads.
// Object values get a ts stamped if absent; scalar values (evidenceTs) are stored as-is.
export function setObservation(patch = {}) {
  const now = Date.now();
  for (const [k, v] of Object.entries(patch)) {
    if (v == null || !(k in _obs)) continue;
    _obs[k] = (typeof v === 'object' && !Array.isArray(v)) ? { ...v, ts: v.ts ?? now } : v;
  }
}

export function getObservations() {
  return { ..._obs };
}

export function resetObservations() {
  for (const k of Object.keys(_obs)) _obs[k] = null;
}
