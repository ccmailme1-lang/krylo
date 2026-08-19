# SPEC — Relationship Validator: Eight Operator Contracts
Jira: none filed (no emergency; per session direction, no new Jira work unless required)
Date: 2026-08-18
Status: CONTRACT DRAFT. Specializes `SPEC-relationship-validator-operator-contract.md` (the
common contract) into eight named operators. Produces no code. Implementation, adapters, and
the `ValidationProfile` overall-status composition function are explicitly out of scope — the
compositional-role classification in §9 is a prerequisite for that future document, not a
substitute for it.

---

## 0. Precedence and correction notice

This document implements `SPEC-relationship-validator-operator-contract.md`. Where ambiguity
exists, the common contract has precedence — this document exists to specialize it per operator,
not to introduce new authority over the candidate shape, the five prohibitions, or the
Independent Evidence Rule.

**Three corrections applied here, caught in review before this was written:**

1. **Every "Candidate input" field below is corrected to the locked five fields only** — `id`,
   `sourceId`, `targetId`, `relationType`, `provenanceHash`. Earlier drafting referenced
   `temporal_anchors`, `historical_observations`, `core_state_snapshot`, `evidence_refs`,
   `local_neighborhood_ref`, and `relation_id` as candidate fields — none of those exist on the
   locked candidate (see the common contract §2). Every one of them moves to
   `ValidationContext`, per operator, below.
2. **Temporal's ordering test is softened** from a strict all-pairs requirement to a materiality
   rule — see §1.
3. **Recurrence drops `FAIL` from its state space** — it is supporting evidence, not a
   falsifiable prerequisite. **Alternatives' `PASS` definition is narrowed** to what graph search
   can actually establish, not a positive claim about the candidate. See §4 and §5.

---

## Domain neutrality (governs all eight)

No operator may know whether the candidate under test concerns an individual, a corporation, an
investment thesis, a government/institutional question, a research question, or any other future
KRYLO context. Operators evaluate relationship structure. Context (§3 of the common contract)
determines applicability and available evidence — it never redefines what "temporal validity" or
"independence" means. This is what keeps the eight operators core ontology infrastructure rather
than a commercial analytics feature bolted onto one product surface.

**Common input shape, every operator, no exceptions:**
```
Operator(
  R_c: { id, sourceId, targetId, relationType, provenanceHash },
  Context: ValidationContext   -- operator-specific subset, listed per operator below
)
```

---

## 1. Temporal Operator

**Question** — Does the evidence establish that A precedes B?

**Candidate input** — `R_c` (locked five fields only)

**Required ValidationContext** — Ordered observation timestamps or lineage references
sufficient to establish ordering between source- and target-side observations (`evidence`,
`lineage` from the common contract's context surface).

**Applicability predicate** — At least one usable ordered pair of observations linking A and B
exists. Otherwise → `N/A`.

**Mathematical test — corrected, materiality-based, not strict all-pairs.** The original
formulation (`∀ relevant observation pairs, t_A < t_B`) is too brittle: one anomalous or noisy
observation would fail a relationship the broader evidence actually supports. The operator
instead classifies the applicable evidence set into three buckets and tests materiality across
them:
- **Ordering evidence** — observation pairs consistent with `t_A < t_B`.
- **Material temporal contradiction** — a non-trivial share of observation pairs showing `t_B`
  preceding `t_A` in a way that cannot be explained by measurement/reporting noise.
- **Unresolved temporal evidence** — pairs too sparse or too noisy to classify either way.

`PASS` requires the ordering-evidence share to clear a materiality floor with no material
contradiction present; `FAIL` requires a material contradiction, not a single outlier. May be
implemented as a distribution of ordering outcomes tested against a null of random ordering,
rather than a bucket count — the null-distribution framing tolerates noise more naturally than a
strict pairwise rule and is compatible with the materiality requirement above.

**Output states** — `PASS | FAIL | UNDETERMINED | N/A`

**Evidence requirements** — Pointers to the specific evidence/lineage items establishing (or
contradicting) the ordering, plus the materiality classification each was assigned.

**Conflict semantics** — None. Ordering is evaluated against the supplied evidence as a
materiality question, not a competing-structure question; competing temporal accounts are a
composition-layer concern, not this operator's.

**Failure semantics** — `FAIL` only on material contradiction, not on any single anomalous
observation.

**Independence requirements** — Must not depend on lag magnitude (§2), graph structure (§3), or
any other operator's result (Independent Evidence Rule).

**Computational class** — Cheap (ordering classification over a bounded evidence set).

**Existing KRYLO substrate** — `cirgate.js checkTemporalLegal()` *(verified firsthand this
session)* — real, pure, already embedded in a read-only admit/reject gate using RKM
`observedAt` timestamps. Current implementation is strict precedence, not materiality-bucketed —
the materiality classification above is the semantic delta from what exists today, not a
reuse-as-is.

**Adaptation required** — Interface adaptation (accept `R_c` + context instead of a CI-R path)
plus the materiality-bucketing logic, which does not exist in the current substrate.

**Explicit prohibitions** — Must not invent a reverse relationship, adjust timestamps, or
reinterpret directionality based on the ordering result.

---

## 2. Lag Operator

**Question** — Is the observed A→B temporal displacement consistent with the relationship's
relevant history?

**Candidate input** — `R_c`

**Required ValidationContext** — Historical lag observations for the same relation, or for
sufficiently similar structural configurations (`relationHistory`); optional null-model
baseline.

**Applicability predicate** — At least two usable lag observations exist, or one current lag
plus a sufficient historical distribution. Otherwise → `N/A` or `UNDETERMINED`.

**Mathematical test** — Evaluate the distribution of `Δt = t_B − t_A` against the historical lag
structure for this relation or motif — central tendency, variance, or divergence from an
appropriate null.

**Output states** — `PASS | FAIL | UNDETERMINED | N/A`

**Evidence requirements** — References to the lag samples and the historical distribution used.

**Conflict semantics** — None — distributional consistency is not a competing-structure
question.

**Failure semantics** — `FAIL` when the observed lag(s) fall outside the historically coherent
range in a material way.

**Independence requirements — Temporal ≠ Lag, locked distinct.** Temporal is an ordering
constraint (`t_A < t_B`); Lag is a distribution/consistency question over `Δt = t_B − t_A`. A
candidate can `PASS` Temporal and `FAIL` Lag — order is right, but the timing doesn't match this
relationship's known rhythm. Must not collapse into Temporal, and must not require exact-edge
repetition (see Recurrence, §4, for the multi-scale distinction).

**Computational class** — Medium (distributional comparison).

**Existing KRYLO substrate** — `confirmationvelocity.js` (confirmation rate over a trailing
window) and `signalgenealogy.js` (`lag_estimate_days`, `expand_genealogy()`) *(fork-reported
this session, not independently reread — Verification: C, not R)*. Neither answers exactly this
question as-is: `confirmationvelocity.js` is closer (same-claim reconfirmation rate);
`signalgenealogy.js`'s lag is cross-node propagation delay in a genealogy chain, a related but
distinct question. Treat both as ingredients requiring reconciliation, not a single ready
substrate.

**Adaptation required** — Interface adaptation, plus reconciling which of the two candidate
substrates (or a combination) actually answers "is this lag consistent with history," since they
currently answer adjacent but non-identical questions.

**Explicit prohibitions** — Must not alter temporal anchors or invent historical lags where none
were observed.

---

## 3. Structural Operator

**Question** — Does A→B fit the observed local graph structure?

**Candidate input** — `R_c`

**Required ValidationContext** — Local graph neighborhood (`worldGraph`) — paths, degrees,
motifs, direction consistency — sufficient to assess fit.

**Applicability predicate** — A usable local neighborhood reference exists. Otherwise → `N/A`.

**Mathematical test** — Contextual structural coherence: path consistency, motif participation,
neighborhood similarity, direction consistency, and connectivity impact of the proposed edge
within the observed local graph. **Ontology edge-type legality is a prerequisite only — it is
not the test.** A candidate can be perfectly legal by type and still fail this operator on
neighborhood incoherence.

**Output states** — `PASS | FAIL | UNDETERMINED | N/A`

**Evidence requirements** — References to the specific local structures that support or
undermine fit.

**Conflict semantics** — None. Competing explanatory paths are the domain of Alternatives (§5),
not this operator.

**Failure semantics** — `FAIL` when the edge produces structural incoherence (direction
conflict, motif violation, neighborhood inconsistency) even where the edge type is ontologically
legal.

**Independence requirements — Structural ≠ Alternatives, locked distinct.** Structural asks
"does this edge fit the surrounding graph?"; Alternatives asks "is there another observed
structure that competes with this edge as an explanation?" A candidate can fit the graph
perfectly while simultaneously having a strong competing path — that produces `Structural: PASS`
/ `Alternatives: CONFLICT`, not a contradiction in the profile.

**Computational class** — Medium–High (local graph queries).

**Existing KRYLO substrate** — `cirgate.js checkEdgeLegal()` *(verified firsthand)* — real,
tests edge-type legality against an injectable ontology over a candidate path. This is the
prerequisite check named above, not the operator itself: it answers "is this edge type
permitted," a narrower question than "does the neighborhood support this edge."
`entitytopologyregistry.js findPath()` *(fork-reported, not independently reread)* supplies
neighborhood traversal. **This is the audit's identified semantic-extension case, confirmed
again here**: real substrate exists for the prerequisite and for graph traversal; the
neighborhood-coherence evaluation itself does not yet exist as one function.

**Adaptation required** — Semantic extension, not interface-only: move from "is this edge type
legal?" to "does this particular edge fit the observed local structure?" — genuinely new logic
combining the existing legality check with motif/degree/direction evaluation over `findPath()`'s
output.

**Explicit prohibitions** — Must not rewrite the edge, invent new edges, or treat ontology
legality alone as sufficient for `PASS`.

---

## 4. Recurrence Operator

**Question** — Has the same relationship or relevant structural motif recurred?

**Candidate input** — `R_c`

**Required ValidationContext** — Historical instances of the exact relation, or of higher-order
motifs/configurations that include it (`relationHistory`, at multiple structural scales).

**Applicability predicate** — A non-empty historical observation surface is present. Otherwise →
`UNDETERMINED` or `N/A`.

**Mathematical test** — Frequency or motif-recurrence test at one or more structural scales
(exact edge → path → motif → configuration). Recurrence is **supporting evidence, not a hard
prerequisite** for validity.

**Output states — corrected, `FAIL` removed.** `PASS | UNDETERMINED | N/A`. If recurrence is
explicitly non-prerequisite supporting evidence, "has this recurred?" has a meaningful `PASS`,
`UNDETERMINED`, and `N/A` — but absence of recurrence does not logically invalidate the
relationship, so no genuine falsification condition exists for it to `FAIL` against. Reserve
`FAIL` in this contract family for operators whose question contains a real falsification
condition (Temporal, Structural, Independence, Stability — see §9's classification).

**Evidence requirements** — References to prior instances or motif occurrences.

**Conflict semantics** — None.

**Failure semantics** — N/A — no `FAIL` state (see Output states above). Where recurrence is
demonstrably absent in a context where it would be expected, the correct emission is
`UNDETERMINED`, not `FAIL` — the absence is informative but not falsifying.

**Independence requirements** — Must not require exact edge repetition if a higher-order motif
is the relevant unit — this is the multi-scale requirement distinguishing Recurrence from Lag
(§2), which evaluates timing consistency of a single relation, not motif recurrence across
scales.

**Computational class** — Medium (historical/motif lookup).

**Existing KRYLO substrate** — `rfereconciler.js` (K=2/N=3 hysteresis), `convergenceclassifier.js`
(3-tick persistence buffer), `formationintegrity.js persistenceGate()` *(fork-reported, not
independently reread)*. All three implement "has this state/motif persisted enough to be real,
not noise" — the right pattern — but over classifier Σ-state or Formation objects, not over an
arbitrary `R_c`. Real pattern, wrong object — matches the audit's ADAPT classification exactly.

**Adaptation required** — Interface adaptation plus explicit multi-scale (edge/path/motif)
support, redirecting the existing hysteresis pattern from Σ/Formation state onto `R_c` directly.

**Explicit prohibitions** — Must not invent historical instances, and must not promote a
recurring motif into a new relationship candidate (§6 of the common contract, prohibition 5 —
no implicit relationships).

---

## 5. Alternatives Operator

**Question** — Does another observed path/structure provide a competing explanation for B?

**Candidate input** — `R_c`

**Required ValidationContext** — Surrounding graph structure (`worldGraph`) sufficient to detect
alternative paths or explanatory configurations that reach the same target.

**Applicability predicate** — A usable graph neighborhood exists. Otherwise → `N/A`.

**Mathematical test** — Detection of competing paths or structures (e.g. `C→B`, or `A→C→B`, or
another observed configuration explaining B). Presence of a competitor is reported; strength may
be noted but never used to rewrite the candidate.

**Output states** — `PASS | CONFLICT | UNDETERMINED | N/A`

**`PASS` — corrected, narrowed definition.** `PASS` does **not** mean "no competing explanation
exists" — that overstates what a bounded graph search can establish. `PASS` means precisely:
**"No material competing explanation was identified within the applicable search space."** This
is an observation about the search, not a validation claim about the candidate's exclusivity.

**Evidence requirements** — References to the competing path(s) or structures found.

**Conflict semantics** — `CONFLICT` is a first-class, non-destructive state. It does not imply
rejection of the candidate and must never be collapsed into `FAIL`. Example, from the common
contract: `Structural: PASS` / `Alternatives: CONFLICT` is a coherent, expected profile shape —
not a contradiction.

**Failure semantics** — No `FAIL` state for the simple presence of alternatives; `CONFLICT` is
the correct emission. (There is no falsification condition here — a competing explanation
existing doesn't falsify this candidate, it just means both are live.)

**Independence requirements — Structural ≠ Alternatives** (see §3) — orthogonal questions, both
required.

**Computational class** — Medium–High (path enumeration / alternative detection).

**Existing KRYLO substrate** — `entitytopologyregistry.js findPath()` (competing-path discovery)
and `formationintegrity.js counterGate()` (tested counter-formation blocks promotion, never
rewrites) *(fork-reported, not independently reread)*. `counterGate()`'s described behavior —
"a competing explanation blocks/holds, never gets promoted into the primary claim" — is close to
exact semantic precedent for this operator's non-promotion rule, but operates on Formation
objects, not `R_c`.

**Adaptation required** — Interface adaptation (redirect `counterGate`-style logic and
`findPath()` onto `R_c`); explicit non-promotion rule enforcement at the operator boundary.

**Explicit prohibitions** — Must never promote a competing path into a relationship candidate,
and must never rewrite `R_c` toward or away from the competing explanation (common contract
prohibitions 4 and 5).

---

## 6. Independence Operator

**Question** — Does the relationship remain supported when relevant alternative
variables/relationships are considered?

**Candidate input** — `R_c`

**Required ValidationContext** — Candidate third variables/relationships and the observations
needed to condition on them (`confounders`).

**Applicability predicate** — At least one relevant alternative variable or relationship is
available for conditioning. Otherwise → `N/A` — **explicit, not a silent skip.** (This corrects
a real gap the audit found: `causalvaliditygate.js`'s current behavior silently skips its
confounder criterion when `confounders` is empty, rather than emitting `N/A`. Under this
contract that silence must become an explicit applicability declaration.)

**Mathematical test** — Conditional support test: does the A–B relationship remain after
accounting for the alternative(s)? Conceptually closer to conditional dependence/confounding
checks than to full causal identification.

**Output states** — `PASS | FAIL | UNDETERMINED | N/A`

**Evidence requirements** — References to the conditioning variables and the before/after
support comparison.

**Conflict semantics** — None — this is a persistence-after-conditioning question, not a
competing-structure question.

**Failure semantics** — `FAIL` when support for A→B materially disappears after conditioning on
a relevant alternative.

**Independence requirements** — Must not invent causal claims, and must not promote the
conditioning variable into a new relationship (common contract prohibition 1).

**Computational class** — Medium–High (conditional tests).

**Existing KRYLO substrate** — `causalvaliditygate.js` criterion 3 *(verified firsthand)* —
confounder-substitution test: is a confounder equally or more predictive than the candidate's
own upstream signal? Real, pure, correct semantic match. **False-equivalence catch (from the
common-contract audit, restated here):** the function takes raw `number[]` histories, not typed
`R_c`/evidence objects — it needs a translation adapter, not zero-change reuse.

**Adaptation required** — Interface adaptation (typed `R_c` + `ValidationContext.confounders` →
the array shapes `causalvaliditygate.js` currently expects) plus converting its current silent
skip into an explicit `N/A` applicability declaration.

**Explicit prohibitions** — Must not output a new causal edge, and must not claim the
alternative variable is the "true" cause — that is a causal interpretation, explicitly forbidden
to the validator (common contract §1).

---

## 7. Stability Operator

**Question** — Does the relationship persist independently across applicable regimes?

**Candidate input** — `R_c`

**Required ValidationContext** — Regime partitions (or the ability to derive them) and
per-regime observations of the relationship (`regimes`, `relationHistory`).

**Applicability predicate** — At least two applicable regimes with usable observations of the
relationship exist. Otherwise → `UNDETERMINED` or `N/A`.

**Mathematical test — the audit's identified semantic-extension case, confirmed and locked
here.** Cross-regime persistence: the relationship's relevant behavior (support, direction,
strength characteristics) remains coherent **within each applicable regime independently**. Mere
presence of the relation in ≥2 regimes is **insufficient** and must not be accepted as this
operator's test. Provisional formal shape: `Valid(R, G_i) ∀ G_i ∈ G_applicable` — the exact
statistical formulation is left to implementation; the semantic requirement (independent
per-regime validity, not pooled regime-count) is what's locked here.

**Output states** — `PASS | FAIL | UNDETERMINED | N/A`

**Evidence requirements** — References to the regime definitions and the per-regime relationship
observations.

**Conflict semantics** — None.

**Failure semantics** — `FAIL` when the relationship is materially present in one applicable
regime and absent or reversed in another.

**Independence requirements** — Must implement the semantic extension above; cannot be reduced
to a simple regime-count check.

**Computational class** — Medium–High (regime segmentation + per-regime evaluation).

**Existing KRYLO substrate** — `causalvaliditygate.js` criterion 2 *(verified firsthand)* —
current implementation only checks `distinctRegimes ≥ MIN_REGIMES` over the **pooled** sample —
exactly the insufficient check this operator's test explicitly rejects. This is a genuine
semantic gap in the existing substrate, not merely an interface gap — the per-regime replication
logic this operator requires does not exist anywhere found in this codebase to date.

**Adaptation required** — Semantic extension (new per-regime evaluation logic) plus the same
array/typed-object interface adaptation as Independence (§6), since both live in the same
source file today.

**Explicit prohibitions** — Must not invent regimes, and must not alter the candidate to force
cross-regime consistency where none exists.

---

## 8. Information Operator

**Question** — Does the relationship contribute information beyond the existing explanatory
structure?

**Candidate input** — `R_c`

**Required ValidationContext** — Baseline explanatory structure (existing relationships/paths
that already speak to B) and the information-theoretic or predictive measures needed for
comparison (`evidence`, `worldGraph`, `signalState`).

**Applicability predicate** — Sufficient structure and observations exist to compute a
before/after or conditional information comparison. Otherwise → `UNDETERMINED` or `N/A`.

**Mathematical test** — Evaluate whether including A→B reduces uncertainty about B (or improves
the predictive/structural account) beyond what the surrounding structure already provides. May
orchestrate existing prediction-error-change and normalized-evidence-entropy measures.

**Output states** — `PASS | FAIL | UNDETERMINED | N/A`

**Evidence requirements** — References to the baseline structure and the computed information
delta.

**Conflict semantics** — None.

**Failure semantics** — `FAIL` when the relationship is informationally redundant given the
existing structure.

**Independence requirements** — Must not treat informational redundancy as ontological
invalidity — a relationship can be real yet non-contributory. This keeps Information a
supporting-evidence operator (§9), not a constraint operator: failing it says nothing about
whether A→B exists, only whether it adds anything beyond what's already known.

**Computational class** — Medium–High (information/predictive comparison).

**Existing KRYLO substrate** — Two independent real candidates, both *verified firsthand*:
`causalvaliditygate.js` criterion 1 (prediction-error-increase test, same array-interface caveat
as §6/§7) and `relationdynamics.js normalizedEntropy()` (normalized entropy over the
supporting-evidence weight distribution — a genuinely different, complementary information
measure, operating closer to the `E` substrate directly rather than through raw arrays).

**Adaptation required** — Orchestration between the two existing sources, plus the same
array/typed-object interface adaptation needed for criterion 1.

**Explicit prohibitions** — Must not invent new information measures that require ontology
changes, and must not promote the edge on the basis of information gain alone — information
contribution is evidence for the profile, not grounds for strengthening `R_c` (common contract
prohibition 3 / Independent Evidence Rule).

---

## 9. Compositional-role classification (prerequisite for the Validation Profile contract)

Not a ranking, not an importance assignment — a formal distinction required before any
overall-status composition logic can be written, because the eight operators are not
semantically equivalent and a uniform composition rule would treat them as if they were.

**Class A — Contradiction-capable constraints.** Can materially undermine the candidate; genuine
falsification conditions exist.
- Temporal, Structural, Independence, Stability

**Class B — Supporting-evidence operators.** Increase evidentiary support but do not falsify the
relationship on their own; no `FAIL` state (Recurrence) or a `FAIL` that means "redundant," not
"wrong" (Lag, Information).
- Lag, Recurrence, Information

**Class C — Competing-structure operator.** Detects and surfaces competing explanations without
adjudicating them; `CONFLICT` is its own first-class outcome, not a degraded `FAIL`.
- Alternatives

**Why this matters for composition, deferred but flagged now:** `FAIL` on Recurrence (Class B)
must not carry the same compositional weight as `FAIL` on Temporal (Class A) — Recurrence's
`FAIL` doesn't even exist (§4). `CONFLICT` on Alternatives (Class C) must not automatically
collapse into `CONTRADICTED` — the entire purpose of `CONFLICT` is to preserve competing
structure without adjudicating it. A composition rule that ignores this classification would
silently convert eight heterogeneous tests into one hidden confidence score — exactly what the
common contract's "no scalar validity score" invariant exists to prevent.

**This document does not define the composition function.** That is
`ValidationProfile`'s job, in a future document, now unblocked by this classification.

---

## Summary — what these eight contracts lock

1. All eight operators receive only the five-field `R_c` plus their own named
   `ValidationContext` subset — no operator references a candidate field that doesn't exist on
   the locked shape.
2. Temporal's ordering test is materiality-based, not strict all-pairs. Recurrence has no `FAIL`
   state. Alternatives' `PASS` means "no material competitor found in the search space," not "no
   competitor exists."
3. Temporal ≠ Lag (ordering vs. distribution) and Structural ≠ Alternatives (local fit vs.
   competing explanation) are locked, independently testable distinctions — a candidate can pass
   one and fail/conflict the other without contradiction.
4. Of the eight: **six existing-substrate matches were independently re-verified this session**
   (Temporal, Structural's prerequisite, Independence, Stability, Information ×2); **two rely on
   fork-reported findings not independently reread** (Lag, Recurrence, Alternatives — flagged
   Verification: C per §29, not R).
5. Structural and Stability require genuine semantic extension, not interface plumbing — this is
   restated, not softened, from the common-contract audit.
6. Eight operators classify into three compositional roles (Class A/B/C) — required before the
   `ValidationProfile` composition function can be written without collapsing into a hidden
   scalar score.

```
SPEC-relationship-validator-operator-contract.md (common contract)
        |
        v
SPEC-relationship-validator-operators.md (this document — 8 specializations + role classes)
        |
        v
ValidationProfile contract (composition function, using §9's classes — not yet written)
        |
        v
Orchestration + adapter design (not yet written)
```
