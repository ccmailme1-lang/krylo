# WO-2005B — Structural Confirmation Engine: Field-Level Extraction

Status: Architecture Recon / NOT a build spec. No code changed to produce this document.
Evidence Standard identical to 001 (NOT FOUND / UNVERIFIED / INFERRED — see that file for the
full statement, not repeated here).

### ⚠ Naming-Collision Note (SCI)

Two independent functions named `computeSCI` exist in the repository. They accept different
input structures and implement different metrics. No cross-import between the implementations
was identified. These functions must remain semantically distinct during Lean-Ontology
reconciliation. No equivalence, substitution, or dependency between them is established by the
shared name.

| Alias (audit only) | Module / File | Input Shape | Layer Intent |
|---|---|---|---|
| SCI-CONTRADICTION | `structuralintegrity.js` | `(domainReads)` → vector slot | Integrity layer (part of β_c = ⟨SCI, CSAT, ISI, RCC, UE⟩) |
| SCI-CONFIRMATION | `structuralconfirmation.js:68` | `(evidenceGraph)` → `{score, groundedness, ...}` | Confirmation engine (evidence-type scoring, this file's export) |

These aliases are audit labels only, not proposed code changes. Any statement below referring to
"SCI" without qualification means SCI-CONFIRMATION (this file's export) — WO-2005B never
references SCI-CONTRADICTION at all.

---

## 1. Module Inventory

```
Repo path(s)        : src/engine/structuralconfirmation.js (245 lines, single file)
Entry point         : computeSCI (only export with confirmed live callers — see §10)
Runtime invoked by  : whytrace.js, structuralfingerprint.js, steeengine.js (all import
                      computeSCI only); edgar8kevidence.js (imports getAnchorStrength only)
External deps       : evidencetiers.js (getDescriptor, EPISTEMIC_CLASS, listByClass),
                      pathstore.js (getLRPriorByKey). No npm packages. No import from
                      structuralintegrity.js, identitylineage.js, or any provenance module.
Persistence sink    : NOT FOUND. Every export is a pure function returning a plain object or
                      primitive. pathstore.js's getLRPriorByKey is called (read), never written
                      to, from this file.
```

## 2. Declared Inputs (as-coded)

| Param / Stream | Type Signature | Source module | Immutable? | Notes |
|---|---|---|---|---|
| `computeSCI(evidenceGraph)` | reads only `evidenceGraph.nodes` (a `Map`) | Caller-supplied | Not mutated | Does **not** read `.edges`, `.rootSeeds`, `.continuityScore`, `.branchingFactor`, `.fragmentationPoints`, or `.stabilityScore` — i.e. none of WO-2004 `buildGraph()`'s topology fields are consumed. Confirmed by `steeengine.js:47`, which calls `computeSCI({ nodes })` directly — a bare object with only a `nodes` key, not a real WO-2004 CanonicalEvent's evidenceGraph. The function's real minimum required input is `{nodes: Map}`, nothing more. |
| `computeStructuralMomentum(eventHistory, windowMs=30d)` | `eventHistory`: array of CanonicalEvent-shaped objects (reads `.timeWindow.start`, `.evidenceGraph` per element) | Caller-supplied | Not mutated | Only function in this file that applies a time-window filter (`cutoff = now - windowMs`) |
| `computeStructuralDivergence(evidenceGraph)` | same node-only read as `computeSCI` | Caller-supplied | Not mutated | |
| `computeSPS({evidenceGraph, convergenceBand, domain})` | `evidenceGraph.nodes`, plus two plain strings | Caller-supplied + `pathstore.js` | Not mutated | Delegates to `getLRPriorByKey` (external lookup, WO-1869) |
| `computeStructuralSuite(event, {convergenceBand, domain, eventHistory})` | `event.evidenceGraph` | Caller-supplied | Not mutated | Aggregator — calls the four functions above internally |

None of these inputs are raw connector payloads. All are CanonicalEvent / EvidenceGraph shaped
(or a subset of that shape), confirming this module sits downstream of WO-2004 as its header
comment states ("Consumes: WO-2004 EvidenceGraph").

## 3. Internal Processing Pipeline (computeSCI — the only live-called function)

| Step # | Function / Class | Purpose | Reads | Writes | Notes |
|---|---|---|---|---|---|
| 1 | `computeSCI` line 68 | Guard | `evidenceGraph.nodes.size` | — | Returns `null` if no nodes (§22-style withhold, not a fabricated 0) |
| 2 | line 74 | Build `coveredTypes` | distinct `n.evidenceType` across all nodes | — | A `Set`, not a graph |
| 3 | line 78-82 | Build `verifiedTypes` | `n.metadata?.entityVerified === true`, grouped by type | — | |
| 4 | lines 93-115 | Per-type loop | `getDescriptor(type)` (evidencetiers.js), `CALIBRATION_PRIORS[type]` (this file's own constant) | accumulates `raw`, `classCount`, `discountedTypes`, `perTypeContribution` | This is a loop over **distinct evidence types present**, not over individual nodes/edges — a node-count of 50 with 3 distinct types produces the same iteration count as 3 nodes with 3 distinct types |
| 5 | line 117 | Normalize | `raw`, module-level constant `MAX_POSSIBLE` (computed once at module load from `CALIBRATION_PRIORS`) | `score` (0-10, one decimal) | |
| 6 | line 119 | Groundedness | `coveredTypes.size` | `groundedness` (0-1, saturates at 8 distinct types) | Independent formula from `score` — not derived from it |
| 7 | lines 121-128 | Return | — | flat object (see §4) | |

## 4. Output Object(s)

**`computeSCI` return shape** (the only output shape with confirmed live consumers):

| Field | Type | Nullable | Comment |
|---|---|---|---|
| score | number, 0-10, 1 decimal | Y (whole return is `null` if no nodes) | |
| groundedness | number, 0-1, 2 decimals | same | Independent metric, not `score` rescaled |
| coveredTypes | `string[]` | N | Distinct evidenceType values seen |
| classCoverage | `{[epistemicClass]: count}` | N | Count of **distinct types**, not node count, per class |
| discountedTypes | `string[]` | N | entity-bound types with no verified node |
| perTypeContribution | `{[type]: {contribution, tierWeight, weighted, epistemicClass, discounted}}` | N | Per-**type** breakdown, not per-node/per-evidence-id breakdown |

No field named `nodes`, `edges`, `vertices`, `V`, `E`, or anything graph-shaped appears anywhere
in this object. **This is a flat metrics/properties bag, not a graph.**

`computeStructuralDivergence` output: `{divergence, direction, structuralBurden, narrativeBurden}`
— same shape class, flat.

`computeStructuralMomentum` output: a single number (or `null`).

`computeSPS` output: whatever `getLRPriorByKey` returns, or `null` if N<5 — not independently
inspected in this pass (pathstore.js is a separate WO-1869 module, out of scope here).

`computeStructuralSuite` output: `{sci, divergence, sps, momentum}` — a flat container object
holding the four outputs above side by side. Not a graph. Not a single unified structure —
four independently-computed sibling values.

## 5. Graph Construction Audit

| Aspect | Code detail | Found? | Location / line# |
|---|---|---|---|
| Builds vertex set VΣ | Reads `evidenceGraph.nodes` but never re-emits a vertex set of its own — no output field represents "the vertices of this structure" | **N** | — |
| Builds edge set EΣ | `.edges` is never even read from the input, let alone constructed or emitted | **N** | — |
| Predicate / labels | No predicate/label concept anywhere in this file | **N** | — |
| Snapshot window W | `computeStructuralMomentum` only: `windowMs`/`cutoff` filter on `eventHistory` | **Partial** (1 of 5 exports) | line 134-142 |
| Filters ℒ(x,t)=⊤ | No observation-truth-value check anywhere; every node in the input Map is used unconditionally | **N** | — |

**This file does not construct a graph at any point.** It consumes a graph's *node set* (never its
edges) and reduces it to scalar/categorical summary statistics.

## 6. Provenance & Traceability

| Mechanism | Evidence source | How linked? | Meets πΣ invariant? |
|---|---|---|---|
| `perTypeContribution` | `evidenceType` (a class/category string) | Score components keyed by **type**, not by individual evidence/node id | **NO** — rc3's invariant requires `∃y∈E∪R` per vertex/edge/property; this file's finest traceability grain is "a type of evidence was present," which cannot identify which specific Event or Relationship instance backs a given score component |
| Node → contribution | Implicit — all nodes of a type feed one shared `perTypeContribution[type]` entry | Many-to-one collapse (many nodes → one type-level number), not the many-to-many element-level relation rc3 defines for πΣ | **NO** |
| Any πΣ-typed object (`⊆ (E∪R) × (VΣ∪EΣ∪propsΣ)`) | Not constructed anywhere in this file | — | **NOT FOUND** |

No structure in this file could pass the rc3 traceability test as literally written, because
there is no `VΣ`/`EΣ` to test membership against in the first place, and even the flat `propsΣ`-
like fields (`score`, `groundedness`) are traceable only to a coarse type-set, not to specific
evidence instances.

## 7. Integrity Metrics

| Metric fed into structure | Calc line# | Alias (audit) | Consumed from structuralintegrity.js? |
|---|---|---|---|
| score, groundedness | line 68-129, this file | SCI-CONFIRMATION — see Naming-Collision Note above; NOT to be confused with SCI-CONTRADICTION | **NO** — self-contained, does not import structuralintegrity.js |
| CSAT | NOT FOUND in this file | — | N/A |
| ISI | NOT FOUND in this file | — | N/A |
| RCC | NOT FOUND in this file | — | N/A |
| UE | NOT FOUND in this file | — | N/A |

Direct answer to the question "are SCI/CSAT/ISI/RCC/UE properties of Σ, measurements about Σ, or
an independent layer": **CSAT/ISI/RCC/UE do not appear in WO-2005B at all** — they live
exclusively in the separate `structuralintegrity.js` file (audited informally earlier this
session, not re-verified line-by-line here), which this file never imports. WO-2005B's own SCI
(Confirmation) is a self-contained scalar computed from a node-type histogram — not a property
read off of any Σ object, because no Σ object exists in this file to read a property from.

## 8. Temporal Handling

| Field / variable | Purpose | Uses window? | UTC? | Notes |
|---|---|---|---|---|
| `windowMs` / `cutoff` (computeStructuralMomentum only) | Rolling lookback filter on `eventHistory` | Y | UNVERIFIED — uses `Date.now()`/`.getTime()`, JS runtime-local semantics, no explicit UTC handling found | Only genuine "W"-like construct in this file |
| Everything else in this file | No time parameter at all | N | N/A | `computeSCI`, `computeStructuralDivergence`, `computeSPS` are timeless — they score whatever node set they're handed regardless of when those nodes were observed |

## 9. Persistence / Caching

| Store/Cache | Object saved | Mutability | Upsert/Insert | TTL |
|---|---|---|---|---|
| NOT FOUND | — | — | — | — |

`MAX_POSSIBLE` (line 49) is a module-level constant computed once at import time from
`CALIBRATION_PRIORS` — this is in-memory computation caching, not persistence, and holds no
per-event data.

## 10. Down-Stream Consumers

| Module | Import path | Calls | Purpose (as stated in that file's own comments, not inferred) |
|---|---|---|---|
| `whytrace.js` | `./structuralconfirmation.js` | `computeSCI` only | Line 78: `const sci = computeSCI(event.evidenceGraph)`. That file's own comment (line 10-12) states this is "a pure read... recomputes a real inference-derived result for explanation purposes" |
| `structuralfingerprint.js` | `./structuralconfirmation.js` | `computeSCI` only | Line 84, comment at line 9 notes it's "an inference-derived value... rather than purely retrieving stored state" |
| `steeengine.js` | `./structuralconfirmation.js` | `computeSCI` only | Called with a bare `{nodes}` object, not a full WO-2004 graph — confirms `computeSCI`'s real contract is looser than "takes a WO-2004 EvidenceGraph" |
| `connectors/edgar8kevidence.js` | `../structuralconfirmation.js` | `getAnchorStrength` only, passed into WO-2004's `createCanonicalEvent({getAnchorStrength})` | This is the one confirmed live cross-file wiring between WO-2004 and WO-2005B — closes a gap left open (marked UNVERIFIED) in audit 001 |

**`computeStructuralSuite`, `computeStructuralMomentum`, `computeStructuralDivergence`,
`computeSPS`, `makeStructuralKey`, `getCalibration` — 6 of 8 exports — have no confirmed caller
anywhere in `src/`** by static-import search. In particular, `computeStructuralSuite` — the
function that would most plausibly be "the module's real output" (it bundles all four metrics
together) — is dead code by this measure. Only the narrower `computeSCI` and `getAnchorStrength`
are actually wired into the running system.

## 11. Reconciliation Table (Lean Ontology vs WO-2005B)

| Lean requirement | Evidence in WO-2005B | Match | Mismatch / Gap |
|---|---|---|---|
| Σ structure object exists | `computeStructuralSuite` returns `{sci, divergence, sps, momentum}` — four sibling scalars/objects, not a `⟨GΣ, propsΣ, πΣ⟩` container | **NOT FOUND** | Nothing in this file returns anything with a graph component. Even the "richest" output (`computeStructuralSuite`) is unconsumed dead code (§10). |
| — VΣ present | No vertex set constructed or emitted anywhere | **NOT FOUND** | |
| — EΣ present | `.edges` never read, never emitted | **NOT FOUND** | |
| — propsΣ present | Loosely yes — `score`, `groundedness`, `divergence`, `momentum`, `sps` are property-shaped values | **partial** | These are properties *about* the input node set, not properties bound to a `GΣ` that doesn't exist |
| πΣ traceability relation | `perTypeContribution` keyed by evidence type | **partial, fails the invariant** | Traceable to a type-class, not to a specific `y ∈ E∪R` instance per the rc3 formula |
| — every vertex has evidence | N/A — no VΣ exists to test | **N/A** | |
| — every edge has evidence | N/A — no EΣ exists to test | **N/A** | |
| — every property has evidence | `score`/`groundedness` trace back to `coveredTypes`/`perTypeContribution`, i.e. to evidence *types* present, in aggregate | **partial** | Coarser than rc3 requires; cannot answer "which specific piece of evidence" for a given property value |
| SCI vector injected | WO-2005B's SCI is unrelated to `structuralintegrity.js`'s vector (β_c = SCI, CSAT, ISI, RCC, UE) — see naming-collision note at top | **NOT FOUND** (as the vector) | The "SCI" in this file is a single scalar with two sub-fields (score, groundedness), not the 5-component integrity vector referenced earlier this session |
| Temporal window W honoured | Only in `computeStructuralMomentum`, which is itself only reachable through `computeStructuralSuite` — unconsumed | **partial, and on a dead path** | The one live-called function (`computeSCI`) is timeless |
| Uses CanonicalEvent (E) ids | `computeSCI` reads `evidenceGraph.nodes` values' fields (`evidenceType`, `metadata`), never reads or emits `identityId`/any id | **partial** | Operates on E's *contents*, doesn't reference E's own identity |
| Creates/uses Relationships (R) | `.edges` never read | **NOT FOUND** | |

---

## Conclusion of A2

Directly answering the question A1 set up: **WO-2005B does not consume the E-shaped
CanonicalEvent substrate and construct something that satisfies Σ. It calculates structural
metrics from event data** — specifically, from the node-type histogram of one CanonicalEvent's
evidence graph, completely independent of that graph's edge structure. The "Structural" in
"Structural Confirmation Engine" refers to the STRUCTURAL *epistemic tier* (non-fabricable
evidence, per evidencetiers.js's `EPISTEMIC_CLASS.STRUCTURAL`), not to graph structure — a
terminology overlap that is easy to misread as "this module operates on GΣ."

Combined with A1's finding, the emerging picture is:

```
E  ← WO-2004 (strong)
O  ← NOT FOUND anywhere audited so far
R  ← NOT FOUND anywhere audited so far (WO-2004's edges are evidence-internal;
                                          WO-2005B doesn't read edges at all)
Σ  ← NOT FOUND — WO-2005B produces flat metrics, not a graph+props+provenance structure
πΣ ← NOT FOUND as a formal relation; a coarser type-level traceability exists inside computeSCI,
      insufficient for the rc3 invariant as literally stated
```

This is a materially different conclusion than "KRYLO already has most of the Lean Ontology under
different names." What KRYLO has is a well-built, real, live **evidence-quality scoring system**
(WO-2004 identity/merge-split + WO-2005B confirmation scoring) that operates adjacent to where the
Lean Ontology's G_W/σ/Σ/πΣ spine would sit, consuming similar raw material (evidence graphs,
CanonicalEvents), but it does not currently construct the graph-shaped, traceable Σ object the
spec defines. Building that would be new work, not a renaming exercise — which is exactly the
kind of fact this reconciliation was supposed to surface before any GO decision.
