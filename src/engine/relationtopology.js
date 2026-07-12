// relationtopology.js — WO-20XX SRE Phase 1: read-only topology metrics.
// Appendix A v1.2 §6. Consumes RelationCore + RelationDynamics; NEVER mutates them
// (authority contract — SES/STSE read these, they don't write back).
// All weights from governance profile 𝒫 (Engine ≠ Policy).

import { RelationType } from './relationontology.js';

const wType = (policy, τ) => (policy?.typeWeights?.[τ] ?? 1);
const wTier = (policy, tier) => (policy?.tierWeights?.[tier] ?? 1);

// (20) Constraint Centrality of node n at time t.
//   CC(n) = Σ_{rc: τ=CONSTRAINS, n∈{s,d}} W(e)·ϕ(rc)
//   W(e)  = W_type(CONSTRAINS)·W_tier(src_tier)·W_tier(dst_tier)
//   rels: [{ core:{sourceId,targetId,relationType}, phi, srcTier, dstTier }]
export function constraintCentrality(nodeId, rels, policy) {
  let cc = 0;
  for (const r of rels ?? []) {
    const c = r.core;
    if (!c || c.relationType !== RelationType.CONSTRAINS) continue;
    if (c.sourceId !== nodeId && c.targetId !== nodeId) continue;
    const w = wType(policy, RelationType.CONSTRAINS) * wTier(policy, r.srcTier) * wTier(policy, r.dstTier);
    cc += w * (r.phi ?? 0);
  }
  return cc;
}

const edgeKey = e => `${e.s}|${e.τ ?? e.relationType}|${e.d}`;

// Multiset Jaccard distance over structural triples (s,τ,d): 1 − |Sᵢ∩Sⱼ|/|Sᵢ∪Sⱼ|.
export function jaccardDistance(snapI, snapJ) {
  const A = new Set((snapI ?? []).map(edgeKey));
  const B = new Set((snapJ ?? []).map(edgeKey));
  if (A.size === 0 && B.size === 0) return 0;
  let inter = 0;
  for (const k of A) if (B.has(k)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : 1 - inter / union;
}

const meanPhi = snap => {
  const xs = (snap ?? []).map(e => e.phi ?? 0);
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
};

// (21′, Correction 4) Normalized Topology Drift ∈ [0,1].
//   Δ_topo = (J + κ·C) / (1 + κ),   J = Jaccard distance,  C = |μⱼ − μᵢ|,  κ ∈ [0,1].
// snapshots: [{ s, τ, d, phi }]. κ from governance profile (policy.kappa).
export function topologyDrift(snapI, snapJ, policy) {
  const kappa = policy?.kappa ?? 0;
  const J = jaccardDistance(snapI, snapJ);
  const C = Math.abs(meanPhi(snapJ) - meanPhi(snapI)); // both ϕ∈[0,1] ⇒ C∈[0,1]
  return (J + kappa * C) / (1 + kappa);
}
