# WO-1342 — Deferred Cognitive Systems Specification
## riskModel() + Temporal Horizon + Parsed Intent NLP

STATUS: SPECIFICATION LOCKED (ARCHITECTURE-GRADE)
Date: 2026-05-29

These systems are deferred from the critical execution path until their semantics are fully deterministic, provenance-safe, and replay-compatible.

---

# I. riskModel() — Operational Risk Inference Layer

## Position In Stack
```
Substrate → Vector Engine → Emergence Event → Provenance Validation → riskModel() → Projection Layer
```
Critical invariant: riskModel() operates AFTER causal validation. Never before.

## Core Risk Dimensions
| Dimension  | Meaning                            |
| ---------- | ---------------------------------- |
| Exposure   | Magnitude of operator sensitivity  |
| Velocity   | Rate of systemic change            |
| Fragility  | Sensitivity to drift or volatility |
| Confidence | Stability of supporting evidence   |
| Contagion  | Cross-domain propagation risk      |

## Canonical Risk Object
```ts
type RiskVector = {
  exposure: number        // [0,1]
  velocity: number        // [0,1]
  fragility: number       // [0,1]
  confidence: number      // [0,1]
  contagion: number       // [0,1]
  aggregate_risk: number  // normalized composite
}
```

## Aggregate Risk Formula
```
aggregateRisk =
  0.30 * exposure +
  0.25 * velocity +
  0.20 * fragility +
  0.15 * contagion +
  0.10 * (1 - confidence)
```
Weights are deterministic, globally versioned, replay-safe.

## Risk Decay
```
R(t) = R₀ · e^(−μΔt)
```
μ = risk-specific decay. λ = epistemic confidence decay. Separation is mandatory.

## Forbidden Behavior
riskModel() must NEVER:
- mutate event store
- overwrite confidence
- suppress emergence artifacts
- infer hidden operator state
- introduce stochastic outputs

---

# II. Temporal Horizon System

## Canonical Horizon Enum
```ts
enum TemporalHorizon {
  IMMEDIATE,   // minutes → hours
  SHORT,       // hours → days
  MEDIUM,      // days → weeks
  LONG,        // weeks → months
  STRUCTURAL   // months → years
}
```
Default if unresolved: TemporalHorizon = MEDIUM

## Canonical Horizon Object
```ts
type HorizonResolution = {
  horizon: TemporalHorizon
  declared_by: "OPERATOR" | "TEMPLATE"
  confidence: number
  provenance_ref: string
}
```

## Horizon Effects
| System                | Effect                         |
| --------------------- | ------------------------------ |
| confidence decay λ    | modifies epistemic aging       |
| emergence persistence | affects visibility duration    |
| resonance weighting   | changes vector significance    |
| riskModel()           | changes urgency interpretation |
| replay reconstruction | changes contextual rendering   |

Horizons must be: operator-declared, deterministic, explicitly serialized. Never inferred silently.

---

# III. parsed_intent NLP System

STATUS: RESTRICTED

## Design Principle
The system must STRUCTURE intent. NOT invent intent.

## Permitted NLP Functions
- verb classification
- entity extraction
- domain tagging
- syntax normalization
- template alignment

## Forbidden
- hidden-goal inference
- psychological inference
- speculative objective expansion
- autonomous intent rewriting

## Canonical Intent Verbs
```ts
enum IntentVerb {
  TRACK, INVESTIGATE, COMPARE, MONITOR, HEDGE,
  SECURE, AUDIT, ACCELERATE, REPOSITION, VALIDATE
}
```

## Intent Parse Object
```ts
type ParsedIntent = {
  raw_input: string
  normalized_verb: IntentVerb
  entities: string[]
  domains: string[]
  ambiguity_score: number   // if > 0.35 → operator clarification required, no auto-execution
  parser_version: string
}
```

## Determinism Requirements
```
same input + same parser_version = same ParsedIntent (always)
```

## Phase A Implementation (Buildable Now)
NO LLM inference. Use:
- constrained grammar
- deterministic regex/entity extraction
- finite intent vocabulary (10 verbs above)
- ontology-based matching

---

# IV. Final VectorResolution Contract

```ts
type VectorResolution = {
  base: {
    lens: LensId
    kernel_state_hash: string
  }
  target: {
    objective: string
    parsed_intent?: ParsedIntent
    temporal_horizon?: HorizonResolution
  }
  validity: {
    complete: boolean
    missing?: "BASE" | "TARGET"
  }
}
```

---

# V. Final Architectural Rule

The system may:
- organize ambiguity
- constrain ambiguity
- expose ambiguity

The system may NEVER:
- conceal ambiguity
- hallucinate precision
- fabricate operator intent

> deterministic first, interpretive second.
