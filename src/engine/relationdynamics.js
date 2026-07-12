// relationdynamics.js — WO-20XX SRE Phase 1: RelationDynamics updater + event detector.
// Implements Appendix A v1.2 equations (3)–(16). Pure functions; Engine ≠ Policy —
// every coefficient/threshold comes from the governance profile 𝒫 (relationontology.makePolicyProfile).
//
// Boundary contracts enforced here (all committed in relationontology.js):
//   §18/§19 φ-grounding  — every Δϕ routed through assertPhiGrounded (no assigned strength)
//   §23 orthogonality    — reversibility is DERIVED (reversibilityOf), never stored/scored
//   §11a time-arrow      — momentum/acceleration computed for DETECTION only (see assertNoForecast)

import { assertPhiGrounded, reversibilityOf, makeRelationEvent, RelationEventType } from './relationontology.js';

const EPS = 1e-9;
const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);

// §3 (v1.2) normalized entropy (Correction 3): Hₙ = −Σ pᵢ ln pᵢ / ln n ∈ [0,1], n = |support|.
// dist: array of non-negative weights over supporting evidence. n<2 ⇒ 0 (undefined spread).
export function normalizedEntropy(dist) {
  const w = (dist ?? []).filter(x => x > 0);
  const n = w.length;
  if (n < 2) return 0;
  const total = w.reduce((s, x) => s + x, 0);
  if (total <= 0) return 0;
  let h = 0;
  for (const x of w) { const p = x / total; h -= p * Math.log(p); }
  return clamp01(h / Math.log(n));
}

// Exponential moving average for volatility ν (eq. 7). a = Δt/τ_ν clamped to [0,1].
function ema(prev, sample, dt, tau) {
  if (!(tau > 0)) return sample;
  const a = clamp01(dt / tau);
  return (1 - a) * prev + a * sample;
}

// §2 (v1.2) RelationDynamics update — equations (3)–(11).
//   evidenceDelta: { supportGained, contradictionGained, dist?, formed?, unmetCapacity? }
//     supportGained/contradictionGained — OBSERVED evidence deltas in (tₖ₋₁,tₖ] (the ONLY ϕ driver)
//     dist — weight distribution over supporting evidence, for Hₙ (eq. 8′)
//     formed — β_form: relation (re)formed in window
//     unmetCapacity — for saturation σ̂ (eq. 10)
//   policy: governance profile 𝒫 (alpha1, alpha2, lambdaP, tauNu)
export function updateDynamics(prev, evidenceDelta, policy, tNow) {
  if (!prev)   throw new Error('updateDynamics: prev dynamics required (seed with initialDynamics)');
  if (!policy) throw new Error('updateDynamics: governance profile 𝒫 required (Engine ≠ Policy)');
  const dt = (tNow - prev.timestamp) / 1000; // seconds; A2 monotonicity checked by caller/audit
  if (!(dt > 0)) throw new Error('updateDynamics: Δt must be > 0 (A2 time monotonicity)');

  const ed   = evidenceDelta ?? {};
  const sW   = Math.max(0, ed.supportGained ?? 0);       // Σ_w
  const sL   = Math.max(0, ed.contradictionGained ?? 0); // Σ_l
  const a1   = policy.alpha1 ?? 0;
  const a2   = policy.alpha2 ?? 0;

  // (3) strength update — grounded strictly in observed evidence deltas.
  const phi = clamp01(prev.strength + dt * a1 * sW - dt * a2 * sL);
  // §18/§19 contract: reject any ϕ change with no observed evidence delta.
  assertPhiGrounded(prev.strength, phi, ed);

  // (4)(5) momentum / acceleration — DETECTION quantities (§11a), never a forecast basis.
  const momentum     = (phi - prev.strength) / dt;
  const acceleration = (momentum - prev.momentum) / dt;

  // (6) persistence ψ — decay + reformation bump.
  const lambdaP = policy.lambdaP ?? 0;
  const betaForm = ed.formed ? 1 : 0;
  const persistence = clamp01(prev.persistence * Math.exp(-lambdaP * dt) + lambdaP * dt * betaForm);

  // (7) volatility ν — EMA of |ϕ̇|.
  const volatility = Math.max(0, ema(prev.volatility, Math.abs(momentum), dt, policy.tauNu ?? 0));

  // (8′) normalized entropy Hₙ over supporting-evidence distribution.
  const entropy = normalizedEntropy(ed.dist);

  // (9) elasticity ε — relative change of ϕ this step (windowless v1; documented).
  const elasticity = Math.abs(phi - prev.strength) / Math.max(prev.strength, EPS);

  // (10) saturation σ̂ = ϕ / (ϕ + unmet_capacity).
  const unmet = Math.max(0, ed.unmetCapacity ?? 0);
  const saturation = (phi + unmet) > 0 ? clamp01(phi / (phi + unmet)) : 0;

  return {
    relationId:   prev.relationId,
    timestamp:    tNow,
    strength:     phi,
    momentum,
    acceleration,
    persistence,
    volatility,
    entropy,
    elasticity,
    saturation,
    // reversibility ρ = 1 − ψ is DERIVED on read (reversibilityOf), never stored (§23).
  };
}

// Convenience: derived reversibility for a dynamics record (re-export of the §23 rule).
export { reversibilityOf };

// §3 (v1.2) event detector — equations (12)–(16). Returns a RelationEvent or null.
// Thresholds from 𝒫: tauCreate, tauBreak, tauPos, tauNeg. Events are immutable + replay-complete
// (ϕ⁻,ϕ⁺ carried per Correction 5; makeRelationEvent enforces A3 Δϕ = ϕ⁺ − ϕ⁻).
export function detectEvent(prev, next, policy, { eventId, contextHash } = {}) {
  const phiBefore = prev.strength;
  const phiAfter  = next.strength;
  const p = policy ?? {};
  let theta = null;
  if      (phiBefore <  (p.tauCreate ?? Infinity) && phiAfter >= (p.tauCreate ?? Infinity)) theta = RelationEventType.FORMED;      // (12)
  else if (phiAfter  <  (p.tauBreak  ?? -Infinity))                                          theta = RelationEventType.BROKEN;      // (15)
  else if (next.momentum >=  (p.tauPos ?? Infinity) && phiAfter > phiBefore)                 theta = RelationEventType.STRENGTHENED;// (13)
  else if (next.momentum <= -(p.tauNeg ?? Infinity) && phiAfter < phiBefore)                 theta = RelationEventType.WEAKENED;    // (14)
  else if (Math.sign(next.momentum) !== Math.sign(prev.momentum) && prev.momentum !== 0)     theta = RelationEventType.INVERTED;    // (16)
  if (!theta) return null;
  return makeRelationEvent({
    eventId: eventId ?? `${next.relationId}:${next.timestamp}`,
    relationId: next.relationId,
    theta, t: next.timestamp,
    phiBefore, phiAfter,
    contextHash: contextHash ?? null,
  });
}
