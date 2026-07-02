// WO-2074 — Composition Engine Vector Interface
// Standardizes composeInvariantSets() (WO-2066 Phase 4) output into fixed-order, comparable
// vectors. Read-only over already-composed data — adds no new computation to invariants,
// no mutation, no cross-domain merging. Purpose: let WO-2075 (Pareto resolver) compare domains
// without flattening them into one ontology.

import { DECISION_INVARIANTS } from './decisioninvariants.js';
import { CONSTRAINT_CATEGORIES } from './availabilityfilter.js';

// ── Decision Vector ────────────────────────────────────────────────────────────
// Fixed-order array of raw invariant values (DECISION_INVARIANTS order, len 8).
// null = unpopulated. Never coerced to 0 — a missing dimension is not a zero score.
export function toDecisionVector(invariantSet) {
  return DECISION_INVARIANTS.map(inv => invariantSet?.[inv]?.raw ?? null);
}

// ── Epistemic Vector ───────────────────────────────────────────────────────────
// Parallel confidence values, same fixed order as the Decision Vector. Kept as a
// separate vector (not merged into Decision Vector) — magnitude and confidence
// in that magnitude are different questions and must stay separately inspectable.
export function toEpistemicVector(invariantSet) {
  return DECISION_INVARIANTS.map(inv => invariantSet?.[inv]?.confidence ?? null);
}

// ── Constraint Alignment Vector ────────────────────────────────────────────────
// Fixed-order array (CONSTRAINT_CATEGORIES order, len 7 — a DIFFERENT space from
// the 8 Decision Invariants; never index one against the other).
// true = passed, false = rejected (enforced failure), null = not evaluated for
// this candidate (no constraint declared, or no requirement on that category).
// Built from applyAvailabilityFilter()'s output (WO-2068) — not recomputed here.
export function toConstraintAlignmentVector(filterResult) {
  const rejected = new Set((filterResult?.rejections ?? []).map(r => r.category));
  const advised  = new Set((filterResult?.advisories ?? []).map(r => r.category));
  return CONSTRAINT_CATEGORIES.map(cat => {
    if (rejected.has(cat)) return false;
    if (advised.has(cat))  return true; // advisory-only failure does not block — treated as aligned
    return null; // no evaluation ran for this category on this candidate
  });
}

// ── Comparability rule ─────────────────────────────────────────────────────────
// Two vectors (same fixed-order space — both Decision or both Epistemic or both
// Constraint Alignment) are comparable ONLY on indices where both are non-null.
// Never fill a null with a default to force a comparison — that fabricates data
// the domain never populated.
export function comparableDimensions(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error('comparableDimensions: vectors must be from the same fixed-order space');
  }
  return vecA
    .map((_, i) => i)
    .filter(i => vecA[i] !== null && vecB[i] !== null);
}

// ── Per-domain vector bundle ───────────────────────────────────────────────────
// Takes composeInvariantSets() output (WO-2066 Phase 4) + optional per-domain
// filterResults (WO-2068, keyed by domain) and returns one vector bundle per
// domain — still side-by-side, never merged across domains.
export function buildCompositionVectors(composedOutput, filterResultsByDomain = {}) {
  if (!composedOutput?.composed) {
    throw new Error('buildCompositionVectors requires composeInvariantSets() output');
  }
  const bundles = {};
  for (const domain of composedOutput.domains) {
    const invariantSet = composedOutput.sets[domain];
    bundles[domain] = {
      decisionVector:            toDecisionVector(invariantSet),
      epistemicVector:           toEpistemicVector(invariantSet),
      constraintAlignmentVector: toConstraintAlignmentVector(filterResultsByDomain[domain]),
    };
  }
  return {
    subject:    composedOutput.subject,
    domains:    composedOutput.domains,
    vectors:    bundles,
    builtAt:    Date.now(),
  };
}
