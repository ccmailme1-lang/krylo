# SPEC — Phase 2: Real Relationship Substrate & Regime Inventory (WO-PHASE2-SUBSTRATE-001)

Date: 2026-08-19
Status: FACTUAL INVENTORY — Deliverables A and B. No code written. No metrics proposed. No
thresholds. No Structure Map changes. No solution design.
Method: every claim below was measured against live code or produced by executing the real modules
in Node this session. Where something was NOT verified, it says so explicitly.
Scope boundary: this inventory covers relational stores reachable under `src/`. It does not cover
external databases, the Render API backend, or any store that exists only in production.

---

## DELIVERABLE A — Relationship Substrate Inventory

### A.1 — Source: `entitytopologyregistry.js` → `TYPED_EDGES` (v2, typed/directed)

| Field | Observed Fact |
|---|---|
| Source | `src/engine/entitytopologyregistry.js`, exported `TYPED_EDGES` array |
| Population mechanism | `registerTypedEdge()`. Sole live caller: `chokepointedges.js`'s `registerChokepointEdges()`, invoked from `app.jsx:908` on mount (`useEffect`, runs once) |
| Edge count (measured) | **24** (executed live this session) |
| Relationship types (measured) | `OPERATES`, `GATES`, `PROVIDES`, `POWERS`, `ENABLES` — 5 types |
| Direction | Directed (`from` → `to`). File's own comment: *"directed outbound dependency facts"* |
| Node count (measured) | 28 distinct nodes |
| Node semantics | Mixed: 6 companies keyed by real SEC CIK (`CIK:0001403161` = Visa, etc.), 1 company name-keyed (`WORLDPAY` — deliberately, no clean CIK, per file comment), remainder are capability/transaction-type concepts (`CARD_PAYMENT_RAILS`, `POS_TRANSACTIONS`, `DNS_AUTH_CDN`, …) |
| Weights | **Absent** (measured: no `weight` field on any edge) |
| Time | `ts` (registration wall-clock, NOT observation time), `validFrom` (defaults to `ts`), `validTo` (defaults `null`). Measured: `validFrom`/`validTo` present on 100% of edges |
| Evidence/provenance | `source` field, value `'DOMAIN_DEP_FACT'` on all 24 edges. Consumed by `causalimpactmap.js` as `grounded: !!e.source && e.source !== 'UNKNOWN'` |
| Admission state | **Non-canonical.** Not produced through KRYL-1133 admission. Hand-curated in `chokepointedges.js` |
| Topology (measured) | Strictly hierarchical/DAG. Global clustering coefficient = **0.000** (no triangles). Degree-variance z vs. G(N,E) null = **-0.63** (less heterogeneous than random) |
| Live consumers | `causalimpactmap.js` → `causalimpactview.jsx` → `analysisidlefield.jsx:1644` ("IMPACT" tab, Analysis page). Also `gwrealiser.js`/`sigmaengine.js` via `buildChokepointStructure()` |
| Provisional regime applicability *(metadata only)* | Hierarchical / dependency |
| **Gaps** | No weights. No real observation timestamps (only registration time). Single source value. Curated, not observed — does not grow from evidence. Node semantics mix entities with abstract capabilities |

### A.2 — Source: `entitytopologyregistry.js` → `entityTopologyRegistry` (v1, flat/symmetric)

| Field | Observed Fact |
|---|---|
| Source | Same file, exported `entityTopologyRegistry` object (adjacency map) |
| Population mechanism | Two writers: (a) `registerInventorMigrationEdge()`, called live from `patentsviewconnector.js:215`, which is called from `app.jsx:794,827`; (b) `registerTypedEdge()`'s backward-compat sync block |
| Edge count | **Not measurable statically** — depends on live PatentsView API responses at runtime. Zero when the API is unreachable |
| Relationship types | **None.** v1 stores bare adjacency; no `type` field exists on this structure |
| Direction | **Symmetric/undirected** — `registerInventorMigrationEdge()` writes `src→dst` AND `dst→src` (verified, lines 37–41) |
| Node semantics | Organization names, normalized `toUpperCase().replace(/[\s-]/g,'_')`. Not CIK-anchored |
| Weights | Absent |
| Time | Absent on this structure |
| Evidence/provenance | **Absent on this structure.** No `source` field in the v1 adjacency map |
| Admission state | Non-canonical |
| Topology | Not measured (runtime-dependent, requires live API) |
| Provisional regime applicability | Unknown — insufficient data to characterize |
| **Gaps** | **CORRECTION TO A PRIOR CLAIM:** `specs/SPEC-structural-formation-lifecycle-pre-post-state-recognition.md` implies PatentsView inventor-migration edges reach the typed/directed store. Verified this session: `registerInventorMigrationEdge()` writes ONLY to the v1 flat symmetric registry, never to `TYPED_EDGES`. These edges are therefore undirected, untyped, and unsourced — a materially weaker substrate than that spec implies. Flagged, not corrected in that file |

### A.3 — Source: `signalgenealogy.js` → `SEED_GRAPH`

| Field | Observed Fact |
|---|---|
| Source | `src/engine/signalgenealogy.js`, `buildSeedGraph()`. Instantiated once as `SEED_GRAPH` in `reconlayer.js:14` |
| Population mechanism | Hard-coded `addEdge()` calls inside `buildSeedGraph()`. No connector writes to it |
| Edge count (measured) | **12** |
| Node count (measured) | Node array shape differs from expectation — `g.nodes.length` returned `undefined` when executed, meaning nodes are stored under a different structure than a plain array. **Not resolved this session** |
| Relationship types (measured) | `causes`, `precedes`, `correlates_with` — 3 types |
| Direction | Directed (`from` → `to`) |
| Node semantics | Signal **categories**, not instances (`CONSTRUCTION_PERMITS`, `POWER_INFRA`, `COMPUTE_CAPACITY`, `MARKET_PRICE`, `SEC_FILING`, …) |
| Weights | **Present** — `confidence` on every edge. Measured range: **0.25 – 0.90** |
| Time | **Present and required** — `lag_estimate_days` on 100% of edges (measured). `addEdge()` throws if absent: *"lag_estimate_days required"*. Granularity: days. Represents estimated causal lag, NOT observation timestamp |
| Negative/constraint edges | **Present** — measured: 1 of 12. File header: *"Negative edges are constraint markers, not causal"* |
| Max degree (measured) | 6 |
| Evidence/provenance | **Absent** — no evidence reference or source field on edges |
| Admission state | **Non-canonical.** Hand-authored prior. `specs/SPEC-structural-formation-lifecycle-...md` characterizes it as *"a hand-authored prior over signal categories… not asserted relationships between specific evidence instances"* |
| Live consumers | `reconlayer.js` → `recondashboard.jsx` → `analysisidlefield.jsx:1644` ("RECON" tab, Analysis page). Also `baccoupling.js` |
| Provisional regime applicability *(metadata only)* | Temporal / lagged-causal, and hierarchical |
| **Gaps** | Category-level, not instance-level. No provenance. Hand-authored, does not grow from evidence. 12 edges total. Node structure not fully characterized (see above) |

### A.4 — Source: RKM `genealogy` (`rkmstore.js`)

| Field | Observed Fact |
|---|---|
| Source | `src/engine/rkmstore.js`, `genealogy` field on every RealityObject |
| Schema | 5 relationship kinds: `causedBy`, `causes`, `dependsOn`, `enables`, `derivedFrom` |
| Population mechanism | **None.** Verified this session across all 6 live RKM-writing connectors: `edgar8kconnector.js` sets `genealogy: {}` explicitly (line 219); `edgar8kevidence.js`, `edgarnarrativeconnector.js`, `companieshouseconnector.js`, `waybackconnector.js`, `edgar8ksignal.js` never reference genealogy at all |
| Edge count | **0**, always |
| Live consumers | `cifengine.js` (CI-F) traverses `ro.genealogy?.[field]` — a real, live engine operating on permanently empty data |
| Admission state | Canonical path is defined (KRYL-1133 → Admission Contract) but **unratified**; Jira status verified live this session: `Ready`, Resolution `None` |
| **Gaps** | Complete. Schema exists, consumer exists, producer does not |

### A.5 — Sources examined and excluded

| Source | Reason excluded |
|---|---|
| `relationontology.js` / `RelationCore` | Real type with enforced `provenanceHash`, but its only populator (`relationmigration.js`) has **zero live callers** (verified) |
| `relationtopology.js` | **Zero live callers** (verified) |
| `secownershipconnector.js` | `runSecOwnershipSync()` has **zero live callers** (verified this session) — real SEC 13D/13G ownership edges, code-complete, unwired |
| `disruptionalertlayer.js` | **Zero live callers** (verified) |
| `identitykernel.js` `EvidenceGraph` | Per `SPEC-structural-formation-lifecycle-...md`: every live `CanonicalEvent` built with `edges: []`. Not re-verified this session |
| `cifengine.js`, `gwrealiser.js`, `sigmaengine.js`, `whytrace.js`, `portfolioconvergence.js`, `validator/*` | Consumers or transformers of the above, not independent relational stores |

---

## DELIVERABLE B — Substrate Readiness Map

```
                        EXISTING RELATIONAL EVIDENCE
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
  USABLE TODAY              USABLE AFTER              REQUIRES KRYL-1133
  (as-is, real,             TRANSFORMATION            ADMISSION
   live, non-canonical)
        │                           │                           │
  TYPED_EDGES (24)          v1 flat registry          RKM genealogy (0 edges)
  signalgenealogy (12)      (undirected, untyped,     RelationCore
                             untimed, unsourced)      secownership (unwired)
        │                           │                           │
        ▼                           ▼                           ▼
  Feed a recognizer         Needs direction +          Needs the entire
  NOW, labeled              type + provenance          admission layer built
  non-canonical             before it is usable        (Policy unratified)
```

### B.1 — Can we already feed real relationships into a regime-aware recognizer?

**Yes, with an explicit non-canonical label.** Two real, live, executable stores exist today —
`TYPED_EDGES` (24 edges) and `signalgenealogy`'s `SEED_GRAPH` (12 edges) — and both were
successfully executed and measured this session without network access or the admission layer.
Neither is canonical (neither passed KRYL-1133 admission; both are hand-curated rather than
evidence-grown). Any recognizer output from them is experimental, not authoritative.

### B.2 — What exact transformations or admissions are still required?

| To use | Required |
|---|---|
| `TYPED_EDGES` as-is | Field rename only (`from`/`to` → `subjectId`/`objectId`). Already demonstrated in `diag_structuralrecognition_real_data.mjs`. No fabrication needed |
| `signalgenealogy` as-is | Field rename (`from`/`to`), plus a decision on whether `confidence` and `lag_estimate_days` may be consumed as weight/time — **not decided here** |
| v1 flat registry | Direction, type, and provenance are all absent and cannot be recovered from the stored data. Would require changing the writer, not the reader |
| RKM genealogy | The complete admission layer: KRYL-1133 ratification → schemas → the WO-2049 ledger dependency → admission endpoint → rule modules → a producer that proposes relationships |
| `secownership` edges | A sync trigger (`runSecOwnershipSync()` has no caller). Whether that is authorized is not determined here |

### B.3 — Is hierarchy material present in sufficient volume and quality to justify a hierarchy branch now?

**Observed facts only, no recommendation:**

- **Volume**: 24 edges / 28 nodes (`TYPED_EDGES`) + 12 edges (`signalgenealogy`) = **36 real edges total** across both live stores.
- **Quality — strengths**: both are directed; both are typed (5 and 3 types respectively); `TYPED_EDGES` carries uniform provenance (`source`); `signalgenealogy` carries per-edge confidence weights and required temporal lag.
- **Quality — limitations**: both are hand-curated, not evidence-grown; neither is canonical; `TYPED_EDGES` has no weights and no true observation timestamps; `signalgenealogy` has no provenance and is category-level rather than instance-level; neither grows over time from connector activity.
- **Confirmed hierarchical character**: `TYPED_EDGES` measured at clustering = 0.000, degree-variance z = -0.63 — a strict DAG with no cycles and no triangles.
- **Not established**: whether 36 hand-curated edges constitute a statistically adequate basis for calibrating hierarchy-recognition thresholds. That is a judgment about sufficiency, not a fact the inventory can produce.

---

## Decision gate — inputs assembled, decision NOT made here

Per WO-PHASE2-SUBSTRATE-001, the gate is: *does the real substrate contain enough valid
hierarchical evidence to justify opening a hierarchy-recognition WO?*

The facts above are the input to that decision. The decision itself is a Founder call and is
deliberately not made, implied, or pre-empted by this document. No Phase 3 work is authorized by
this inventory's existence.

---

## Verification boundary

Measured by live execution this session: `TYPED_EDGES` counts/types/topology/field presence;
`signalgenealogy` counts/types/confidence range/lag presence/negative-edge count/max degree.
Verified by direct code read: all population mechanisms, live-caller traces, admission states.
Verified by live Jira API: KRYL-1133 status (`Ready`, unresolved).
NOT verified: v1 flat registry's runtime edge count (requires live PatentsView API);
`signalgenealogy`'s node structure (returned `undefined` for `.length`); `identitykernel.js`'s
current edge state (carried from a prior session's spec, not re-checked).
