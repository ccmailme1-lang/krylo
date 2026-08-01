# WO-XXXX — Structural Delta Encoding (Absence Encoding Primitive)

**Status:** SPEC HARDENED — UNBLOCKED, pending a companion spec (see §8)
**Number:** unassigned — per Jira-exclusive numbering doctrine, this file is not a WO until a
KRYL-#### ticket is opened. Do not build against "WO-XXXX."
**Origin:** backlog discussion 2026-07-31 — "Latent Capacity" concept, refined through Truth
Engine/Interface separation (§ doctrine) and §21 Route-Don't-Aggregate.
**Generalizes:** `decomposeUncertainty()` in `epistemictransparency.js` (WO-2079) — same
`populated / unpopulated / coverage` shape, generalized from the fixed 8-key DECISION_INVARIANTS
schema to formation-level structural elements.
**Interface contract:** NEW — no existing external consumer depends on this yet.

---

## 1. Single Responsibility

**Job:** Given a set of structural elements a formation is expected to have, and the set it
actually has evidence for, produce the delta — nothing more.

**Output:** One record per formation: `{ expected, observed, missing, coverage }`. No score, no
rank, no verdict.

If you find yourself adding a second output type (e.g. an importance-weighted number) — stop.
That belongs to a consumer, not this module. See §5.

---

## 2. Boundary Declaration

**Input contract:**
- `expected`: a named set of structural element identifiers for this formation's category.
  **Source of this set is UNRESOLVED — see §7. This is the build gate.**
- `observed`: structural elements already confirmed present, read from existing engines
  (SCI, RBCS inputs, evidence layer) — this module computes nothing new about *whether* an
  element is present, only which named elements from `expected` show up in what's already been
  computed elsewhere.

**Output contract:**
- `missing`: `expected − observed` (set difference)
- `coverage`: `|observed ∩ expected| / |expected|` — a plain ratio, uniform weighting across
  elements by construction (see §6.1 — this is a declared assumption, not a neutral default)

**Explicit exclusions:**
- Does NOT decide which missing elements matter — no importance, no rank, no severity
- Does NOT decide what "expected" means — that's an input this module receives, not derives
- Does NOT write back to SCI, RBCS, HP, or any signal/evidence engine
- Does NOT dispatch directly to a consumer (routes through shared dispatch, §16 pattern — see §6.3)
- Does NOT produce a confidence score, a readiness score, or any single scalar

---

## 3. Zero Drift Confirmation

- [x] Detection layer touched → inference does NOT redefine signal schema. **Confirmed not
      violated**: this reads already-computed evidence; it does not re-derive it.
- [x] Scoring layer touched → output is NOT a recommendation. **Confirmed not violated**:
      `coverage` is a ratio of counts, not a judgment. No pass/fail threshold lives here.
- [ ] Inference layer touched — N/A, this module performs no inference.
- [ ] UI layer touched — N/A, this is engine-only in this WO.

**Drift notes:** The single largest drift risk is a future consumer treating `coverage` as a
de facto readiness score by convention (e.g., "always gate at coverage > 0.7") without that
threshold being declared as *that consumer's* local interpretation. This module cannot prevent
that misuse structurally — it can only refuse to define a threshold itself. Any WO that consumes
this primitive must name its own threshold explicitly, in its own file, not import one from here.

---

## 4. Strategic Leverage Statement

This WO surfaces structural gaps — what a formation is missing relative to what its category
expects — as a shared, unweighted, reusable fact, so every consumer (HP, Causal Event Engine,
Surface, future Explainability work) can apply its own domain-specific judgment to the same
ground truth instead of each engine re-deriving its own private notion of "what's missing."
It protects against the failure mode named in §21: a pre-aggregated, hidden-judgment
completeness score computed before routing decisions are made.

---

## 5. Output Gravity

**"The single thing this WO produces that matters most is the missing set — the honest, named
list of what a formation's own category expects that isn't there."**

Coverage is a convenience derivative of the missing set, not the other way around. If a future
revision ever makes coverage the primary output and missing set the derivative, that is a
different WO and needs its own Bottle Test.

---

## 6. Formula / Contract

### 6.1 Coverage (declared, not neutral)
```
coverage = |observed ∩ expected| / |expected|
```
This is uniform-weighted by construction — every element in `expected` counts equally toward
the ratio. That is a declared modeling choice, stated here explicitly per the discussion that
produced this spec, not an emergent property of "just counting." A future WO may propose a
weighted variant; it must be a separate, named, orthogonality-audited (§23) construct — never a
silent change to this formula.

### 6.2 Missing set
```
missing = expected − observed   (set difference, no ordering, no ranking)
```

### 6.3 Dispatch (§16 pattern, generalized to absence data)
```
Expectation source → Comparison against observed evidence → StructuralDeltaRecord →
  dispatch via shared router (mirrors surfacerouter.js's contract, new channel — not signal
  dispatch, not the same event type) → consumer reads, never mutates
```
No direct wiring from this module into HP, Causal Event Engine, or any specific consumer.
Same discipline §16 already locks for signal connectors: normalize, dispatch to a shared point,
never connector-to-consumer direct.

### 6.4 What this WO must NOT do
- Must NOT compute or expose any weighted/composite score
- Must NOT rank missing elements by importance
- Must NOT infer `expected` from a reference/peer set of formations (that is Option B in §7 —
  if chosen, it is its own follow-on WO with its own bias/groundedness hardening, not built here)
- Must NOT gate any downstream decision itself (HP, export, routing) — consumers gate, this
  module only reports

> Formula for `expected`: **TBD — WO BLOCKED.** See §7. Do not invent a schema to unblock this.

---

## 7. What WO-XXXX does NOT resolve — THE BUILD GATE

**RESOLVED 2026-07-31:** Option A, below — chosen. `expected` is supplied at call time by
`WO-XXXX — Expectation Registry Governance` (companion spec), as a versioned, human-authored
`ExpectedStructure` record. Option B (candidate generation from peer/statistical inference) is
explicitly OUT of scope for both this primitive and the registry's v1 — deferred to a future,
separately-hardened WO if ever pursued. This module still does not derive `expected` itself; it
only receives it — the registry, not this primitive, owns the decision recorded below.

**Where does `expected` come from? Three named options were considered:**

**Option A — Fixed Schema Per Formation-Type (declared)**
A hand-authored, versioned list of expected structural elements per formation category, exactly
like `DECISION_INVARIANTS` in WO-2063. Zero inference, fully auditable, directly reuses the
proven WO-2079 pattern.
*Cost:* someone (Founder or a named domain owner) must author and maintain a schema per
category; does not automatically cover a new formation type until a human adds it.

**Option B — Derived From a Reference Set (comparative)**
`expected` = elements present in some threshold % of formations already independently confirmed
complete (e.g., via existing HP qualification or SCI grounding).
*Cost:* this is a statistical/inferential judgment, not a declaration — it reintroduces exactly
the kind of interpretive risk this spec exists to keep out of the primitive. Would need its own
bias and sample-size hardening (same class of concern already written for Path Memory under §19
— survivorship bias, N-floors, WITHHOLD BEATS FABRICATE). This is realistically its own WO, not
a sub-clause of this one.

**Option C — Consumer-Supplied, Per Call (no universal schema)**
This module defines no canonical "expected" set at all. Each consumer (HP, Causal Event Engine,
Surface) passes its own expected-set scoped to its own need when it calls the primitive.
*Cost:* there is no single canonical "coverage %" for a formation — every consumer computes its
own view. *Note:* this is the option most consistent with the rest of this spec (unweighted,
no-owner, "N local interpretations" already settled in §4/§6.3) — named here as an observation
about internal consistency, not a recommendation to build it.

**This spec does not pick one.** Per the Bottle Test in §8, that decision blocks the build.

---

## 8. Bottle Test

| Question | Answer |
|---|---|
| Does this reduce ambiguity in the system? | YES — once §7 resolves, gives every consumer one shared fact instead of N private guesses |
| Does this have a single dominant output? | YES — the missing set (§5) |
| Are all boundaries explicitly defined? | PARTIAL — `observed`/`missing`/`coverage` fully defined; `expected` source is not (§7) |
| Can this be built without touching an undefined dependency? | YES — `expected` is now supplied by the Expectation Registry (companion spec); source is no longer undefined from this module's point of view |
| Does this avoid increasing expressive flexibility in the core? | YES — it constrains (reports gaps) rather than expands (no new scoring surface) |

**Build gate: UNBLOCKED, sequenced after the registry**
Do not build until:
- `WO-XXXX — Expectation Registry Governance` exists and can supply a versioned `ExpectedStructure`
- The per-category schema authorship owner (Founder or named DomainOwner) is active in that registry
  for at least one formation type this module will be tested against

---

## 9. Definition of Done

*(Cannot be finalized until §7 resolves — listed here so it's ready the moment it unblocks.)*

- `structuraldeltaengine.js` exists, exporting a pure function producing
  `{ expected, observed, missing, coverage }`, mirroring `decomposeUncertainty()`'s shape
- No file outside this module computes `missing` or `coverage` independently (grep confirms)
- Dispatch goes through a shared channel, never consumer-to-primitive direct wiring (grep
  confirms no direct import of `structuraldeltaengine.js` internals by HP/Causal Event
  Engine/Surface — only the dispatched record)
- Zero weighted/composite score anywhere in this module (grep confirms no `* weight`, no
  `reduce` producing a single scalar beyond the declared `coverage` ratio)
- `expected` source is documented inline with which §7 option was chosen and why

---

## NOTES

This spec exists to lock in what the backlog discussion already settled (unweighted primitive,
no owner, §16-pattern dispatch, §21 extension to absences) so that work isn't lost — and to stop
at the one place a real, undelegated Founder decision is required. Consistent with WO-1848's
precedent: a hardened, BLOCKED spec is the honest state here, not a guess dressed up as a
formula.
