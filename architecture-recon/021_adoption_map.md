# KRYLO Lean Ontology — Authoritative Adoption Map (DOD Step 2)

Status: Synthesis of audits 001-020 + commits `40fc73a`/`52f022f`/`bfcde06`/`3299c02`/`f12f440`.
No new discovery in this document — every row cites the audit that established it. Exit
criterion (per the locked DOD): every active O/E/R-producing path has an explicit
architectural owner and relationship to the Lean Ontology.

## Legend

**Classification** (one per path, no path gets two):
- **AUTHORITATIVE** — the canonical store for that ontology role; nothing else may silently claim it.
- **DOWNSTREAM** — consumes canonical data, produces its own derived output (M4-shaped), never claims to be the source of truth for O/E/R itself.
- **CONSUMER** — reads an authoritative store, does not write to it.
- **COMPLEMENTARY** — produces a real, legitimate representation adjacent to the canonical one, serving a distinct consumer, not competing for the same role.
- **LEGACY/DORMANT** — real code, zero live callers or explicitly disabled.
- **N/A** — does not participate in O/E/R at all (signal-only).

## The map

| Path | What enters | Owns O | Owns E | Owns R | T/ST/SO/ℒ | Gᵂ realised | σ produced | Σ produced | πΣ maintained | Same role elsewhere? | Classification |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **`entityresolution.js` + `entityregistry.json`** | static curated registry; runtime `createEntity`/`upsertEntity`/`mergeEntity` (this session) | **Yes — canonical O** | No | No | T: n/a (static) / ST: n/a / SO: n/a / ℒ: n/a | No | No | No | No | No | **AUTHORITATIVE (O)** |
| **`entitytopologyregistry.js`** (`TYPED_EDGES`) | edges from whichever writer calls `registerTypedEdge` | No | No | **Yes — canonical R** | T: `validFrom`/`validTo` (this session) / SO: `source` field / ST,ℒ: n/a | No | No | No | No | No | **AUTHORITATIVE (R)** |
| **`gwrealiser.js`** | O/R from the two stores above + caller-supplied E | No | No | No | T: window contract (`toMillis`/`intervalsOverlap`) / ℒ: `status==='ACTIVE'` filter | **Yes — canonical, virtual/on-demand** | No | No | No | No | **AUTHORITATIVE (Gᵂ)** |
| **`sigmaengine.js`** (`buildStructure`) | a `realiseSnapshot()` output | No | No | No | No | reads Gᵂ | consumes σ-shaped inputs (WO-2005B via reuse) | **Yes — canonical Σ = ⟨VΣ,EΣ,propsΣ⟩** | writes via `ProvenanceDAG.linkEvidence` | No | **AUTHORITATIVE (Σ)** |
| **`causalos/provenance.js`** (`ProvenanceDAG`) | evidence↔element links from `sigmaengine.js` | No | No | No | No | No | No | No | **Yes — canonical πΣ (element-level, binary)** | No | **AUTHORITATIVE (πΣ)** |
| **`rkmstore.js`** (RKM) | `createObject()` calls, currently only `objectType: EVENT` | `identityId` field references O (attribution) | **Yes — atomic per-filing E, live** | `genealogy` (unpopulated in live use) — NOT R, see 012 addendum | ST: `state` field (real) / ℒ: `epistemicState` (real, richer than WO-2004's) / T: `observedAt`/`validFrom`/`validUntil` / SO: `metadata.source` | No | feeds `edgar8ksignal.js` | No (its shape isn't Σ) | `evidence[]` — object-grain, real, not yet threaded into `ProvenanceDAG` | **Yes — see WO-2004 row** | **COMPLEMENTARY (E, atomic grain)** — audit 012 |
| **`identitykernel.js`** (WO-2004, via `edgar8kevidence.js`) | `getProcessedEvents()` (RKM's log) + `getById()` | `entityKey` references O (attribution, same substrate) | **Yes — grouped (entity,eventClass) proto-Σ, live, feeds WhyTrace** | edges always `[]` — never populated | ST/ℒ: none native / T: `timeWindow` (real) / SO: via `evidencetiers.js` `evidenceType` | No | feeds `structuralconfirmation.js` (SCI-CONFIRMATION) | **Structurally proto-Σ-shaped** (an aggregation of multiple `EvidenceNode`s), but not rc3-shaped, not this session's Σ | none formal — `entityVerified` metadata only | **Yes — atomic grain overlaps RKM (audit 017)** | **COMPLEMENTARY (E, grouped grain)** — audit 017 |
| **`structuralconfirmation.js`** (WO-2005B) | a WO-2004 `evidenceGraph` | No | No | No | No | reads node-set only, never edges | **produces `SCI-CONFIRMATION` metrics — reused by `sigmaengine.js`, not duplicated** | No (audit 002: never builds VΣ/EΣ) | type-level only (`perTypeContribution`) | Named-collision only with `structuralintegrity.js`'s SCI-CONTRADICTION — not role-duplication (audit 001/002/005) | **DOWNSTREAM (metrics producer, reused as Σ input)** |
| **`cipipelinerun.js`/`cifengine.js`/`cirgate.js`/`rbcsengine.js`** (CI-F/CI-R/RBCS) | all live `rkmstore.js` objects (`listAll()`) | No | No | reads `genealogy` (dead weight — always empty, audit 016) | No native T/ST/SO; ℒ n/a | No — reads RKM directly, bypasses Gᵂ | No | builds a speculative hypothesis tree (M4 projection, NOT Σ — audit 016) | own ring buffer, not `ProvenanceDAG` | No — confirmed non-competing, different question domain (audit 016) | **DOWNSTREAM (M4 interpretation/projection)** |
| **`edgar8kconnector.js`** | live EDGAR 8-K fetch | reads O (`entityresolution.js`) | writes E (`rkmstore.js`) | no | ST/ℒ/T/SO — all via `rkmstore.js` fields | **Yes, this session** — `realityObjectToEventLike()` translation | no | **Yes, this session** — real, tested, multi-cycle-coherent | **Yes, this session** — session-scoped `_provenanceDAG`, per-item `evidence[]` | shares E-atomic-grain with WO-2004 (see above) | **AUTHORITATIVE for this session's Gᵂ/Σ/πΣ ingestion of RKM data** |
| **`chokepointedges.js`** | hand-curated dependency facts | no | no | **writes R — the one confirmed-live producer into `entitytopologyregistry.js`** | SO: `source: 'DOMAIN_DEP_FACT'` (real field, no canonical external artifact — audit 020) | **Yes, this session** | no | **Yes, this session** — `CHOKEPOINT_DEPENDENCY_STRUCTURE`, fixed sigmaId, idempotent | **Yes, this session** — structural provenance only, not epistemic (audit 020, honest finding) | no | **AUTHORITATIVE R producer + this session's Σ/πΣ ingestion** |
| **`supplychainconnector.js`** | reads `entityTopologyRegistry` | no | no | **reads only — never writes (corrected, audit 019)** | no | no | dispatches suppression signals | no | n/a | no | **CONSUMER (R reader → signal dispatch)** |
| **`patentsviewconnector.js`** | would fetch PatentsView API | no | no | would write R (`registerInventorMigrationEdge`) | n/a | no | no | no | no | no | **LEGACY/DORMANT — `PATENTSVIEW_ENABLED=false`, corrected audit 018** |
| **`secownershipconnector.js`** | would fetch EDGAR ownership filings | no | no | would write R (tested, this session) | n/a | tested only | no | tested only | tested only | no | **LEGACY/DORMANT — zero live callers, audits 004/011** |
| **`edgarnarrativeconnector.js`** | would fetch EDGAR narrative filings | reads O if called | no | no | n/a | no | no | no | no | no | **LEGACY/DORMANT — zero live callers, audit 015** |
| **`capitalrealizationconnector.js`** | user query (via `topicconnectors.js`) | reads O | no | no | n/a | no | no | no | no | no | **CONSUMER — query-driven, not scheduled (audit 015)** |
| **`edgar8ksignal.js`** | `rkmstore.js` RealityObjects | no | reads E | no | n/a | no | **produces §16 signal packets** | no | n/a | no | **DOWNSTREAM (signal dispatch, N/A for O/E/R role)** |
| **24 signal-only connectors** (arxiv, bls, census, etc.) | various external APIs | no | no | no | n/a | no | signal dispatch only | no | no | no | **N/A — never claimed an O/E/R role (audit 015)** |

## Answering the DOD's required question per path

Every active O/E/R-producing path now has exactly one classification, and no two paths share
an unexplained AUTHORITATIVE claim for the same role:

- **O**: `entityresolution.js` alone is AUTHORITATIVE. Every other path that touches O
  (`edgar8kconnector.js`, `edgar8kevidence.js`, `rkmstore.js`'s `identityId`,
  `capitalrealizationconnector.js`) reads/references it — none writes a competing O record.
- **E**: RKM and WO-2004 are both real, both live, both COMPLEMENTARY (not one AUTHORITATIVE
  + one illegitimate) — they operate at different grains (atomic filing vs. grouped
  entity+eventClass), feed different real consumers (signals+CI-F vs. WhyTrace+SCI-CONFIRMATION),
  and audit 017 already established this is functional separation, not conflict.
- **R**: `entitytopologyregistry.js` alone is AUTHORITATIVE. Two real writers
  (`chokepointedges.js`, live; `secownershipconnector.js`, dormant) — one CONSUMER
  (`supplychainconnector.js`) — one DORMANT would-be writer (`patentsviewconnector.js`).
  No competing R store exists anywhere.
- **Gᵂ/Σ/πΣ**: `gwrealiser.js`/`sigmaengine.js`/`causalos/provenance.js` are AUTHORITATIVE,
  singular, and now demonstrated against two independent real data sources (EDGAR/RKM and
  chokepoint/topology) — not one isolated integration.
- **M4 (interpretation/projection)**: CI-F/CI-R/RBCS is the one real system here, correctly
  classified DOWNSTREAM, confirmed non-competing (audit 016).

## What remains genuinely open (carried forward, not resolved by this map)

1. **ℒ** — audit 005's caveat (doctrinal-only, not independently code-audited) is now
   substantially answered by RKM's `epistemicState` (audit 017/012 finding), but this map
   does not itself re-run that verification — flagged for Step 7 (ST/T/SO/ℒ canonical
   contract), not resolved here.
2. **RKM `evidence[]` → `ProvenanceDAG` translation** — recommended in audit 012, not built.
   Still the one identified (not yet closed) seam between RKM's real evidence linkage and
   this session's canonical πΣ mechanism.
3. **Genealogy predicate-level disposition** (`CAUSES`/`DEPENDS_ON`/`ENABLES`/`DERIVED_FROM`/
   `CAUSED_BY`) — explicitly deferred to DOD Step 6, not addressed here, since none has been
   encountered by a live integration yet (`genealogy` remains `{}` in production).

## Status

Gate: **Step 2 — GREEN.** Every active O/E/R-producing path found across audits 001-020 has
an explicit classification and owner. No unexplained parallel authority remains. Per the
locked DOD sequence, next is Step 3 (resolve remaining representation overlaps) — which this
map shows is already substantially pre-resolved by 012/016/017/019, so Step 3 may be a short
confirmation pass rather than new work.
