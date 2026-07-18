// statedistribution.js — KRYL-1003 Perception State-Distribution.
// Turns a POPULATION of real convergence-classifier states into a bounded, legible distribution
// (e.g. AMPLIFYING 68% / STABLE 21% / DISSIPATING 11%). No Monte Carlo, no new math, no simulation.
// The only inputs are stateIds emitted by src/engine/convergenceclassifier.js — real readings.
//
// DOCTRINE:
//  §22 absence-is-signal — INSUFFICIENT (stateId 0 = no reading) is NOT counted as a band. It is
//    tracked separately (insufficientCount) and shrinks the denominator; it is never smeared into
//    STABLE. A field of all-insufficient cones yields no distribution, not a false "100% STABLE".
//  detect-not-predict (§11a) — a distribution needs a real population. Below MIN_POPULATION the
//    function WITHHOLDS (sufficient:false) rather than present one reading as a spread. Presenting
//    N=1 as "100% AMPLIFYING" would be fabricated variance — banned by the ticket.
//  DEF-1863 — the classifier is PROJECTION; this aggregate inherits that. stateType carried through.

// classifier stateId → legible band. stateId 0 (INSUFFICIENT SIGNAL) is intentionally absent:
// it is a no-reading, handled as absence, not a band.
const BAND_OF = {
  1: 'STABLE',       // LOW SIGNAL YIELD  — flat, holding
  2: 'AMPLIFYING',   // BUILDING CONVERGENCE
  3: 'DISSIPATING',  // TURBULENT CONVERGENCE — straining / cannibalizing (fragility phase 3)
  4: 'AMPLIFYING',   // HIGH CONVERGENCE
};

// Display order + theme token (tokens locked in CLAUDE.md §6 — no new color introduced).
export const BANDS = [
  { key: 'AMPLIFYING',  label: 'AMPLIFYING',  theme: 'signal_lime' },
  { key: 'STABLE',      label: 'STABLE',      theme: 'muted_slate' },
  { key: 'DISSIPATING', label: 'DISSIPATING', theme: 'signal_blue' },
];

export const MIN_POPULATION = 2; // < 2 real readings → no distribution (withhold, never fabricate)

// Largest-remainder rounding so integer percentages sum to exactly 100 (honest, deterministic).
function toPercents(counts, total) {
  const raw = counts.map(c => (c / total) * 100);
  const floor = raw.map(Math.floor);
  let remainder = 100 - floor.reduce((a, b) => a + b, 0);
  // hand the leftover points to the largest fractional parts
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  const pct = floor.slice();
  for (let k = 0; k < order.length && remainder > 0; k++, remainder--) pct[order[k].i]++;
  return pct;
}

/**
 * computeStateDistribution(stateIds) — real classifier states → bounded band distribution.
 * @param {number[]} stateIds - classifier stateIds (0–4) from real cones/signals. Non-numbers ignored.
 * @returns {{
 *   sufficient:boolean, n:number, insufficientCount:number,
 *   bands:{key,label,theme,count,pct}[], dominant:string|null, stateType:'PROJECTION'
 * }}
 *   sufficient=false → n (classified readings) < MIN_POPULATION; bands are zeroed, caller must WITHHOLD.
 */
export function computeStateDistribution(stateIds = []) {
  const counts = { AMPLIFYING: 0, STABLE: 0, DISSIPATING: 0 };
  let insufficientCount = 0;
  let n = 0;

  for (const id of stateIds) {
    if (typeof id !== 'number' || Number.isNaN(id)) continue;
    if (id === 0) { insufficientCount++; continue; }   // §22 absence — not a band
    const band = BAND_OF[id];
    if (!band) continue;
    counts[band]++;
    n++;
  }

  const sufficient = n >= MIN_POPULATION;
  const orderedCounts = BANDS.map(b => counts[b.key]);
  const pcts = sufficient ? toPercents(orderedCounts, n) : orderedCounts.map(() => 0);

  const bands = BANDS.map((b, i) => ({
    key: b.key, label: b.label, theme: b.theme,
    count: orderedCounts[i], pct: pcts[i],
  }));

  const dominant = sufficient
    ? bands.reduce((a, b) => (b.count > a.count ? b : a)).key
    : null;

  return { sufficient, n, insufficientCount, bands, dominant, stateType: 'PROJECTION' };
}
