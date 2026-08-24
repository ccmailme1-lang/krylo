# SPEC — Perceptual Realism: Persistence, Formation Legibility, and Salience

**Status:** DISCOVERY COMPLETE (2026-08-23) — ready for downstream decomposition
**Scope:** KRYLO perception model and existing Formation-to-surface path
**Primary inquiry:** P1 / P2 — both closed, see §11
**Implementation status:** No implementation authorized by this specification. Discovery only.

### 1. Purpose
Establish a precise boundary between five related but non-equivalent operations:

1. Structural recognition
2. Temporal persistence
3. Legibility transformation
4. Salience adjudication
5. Perceptual representation

The purpose of this specification is investigative and contractual:
- Determine what KRYLO already does
- Identify what capability (if any) is missing
- Define the evidence required before any implementation is proposed

This document does **not** prescribe a new subsystem. It is a discovery and contract-discovery instrument. The eventual decomposition into implementation work orders, if warranted, will be derived from its findings.

### 2. Core Model
KRYLO must maintain a clear separation among:

| Concept | Question |
|---------|----------|
| **Detection** | What structural condition is established by the Truth Engine? |
| **Representation** | What typed structural object represents that condition? |
| **Legibility** | How is that established structure transformed into a form that exposes it to human perception? |
| **Perception** | What makes the resulting representation perceptually meaningful without substituting for or altering the underlying structural truth? |

**Key architectural claim:** Persistence and Formation recognition are independent inputs to the perceptual path. They must not be conflated.

### 3. P1 — Persistence / Temporal Perception

#### 3.1 Principle
A quantity explicitly defined relative to prior observations, historical anchors, or trajectories cannot be derived from an instantaneous observation unless the necessary historical information is already encoded in that instantaneous state. Therefore, KRYLO temporal observables require access to persistent history or an equivalent sufficient statistic (drift, momentum, persistence, convergence/divergence across observations, Formation evolution, change relative to a historical anchor).

#### 3.2 Important Qualification
Not a universal claim that all velocity/temporal behavior requires memory. The KRYLO requirement is narrower: any observable *explicitly defined* relative to prior observations or historical state requires that history (or a sufficient statistic of it).

#### 3.3 Investigation Requirement
Trace: `EntityStateLedger`, KRYL-1202 loop, temporal operators, Formation recognition, legibility candidate generation, candidate selection, perceptual rendering. Core question: does persistent state actually participate in perception, or does it merely exist elsewhere in the architecture? Distinguish **stored** from **consumed**.

### 4. P2 — Formation Legibility

#### 4.1 Principle
A confirmed Formation is a structural determination. It is not automatically a perceptually legible representation. `Formation exists ≠ Formation is perceptually legible`.

#### 4.2 Existing Implementation
`observeStoryView.jsx` already contains a live, partial implementation of this operation — candidate generation from observable structural conditions (multiple domains moving together, relationship convergence/divergence, volatility standout, opposing movement, emerging domain approaching a confirmed one), each with an explicit eligibility condition, none manufactured to pad the list. Candidate generation is an existing KRYLO capability, not an unbuilt concept.

### 5. Salience Adjudication

#### 5.1 Existing Gap
Multiple candidates may be simultaneously valid. Current selection: `stateHash(domains) % candidates.length`. Deterministic, not a ranking. Does not demonstrate KRYLO can answer which of several simultaneously valid conditions deserves perceptual priority.

#### 5.2 Investigation Mandate
Determine whether existing candidate objects already contain sufficient information for meaningful ordering. Candidate salience dimensions (magnitude, relationship strength, cross-domain extent, persistence, novelty, deviation from baseline, formation coherence, evidence strength, emergence state, convergence/divergence state) must be derived from the actual implementation, not assumed.

#### 5.3 Required Determination
Classify current state as exactly one of:
| Outcome | Meaning |
|---|---|
| **A** | Ranking is locally implementable — candidate representation already has sufficient info. |
| **B** | Upstream enrichment required — candidate representation loses needed structural info. |
| **C** | Both. |

### 5.4 Candidate inventory and information-loss boundary — TRACED (2026-08-23), deliverables 3 & 4 complete

| Candidate | Input | Derived value used for eligibility | Threshold |
|---|---|---|---|
| Stable-group (2+) | `domains` filtered `formationState==='STABLE'` | `leader` = domain with `magnitude` furthest from 50 | `stable.length >= 2` (categorical) |
| Stable-solo (1) | same filter | — | `stable.length === 1` (categorical) |
| Relationship state | `relationships[0]` — positional, not ranked | `topRel.state` from `deriveState()` | relationship exists at index 0 |
| Volatility standout | `active` domains | `mostVolatile.volatility − avgVol` | `> 0.15` — hardcoded |
| Opposite-direction pair | `active` domains, pairwise `rawVelocity` sign | `bestSpread` = max opposite-sign velocity gap | `> 6` — hardcoded |
| Emerging closing gap | `emerging` × `stable` domains | `closestGap` = min magnitude distance | `< 8` — hardcoded |

Three of six gates are fixed constants, not derived from any statistical baseline (contrast
`structuralrecognition.js`'s Monte Carlo null-model `z >= 1.65`).

**Information-loss boundary:** every surviving candidate has the identical shape —
`{headlinePre, emphasis, headlinePost, paragraph}`, all plain strings. The number that determined
eligibility (volatility delta, velocity spread, magnitude gap) is computed once, used for the
pass/fail check, then discarded — never attached to the candidate object. A ranking function would
have nothing numeric to rank on without recomputing from scratch.

**This answers §5.3 directly: not A.** The candidate representation itself discards the exact
information a ranking would need. Upstream enrichment (carrying the real numeric margin onto each
candidate) is required before any selection logic — B at minimum, pending #5's validation for
whether B alone is sufficient or C (selector logic also needed) applies.

### 5.5 Simultaneous-candidate validation — TRACED (2026-08-23) via actual computation, deliverables 5, 6, 7 complete

Ran the real `stateHash`/`buildCandidates`/selection logic verbatim (replicated exactly, not
reasoned about) against controlled cases:

- **Margin doubled (0.35→0.49), selection unchanged** — coincidence of hash parity (`210%2 ==
  200%2`), not tracking.
- **Domain labels changed, numbers held fixed** — identical hash, identical selection.
  `stateHash` never reads labels; revises the original hypothesis that naming/ordering drives
  selection — it doesn't, directly.
- **One domain's magnitude perturbed by +1, salience-irrelevant** (the winning candidate's own
  margin doesn't move) — **selection flips anyway**, because the perturbation flipped
  `stateHash`'s parity (210→211).
- One sweep sub-test was flawed (both domains given equal magnitude, so only one candidate was
  ever simultaneously eligible — `idx = hash % 1` is always 0 by necessity) and is excluded from
  the finding rather than cited as support.

**Finding:** selection is governed by the parity of a sum (`Σ round(magnitude) +
round(volatility×100)` across all active domains) with no structural relationship to any
individual candidate's eligibility margin, and can flip on a change irrelevant to which condition
is actually more significant.

**#6 — C, not B.** #5.4 already showed candidates discard their margins before reaching selection.
This test shows the other half: even with margins attached (B), the current selector doesn't take
a candidate's margin as input at all — only the raw domain array. Enrichment alone would not
change what gets selected; the selector itself has no consumption path for that information.

**#7 — the missing capability, precisely:** a salience function that takes each candidate's real
numeric eligibility margin (currently computed once, then discarded) and ranks candidates by it,
replacing the current selector — which is driven by an arithmetic artifact (parity of an unrelated
global sum) structurally decoupled from any individual candidate's significance.

### 6. Formation → Legibility Data Boundary — TRACED (2026-08-23)

The assumed single linear chain does not match the live code. The real lineage is a branch:

**Path A — feeds the existing candidate generation (`observeStoryView.jsx`), live today:**
```
coneState (pressure/volatility per domain, from app.jsx aggregateSignals)
      ↓
classifyConvergenceState()   [convergenceclassifier.js — threshold-based: D/A/V/T vector → stateId 0-4]
      ↓
formationState (STABLE / EMERGING / null, derived from stateId)
      ↓
buildCandidates()   [observestoryview.jsx]
      ↓
stateHash(domains) % candidates.length   [selection — deterministic, not ranked]
      ↓
surface (Quick Read banner)
```
Does **not** call `inferFormation()` or `structuralrecognition.js` anywhere in this path.

**Path B — `inferFormation()`'s real consumers, a separate surface path:**
```
inferFormation()   [formationinference.js — E = Cohesion × PressureCoherence × AvgGroundedness]
      ↓ (real importers, confirmed via grep)
analysisfield.jsx, structuralintegrity.js, perceptionread.js, formationprospectusproducer.js
```

**Path C — `structuralrecognition.js`:** zero consumers anywhere. Confirmed unwired, experimental,
non-authoritative per its own file header.

**Implication:** the legibility transform that already exists (Path A) is built on the *simplest*
of KRYLO's three formation-determination mechanisms — a single threshold classifier over a 4-value
vector — not on the more rigorous `inferFormation()` (multiplicative score) or
`structuralrecognition.js` (Monte Carlo null-model z-tests). Any future salience work needs to
decide which of the three determination mechanisms it's actually building legibility on top of —
they are not interchangeable and currently feed three different, unconnected surfaces.

For every transition, use: **Available** (exists upstream) / **Consumed** (actually used
downstream) / **Derived** (computed from other inputs) / **Discarded** (available upstream, absent
from the downstream legibility decision). Applied to Path A: `coneState`'s raw pressure/volatility
are Consumed by the classifier; the classifier's D/A/V/T vector components beyond what feeds
`stateId` are Discarded before `buildCandidates()` ever runs; `structuralrecognition.js`'s
organization/dependence/stability z-scores are Available system-wide but entirely Discarded from
this path since nothing in it is called.

### 6a. `classifyConvergenceState()` vs. `inferFormation()` — semantic/contract comparison, TRACED (2026-08-23)

**`classifyConvergenceState(vector, telemetryConfidence)`** (`convergenceclassifier.js`) — single-domain,
heuristic, hardcoded-confidence. In `observeStoryView`'s actual call site, `D` and `A` are set to
the *same* value (`pressure/100`), `T` is a hardcoded constant (0.7), `telemetryConfidence` is a
hardcoded constant (0.8) — not derived from any real evidence-quality signal. Output: one of 5
threshold buckets, `stateType: PROJECTION` always. Own file header: "Heuristic only. No predictive
claims... stateType is always PROJECTION until a real outcome-capture layer... exists." Makes zero
claim about relationships between domains — evaluated once per domain, independently.

**`inferFormation(rawParticles)`** (`formationinference.js`) — multi-domain, graph-structured,
evidence-anchored. Requires ≥2 domains connected by a real co-presence edge to return anything
(`MIN_DOMAINS = 2`) — a single domain alone can never produce a Formation. `Existence = Cohesion ×
PressureCoherence × AvgGroundedness`, where `AvgGroundedness` comes from real per-particle
groundedness, not a constant. Tracks explicit exclusion reasons per particle.

**Verdict: `formationState` is not a Formation in KRYLO's own technical sense.** It borrows the
word without satisfying the contract that word already has elsewhere in the same codebase. Third
instance this session of the same pattern (reusing a defined term for something that doesn't meet
its own definition) — see the SIL naming collision and the two-independent-Formation-engines
finding, both found earlier the same session.

**Also surfaced:** the narrative's relationship language ("X and Y are pulling into alignment")
isn't built on `inferFormation()`'s real cohesion either — `observeStoryView.jsx` calls
`deriveRelationships()` with `cohesion: stateId / 4`, a crude 5-value proxy from the same threshold
bucket, not a graph computation.

**Information in `inferFormation()` with no equivalent in `formationState`:** which specific domain
pairs are co-present (vs. an aggregate bucket), real per-particle evidence and groundedness,
explicit exclusion reasons, a topology-based id, net-vs-gross directional coherence (Q) computed
from a domain's own evidence set rather than a raw pressure/volatility threshold.

### 7. Traceability / Semantic Fidelity
The legibility layer must never become a second Truth Engine — transformation only, never semantic
substitution. Required: `Structural Truth → Legibility → Perceptual Representation`. Prohibited:
`Structural Truth → UI interpretation → modified structural meaning`. Full mathematical
invertibility not required; traceability is the sufficient requirement.

### 8. Validation
Before any new salience mechanism is proposed, construct controlled cases with multiple
simultaneously-valid candidates (strong convergence vs. weak divergence; weak convergence vs.
strong divergence; emergence vs. volatility; relationship strengthening vs. broad domain movement).
Determine whether current selection responds to structural properties or is governed solely by the
hash. Record as empirical findings, not interpretations.

### 9. Non-Goals
Does not authorize: a Believed-State subsystem, replacement of existing Formation recognition,
Truth Engine redesign, automatic salience score creation, UI redesign, new ontology primitives,
Jira implementation work, arbitrary candidate-dimension weighting.

### 3.4 Persistence-to-perception lineage — TRACED (2026-08-23), deliverable #2 complete

Every real persistence mechanism near the perception path, writer and reader (grep-confirmed):

| Store | Writer | Reader |
|---|---|---|
| `EntityStateLedger` | `ontologycontracts.js` | **None** — zero callers of `getEntityHistory()`/`getEntityStateAt()` anywhere. Write-only. |
| `pathstore.js` | Manual "Log Outcome" | `intelligencebrief.jsx`, `targetpacket.jsx`, `actionmatrix.jsx`, `metricsengine.js`, `calibrationengine.js`, `historicaldivergence.js`, others — all Analysis/report surfaces |
| Hysteresis buffer (`convergenceclassifier.js applyTransitionPolicy`) | `classifyConvergenceState()` output | `analysisidlefield.jsx`, `analysisfield.jsx`, `formationadapter.js`, `analysisprojection.js`, `oraclesignal.js`, `disruptionalertlayer.js` |

Direct grep on `observestoryview.jsx` for all three: **zero matches.** It calls
`classifyConvergenceState()` but never `applyTransitionPolicy()` — the one persistence mechanism
sitting in the same file it already imports from goes unused there. `stateHash()` is explicitly
stateless by its own comment ("a hash of the REAL current per-domain magnitudes/volatilities — not
the calendar"). The `next`-candidate panel is recomputed fresh each render, not a record of what
was actually shown previously.

**Answer to the core P1 question: persistent state does not participate in perception on this
path — it merely exists elsewhere in the architecture.** Every real store either has no reader at
all, or its readers are exclusively other surfaces (Analysis/Intelligence Brief/Oracle), never the
Observe legibility path.

### 10. Required Deliverables
1. Formation-to-legibility data lineage (file/function references) — **complete, see §6, §6a**
2. Persistence-to-perception data lineage (stored vs. consumed) — **complete, see §3.4**
3. Complete inventory of current candidate inputs and provenance — **complete, see §5.4**
4. Explicit determination of structural information discarded before salience selection — **complete, see §5.4**
5. Controlled simultaneous-candidate validation results — **complete, see §5.5**
6. Classification of the current gap as A, B, or C — **complete: C, see §5.5**
7. Precise definition of the missing perceptual capability (if one exists) — **complete, see §5.5**

### 11. Final Conclusion — both P1 and P2 closed (2026-08-23)

**P1:** Persistence exists elsewhere in KRYLO (`EntityStateLedger`, `pathstore.js`, the
`convergenceclassifier.js` hysteresis buffer) but does not participate in the Observe perception
path. All three real stores either have no reader anywhere, or their readers are exclusively other
surfaces (Analysis/Intelligence Brief/Oracle). Closed, not open — confirmed by direct trace, not
inference.

**P2:** KRYLO currently contains an evidence-gated candidate-generation mechanism that transforms
observable structural conditions into perceptual candidates. However, the candidate representation
discards the quantitative margins that establish the strength of those conditions, and the
existing candidate selector does not consume candidate significance at all. Selection is instead
determined by a stateless arithmetic hash of the current domain state. Controlled computation
(§5.5 — real code, run, not reasoned about) demonstrates that salience-irrelevant changes can alter
the selected perceptual output. The missing capability is therefore a structurally grounded
salience adjudication mechanism, together with preservation of the quantitative evidence required
to perform that adjudication. Classified **C**: both a representation fix and a new selection
mechanism are required — enrichment alone would not change what gets selected, since the current
selector has no consumption path for candidate significance at all.

**What this discovery has not done:** it has not specified a salience score, a ranking formula, or
an adjudication algorithm. That is downstream design/implementation work, out of scope for this
spec by §9's non-goals. This spec's job — establishing what exists, what's discarded, and where —
is complete.

All seven deliverables in §10 are closed. No further discovery work is outstanding.
