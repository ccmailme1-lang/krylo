# WO-2004 — Identity Kernel: Field-Level Extraction

Status: Architecture Recon / NOT a build spec. No code changed to produce this document.

### Naming-Collision Note (SCI)

Two independent functions named `computeSCI` exist elsewhere in the repository (surfaced during
the WO-2005B audit, 002, and recorded here for cross-reference since WO-2004's
`computeStabilityScore` accepts a `getAnchorStrength` callback that WO-2005B supplies — the two
files are wired together, so this collision is reachable from an identity-kernel code path even
though identitykernel.js itself never calls either `computeSCI`):

| Alias (audit only) | Module / File | Input Shape | Layer Intent |
|---|---|---|---|
| SCI-CONTRADICTION | `structuralintegrity.js` | `(domainReads)` → vector slot | Integrity layer (part of β_c = ⟨SCI, CSAT, ISI, RCC, UE⟩) |
| SCI-CONFIRMATION | `structuralconfirmation.js` | `(evidenceGraph)` → scalar/flag | Confirmation engine (graph acceptance test) |

No import path links the two; they implement different formulas. These aliases are audit labels
only, not proposed code changes. Neither variant is mapped into the Lean Ontology's I(Σ) vector
by this document — that mapping is deferred to the architecture-decision phase.

### Audit Evidence Standard

Every statement in this audit is traceable to one of:

1. An inspected source file and line/function.
2. An inspected test and its asserted behavior.
3. An observed runtime/data artifact explicitly produced by the implementation.

Statements based solely on naming, comments, architectural intent, prior discussion, or expected
design are NOT evidence. Where evidence is insufficient:

- `NOT FOUND` — searched for and not present.
- `UNVERIFIED` — potentially present, but inspection is insufficient to establish it.
- `INFERRED` — architectural interpretation; excluded from Bin 1 (What Exists).

No test file exists for this module (`find . -iname "*identitykernel*"` returns only the source
file itself). No behavior below is asserted from a test — only from reading the implementation.

---

## 1. Extraction (literal code facts)

```
Repo path(s)          : src/engine/identitykernel.js (single file, 430 lines)
Primary entry points  : createEvidenceNode(), createCanonicalEvent()
Public exports        : computeVersionHash, createEvidenceNode, createCanonicalEvent,
                         shouldMerge, shouldSplit, addNode, mergeEvents, resolveIdentity,
                         attachDomainPressures, attachSCI
Internal helpers      : fnv32, computeContinuityScore, computeBranchingFactor,
                         findFragmentationPoints, computeStabilityScore, buildGraph,
                         jaccard, overlapCoefficient, computeStructuralSimilarity,
                         computeTemporalOverlap, hasStructuralNodes
Persistence adapter(s): NOT FOUND. Header comment (line 2) states "Pure functional module. Not
                         a service" — confirmed by code: every export returns a plain JS object
                         (Map/array/primitive fields), no read/write to any store, DB, or file.
External deps         : crypto.randomUUID() (Web Crypto global, not imported). No npm packages
                         imported. Two local imports: evidencetiers.js (getDescriptor,
                         EPISTEMIC_CLASS, CANONICAL_ROLE), identitylineage.js (dispatch, aliased
                         dispatchLineage).
```

### Constructor / Factory

| Function | Params | Return | Mutability | Notes |
|---|---|---|---|---|
| `createEvidenceNode` | `{id, seedId, evidenceType, content, metadata, predecessorIds, successorIds, timestamp}` (destructured, all optional except `evidenceType`) | plain object, "EvidenceNode" shape (see field inventory) | new object each call | Line 140. Pulls `epistemicClass`/`canonicalRole`/`persistence`/`decayModel`/`canCreate`/`canStrengthen`/`canSplit` from `getDescriptor(evidenceType)` (evidencetiers.js) at creation time; comment states these are "never recomputed" — code confirms nothing in this file recomputes them post-creation. |
| `createCanonicalEvent` | `{nodes=Map(), edges=[], rootSeeds=[], identityId, lineageRoot, timeWindow={start:now,end:null}, entityKey=null, getAnchorStrength}` | plain object, "CanonicalEvent" shape wrapping a `buildGraph()` output | new object each call | Line 173. Calls `buildGraph()` internally, then `dispatchLineage({type:'CREATED', ...})` as a side effect (the ONLY side effect anywhere in this module — a pub/sub broadcast, not a mutation of anything read back into this module). |
| `buildGraph` (internal, not exported) | `(nodes, edges, rootSeeds, getAnchorStrength)` | plain object: `{nodes, edges, rootSeeds, versionHash, continuityScore, branchingFactor, fragmentationPoints, stabilityScore, structuralBurdenScore:0}` | new object each call | Line 118. `structuralBurdenScore` is hardcoded to `0` with comment "filled by WO-2005B" — confirmed NOT filled anywhere in this file. Whether WO-2005B actually fills it is out of scope for this audit (WO-2005B gets its own A2 pass). |

### Canonical Field Inventory

Two distinct object shapes exist — there is no single unified "identity object." `EvidenceNode`
is a leaf; `CanonicalEvent` wraps a graph of EvidenceNodes.

**EvidenceNode** (from `createEvidenceNode`, lines 151-168):

| Field | Type | Nullable | Default | Comment |
|---|---|---|---|---|
| id | string (UUID) | N | `crypto.randomUUID()` | |
| seedId | string | N | falls back to `id` | Used later as the unit of "shared evidence" in structural similarity (line 250-251) |
| timestamp | Date | N | `new Date()` | |
| content | any | Y | `''` | Untyped in source |
| metadata | object | Y | `{}` | Untyped in source |
| predecessorIds | array | N | `[]` | Not read anywhere else in this file — no code path consumes it |
| successorIds | array | N | `[]` | Same — not read anywhere else in this file |
| evidenceType | string | N | (required, no default) | Key into `getDescriptor()` from evidencetiers.js |
| epistemicClass | enum (`EPISTEMIC_CLASS`) | N | `NARRATIVE` if descriptor missing | Sourced from evidencetiers.js at creation |
| canonicalRole | enum (`CANONICAL_ROLE`) | N | `STATE_TRANSITION` if descriptor missing | Sourced from evidencetiers.js |
| persistence | string | N | `'SHORT'` if descriptor missing | Sourced from evidencetiers.js |
| decayModel | string | N | `'EXPONENTIAL'` if descriptor missing | Sourced from evidencetiers.js |
| canCreate / canStrengthen / canSplit | boolean | N | `false` / `true` / `false` | Sourced from evidencetiers.js. **Not read anywhere in this file** — `canCreate`/`canStrengthen`/`canSplit` are set but no function in identitykernel.js branches on them. UNVERIFIED whether a consumer elsewhere reads them (no consumer of EvidenceNode fields found beyond edgar8kevidence.js, which only constructs — see Consumption Map). |

**CanonicalEvent** (from `createCanonicalEvent`, lines 187-200):

| Field | Type | Nullable | Default | Comment |
|---|---|---|---|---|
| identityId | string (UUID) | N | `crypto.randomUUID()` | This is the stable id KRYL-1092's merge/split logic keys off of |
| entityKey | string \| null | Y | `null` | Comment (line 180-183) states this is "a stable key for the entity this event is attributed to (e.g. a canonical entity id or a CIK)" and is enforced as an absolute gate in `shouldMerge`. Note this is **attribution to something external**, not the CanonicalEvent's own identity — see Reconciliation table, O row. |
| currentVersionHash | string (8-char hex) | N | `graph.versionHash` | FNV-1a-32 hash of sorted node ids + edge triples |
| evidenceGraph | object | N | `buildGraph()` output | See `buildGraph` fields above |
| timeWindow | `{start: Date, end: Date\|null}` | N (start) / Y (end) | `{start: new Date(), end: null}` | |
| structuralSignature | `{graphHash, temporalWaveform}` | N | derived | `temporalWaveform` = `fnv32(timeWindow.start.toISOString())` — a hash of the start timestamp only; `end` is not part of this signature |
| status | enum string | N | `'ACTIVE'` | Observed values in code: `'ACTIVE'`, `'FRAGMENTED'` (set in `resolveIdentity`, line 395) |
| lineageRoot | string \| null | Y | `rootSeeds[0] ?? null` | |
| metadata | object | N | `{}` | Comment: "domainPressures + SCI attached post-formation" — confirmed these two keys are the only ones ever written into `metadata`, via `attachDomainPressures`/`attachSCI`, and confirmed (Consumption Map, below) that neither of those two functions has a found caller outside this file. |

### Identity-Generation Rules

| Rule / Function | Input → Output | Collision Policy | Notes |
|---|---|---|---|
| `identityId` generation | none → `crypto.randomUUID()` | None — UUID collision not handled/checked | No custom hash-based identity key; identity is a random UUID, not derived from content |
| `computeVersionHash` (line 50) | `(nodes, edges)` → 8-char FNV-1a-32 hex string | N/A (this is a content hash, not an identity key) | Deterministic given the same node-id set and edge triples; used to detect *whether the graph changed*, not to *generate* identity |
| `shouldMerge` (line 283) | `(eventA, eventB, thresholds)` → boolean | Absolute entity gate first (`entityKey` mismatch → hard `false`, line 295), then structural-similarity floor, then temporal-overlap floor, then a stability non-regression check | This is the actual "two observations are the same real-world thing" decision function |
| `shouldSplit` (line 319) | `(event, thresholds)` → boolean | Stability-floor OR fragmentation-ratio trigger | |

### Temporal Fields & Versioning

| Field | Clock Source | Monotonic? | Comment |
|---|---|---|---|
| `EvidenceNode.timestamp` | `new Date()` (wall clock) at call site, or caller-supplied | NOT FOUND — no monotonic clock source imported anywhere in this file or its two direct imports | Wall-clock `Date`, not a logical/monotonic clock |
| `CanonicalEvent.timeWindow.{start,end}` | Same — `Date` objects, wall clock | Same | `end` defaults to `null` (open window) until a later `addNode`/`mergeEvents` call extends it |
| `currentVersionHash` / `structuralSignature` | Not a clock — content hash | N/A | |

No dedicated time/clock module (`clock.js` or equivalent) is imported by this file. This directly
contradicts an earlier unverified claim in this conversation that a `clock.js` monotonic wrapper
supplies KRYLO's Lean-Ontology T axis — see Reconciliation table, T row.

### Source / Evidence Handling

| Mechanism | Where stored? | Immutable? | Comment |
|---|---|---|---|
| `evidenceType` → tier descriptor | Looked up from evidencetiers.js at `createEvidenceNode` time, copied onto the node (`epistemicClass`, `canonicalRole`, `persistence`, `decayModel`, `canCreate/Strengthen/Split`) | Yes — comment states "set at ingestion, never recomputed"; confirmed no function in this file reassigns these fields after creation | This is the ontology's SO-adjacent (source-class, not source-identity) data |
| `dispatchLineage` (identitylineage.js) | Broadcast to an in-memory subscriber set + a 500-entry ring buffer (`history`) inside identitylineage.js itself, not inside identitykernel.js | The event bus is documented (identitylineage.js header) as read-only telemetry, explicitly forbidden from being imported by scoring/routing modules | This is an audit trail of *identity-kernel state transitions* (CREATED/NODE_ADDED/MERGED/FRAGMENTED), not evidence provenance in the Lean-Ontology πΣ sense — it records what the kernel did, not which raw Event/Relationship supports which structural claim |
| Raw-evidence-to-node link | `EvidenceNode.id`/`seedId` are the only identifiers carried; nothing in this file links a node back to an original external Event/Relationship object beyond these two string fields | N/A | UNVERIFIED whether `id`/`seedId` are populated with values traceable to an upstream `E`/`R` at the call site — that depends on the caller (edgar8kevidence.js), which is outside this file's scope but noted under Consumption Map |

There is no field in either object shape named `source`, `provenance`, or similar. The closest
concept is `evidenceType` (a string key), which is a *class* label, not a *source* reference.

### Mutation Behaviour

| Operation | Allowed (Y/N) | Guard / Version check | Persistence path |
|---|---|---|---|
| `addNode` (line 329) | Y — returns a new object, does not mutate the input `event` (spreads `...event`) | None beyond recomputing the graph from scratch | None — returns in-memory object to caller |
| `mergeEvents` (line 354) | Y — same immutable-return pattern | Caller must have already passed `shouldMerge` — this function does not re-check | None |
| `resolveIdentity` (line 384) | Y — runs split-then-merge over an array, returns `{events, merges, splits}` | O(n²) pairwise merge loop, comment notes "acceptable at current scale" | None |
| `attachDomainPressures` / `attachSCI` (lines 423, 427) | Y — same immutable-return pattern, only touches `metadata` | None | None |

Every mutation in this file is a pure function returning a new object; nothing is mutated in
place, and nothing is written to any store. "Persistence" as asked by the template is uniformly
`NOT FOUND` — this module has none. Whatever holds these objects across time (a database, an
in-memory store, a React state container) lives outside this file, and I did not find it in this
pass — that would require tracing the caller (edgar8kevidence.js) forward, which is out of scope
for a WO-2004-file-only audit.

### Consumption Map

Static-import grep (`from ['"].*identitykernel`) across `src/` found exactly two importers:

| File / Module | Function(s) imported | What does it read? | Mutable? |
|---|---|---|---|
| `src/engine/steeengine.js` | `computeVersionHash` only | Not traced further in this pass (out of scope) | N/A |
| `src/engine/connectors/edgar8kevidence.js` | `createEvidenceNode`, `createCanonicalEvent` only | Constructs nodes/events from EDGAR 8-K data; its own comment (line 75-76) states explicitly it does **not** call `resolveIdentity()` | N/A |

**Finding, stated plainly:** `shouldMerge`, `shouldSplit`, `addNode`, `mergeEvents`,
`resolveIdentity`, `attachDomainPressures`, and `attachSCI` — 7 of the module's 10 exports — have
**no confirmed caller anywhere in `src/`** by static-import search. This includes the two
functions (`attachDomainPressures`, `attachSCI`) that the module's own header comment describes
as the intended hookup to `domaingravity.js` and `structuralconfirmation.js`
("→ domaingravity.js (overlay) → structuralconfirmation.js (SCI)"). I checked `domaingravity.js`
directly for calls to either function: none found.

Per the Audit Evidence Standard: the documented pipeline (identity → domain-pressure overlay →
SCI attachment) is `NOT FOUND` as a wired, running path. Whether it exists via some indirect
mechanism I didn't search for (event bus, dynamic import, string-based dispatch) is `UNVERIFIED`,
not ruled out — but not established either.

---

## 2. Reconciliation (comparison against Lean Ontology rc3)

| Lean primitive | What we must establish | Evidence in WO-2004 | Match | Mismatch / Gap |
|---|---|---|---|---|
| **O** — stable identity-bearing object | Does WO-2004 establish a stable identity-bearing *real-world* object? | `CanonicalEvent.identityId` is a random UUID assigned at creation, not derived from any stable real-world key. The one field that points at a real-world referent — `entityKey` ("a canonical entity id or a CIK") — is optional (`null` by default), lives *inside* a CanonicalEvent rather than being its own addressable object, and per KRYLCF/edgar8kevidence usage represents attribution of an *event* to an external entity, not the entity's own identity record. | **partial** | WO-2004's own `identityId` identifies an *EvidenceGraph/event*, which is closer to the Lean **E** primitive's occurrence-identity than to **O** (a persistent object like a company or person). The actual "stable object" — the entity `entityKey` refers to — is not modeled here at all; it's an opaque string with no lifecycle, no fields, no resolution logic in this file. |
| **E** — occurrence with a time window | Does it represent/retain occurrences, with a bounded time window? | `CanonicalEvent.timeWindow = {start, end}` — Y, this is a genuine bounded time window, with real merge/split logic gated on temporal overlap (`computeTemporalOverlap`, line 262). | **strong** | This is the primitive WO-2004 actually implements best. The naming ("CanonicalEvent") is accurate to the Lean **E** role, not to **O**. |
| **R** — directed relationship / predicate | Does it represent directed semantic relationships between objects, or merely internal graph edges? | `edges` are `{from, to, type}` triples (inferred from `computeVersionHash`'s `${e.from}~${e.type}~${e.to}` join, line 52, and `buildGraph`'s adjacency construction, line 63-65) connecting **EvidenceNode ids to EvidenceNode ids** — i.e., evidence-to-evidence graph structure internal to one CanonicalEvent's proof graph. | **partial** | These edges are NOT relationships between real-world Objects (company→company, person→org). They are internal provenance/continuity edges between pieces of evidence supporting one event's identity. This is a materially different thing from the Lean **R** primitive, which is meant to be a first-class directed predicate between Os. Calling WO-2004's edges "R" would be a category error, not a naming quibble. |
| **ST** — state | Is state represented, and with what semantics? | `CanonicalEvent.status` — confirmed values: `'ACTIVE'`, `'FRAGMENTED'`. No `'EXPIRED'`, `'CONTRADICTED'`, or other states found anywhere in this file. | **partial** | Two-value state machine, not the fuller set an earlier (unverified) claim in this conversation implied. |
| **T** — time | What temporal semantics actually exist? | Plain `Date` objects (wall clock), no monotonic clock source. | **partial** | Real, but not monotonic — two events created in the same millisecond, or a system clock adjustment, are not guarded against. No `[t1,t2]` window-algebra beyond the overlap calculation already covered under **E**. |
| **SO** — source | Is source/provenance actually attached to the relevant identity/observation? | `evidenceType` → tier descriptor (`epistemicClass` etc.) is attached per-node. No field named `source`, no link to a specific origin system/connector/URL beyond whatever the caller chooses to put in the untyped `content`/`metadata` fields. | **partial** | What exists is an evidence-*class* label (STRUCTURAL/OPERATIONAL/FINANCIAL/NARRATIVE/SPECULATIVE), which answers "how trustworthy a category is this evidence type," not "where specifically did this observation come from." Closer to the Lean Ontology's evidence-tier concept than to **SO**. |

---

## 3. Gap Register

Requirements the Lean Ontology spec (rc3) states, that this file does **not** demonstrate:

1. **No modeled O (persistent real-world object).** WO-2004 identifies *events* (occurrences),
   not the *objects* those events happen to. `entityKey` is a bare string reference to something
   that must live elsewhere — that "elsewhere" was not found in this file and is not yet audited.
2. **No monotonic time source.** Wall-clock `Date` only.
3. **No first-class R between Objects.** The only edges present are evidence-internal, not
   inter-object relationships.
4. **No source/observer record distinct from evidence-tier class.** `SO` as "where the
   observation came from" is not represented; only "what kind of evidence class it is" is.
5. **The documented post-formation attachment pipeline (`attachDomainPressures`, `attachSCI`) has
   no confirmed live caller.** This is a wiring gap in the *existing* documented architecture,
   independent of the Lean Ontology question — noted because it affects how much weight the
   "→ domaingravity.js → structuralconfirmation.js" pipeline claim (module header, line 6-7)
   should carry in later audits (A2 especially).

## What this audit does NOT establish

Per the evidence standard: this file alone cannot answer whether KRYLO *elsewhere* has a real O
substrate (an entity/object registry that `entityKey` resolves against). That would require a
separate, explicitly scoped audit of whatever "canonical entity" mechanism exists in the
codebase (KRYLO Org Chart memory references an "Entity Identity Layer — KRYL-1007"; unopened in
this pass). Recording that as `UNVERIFIED`, not `NOT FOUND` — it wasn't searched for here.

---

**Conclusion of A1:** WO-2004 is real, running (via edgar8kevidence.js), and rigorously built —
but it is best characterized as **a Lean-Ontology E (occurrence) identity/merge-split kernel**,
not an O (object) kernel. The name "Identity Kernel" and the framing in this conversation's
earlier reconciliation table ("O stable identity ← WO-2004") does not hold up against the field-
level evidence. This is exactly the "CanonicalEvent exists, therefore E exists — but that doesn't
mean O exists" distinction flagged before this audit started, and the audit confirms it.

Next: A2 (WO-2005B / Structural Confirmation Engine), informed by this finding — specifically,
whether WO-2005B operates on WO-2004's E-shaped output, and whether either file's output actually
satisfies Σ = ⟨GΣ, propsΣ, πΣ⟩ or only feeds into something that could become Σ.
