// KRYL-976 — Cross-Domain Structural Fingerprint Exposure
// Spec: specs/KRYL-976-cross-domain-structural-fingerprint.md (Bottle Test PASS, 4AR PASS)
//
// Assembles domain-agnostic structural properties a CanonicalEvent already has into
// one fixed-length StructuralFingerprint. Every field already exists elsewhere in the
// codebase — this is pure assembly, no new computation, no new taxonomy.
//
// Classification (same discipline as whytrace.js/KRYL-980): this module recomputes
// computeSCI (an inference-derived value) rather than purely retrieving stored state —
// not a pure join. Nothing may import this module's output back into a scoring/
// identity/routing path.
//
// Explicit exclusions: does NOT compute similarity/correlation between two
// fingerprints — KRYLO exposes the fingerprint, a human or downstream consumer
// decides if two look alike. Does NOT introduce any evidence type, epistemic class,
// or canonical role beyond evidencetiers.js's existing five-and-five taxonomy. Does
// NOT touch identity merge/split, SCI's formula, RBCS, or any routing path. Not
// subject to the section 16 0–100 signal scale — this never enters surfacerouter.js's
// dispatch path; a future UI-facing ticket must define its own compliant normalization.

import { getDescriptor, EPISTEMIC_CLASS, CANONICAL_ROLE } from './evidencetiers.js';
import { computeSCI } from './structuralconfirmation.js';
import { computeTruthDynamics } from './identitydynamics.js';

export const FINGERPRINT_VECTOR_VERSION = 1; // bump only if the field set/order changes

function emptyDistribution(classMap) {
  const dist = {};
  for (const key of Object.values(classMap)) dist[key] = 0;
  return dist;
}

/**
 * buildFingerprint — assemble a StructuralFingerprint for a CanonicalEvent.
 *
 * @param {object} event — CanonicalEvent, as produced by identitykernel.js
 * @returns {object} StructuralFingerprint — {
 *   identityId,
 *   epistemicDistribution: { STRUCTURAL, OPERATIONAL, FINANCIAL, NARRATIVE, SPECULATIVE },
 *   roleDistribution:       { LONG_TERM_BASELINE, STATE_TRANSITION, CAUSAL_PRECURSOR, ENTITY_LINKED, ANOMALY_DETECTOR },
 *   sci:      { score, groundedness },
 *   topology: { continuityScore, branchingFactor, stabilityScore },
 *   dynamics: { velocity, lifecyclePhase },
 *   vectorVersion,
 * }
 */
export function buildFingerprint(event) {
  if (!event?.identityId || !event?.evidenceGraph) {
    return { identityId: null, flag: 'NO_EVENT', vectorVersion: FINGERPRINT_VECTOR_VERSION };
  }

  const nodes = Array.from(event.evidenceGraph.nodes?.values() ?? []);

  // epistemicDistribution: fraction of COVERED TYPES per class (matches computeSCI's
  // own "one contribution per distinct evidenceType" stacking rule — see
  // structuralconfirmation.js — so this distribution is directly comparable to sci.*).
  const coveredTypes = new Set(nodes.map(n => n.evidenceType));
  const epistemicDistribution = emptyDistribution(EPISTEMIC_CLASS);
  for (const type of coveredTypes) {
    const descriptor = getDescriptor(type);
    if (!descriptor) continue;
    epistemicDistribution[descriptor.epistemicClass] =
      (epistemicDistribution[descriptor.epistemicClass] ?? 0) + 1;
  }
  const typeCount = coveredTypes.size || 1;
  for (const key of Object.keys(epistemicDistribution)) {
    epistemicDistribution[key] = parseFloat((epistemicDistribution[key] / typeCount).toFixed(4));
  }

  // roleDistribution: fraction of NODES (not distinct types) per canonical role —
  // role is a per-node property (how each individual piece of evidence functions),
  // distinct from the per-type epistemic distribution above.
  const roleDistribution = emptyDistribution(CANONICAL_ROLE);
  for (const node of nodes) {
    const descriptor = getDescriptor(node.evidenceType);
    if (!descriptor) continue;
    roleDistribution[descriptor.canonicalRole] = (roleDistribution[descriptor.canonicalRole] ?? 0) + 1;
  }
  const nodeCount = nodes.length || 1;
  for (const key of Object.keys(roleDistribution)) {
    roleDistribution[key] = parseFloat((roleDistribution[key] / nodeCount).toFixed(4));
  }

  const sciResult = computeSCI(event.evidenceGraph);
  const sci = { score: sciResult?.score ?? null, groundedness: sciResult?.groundedness ?? null };

  const topology = {
    continuityScore:  event.evidenceGraph.continuityScore  ?? null,
    branchingFactor:  event.evidenceGraph.branchingFactor  ?? null,
    stabilityScore:   event.evidenceGraph.stabilityScore   ?? null,
  };

  const dynamicsResult = computeTruthDynamics(event.identityId);
  const dynamics = {
    velocity:       dynamicsResult?.velocity?.velocity ?? null,
    lifecyclePhase: dynamicsResult?.lifecycle?.phase ?? null,
  };

  return {
    identityId: event.identityId,
    epistemicDistribution,
    roleDistribution,
    sci,
    topology,
    dynamics,
    vectorVersion: FINGERPRINT_VECTOR_VERSION,
  };
}
