// Domain Metrics History Store — records computeMetrics() output tagged by
// domain, over time. Same append-only pattern as pathstore.js/
// entitystateledger.js — proven, already used elsewhere in this codebase.
//
// Producer contract: recordMetricsSnapshot() is the ONLY write path. Called
// from the real computeMetrics() call sites (intelligencebrief.jsx,
// actionmatrix.jsx, targetpacket.jsx) — never called speculatively, never
// invents a value. computeMetrics() itself remains the sole computational
// authority (§18 WIRING CONTRACT) — this store only persists what it already
// produced, never recomputes.
//
// Consumer contract: getDomainAverage() is read-only — averages already-
// recorded real values, no calculation beyond that. §23 Orthogonal Axis
// Integrity: each metric (signal/validity/convergence/cac/roas/ltv) is
// averaged independently, never blended into one composite number.

const STORE_KEY = 'krylo_domain_metrics_v1';
const MAX_PER_DOMAIN = 200; // cap — this is a rolling window, not an archive

const METRIC_KEYS = ['signal', 'validity', 'convergence', 'cac', 'roas', 'ltv'];

function readStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}'); }
  catch { return {}; }
}

function writeStore(store) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); }
  catch { /* storage unavailable — degrades to no-op, never throws */ }
}

// Producer — the only write path. metrics is computeMetrics()'s real return
// object; only the six value fields are persisted (sci/sps/leverageRealization
// etc. are out of scope for this card set, not dropped elsewhere).
export function recordMetricsSnapshot({ domain, metrics }) {
  if (!domain || !metrics) return;
  const key = domain.toUpperCase();

  const snapshot = { ts: Date.now() };
  for (const m of METRIC_KEYS) {
    snapshot[m] = typeof metrics[m]?.value === 'number' ? metrics[m].value : null;
  }

  const store = readStore();
  const list = store[key] ?? [];
  list.push(snapshot);
  if (list.length > MAX_PER_DOMAIN) list.shift();
  store[key] = list;
  writeStore(store);
}

// Consumer — read-only. Returns all recorded snapshots for a domain, oldest first.
export function getSnapshotsForDomain(domain) {
  if (!domain) return [];
  const store = readStore();
  return store[domain.toUpperCase()] ?? [];
}

// Consumer — averages each metric independently across all recorded
// snapshots for a domain. Returns null per metric if zero real values exist
// (§22 — absence is not zero, never default a missing average to 0).
export function getDomainAverage(domain) {
  const snapshots = getSnapshotsForDomain(domain);
  const result = { domain: domain?.toUpperCase() ?? null, n: snapshots.length };

  for (const m of METRIC_KEYS) {
    const values = snapshots.map(s => s[m]).filter(v => typeof v === 'number');
    result[m] = values.length
      ? { value: values.reduce((a, b) => a + b, 0) / values.length, n: values.length }
      : { value: null, n: 0 };
  }

  return result;
}
