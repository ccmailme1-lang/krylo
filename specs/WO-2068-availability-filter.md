# WO-2068 — Availability Filter

**Status:** BUILD-READY
**Filed:** 2026-07-01
**File:** `src/engine/availabilityfilter.js`
**Depends on:** WO-2066 (Metric Adapter — adapted invariant output)
**Blocks:** Pareto candidate set, ranking, Cone rendering

---

## Single Responsibility

Feasibility gate: filters the candidate set to user-accessible opportunities only.
Eliminates candidates. Does not deprioritize, score, or rank.

---

## Pipeline Position

```
Decision Invariant mapping (WO-2066)
        ↓
AVAILABILITY FILTER (WO-2068)
        ↓
Pareto candidate set
        ↓
Ranking / convergence
        ↓
Cone rendering (WO-2067)
```

---

## What Availability Is and Is Not

**Availability IS:**
- feasibility under user-specific constraints
- a hard elimination gate (passes or fails — no partial scores)

**Availability IS NOT:**
- desirability
- probability
- value
- a ranking signal

---

## Constraint Categories (exhaustive)

```
CAPITAL_ACCESS        — can the user fund this opportunity
LEGAL_ELIGIBILITY     — legal authorization, accreditation, licensing
GEOGRAPHY             — jurisdiction, location, operational reach
TIME_WINDOW           — opportunity window vs user's available timeline
EXECUTION_CAPABILITY  — operational capacity to act
RISK_TOLERANCE        — user-declared or inferred risk bounds
INFORMATIONAL_ACCESS  — user has or can obtain required information
```

---

## Two Filter Spaces (never conflated)

### 1. Validity filter (system-side — already handled upstream)
Answers: "Is this real, supported, and causally coherent?"
Handled by: epistemic invariants + domain-native reasoning.

### 2. Availability filter (user-side — this WO)
Answers: "Can the user actually act on this?"
Handled by: user constraint model applied here.

---

## Hard Constraints

- Runs only after Phase 3 (adapted invariant output) is complete
- Read-only access to adapted output
- Each constraint evaluator registered independently per category (plug-in)
- Enforced constraints: hard elimination
- Unenforced (advisory) constraints: pass through with annotation
- No merging or normalization of constraint categories

---

## Open Structural Artifact

User constraint model encoding — how user capability space is represented — is not yet defined.
This WO builds the filter infrastructure and evaluator registry.
Constraint evaluators are registered per-category as domain implementations become available.

---

## Definition of Done

- `filterCandidateSet(adaptedOutputs, constraintModel)` returns `{ passed[], eliminated[], totals }`
- Single candidate `applyAvailabilityFilter` returns `{ passed, rejections[] }` with rejection reasons
- Evaluator registry accepts per-category plug-ins
- No mutation of adapted output
- No access to raw Domain Package state
