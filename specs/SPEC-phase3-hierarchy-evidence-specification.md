# SPEC — Phase 3: Hierarchy Evidence Specification + Temporal/Constraint Characterization
WO-PHASE3-REGIME-VALIDATION-001

Date: 2026-08-19
Status: EVIDENCE SPECIFICATION — document only. No recognizer code written. No modification to the
33/33 mesh baseline. No StructureCandidate fields added. No visualization changes. No production
promotion claim. No KRYL-1133 work.
Method: every topology figure below was produced by executing the real modules in Node this
session against live `TYPED_EDGES` and `signalgenealogy`'s `SEED_GRAPH`. Nothing is estimated.

---

# PART 3A — HIERARCHY CHARACTERIZATION (real `TYPED_EDGES`, measured)

## 3A.1 — Topology (measured)

| Property | Measured value |
|---|---|
| Nodes | 28 |
| Edges | 24 |
| Acyclic | **true** (DFS three-color, zero back-edges) |
| Sources (in-degree 0) | 9 |
| Sinks (out-degree 0) | 13 |
| Interior nodes (both in and out) | 6 |
| Max depth (longest directed path) | **4** |
| Weakly connected components | **5** — sizes [10, 5, 5, 4, 4] |
| Out-degree distribution | [3,3,3,2,2,2,1,1,1,1,1,1,1,1,1, 0×13] |
| In-degree distribution | [3,2,2,2,1×15, 0×9] |

Depth per non-sink node (measured): `CIK:0001477333`(Cloudflare)=4, `CIK:0001086222`(Akamai)=4,
`DNS_AUTH_CDN`=3, `CIK:0001403161`(Visa)=2, `CIK:0001141391`(Mastercard)=2,
`CIK:0000798354`(Fiserv)=2, `WORLDPAY`=2, `CIK:0001597033`(Sabre)=2, `TWO_FACTOR_AUTH`=2,
`CARD_PAYMENT_RAILS`=1, `ECOMMERCE_PAYMENT_PROCESSING`=1, `ONLINE_ACCOUNT_AUTHORIZATION`=1,
`AIRLINE_RESERVATIONS`=1, `CLEARING_NETWORKS`=1, `EDI`=1.

## 3A.2 — Semantic structure (measured)

| Edge type | Count | Observed meaning (from `chokepointedges.js` source comments and usage) |
|---|---|---|
| `GATES` | 16 | Capability → what it gates. The dominant relation (67% of all edges) |
| `OPERATES` | 4 | Company → capability it operates (Visa/Mastercard → card rails; Fiserv/Worldpay → ecommerce processing) |
| `PROVIDES` | 2 | Company → capability it provides (Cloudflare/Akamai → DNS_AUTH_CDN) |
| `POWERS` | 1 | Company → capability it powers (Sabre → airline reservations) |
| `ENABLES` | 1 | Capability → capability (account auth → payment auth) |

Observed facts about the semantics:
- **Direction carries semantic force**, not merely representation. The file's own header states
  *"Direction: outbound = 'impacts / gates'"*, and `causalimpactmap.js` depends on this: its header
  warns that using the symmetric adjacency map instead *"would return bidirectional neighbors and
  invert the impact direction."*
- **Edge types encode two distinct levels**: `OPERATES`/`PROVIDES`/`POWERS` are all
  entity→capability (an organization supplying a capability); `GATES`/`ENABLES` are
  capability→capability or capability→transaction-type. No edge runs capability→entity.
- **Node classes are not interchangeable**: 7 nodes are companies (6 CIK-keyed, 1 name-keyed);
  21 are capability or transaction-type concepts.

## 3A.3 — Observable vs. unavailable hierarchy properties

**Observable in this substrate:**
- Directed depth / level assignment (max depth 4, per-node depths measured above)
- Source/sink partition (9 sources, 13 sinks)
- Branching structure (out-degree up to 3)
- Reachability / downstream blast radius (already computed live by `causalimpactmap.js`)
- Component partition (5 disjoint weak components)
- Typed level transitions (entity→capability vs capability→capability)

**Unavailable in this substrate:**
- Edge weights (measured absent)
- True observation timestamps (only registration wall-clock `ts`; `validFrom` defaults to it)
- Repeated observation over time (single curated seed; no recurrence to measure)
- Per-edge independent evidence (single uniform `source: 'DOMAIN_DEP_FACT'` on all 24)
- Any cycle-based structure (graph is acyclic by construction)

---

# PART 3B — NULL-MODEL SPECIFICATION (pre-declared, before any implementation)

## 3B.1 — The guardrail this null must satisfy

Acyclicity alone must not be able to pass the test. A uniformly random DAG is acyclic; a bare
chain is acyclic. The null must therefore be capable of producing acyclic graphs of the same size,
so that "is a DAG" carries no evidential weight on its own.

## 3B.2 — Declared null: degree-sequence-preserving directed rewiring

**Preserved (must be identical in null and observed):**
- Node count (28) and edge count (24)
- Each node's exact out-degree and in-degree
- Acyclicity — rewires that would create a cycle are rejected and retried

**Destroyed (what the null randomizes away):**
- Which specific source connects to which specific target
- The resulting depth distribution and layering
- Path concentration through particular interior nodes
- Component composition

**Why appropriate to this substrate:** preserving the exact degree sequence means the observed
degree pattern (out-degree up to 3, in-degree up to 3) cannot itself produce a pass; preserving
acyclicity means DAG-ness cannot produce a pass. Only the *arrangement* — the actual layering and
path structure — is left free to differ.

**Rejected alternative (recorded, not used):** Erdős–Rényi G(N,E) — it does not preserve degree
sequence and does not enforce acyclicity, so a hierarchy signal could be produced merely by the
observed graph being a DAG at all. That is the exact failure this specification exists to prevent.

**Implementation constraint for the eventual recognizer:** double-edge swap on directed edges
(`a→b`, `c→d` becomes `a→d`, `c→b`), rejecting any swap that creates a cycle or a duplicate edge,
with a bounded retry count. Seeded PRNG, matching the determinism property already established in
the mesh control.

---

# PART 3C — EVIDENCE BATTERY (pre-declared; no post-hoc tuning permitted)

## 3C.1 — Metric H1: Depth Concentration

Definition: the standard deviation of node depth (longest directed path from that node), across
all nodes. Observed value must be computed identically in observed and null graphs.

Rationale for choosing it: a genuine dependency hierarchy places nodes at distinct, reproducible
levels; a degree-preserving random rewiring of the same nodes tends to flatten or scatter depth.

Measured observed input: depth values [4,4,3,2,2,2,2,2,2,1,1,1,1,1,1] over non-sink nodes, 0 for
13 sinks.

## 3C.2 — Metric H2: Path Concentration

Definition: the fraction of all source→sink directed paths that pass through the single
highest-betweenness interior node.

Rationale: a real chokepoint topology concentrates flow through specific intermediaries
(`CARD_PAYMENT_RAILS`, `DNS_AUTH_CDN`, `AIRLINE_RESERVATIONS`); a degree-preserving rewiring
distributes it.

## 3C.3 — Significance criterion

For each metric independently: z ≥ 1.65 against the null distribution (one-tailed, ~p<0.05),
computed over **≥ 500** null samples with a seeded PRNG.

Both metrics are reported separately. **They are not summed, averaged, or combined into any
composite score** — consistent with §21 route-don't-aggregate and the no-StructureScore rule
already enforced in the mesh control.

## 3C.4 — Effect-size criterion

z alone is insufficient. Additionally required: the observed value must differ from the null mean
by **≥ 20%** of the null mean (|observed − nullMean| / nullMean ≥ 0.20). This blocks a
statistically significant but structurally trivial difference from passing.

## 3C.5 — Minimum-data condition

- Nodes ≥ 10 **and** edges ≥ 15 **and** max depth ≥ 3.
- The current substrate (28 nodes / 24 edges / depth 4) satisfies this.
- If a future input fails any part, the determination is INCONCLUSIVE — never FAIL, and never PASS.

## 3C.6 — PASS / FAIL / INCONCLUSIVE

```
INCONCLUSIVE  if minimum-data condition (3C.5) is not met
              OR the null sampler cannot produce ≥ 500 valid rewirings within its retry bound

PASS          if BOTH H1 and H2 independently meet BOTH
              the significance criterion (3C.3) AND the effect-size criterion (3C.4)

FAIL          otherwise
```

No threshold in this section may be adjusted after observing a recognizer result. Any change
requires a recorded, dated amendment to this document made before the affected run.

---

# PART 3D — STABILITY / PERTURBATION PROCEDURE (pre-declared)

**What is perturbed:** removal of a single randomly chosen edge (leave-one-out), repeated for
**24 iterations** — one per edge, so every edge is removed exactly once. Deterministic; no
sampling needed at this size.

**What is measured:** whether the full evidence battery (3C.6) still returns PASS with that edge
removed.

**Preservation criterion:** the hierarchy is considered stable if PASS is retained in **≥ 80%** of
leave-one-out iterations (≥ 20 of 24).

**Recorded regardless of outcome:** which specific edges, if any, flip the determination. An edge
whose removal alone destroys the finding is a documented single point of dependence, reported as
part of the result rather than smoothed over.

**Explicit limitation:** at 24 edges, leave-one-out removes 4.2% of the substrate per iteration —
a large perturbation. This procedure tests robustness to single-fact error, not robustness to
sampling variation, and the eventual result must be stated in those terms only.

---

# PART 3E — SMALL-SAMPLE BOUNDARY (binding on all downstream claims)

The substrate is 28 nodes / 24 edges, hand-curated, single-source, non-canonical.

**Conclusions that WOULD be supportable if the battery passes:**
- "This specific curated dependency graph exhibits depth and path concentration beyond a
  degree-preserving acyclic null, under the pre-declared criteria."
- "The hierarchy-recognition approach is empirically distinguishable from the mesh approach on
  real KRYLO data."

**Conclusions that would NOT be supportable regardless of outcome:**
- Any claim about KRYLO's relational data in general — this is one curated dataset, not a sample
  of anything.
- Any calibration of thresholds for future substrates. Thresholds validated at n=24 do not
  transfer.
- Any production-readiness claim, for the recognizer or the Structure Map.
- Any claim that hierarchy is KRYLO's only missing regime — only regimes with real test data have
  been examined.

---

# PART 3F — TEMPORAL / CONSTRAINT CHARACTERIZATION (`signalgenealogy`, investigation only)

Per the WO: characterization and a recommendation only. No temporal recognizer is defined here.

## 3F.1 — Measured properties

| Property | Measured value |
|---|---|
| Nodes | 13 |
| Edges | 12 |
| Acyclic | true |
| Max depth | **5** (deeper than `TYPED_EDGES`' 4, on a smaller graph) |
| Weakly connected components | **1** (fully connected, unlike `TYPED_EDGES`' 5) |
| Sources / sinks | 8 sources, **1 sink** (converges on `MARKET_PRICE`) |
| Edge types | `causes` 4, `precedes` 5, `correlates_with` 3 |
| Temporal lag (`lag_estimate_days`) | Present on 100%. Values: [0, 0, 1, 7, 14, 14, 21, 30, 30, 90, 180, 365] — spans 3 orders of magnitude |
| Confidence | Present on 100%. Range 0.25–0.90, well distributed |
| Negative/constraint edges | 1 of 12: `SOCIAL_MEDIA →correlates_with→ MARKET_PRICE`, flagged negative |
| `regime` field | Present in schema, **set on 0 of 12** edges |
| `nodes` collection | Returns an object with **0 keys** — the node registry is not populated by `buildSeedGraph()`; nodes exist only implicitly as edge endpoints. Unresolved discrepancy, flagged |

## 3F.2 — Recommendation

**DEFER.**

Grounds, stated as facts rather than judgment:
- Volume is 12 edges — below the minimum-data condition this document declares for hierarchy
  (3C.5: ≥15 edges), and any temporal contract would need its own, likely larger, threshold.
- The single negative/constraint edge (n=1) cannot support a constraint-regime evidence contract
  of any kind.
- `regime` is unset on every edge, so the field cannot be used to partition or validate anything.
- `lag_estimate_days` values are **hand-authored estimates**, not observed intervals — the file is
  described in its own source as a seed graph. A temporal contract built on estimated lag would be
  validating the authoring, not the world.
- The node registry discrepancy (0 keys) means the substrate is not fully characterized.

This is a DEFER, not an INSUFFICIENT: the substrate has real, distinguishing properties (typed,
weighted, lagged, directed, one negative edge) that no other KRYLO store has. It is not adequate
for a defensible temporal-regime contract at its current volume and provenance.

---

## Gate

Per WO-PHASE3-REGIME-VALIDATION-001, this document must be reviewed and accepted before any
hierarchy-recognition code is opened. The 33/33 mesh control remains untouched. Neither substrate
is promoted to production input by this document's existence.

---

# ADDENDUM A — Null-Model Validation Gate (executed 2026-08-19)

Executed by `diag_phase3_null_validation.mjs` against the real 28-node / 24-edge `TYPED_EDGES`
dataset. 500 valid null samples, seed=1, ~10× edge-count double-edge swaps per sample. No
recognizer code was written or modified; no new metrics introduced; only pre-registered H1 and H2.

## Observed values

| Statistic | Observed |
|---|---|
| Nodes / Edges / DAG | 28 / 24 / true |
| H1 depth concentration (std of node depth) | **1.2095** |
| H2 path concentration | **0.1905** |
| Level histogram (depth: node count) | `{0:13, 1:6, 2:6, 3:1, 4:2}` |

## CHECK 1 — Depth concentration

| | Value |
|---|---|
| Null mean (n=500) | 1.2805 |
| Null sd | 0.2428 |
| Observed | 1.2095 |
| z | **−0.292** |
| Effect size | 5.5% |

**Result: no separation.** The observed depth concentration sits inside the null distribution, and
slightly *below* its mean. The null does not need to be "destroyed" here — there is no depth
concentration signal in the observed graph to destroy.

## CHECK 2 — Path concentration

| | Value |
|---|---|
| Null mean (n=500) | 0.3287 |
| Null sd | 0.0873 |
| Observed | 0.1905 |
| z | **−1.583** |
| Effect size | 42.1% |

**Result: separation exists, but in the opposite direction.** The observed graph has *less* path
concentration than degree-preserving acyclic rewirings of itself. The pre-registered criterion
(§3C.3) is one-tailed, z ≥ +1.65 — a negative z cannot pass it, and the criterion may not be
changed post-hoc (§3C.6). Recorded as observed.

## CHECK 3 — Level assignment

Procedure used: longest-path rank, exactly as §3C.1 defines depth. Observed vs. first 5 nulls:

```
observed: {0:13, 1:6, 2:6, 3:1, 4:2}
null[0]:  {0:13, 1:7, 2:3, 3:4, 4:1}
null[1]:  {0:13, 1:7, 2:4, 3:1, 4:2, 5:1}
null[2]:  {0:13, 1:7, 2:3, 3:2, 4:2, 5:1}
null[3]:  {0:13, 1:7, 2:3, 3:3, 4:2}
null[4]:  {0:13, 1:8, 2:3, 3:2, 4:2}
```

**Result: nulls are not materially flatter.** They reach the same depth (4) or deeper (5), with
comparable level spread. The 13 sinks at depth 0 are fixed by degree-sequence preservation, as
designed.

## CHECK 4 — Constraint preservation

Across all 500 samples: out-degree sequence violations **0**; in-degree sequence violations **0**;
node-count violations **0**; edge-count violations **0**; DAG-property violations **0**.
0 samples failed to mix.

**Result: the null implementation is correct.** It preserves exactly what §3B.2 declared it would
preserve, on every sample, with no exceptions.

## Gate outcome

```
constraints preserved on every sample:                    true
>=500 valid null samples generated:                       true (500)
distributional separation on >=1 pre-registered metric:   false
```

### **OBSERVED STRUCTURE NOT SEPARATED — NULL MODEL VALID — PHASE 3 GATE FAILED**

Label discipline (corrected same session): an earlier draft of this addendum read "NULL INVALID."
That was wrong and is superseded by this line. Check 4 established the null as a mechanically
valid counterfactual — 0 constraint violations across 500 samples. The null is not the failure.
What failed is the *separation test*: the observed substrate is not distinguishable from its own
constrained counterfactual under the pre-registered metrics. Those are different claims and the
gate label must not conflate them.

## What this result actually establishes

The gate returns INVALID, but Check 4 shows the null model is mechanically correct — it preserves
degree sequence, node/edge count, and acyclicity perfectly, and mixes reliably. The failure is not
in the counterfactual.

The finding is about the substrate: **under the two pre-registered metrics, this 24-edge curated
dependency graph is not distinguishable from a degree-preserving acyclic rewiring of itself.** Its
depth profile is statistically ordinary (z = −0.29), and its path concentration is *lower* than
random rewirings produce (z = −1.58) — the observed graph spreads flow across its 5 disconnected
components rather than concentrating it, while rewirings can bridge those components and
concentrate flow through single intermediaries.

Per §3C.6 and the standing prohibition on post-hoc threshold changes, no adjustment to the metrics,
thresholds, or null is made here. Per §3E, no claim about KRYLO's relational data in general
follows from this — it is one curated dataset of 24 edges.

Phase 4 (hierarchy recognition implementation) is **not opened**. The mesh control (33/33) remains
untouched.

---

# ADDENDUM B — Secondary diagnostic and hypothesis-state separation (2026-08-19)

## B.1 — What the negative H2 result diagnoses

H2's z = −1.58 is not merely "not significant." The observed graph has *less* path concentration
than its own degree-preserving acyclic rewirings. Mechanism, from the measured topology: the
observed substrate has **5 disconnected weak components** (sizes 10/5/5/4/4), which distributes
source→sink paths across separate sub-graphs. Rewiring preserves degree sequence but not component
membership, so nulls routinely bridge those components and concentrate flow through single
intermediaries.

Consequence for interpretation: on this substrate, H2 is substantially measuring **fragmentation**,
not the hierarchical organization it was declared to measure. This is recorded as a property of
the substrate and a limitation of the metric *on this substrate* — not as grounds to replace the
metric, which §3C.6 forbids post-hoc.

Distinction this forces, recorded for downstream work: **connected structural organization** is not
the same as **mere co-existence of relationships in one dataset**. The current substrate may lack
the relational density to distinguish them.

## B.2 — Three hypothesis layers, kept separate

| # | Hypothesis | State after Phase 3 |
|---|---|---|
| 1 | **Product**: Formation should become the higher-order object KRYLO exposes, rather than domain scores | Unaffected by this result — still open |
| 2 | **Ontological**: Formation can be represented as a derived structural configuration of observations and relationships | Unaffected by this result — still open |
| 3 | **Empirical**: KRYLO's observed relational substrates exhibit statistically distinguishable organization under constrained null models | **Not demonstrated on this substrate.** No claim beyond this substrate follows (§3E) |

A negative result on layer 3 for one 24-edge curated dataset is not evidence against layers 1 or 2.

## B.3 — Explicitly not done (no rescue of the experiment)

None of the following were performed, and none may be performed retroactively to change this
result: metrics changed; null changed; thresholds loosened; graph curated until it passes; edges
added to manufacture hierarchy; Phase 4 opened; the result reinterpreted as "near significance."

## B.4 — Implication recorded for the ontology question

This result is grounds for *not* introducing additional classification layers (e.g. a Subcategory
tier between Domain and Formation) on taxonomic grounds alone. The sequence stays
`Observations → Relationships → measurable structure → Formation`, with any intermediate tier
justified by evidence that it is required to represent measured structure — not by the taxonomy
implying it should exist. Introducing a layer now would risk manufacturing apparent structure on a
substrate that has just failed to demonstrate it.

## B.5 — Standing state

Phase 3 gate: FAILED (separation), null: VALID. Phase 4: not opened. Mesh control (33/33):
untouched. Signal genealogy: DEFER (§3F.2), unchanged.

---

# ADDENDUM C — Candidate-explanation inquiry (2026-08-19)

Analytical work about *why the Phase 3 test may have been uninformative*. This is NOT an attempt to
reopen, repair, or re-run the gate. Phase 3 remains closed as a failed separation gate; the null
remains valid; Phase 4 remains unopened; no metric, threshold, or null was altered.

Output type: **a ranked set of candidate explanations with epistemic status attached — not a
determination.** Status vocabulary is deliberately conservative and does not claim causality.

## C.0 — Supporting measurements taken for this inquiry (new, non-gate)

Per-component structure of the observed substrate:

| Component | Nodes | Edges | Max depth | Interior (branch) nodes |
|---|---|---|---|---|
| comp0 | 10 | 10 | 4 | 4 |
| comp1 | 5 | 4 | 2 | 1 |
| comp2 | 5 | 4 | 2 | 1 |
| comp3 | 4 | 3 | 1 | **0** |
| comp4 | 4 | 3 | 1 | **0** |

Whole-graph: total source→sink paths = **21** (this is H2's denominator); interior nodes available
to concentrate flow = **6**; distinct depth levels occupied = 0,1,2,3,4.

Null power probe (300 samples, seed 42, same declared rewiring): H1 null range 0.818–2.281,
mean 1.277, sd 0.277. Null max-depth distribution:
`{2:1, 3:73, 4:135, 5:59, 6:27, 7:5}` against observed max-depth **4**.

## C.1 — Ranked candidate explanations

### Rank 1 — Scale (24 edges / 28 nodes / 21 total paths)
- **Why it could affect detection**: H2 is a ratio over 21 total source→sink paths. A single path
  re-routing shifts it by ~4.8%. H1 is a standard deviation over 28 depth values, 13 of which are
  structurally pinned at 0 (sinks). Both metrics have coarse granularity at this size.
- **Mechanism affected**: statistical power of both pre-registered metrics.
- **Consistency with the Phase 3 result**: high. Null sd for H1 was 0.243 against an observed
  spread the same order of magnitude — the null's own variability is comparable to any effect that
  could exist.
- **Distinguishing evidence needed**: the same metrics applied to a structurally similar but
  substantially larger substrate.
- **Status**: **Supported by current observations** (the path-count and pinned-sink measurements are
  direct), but **not distinguishable** from Rank 2 without a comparative substrate.

### Rank 2 — Fragmentation (5 components; 2 of them with zero interior nodes)
- **Why it could affect detection**: comp3 and comp4 have **0 interior nodes** — they are
  depth-1 stars that cannot express hierarchy or path concentration at all, yet contribute 8 nodes
  and 6 edges to whole-graph statistics. The declared null does not preserve component membership,
  so nulls can bridge components and concentrate flow in ways the observed graph structurally
  cannot.
- **Mechanism affected**: H2 specifically. This is the mechanism already recorded in Addendum B.1.
- **Consistency with the Phase 3 result**: high, and it explains the *sign* of the H2 result
  (observed 0.1905 < null 0.3287), which scale alone does not.
- **Distinguishing evidence needed**: running the declared battery on comp0 alone (10 nodes, 10
  edges, depth 4, 4 interior nodes) versus whole-graph. Not run here — it would constitute a
  post-hoc variant of the gate.
- **Status**: **Plausible mechanism, supported by current observations.** Uniquely explains the
  negative direction of H2.

### Rank 3 — Metric–substrate mismatch (declared metrics vs. what this graph expresses)
- **Why it could affect detection**: the null power probe shows nulls freely reach depth 4 (135/300)
  and beyond (91/300 reach 5+), against an observed max-depth of 4. Depth is therefore not a
  discriminating property under this null for this degree sequence — H1 had little power available
  regardless of what the substrate contained.
- **Mechanism affected**: H1 specifically.
- **Consistency with the Phase 3 result**: high (H1 z = −0.29, effect 5.5%).
- **Distinguishing evidence needed**: none available without changing the metric, which is
  prohibited post-hoc.
- **Status**: **Supported by current observations**, and note this is a property of the
  metric/null pairing rather than of the data — it would recur on any substrate with a similar
  degree sequence.

### Rank 4 — Curation (hand-authored, not evidence-grown)
- **Why it could affect detection**: a curated seed reflects the author's chosen granularity and
  stopping point rather than an observed process. It may be *too tidy* (uniform depth, no
  redundancy, no noise) to exhibit the statistical texture the metrics look for.
- **Mechanism affected**: unclear — could plausibly cut either direction (curation could equally
  produce *artificially strong* structure).
- **Consistency with the Phase 3 result**: neutral. No measurement here distinguishes it.
- **Distinguishing evidence needed**: an evidence-grown substrate of comparable size. None exists
  in KRYLO (Phase 2 inventory).
- **Status**: **Requires comparative substrate. Not currently implicated by any measurement.**

### Rank 5 — Uniform provenance (single `source: 'DOMAIN_DEP_FACT'` on all 24 edges)
- **Why it could affect detection**: neither H1 nor H2 reads the provenance field. No mechanism
  connects this property to either declared metric.
- **Mechanism affected**: none identified.
- **Status**: **Not currently implicated.** Recorded because it is a real substrate property, not
  because evidence points at it.

### Rank 6 — Temporal resolution (no true observation timestamps)
- **Why it could affect detection**: neither H1 nor H2 is a temporal metric. The Phase 3 battery
  never reads time.
- **Mechanism affected**: none, for this gate.
- **Status**: **Not currently implicated** for the Phase 3 result specifically. Remains relevant to
  any future temporal-regime work (§3F), which is separately DEFERRED.

## C.2 — What is NOT justified from this inquiry

- No claim that any candidate *caused* the failure. Ranks 1–3 are consistent with it; none is
  established.
- No requirement that a future substrate be connected, exceed N edges, or be evidence-grown.
  Turning an observation about this substrate into a requirement for all substrates is a separate
  hypothesis needing its own justification.
- No change to H1, H2, the null, the thresholds, or the gate outcome.
- No re-run of the gate on a subset (e.g. comp0 alone), which would be a post-hoc variant.
- No claim about KRYLO's relational data in general (§3E stands).

## C.3 — The one structural observation worth carrying forward

Two of five components (comp3, comp4) have **zero interior nodes** — they are structurally
incapable of expressing hierarchy or path concentration under any metric, while still contributing
29% of nodes and 25% of edges to the whole-graph statistics. Whether whole-graph statistics are the
right unit of analysis for a multi-component substrate is a live design question, recorded here and
deliberately not answered.
