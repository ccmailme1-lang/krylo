# WO-2066 Dependency Lock — Domain-Native Reasoning Output Contract

**Status:** LOCKED
**Blocks:** WO-2066 (Metric Adapter Layer)
**Filed:** 2026-07-01

---

## Core Definition

> Domain-native reasoning output is a **structured, domain-complete evaluation graph** produced entirely within the Domain Package, without reference to Decision Invariants or Cone rendering logic.

It is the **final artifact of domain-internal cognition**.

Not intermediate data.
Not raw signals.
Not UI-ready formatting.

---

## Allowed Output Structure (hard constraint)

Domain output MUST conform to the following four-part structure:

```
DOMAIN_STATE
COMPONENT_GRAPH
SIGNAL_EVALUATION
CAUSAL_MAP
```

No additional top-level structures are permitted.

---

## Component Definitions

### A. DOMAIN_STATE

A declarative snapshot of the subject within the domain.

Allowed:
- entity identification
- domain classification context
- structural positioning inside industry

NOT allowed:
- decision framing
- scoring
- invariant mapping

---

### B. COMPONENT_GRAPH

Represents all relevant domain elements connected to the subject.

Allowed:
- entities
- systems
- subsystems
- relationships
- dependencies

NOT allowed:
- weighting
- normalization
- scoring

---

### C. SIGNAL_EVALUATION

Raw domain-native signal interpretation.

Allowed:
- signal presence
- signal direction (up/down/neutral)
- signal strength (qualitative or bounded numeric)
- temporal behavior (optional)

NOT allowed:
- cross-domain comparison
- invariant translation
- optimization scoring

---

### D. CAUSAL_MAP

Domain-internal cause-effect structure.

Allowed:
- causal relationships
- dependency chains
- structural influence flows

NOT allowed:
- probability aggregation across domains
- decision weighting
- meta-confidence scoring

---

## Hard Constraints

### 4.1 No Invariant Leakage

Domain output MUST NOT reference:
- Cost, Value, Risk, Leverage, Flexibility, Confidence, Momentum, Time

These belong exclusively to WO-2063 + WO-2066 downstream layers.

### 4.2 No Cross-Domain Abstraction

Domain output must not:
- compare to other domains
- normalize across domains
- generalize beyond its own package

### 4.3 No Cone Awareness

Domain output must be entirely unaware of rendering surface.
No formatting for UI. No structural adaptation for display.

### 4.4 No Optimization Layering

Domain output is descriptive + structural only.
Not prescriptive, ranked, optimized, or selected.

---

## Canonical One-Line Definition

> Domain-native reasoning output is a self-contained, non-normalized, non-comparative structural graph of a subject within a single domain, expressed only through state, components, signals, and causality.

---

## Architectural Guarantees

1. **Domain purity** — each domain produces its own truth slice without contamination
2. **Late-binding invariants** — WO-2066 can safely map outputs without upstream bias
3. **Safe composability** — multiple domains compared only AFTER invariant extraction
4. **Clean Cone separation** — Cone is purely a renderer of already-resolved structure

---

## Unresolved (next structural artifact)

Execution ordering guarantees:
- what runs first
- what is forbidden to execute early
- what cannot be parallelized across layers
