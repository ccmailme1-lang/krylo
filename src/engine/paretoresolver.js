// WO-2075 — Pareto Cross-Domain Resolver
// Consumes WO-2074's buildCompositionVectors() output. Produces the "best available set"
// across domains WITHOUT collapsing them to a single scalar winner (non-collapse preservation)
// and WITHOUT comparing dimensions a domain never populated (no ontology flattening).
//
// Distinct from aiae.js's paretoFrontier(): that one defaults missing features to 0, which
// fabricates a worst-case score for an unpopulated dimension. This resolver instead treats
// "no comparable dimension" as "not comparable" — silence is not a zero.

import { comparableDimensions } from './compositionvectors.js';

// A dominates B only on the dimensions BOTH populated. If there is no overlap at all,
// the two are incomparable — neither dominates, both survive independently.
function dominatesVector(vecA, vecB) {
  const dims = comparableDimensions(vecA, vecB);
  if (dims.length === 0) return false; // nothing to compare on — cannot claim dominance
  let strictlyBetter = false;
  for (const i of dims) {
    if (vecA[i] < vecB[i]) return false;
    if (vecA[i] > vecB[i]) strictlyBetter = true;
  }
  return strictlyBetter;
}

// Constraint-aware filter: a domain with ANY hard constraint failure (false) in its
// Constraint Alignment Vector is eliminated before dominance comparison ever runs.
// Mirrors WO-2068's enforced/advisory split — false = enforced failure, already resolved
// upstream by applyAvailabilityFilter(); this just respects that verdict.
function passesConstraints(constraintAlignmentVector) {
  return !constraintAlignmentVector.some(v => v === false);
}

// ── Cross-domain Pareto resolution ─────────────────────────────────────────────
// compositionVectors: output of buildCompositionVectors() (WO-2074).
// Returns the domains that are NOT dominated by any other surviving domain —
// a set, not a rank. Dominated domains are returned separately with the domain
// that dominated them, for audit — never silently dropped.
export function resolveParetoCrossDomain(compositionVectors) {
  const domains = compositionVectors.domains.filter(
    d => passesConstraints(compositionVectors.vectors[d].constraintAlignmentVector)
  );
  const eliminatedByConstraint = compositionVectors.domains.filter(d => !domains.includes(d));

  const frontier   = [];
  const dominated  = [];

  for (const domain of domains) {
    const vec = compositionVectors.vectors[domain].decisionVector;
    const dominator = domains.find(other =>
      other !== domain && dominatesVector(compositionVectors.vectors[other].decisionVector, vec)
    );
    if (dominator) {
      dominated.push({ domain, dominatedBy: dominator });
    } else {
      frontier.push(domain);
    }
  }

  return {
    subject:               compositionVectors.subject,
    frontier,              // non-collapsed "best available set" — order carries no ranking meaning
    dominated,             // audit trail — who beat whom, never silently dropped
    eliminatedByConstraint,
    resolvedAt:            Date.now(),
  };
}
