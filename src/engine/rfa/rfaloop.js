// rfaloop.js — RFA CLOSURE SPINE (KRYL-1073). One runnable pass of the loop, now composed from the
// REAL organs (not inline stubs): observe → abduce(AR) → close(Constraint Fabric boundary) →
// deduce(EDL absence test) → argue → stamp(Epistemic Stamp) → heal(ADCL / §22).
// Truth layer: TOF invariance (KRYL-1075) + Epistemic Stamp (KRYL-1074). No fabricated data — a
// mechanism survives only on observed invariance.
// Doctrine: §21 route-don't-aggregate (mechanisms kept uncollapsed), §22 absence-is-signal,
// §23 orthogonality. Specs: rfa-integration-closure-spine.md.

import { stampChain, MODE, STATUS } from '../causalepistemicstamp.js';
import { abduceMechanisms } from './abductivereasoning.js';       // AR   (KRYL-1069)
import { evaluateConstraints } from './constraintfabric.js';       // CF   (KRYL-1070)
import { deduce as edlDeduce } from './entangleddeductionlayer.js';// EDL  (KRYL-1071)
import { reconcile } from './adcl.js';                             // ADCL (KRYL-1072)

// ── CLOSURE BOUNDARY (Constraint Fabric closure-scoping, KRYL-1070) ──────────────
// The bounded ABDUCIBLE set per effect: E ↔ (C1 ∨ … ∨ Cn) — the closed world (Clark completion).
// A driver of E outside this set is a closure-boundary candidate → §22 discovery.
export const ABDUCIBLES = Object.freeze({
  ENERGY_PRICE_UP: ['CRUDE_DRAWDOWN', 'REFINERY_OUTAGE', 'PIPELINE_DISRUPTION', 'DEMAND_SPIKE'],
});

/**
 * runRfaLoop(effect, fabric, opts) — one full pass, composed from the real organs.
 * @param {string} effect            the observed structural pattern to explain
 * @param {Object} fabric            a Temporal Observation Fabric (TOF)
 * @param {Object} [opts]            { parentExpId, provenance, constraints[], minCounterstates }
 * @returns {Object} {
 *   effect, trace{abduced,closed,deduced}, mechanisms[], deductions[], constraintReports[],
 *   stamped, corroborated[], revisions[], closureViolation:boolean, discovery|null
 * }
 */
export function runRfaLoop(effect, fabric, opts = {}) {
  const { parentExpId = null, provenance = null, constraints = [], minCounterstates = 2 } = opts;
  const abducibles = ABDUCIBLES[effect] ?? [];

  // Stage 1 ABDUCE (AR) — mechanisms over the closed world; PROJECTED until the absence test.
  const mechanisms = abduceMechanisms(effect, abducibles, { parentExpId, provenance });

  // Stage 2 CLOSE — a non-empty abducible set is the closure boundary (closed world).
  const closed = mechanisms.length > 0;

  // Stage 3 CONSTRAIN (CF) — external limiting factors on each mechanism (optional, uncollapsed §21).
  const constraintReports = mechanisms.map(m => evaluateConstraints(m, constraints, { provenance }));

  // Stage 3 DEDUCE (EDL) — absence-test each mechanism against observed reality (TOF invariance).
  const deductions = mechanisms.map(m => edlDeduce(m, fabric, { provenance, minCounterstates }));

  // Stage 5 STAMP — an edge is provenance-backed if EDL produced observed states; the stamp then
  // decides PROJECTED vs CORROBORATED from that invariance record (single source, no re-derivation).
  const edges = mechanisms.map((m, i) => ({ from: m.from, to: m.to, mode: MODE.DEDUCTION, grounded: !!deductions[i].observed_states }));
  const recordFor = e => {
    const i = mechanisms.findIndex(m => m.from === e.from && m.to === e.to);
    return i >= 0 ? deductions[i].observed_states : null;
  };
  const stamped = stampChain(edges, { recordFor });

  // Stage 4 ARGUE (§21) — survivors kept as rows, each with its own status; no scalar collapse.
  const corroborated = deductions
    .filter(d => d.status === 'CORROBORATED')
    .map(d => ({ from: d.from, to: d.to, status: STATUS.CORROBORATED, lcc: d.lcc, ris: d.ris, mode: MODE.DEDUCTION }));

  // Stage 6 HEAL (ADCL) — repair each contradicted mechanism instead of discarding it.
  const revisions = mechanisms
    .map((m, i) => reconcile(m, deductions[i], constraintReports[i], { provenance }))
    .filter(Boolean);

  // §22 closure violation — closed world enumerated, NONE corroborated → an unenumerated cause exists.
  const closureViolation = closed && corroborated.length === 0;

  return {
    effect,
    trace: {
      abduced: mechanisms.map(m => m.from),
      closed,
      deduced: deductions.map(d => ({ from: d.from, status: d.status })),
    },
    mechanisms,
    deductions,
    constraintReports,
    stamped,
    corroborated,
    revisions,
    closureViolation,
    discovery: closureViolation
      ? {
          type: 'MISSING_CONSTRAINT',
          effect,
          exhausted: abducibles,
          reason: `Effect ${effect} observed, closed world exhausted, none corroborated — §22 anomalous absence: an unenumerated cause exists. Re-abduce over Σ' (→ Constraint Fabric candidate).`,
        }
      : null,
  };
}
