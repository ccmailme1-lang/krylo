// relationontology.js — WO-20XX Structural Relation Engine (SRE), Phase 0 (Schema).
// Frozen contract: Appendix A — Formal Structural Relation Calculus v1.2.
// Schema + factories + invariant validators ONLY. No writes, no dynamics computation.
//
// Layer position: Observation → RelationCore → RelationDynamics → RelationEvents → Topology.
// Boundary law: relations are derived semantic objects anchored to immutable observations.
// A relation may evolve, expire, strengthen, weaken, or be invalidated, but MUST NEVER
// mutate the observations it derives from.

// ── §III  RelationType — versioned closed-world enum ─────────────────────────
// Future relation types require ontology migration (bump ONTOLOGY_VERSION).
export const ONTOLOGY_VERSION = 'v1';

export const RelationType = Object.freeze({
  CAUSES:         'CAUSES',
  CONSTRAINS:     'CONSTRAINS',
  DEPENDS_ON:     'DEPENDS_ON',
  ENABLES:        'ENABLES',
  INHIBITS:       'INHIBITS',
  MEDIATES:       'MEDIATES',
  COMPETES_WITH:  'COMPETES_WITH',
  SUBSTITUTES_FOR:'SUBSTITUTES_FOR',
  COUPLED_WITH:   'COUPLED_WITH',
  RESONATES_WITH: 'RESONATES_WITH',
  DIVERGES_FROM:  'DIVERGES_FROM',
  PRECEDES:       'PRECEDES',
  COMPOSITION:    'COMPOSITION',
  REVEALS:        'REVEALS',
});

const RELATION_TYPES = Object.freeze(new Set(Object.values(RelationType)));
export const isRelationType = t => RELATION_TYPES.has(t);

// §IV  COMPOSITION carries a direction instead of inverse PART_OF / CONTAINS edges.
export const CompositionDirection = Object.freeze({
  PARENT_TO_CHILD: 'PARENT_TO_CHILD',
  CHILD_TO_PARENT: 'CHILD_TO_PARENT',
});

// §XIII.4  Directional influence classes (replaces raw causal-distance decay downstream).
export const InfluenceClass = Object.freeze({
  POSITIVE:        Object.freeze([RelationType.CAUSES, RelationType.ENABLES, RelationType.MEDIATES, RelationType.REVEALS]),
  STRUCTURAL:      Object.freeze([RelationType.CONSTRAINS, RelationType.DEPENDS_ON, RelationType.COMPETES_WITH]),
  NON_DIRECTIONAL: Object.freeze([RelationType.RESONATES_WITH, RelationType.COUPLED_WITH]),
});

// ── §1 (v1.2)  RelationCore — immutable identity layer ───────────────────────
// Definition 1.1:  rc = ⟨id, s, d, τ, η, φ₀, σ, π, v⟩
//   §2 (v1.2 Correction 2): confidence η (existence) and strength φ₀ (effect
//   magnitude) are DISTINCT scalars, both stored on the core.
//   Invariant (1′): ∂/∂t (id,s,d,τ,η,φ₀,σ,π) = 0. Only the validity interval may change.
//
// @typedef {Object} RelationCore
// @property {string}  id          uuid
// @property {string}  sourceId    source node s (order matters)
// @property {string}  targetId    destination node d
// @property {string}  relationType τ ∈ RelationType
// @property {number}  eta         η ∈ (0,1]  confidence the relation EXISTS
// @property {number}  phi0        φ₀ ∈ [0,1] initial strength of the relation EFFECT
// @property {number}  structuralSupport σ ∈ (0,1]
// @property {string}  provenanceHash    π = BLAKE3(evidence bundle ⊕ observation ids ⊕ path)
// @property {[number, number]} validity  v = [t0, t1] ⊆ ℝ∪{∞}; t1 may only decrease
// @property {number}  createdAt

const IMMUTABLE_CORE_KEYS = Object.freeze(
  ['id', 'sourceId', 'targetId', 'relationType', 'eta', 'phi0', 'structuralSupport', 'provenanceHash']
);

const inUnitOpen   = x => typeof x === 'number' && x > 0 && x <= 1;   // (0,1]
const inUnitClosed = x => typeof x === 'number' && x >= 0 && x <= 1;  // [0,1]

// Factory — validates every field against the frozen contract. Never guesses a value.
export function makeRelationCore({
  id, sourceId, targetId, relationType,
  eta, phi0, structuralSupport, provenanceHash,
  validity, createdAt,
}) {
  if (!id || !sourceId || !targetId)          throw new Error('RelationCore: id/source/target required');
  if (!isRelationType(relationType))          throw new Error(`RelationCore: bad relationType ${relationType}`);
  if (!inUnitOpen(eta))                       throw new Error('RelationCore: eta η must be in (0,1]');
  if (!inUnitClosed(phi0))                    throw new Error('RelationCore: phi0 φ₀ must be in [0,1]');
  if (!inUnitOpen(structuralSupport))         throw new Error('RelationCore: structuralSupport σ must be in (0,1]');
  if (!provenanceHash)                        throw new Error('RelationCore: provenanceHash required (no unsourced relation)');
  const v = Array.isArray(validity) && validity.length === 2 ? validity : [createdAt ?? Date.now(), Infinity];
  return Object.freeze({
    id, sourceId, targetId, relationType,
    eta, phi0, structuralSupport, provenanceHash,
    validity: Object.freeze([v[0], v[1]]),
    createdAt: createdAt ?? Date.now(),
  });
}

// Invariant (1′) audit hook A1: the immutable tuple never changed between two versions.
export function assertCoreImmutable(prev, next) {
  for (const k of IMMUTABLE_CORE_KEYS) {
    if (prev[k] !== next[k]) throw new Error(`SRE A1 violation: RelationCore.${k} mutated`);
  }
  // Validity may only truncate: t1 may decrease, never expand (v1.2 §1).
  if (next.validity[0] !== prev.validity[0]) throw new Error('SRE A1 violation: validity start t0 mutated');
  if (next.validity[1] > prev.validity[1])   throw new Error('SRE A1 violation: validity end t1 expanded');
  return true;
}

// ── §2 (v1.2)  RelationDynamics — mutable state layer 𝔻(rc,t) ────────────────
// Definition (2): the dynamic state is a 9-tuple + reversibility (v1.1 ρ).
// Schema + initial-condition factory only; update equations (3)–(11) are Phase 1.
//
// @typedef {Object} RelationDynamics
// @property {string} relationId
// @property {number} timestamp   tₖ  (epoch)
// @property {number} strength     ϕ  ∈ [0,1]
// @property {number} momentum     ϕ̇  ∈ ℝ
// @property {number} acceleration ϕ̈  ∈ ℝ
// @property {number} persistence  ψ  ∈ [0,1]
// @property {number} volatility   ν  ≥ 0
// @property {number} entropy      Hₙ ∈ [0,1]  (v1.2 §3: NORMALIZED entropy)
// @property {number} elasticity   ε  ≥ 0
// @property {number} saturation   σ̂ ∈ [0,1]
// reversibility ρ ∈ [0,1] — DERIVED (ρ = 1 − persistence), not stored. See §23 audit + reversibilityOf().

// Initial conditions at t = t0 (v1.2 §2): ϕ(t0) ← φ₀, ψ(t0) ← 1, all derivatives ← 0.
export function initialDynamics(core) {
  return {
    relationId:   core.id,
    timestamp:    core.createdAt,
    strength:     core.phi0,   // ϕ(t0) ← φ₀  (NOT η — existence vs effect are separate)
    momentum:     0,
    acceleration: 0,
    persistence:  1,           // fully fresh
    volatility:   0,
    entropy:      0,
    elasticity:   0,
    saturation:   0,
    // reversibility ρ removed — it is exactly 1 − persistence (§23 dependency). Derive on read.
  };
}

// ── §23 ORTHOGONALITY AUDIT (CLAUDE.md §23) ──────────────────────────────────
// The v1.2 dynamics tuple carried coupled axes. Only INDEPENDENT axes may be scored
// as separate confidence dimensions; scoring a DERIVED one inflates confidence.
// Audit (Pair → Dependency → Action):
//   (momentum, strength)         Fully Dependent (d/dt)  → keep for event detection, never score as axis
//   (acceleration, momentum)     Fully Dependent (d/dt)  → keep for event detection, never score as axis
//   (reversibility, persistence) Fully Dependent (ρ=1−ψ) → retire as stored, derive on read
export const DYNAMICS_AXES = Object.freeze({
  INDEPENDENT: Object.freeze(['strength', 'persistence', 'volatility', 'entropy', 'elasticity', 'saturation']),
  DERIVED: Object.freeze({
    momentum:      'd/dt strength',
    acceleration:  'd/dt momentum',
    reversibility: '1 - persistence',
  }),
});
export const reversibilityOf = dyn => 1 - dyn.persistence;  // ρ, derived (was stored)

// ── §18/§19 ϕ-GROUNDING CONTRACT (the freeze's blind spot, now closed) ────────
// Δϕ MUST originate from an OBSERVED evidence delta (support gained / contradiction
// gained in the window). A ϕ change with no evidence delta is an ASSIGNED strength
// = fabrication. Phase 1's update equation (3) must route every Δϕ through this gate,
// or the 9 dynamics dimensions become confident-looking noise.
export const PHI_GROUNDING = Object.freeze({ rule: 'OBSERVED_DELTA_ONLY' });
export function assertPhiGrounded(prevPhi, nextPhi, evidenceDelta) {
  const changed  = Math.abs(nextPhi - prevPhi) > 1e-9;
  const grounded = !!evidenceDelta &&
    ((evidenceDelta.supportGained ?? 0) > 0 || (evidenceDelta.contradictionGained ?? 0) > 0);
  if (changed && !grounded) {
    throw new Error('SRE φ-grounding violation: ϕ changed with no observed evidence delta (assigned strength = fabrication, §19).');
  }
  return true;
}

// ── §11a TIME-ARROW GUARDRAIL (detect-not-predict) ───────────────────────────
// momentum/acceleration describe how a PRESENT relation is CONFIRMING now — detection.
// Extrapolating them to a FUTURE ϕ is forecasting, which is forbidden. Same math,
// opposite time-arrow (perception-dimension doctrine).
export const TIME_ARROW = Object.freeze({ mode: 'DETECT_ONLY' });
const FORECAST_FORBIDDEN_FIELDS = Object.freeze(new Set(['momentum', 'acceleration']));
export function assertNoForecast({ field, purpose }) {
  if (FORECAST_FORBIDDEN_FIELDS.has(field) && purpose === 'FORECAST') {
    throw new Error(`SRE §11a violation: '${field}' is DETECT-ONLY; projecting future ϕ from it is forecasting, not detection.`);
  }
  return true;
}

// ── §3 (v1.2)  RelationEvent — derived, immutable, replay-complete ───────────
export const RelationEventType = Object.freeze({
  FORMED:       'FORMED',
  STRENGTHENED: 'STRENGTHENED',
  WEAKENED:     'WEAKENED',
  BROKEN:       'BROKEN',
  INVERTED:     'INVERTED',
});
const RELATION_EVENT_TYPES = Object.freeze(new Set(Object.values(RelationEventType)));

// Equation (17′): re = ⟨event_id, relation_id, θ, t, ϕ⁻, ϕ⁺, Δϕ, context_hash⟩.
// Replay rule: stream is append-only, ordered by (t, event_id). Δϕ = ϕ⁺ − ϕ⁻.
export function makeRelationEvent({ eventId, relationId, theta, t, phiBefore, phiAfter, contextHash }) {
  if (!RELATION_EVENT_TYPES.has(theta)) throw new Error(`RelationEvent: bad type ${theta}`);
  if (!inUnitClosed(phiBefore) || !inUnitClosed(phiAfter)) throw new Error('RelationEvent: ϕ⁻/ϕ⁺ must be in [0,1]');
  return Object.freeze({
    eventId, relationId, theta, t,
    phiBefore, phiAfter,
    deltaPhi: phiAfter - phiBefore,
    contextHash,
  });
}

// Audit hook A3 (v1.2): stored ϕ⁻,ϕ⁺ satisfy ϕ⁺ − ϕ⁻ = Δϕ.
export function assertEventConsistent(re) {
  if (Math.abs((re.phiAfter - re.phiBefore) - re.deltaPhi) > 1e-9) {
    throw new Error('SRE A3 violation: RelationEvent Δϕ ≠ ϕ⁺ − ϕ⁻');
  }
  return true;
}

// ── §4 (v1.2)  LatentState — reserved node class, OFF in v1 ──────────────────
// Set-disjointness (0.1): 𝐿 ∩ 𝑂 = ∅ and 𝐿 ∩ ℛ = ∅. Schema placeholder only;
// creation disabled in v1 so no code path co-types an object as both.
export const LATENT_STATE_ENABLED = false;

export const NodeType = Object.freeze({
  ENTITY:      'ENTITY',
  OBSERVATION: 'OBSERVATION',
  RELATION:    'RELATION',
  LATENT_STATE:'LATENT_STATE',   // reserved
});

export function makeLatentState() {
  throw new Error('SRE: LatentState creation is disabled in ontology v1 (reserved).');
}

// ── §5 (v1.2)  Governance profile 𝒫 — versioned, monotone, engine-external ───
// Engine ≠ Policy. All weights/thresholds live here; the engine only executes.
// @typedef {Object} MetricPolicyProfile
export function makePolicyProfile({
  version,
  typeWeights = {},      // W_type : T → ℝ⁺
  tierWeights = {},      // W_tier : {1..5} → ℝ⁺
  alpha1, alpha2,        // α₁, α₂  strength gain/loss coefficients
  lambdaP,               // λ_p     persistence decay
  tauNu,                 // τ_ν     volatility EMA window
  tauCreate, tauBreak,   // event thresholds
  tauPos, tauNeg,        // ± momentum thresholds
  kappa,                 // κ ∈ [0,1]  topology-drift weight (v1.2 §4)
  phi0Init,              // φ₀ initialization policy (v1.2 §2)
  vStart,                // version applies to writes with timestamp ≥ vStart
}) {
  if (!version) throw new Error('PolicyProfile: version required');
  if (kappa != null && !inUnitClosed(kappa)) throw new Error('PolicyProfile: κ must be in [0,1]');
  return Object.freeze({
    version, typeWeights: Object.freeze({ ...typeWeights }), tierWeights: Object.freeze({ ...tierWeights }),
    alpha1, alpha2, lambdaP, tauNu, tauCreate, tauBreak, tauPos, tauNeg, kappa, phi0Init, vStart,
  });
}
