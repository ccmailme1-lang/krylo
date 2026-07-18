// historicaldivergence.js — KRYL-979 Historical Divergence Retrieval (retrieval-only, LOCKED).
// Retrieves REAL RECORDED fork points: instances where one structural pattern (a route) split into
// different RECORDED outcome paths — "N times this pattern diverged into path A vs path B, here is
// what was actually recorded for each." It NEVER generates or simulates a hypothetical (that would
// cross into forecasting — non-goal, locked). Everything here is read from pathstore's outcome
// records (WO-1869); nothing is synthesized.
//
// DISTINCT FROM KRYL-978 (Path Memory Retrieval): 978 retrieves structurally SIMILAR paths by
// embedding similarity. 979 retrieves DIVERGENCE POINTS — the same route that resolved into
// materially different recorded outcomes. Similar-path ≠ fork-point.
//
// DOCTRINE: detect-not-predict (§11a — recorded historical fact, retrospective); §19 — withhold a
// divergence below MIN_N settled records (coincidence guard); §22 — records without a logged outcome
// are excluded as absence, never counted as a neutral branch.
import { getAllRecords, makeRouteKey } from './pathstore.js';

export const MIN_N        = 3;  // §19 — fewer than this settled instances = not enough to call a fork
export const MIN_BRANCHES = 2;  // a divergence requires ≥2 distinct recorded outcome bands
const LR_REALIZED_FLOOR   = 1.0; // Leverage Realization ≥ 1 = the projection was realized or beaten

// Classify ONE settled record's RECORDED outcome into a band. Retrospective fact, not a forecast.
function outcomeBand(r) {
  if (r.lr == null) return null;                 // no realized leverage recorded → not a settled branch
  return r.lr >= LR_REALIZED_FLOOR ? 'REALIZED' : 'UNDERPERFORMED';
}

/**
 * retrieveDivergences({ minN, minBranches }) → { divergences[], scanned, settled }
 * Groups settled outcome records by route (domain·stateLabel·lens), and reports every route that
 * resolved into ≥ minBranches distinct recorded bands with ≥ minN total settled instances.
 *   divergence = {
 *     pattern,                       // the route key (the structural pattern that forked)
 *     route: { domain, stateLabel, lens },
 *     n,                             // settled instances behind this fork
 *     branches: [{ band, n, avgLR, avgObserved, followedRate }],  // the recorded paths A/B/…
 *   }
 * WITHHELD routes (below floors) are simply not returned — a fork is not asserted without evidence.
 */
export function retrieveDivergences({ minN = MIN_N, minBranches = MIN_BRANCHES, records = null } = {}) {
  records = records ?? getAllRecords();
  const byRoute = new Map();
  let settled = 0;

  for (const r of records) {
    const band = outcomeBand(r);
    if (!band) continue;                          // §22 — unsettled record excluded, not a null branch
    settled++;
    const key = makeRouteKey({ domain: r.domain, stateLabel: r.stateLabel, lens: r.lens });
    if (!byRoute.has(key)) byRoute.set(key, { route: { domain: r.domain, stateLabel: r.stateLabel, lens: r.lens }, bands: new Map() });
    const grp = byRoute.get(key);
    if (!grp.bands.has(band)) grp.bands.set(band, []);
    grp.bands.get(band).push(r);
  }

  const divergences = [];
  for (const [pattern, grp] of byRoute) {
    const n = [...grp.bands.values()].reduce((s, arr) => s + arr.length, 0);
    if (grp.bands.size < minBranches || n < minN) continue;  // not a qualified fork → withhold
    const branches = [...grp.bands.entries()].map(([band, arr]) => {
      const avg = (f) => +(arr.reduce((s, x) => s + (f(x) ?? 0), 0) / arr.length).toFixed(4);
      return {
        band,
        n: arr.length,
        avgLR:       avg(x => x.lr),
        avgObserved: avg(x => x.observedValue),
        followedRate: +(arr.filter(x => x.followed).length / arr.length).toFixed(3),
      };
    }).sort((a, b) => b.n - a.n);
    divergences.push({ pattern, route: grp.route, n, branches });
  }

  divergences.sort((a, b) => b.n - a.n);
  return { divergences, scanned: records.length, settled };
}

/**
 * retrieveDivergenceForPattern(route) → divergence | null
 * The recorded fork for ONE pattern. null = the pattern has no qualified recorded divergence
 * (unknown, single-band, or below MIN_N) — retrieval withholds rather than invent a branch.
 */
export function retrieveDivergenceForPattern({ domain, stateLabel, lens }) {
  const target = makeRouteKey({ domain, stateLabel, lens });
  return retrieveDivergences().divergences.find(d => d.pattern === target) ?? null;
}
