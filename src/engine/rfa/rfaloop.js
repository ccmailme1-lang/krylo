// rfaloop.js — RFA WALKING SKELETON (KRYL-1066). One runnable pass of the closure spine on a single
// observation: observe → abduce → close → deduce → stamp → heal. Uses the REAL Epistemic Stamp
// (KRYL-1074) + TOF invariance (KRYL-1075) for the truth layer; abduce / close / deduce are
// minimal-but-real (bounded candidate sets, NO fabricated data — a candidate survives only on real
// observed invariance). Proves the loop end-to-end before each organ (AR/CF/EDL/ADCL) is hardened.
// Doctrine: §21 route-don't-aggregate, §22 absence-is-signal, §23 orthogonality.
// Specs: rfa-integration-closure-spine.md, causal-epistemic-stamp-spec.md, temporal-observation-fabric-spec.md.

import { buildInvarianceRecord } from '../temporalobservationfabric.js';
import { stampChain, MODE, STATUS } from '../causalepistemicstamp.js';

// ── CONSTRAINT FABRIC (KRYL-1070, skeleton) ─────────────────────────────────────
// The bounded ABDUCIBLE set per effect: E ↔ (C1 ∨ … ∨ Cn) within a domain. This IS the closed world.
// A cause outside this set that turns out to drive E is a closure-boundary candidate (→ discovery).
const ABDUCIBLES = Object.freeze({
  ENERGY_PRICE_UP: ['CRUDE_DRAWDOWN', 'REFINERY_OUTAGE', 'PIPELINE_DISRUPTION', 'DEMAND_SPIKE'],
});

// ── AR (KRYL-1069, skeleton): abduce candidate causes for an observed effect ─────
// Output: hypothesis edges, mode=ABDUCTION, status starts PROJECTED. Proposes; never asserts (§11a).
export function abduce(effect) {
  const candidates = ABDUCIBLES[effect] ?? [];
  return candidates.map(c => ({ from: c, to: effect, type: 'HYPOTHESIZED', mode: MODE.ABDUCTION }));
}

// ── CLOSE (KRYL-1070): the candidate set is the closure boundary (Clark completion) ──
export function close(effect, candidates) {
  return { effect, candidates, closed: candidates.length > 0 };
}

// ── DEDUCE (KRYL-1071 EDL): pressure-test each candidate C against the record ─────
// Absence test = TOF invariance: does C co-vary with the effect (present→effect AND absent→¬effect)?
// A withheld record (null) = failed / insufficient counterstates → candidate does not survive.
export function deduce(closure, fabric, opts = {}) {
  return closure.candidates.map(edge => {
    const record = buildInvarianceRecord(fabric, edge.from, edge.to, opts);
    return { edge, record };
  });
}

/**
 * runRfaLoop(effect, fabric, opts) — one full pass of the loop.
 * @returns {Object} {
 *   effect, trace{abduced,closed,deduced}, stamped, corroborated[],
 *   closureViolation:boolean, discovery|null
 * }
 */
export function runRfaLoop(effect, fabric, opts = {}) {
  const candidates = abduce(effect);                 // Stage 1
  const closure    = close(effect, candidates);      // Stage 2
  const deduced    = deduce(closure, fabric, opts);  // Stage 3

  // Stage 5 STAMP — an edge is provenance-backed if it has an observed invariance record; the stamp
  // then decides PROJECTED vs CORROBORATED via the record. (Reasoning mode carried alongside — the
  // stamp's own mode axis stays null until AR/EDL formally tag origins, per the stamp spec.)
  const edges     = deduced.map(d => ({ ...d.edge, grounded: !!d.record }));
  const recordFor = e => deduced.find(d => d.edge.from === e.from && d.edge.to === e.to)?.record ?? null;
  const stamped   = stampChain(edges, { recordFor });
  const stampedByEdge = new Map(stamped.edges.map(s => [`${s.from}->${s.to}`, s]));

  // Stage 4 ARGUE (§21: preserve lineage, no scalar collapse) — the survivors, each with its own status.
  const corroborated = stamped.edges
    .filter(s => s.status === STATUS.CORROBORATED)
    .map(s => ({ from: s.from, to: s.to, status: s.status, mode: MODE.DEDUCTION }));

  // Stage 6 HEAL (KRYL-1072 ADCL / §22): closure violation — effect enumerated a closed world but NO
  // candidate corroborated → a cause exists outside the boundary. That break is a discovery, not an error.
  const closureViolation = closure.closed && corroborated.length === 0;

  return {
    effect,
    trace: {
      abduced: candidates.map(c => c.from),
      closed:  closure.closed,
      deduced: deduced.map(d => ({ from: d.edge.from, holds: !!d.record })),
    },
    stamped,
    stampedByEdge,
    corroborated,
    closureViolation,
    discovery: closureViolation
      ? {
          type: 'MISSING_CONSTRAINT',
          effect,
          exhausted: closure.candidates.map(c => c.from),
          reason: `Effect ${effect} observed, closed world exhausted, none corroborated — §22 anomalous absence: an unenumerated cause exists. Re-abduce over Σ' (→ Constraint Fabric candidate).`,
        }
      : null,
  };
}
