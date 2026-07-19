// formationintegrity.js — Formation Integrity layer (the "20% gap", closed).
//
// The lifecycle-state object + the five formation-level BRAKES that gate its promotion. Nothing here
// detects; it only WITHHOLDS or DOWNGRADES a formation's maturity when a legitimacy check fails —
// same asymmetry as Grounded-or-Withhold. It manufactures no coherence; it removes false coherence.
//
// The five gates (each a falsifying test, KRYL-1039 doctrine-as-a-failing-test):
//   1. Persistence          — survived enough confirmation windows to be structural, not a spike.
//   2. Amplification-collapse — echo != confirmation (amplificationcollapse.js).
//   3. Cross-domain independence — aligning across domains from INDEPENDENT provenance, not one source.
//   4. Counter-formation     — a high state requires a tested "what would invalidate this" (§22 withhold).
//   5. Lifecycle state       — the maturity ladder that makes 1–4 gate-able.
//
// §4 anti-ghost: this is an ASSEMBLER over existing engines — it consumes their outputs
// (confirmationvelocity windows, evidence provenance, causalMap domains, RFA counter-explanations),
// it does not re-detect.
import { collapseAmplification } from './amplificationcollapse.js';

export const FORMATION_STATE = Object.freeze(['LATENT', 'EMERGING', 'STRUCTURING', 'CRYSTALLIZING', 'ESTABLISHED', 'DISSOLVING']);
const RANK = Object.freeze({ LATENT: 0, EMERGING: 1, STRUCTURING: 2, CRYSTALLIZING: 3, ESTABLISHED: 4 });

// Named, tunable gate thresholds (immutable at runtime — calibration only per §18 discipline).
export const FORMATION_GATES = Object.freeze({
  MIN_WINDOWS:   2,   // persistence: distinct confirmation windows survived
  MIN_DISTINCT:  2,   // amplification: distinct provenance sources
  STRONG_DISTINCT: 4, // established: strong distinct-source floor
  MIN_DOMAINS:   2,   // independence: independent domains aligning
});

// ── gates — each returns { pass, value, reason } and can only hold/downgrade ──────

function persistenceGate(windowsSurvived) {
  const v = Number(windowsSurvived ?? 0);
  return { pass: v >= FORMATION_GATES.MIN_WINDOWS, value: v,
           reason: v >= FORMATION_GATES.MIN_WINDOWS ? null : `persistence: ${v} < ${FORMATION_GATES.MIN_WINDOWS} windows (spike, not structural)` };
}

function amplificationGate(observations, opts) {
  const c = collapseAmplification(observations ?? [], opts);
  return { pass: c.distinct >= FORMATION_GATES.MIN_DISTINCT, value: c.distinct, collapse: c,
           reason: c.distinct >= FORMATION_GATES.MIN_DISTINCT ? null
                 : `amplification: only ${c.distinct} distinct source(s) behind ${c.total} signals (echo)` };
}

// drivers: [{ domain, provenance:{originId|sourceUrl} }] — count domains backed by INDEPENDENT origins.
function independenceGate(drivers = [], opts) {
  const byDomain = new Map();
  for (const d of drivers) {
    const dom = d?.domain; if (!dom) continue;
    const key = d?.provenance?.originId ?? d?.originId ?? d?.provenance?.sourceUrl ?? d?.sourceUrl ?? null;
    if (!byDomain.has(dom)) byDomain.set(dom, new Set());
    if (key != null) byDomain.get(dom).add(key);
  }
  // a domain only counts if it has at least one attributed origin; independence = distinct origins across domains
  const allOrigins = new Set();
  let attributedDomains = 0;
  for (const [, origins] of byDomain) { if (origins.size) { attributedDomains++; for (const o of origins) allOrigins.add(o); } }
  // independent domains = min(domains that are attributed, distinct origins) — one source tagged into
  // many domains cannot inflate the domain count.
  const independentDomains = Math.min(attributedDomains, allOrigins.size);
  return { pass: independentDomains >= FORMATION_GATES.MIN_DOMAINS, value: independentDomains,
           reason: independentDomains >= FORMATION_GATES.MIN_DOMAINS ? null
                 : `independence: ${independentDomains} independent domain(s) (< ${FORMATION_GATES.MIN_DOMAINS}); shared source across domains does not count` };
}

// counterFormations: [{ id, tested:bool, invalidates:bool }] — a high state needs a TESTED counter.
function counterGate(counterFormations = []) {
  const tested = counterFormations.filter(c => c?.tested);
  const invalidatingSurvives = tested.some(c => c?.invalidates); // a live invalidating counter blocks
  const pass = tested.length >= 1 && !invalidatingSurvives;
  return { pass, value: tested.length, invalidated: invalidatingSurvives,
           reason: pass ? null
                 : invalidatingSurvives ? 'counter-formation: a tested counter still invalidates this formation'
                 : 'counter-formation: no counter tested (§22 — absence of the counter-check is withheld, not passed)' };
}

/**
 * evaluateFormation(input) — the highest LEGITIMATE lifecycle state given the gates.
 * @param input {
 *   observations,          // evidence signals (with provenance) → amplification + emerging
 *   windowsSurvived,       // from confirmationvelocity → persistence
 *   drivers,               // [{domain, provenance}] → cross-domain independence
 *   counterFormations,     // [{tested, invalidates}] → counter-formation
 *   trend,                 // 'RISING' | 'FLAT' | 'DECREASING' → DISSOLVING
 * }
 * @returns { state, rank, gates, blockedBy, dissolving }
 *   BRAKE: state is the highest rung whose required gates ALL pass; a failing gate holds it there.
 */
export function evaluateFormation(input = {}, opts = {}) {
  const observations = input.observations ?? [];
  const gates = {
    persistence:  persistenceGate(input.windowsSurvived),
    amplification: amplificationGate(observations, opts),
    independence: independenceGate(input.drivers, opts),
    counter:      counterGate(input.counterFormations),
  };

  // DISSOLVING overrides — a weakening structure is not "established", it is dissolving.
  if (input.trend === 'DECREASING') {
    return { state: 'DISSOLVING', rank: -1, gates, blockedBy: [], dissolving: true };
  }

  // requirements per rung (each higher rung inherits the lower's).
  const distinct = gates.amplification.collapse?.distinct ?? 0;
  const reqs = [
    { state: 'EMERGING',      ok: distinct >= 1,                                                        by: distinct >= 1 ? null : 'no attributed evidence' },
    { state: 'STRUCTURING',   ok: gates.persistence.pass && gates.amplification.pass,                   by: !gates.persistence.pass ? gates.persistence.reason : gates.amplification.reason },
    { state: 'CRYSTALLIZING', ok: gates.independence.pass && gates.counter.pass,                        by: !gates.independence.pass ? gates.independence.reason : gates.counter.reason },
    { state: 'ESTABLISHED',   ok: distinct >= FORMATION_GATES.STRONG_DISTINCT && gates.counter.pass && !gates.counter.invalidated,
                              by: distinct < FORMATION_GATES.STRONG_DISTINCT ? `established: ${distinct} < ${FORMATION_GATES.STRONG_DISTINCT} distinct sources` : gates.counter.reason },
  ];

  let state = 'LATENT', blockedBy = [];
  for (const r of reqs) {
    if (r.ok) state = r.state;
    else { blockedBy = [r.by].filter(Boolean); break; }  // holds at the last-passed rung
  }

  return { state, rank: RANK[state] ?? 0, gates, blockedBy, dissolving: false };
}
