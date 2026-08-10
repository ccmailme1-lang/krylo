# KRYLO Lean Ontology — FINAL Master Reconciliation

Status: Architecture Recon / NOT a build spec. Freezes the gap list established by audits
001-004. No code changed to produce this document. No implementation authorized by this document.

Source audits (all committed):
- `001_WO-2004_identity_kernel_audit.md` (commit `366c9de`)
- `002_WO-2005B_structural_confirmation_audit.md` (commit `366c9de`)
- `003_object_scan.md` (commit `0ce9d9e`)
- `004_relationship_scan.md` (commit `0ce9d9e`)

This document does not re-derive findings — every row below cites the source audit. Where this
document draws a conclusion that goes beyond a direct quote from 001-004, it is marked
`SYNTHESIS` and kept separate from the cited evidence.

### Standing correction (carried forward from review)

"Match: strong" in earlier working tables meant *reusable substrate exists*, not *1:1 semantic
compliance with rc3*. This document replaces "match strength" with a two-column split — **what
exists** (fact, cited) and **decision** (reuse / adapt-reconcile / gap) — so the two questions
are never collapsed into one adjective again.

---

## Master Table

| Lean primitive | Existing KRYLO substrate (cited) | Decision | Residual gap |
|---|---|---|---|
| **O** — stable object | `entityresolution.js` (WO-2041, "ERK") + `entityregistry.json`, 56 entities, content-derived `canonicalId`, cross-source identifiers (edgar/fec/uei), 5 confirmed live consumers [003] | **GO — adapt/reconcile** | No lifecycle timestamps on records; no `createEntity`/`upsertEntity`/`mergeEntity` — static, hand-curated, read-only registry [003] |
| **E** — occurrence w/ time window | `identitykernel.js` `createCanonicalEvent` — `identityId`, bounded `timeWindow`, live merge/split logic gated on temporal overlap [001] | **GO — reuse as-is** | None identified. Note: WO-2004's `identityId` is itself an occurrence identity, not an object identity — do not let E's strength imply O is also solved by the same file [001] |
| **R** — directed relationship | `entitytopologyregistry.js` v2 `TYPED_EDGES`: `{from, to, type, source, ts}`, live-written by `secownershipconnector.js` from real SEC 13D/13G filings; `findPath()` BFS query exists [004] | **GO — adapt/reconcile** | Single predicate value observed in live use (`BENEFICIAL_OWNER_OF`) — no closed predicate vocabulary; only creation `ts`, no `valid_from/valid_to`; v1 (name-keyed) / v2 (CIK-keyed) identity schemes don't fully bridge, per the file's own documented limitation [004] |
| **ST** — state | WO-2004 `CanonicalEvent.status` — confirmed values `ACTIVE`/`FRAGMENTED` only [001]. `entitystateledger.js` (KRYL-974) — append-only entity state history, zero confirmed callers [003] | **GO — formalize/adapt** | Two-value state machine in the one live path (WO-2004); the richer append-only ledger (entitystateledger.js) exists but is unwired — `SYNTHESIS`: reconciling ST likely means deciding whether to wire the ledger in, not building new state machinery |
| **T** — time | `Date` wall-clock timestamps throughout (WO-2004 `timeWindow`, WO-2005B `eventHistory` filtering, entitytopologyregistry.js edge `ts`) [001][002][004] | **GO — formalize temporal contract** | No monotonic clock source found anywhere audited (the earlier claim of a `clock.js` monotonic wrapper was checked and does not exist) [001]. Only one function in the entire audited surface (`computeStructuralMomentum`) applies an actual window filter, and it has no confirmed live caller [002] |
| **SO** — source | Evidence-type descriptors (`evidencetiers.js`, referenced in 001/002); edge `source` field in `entitytopologyregistry.js` (e.g. `'SEC_13D_13G'`) [004] | **GO — reconcile naming/attachment** | What exists is evidence-*class* (type of evidence) and edge-*source-string*, not a unified "where did this specific observation come from" record structure across O/E/R uniformly |
| **ℒ** — presence/absent/unknown | §22 Absence-Is-Signal (CLAUDE.md doctrine, not re-audited as code in this pass — carried forward from earlier this session, not from 001-004) | **GO — define normalization** | `SYNTHESIS`: this row is the one entry in this table not backed by a 001-004 code audit; it should be code-audited before being relied on the same way the others are, if it becomes load-bearing for a spec |
| **G_W** — windowed snapshot graph | **NOT FOUND** as a materialized or named construct anywhere in 001-004. What exists is per-CanonicalEvent local `EvidenceGraph` (WO-2004) and the separate entity-topology adjacency graph (004) — neither is a pooled, window-scoped snapshot of everything observed | **ARCHITECTURAL GAP** | Whether this should be materialized, virtual, or hybrid is explicitly *not* decided here — that is the next artifact (G_W/M1 realiser decision note) |
| **σ** — signal as evaluable view | §21 Route-Don't-Aggregate doctrine + WO-2005B's `computeSCI` pattern of recomputing on demand rather than storing [002] (doctrine itself not re-audited as code in this pass) | **GO — bind to whatever G_W decision is made** | Needs an explicit `G_W → σ` boundary once G_W is decided; currently signals are computed ad hoc per caller, not against one named substrate |
| **Σ** — signal structure ⟨G_Σ,props_Σ,π_Σ⟩ | **NOT FOUND.** WO-2005B (`computeStructuralSuite` et al.) never reads `.edges`, never constructs V_Σ/E_Σ, returns flat metric objects only [002] | **ARCHITECTURAL GAP** | This is the largest confirmed gap. WO-2005B is a candidate *producer feeding into* a future Σ engine, not Σ itself — do not substitute it for Σ [002] |
| **π_Σ** — traceability invariant | `ProvenanceDAG` (WO-1336) — real, immutable, cycle-checked event lineage (read earlier this session, not re-verified line-by-line in 001-004). WO-2005B's `perTypeContribution` traces to evidence *type*, not evidence *instance* [002] | **ARCHITECTURAL GAP — instance-level only** | Existing provenance ≠ Lean π_Σ, per 002's explicit finding: the rc3 invariant requires `∃y∈E∪R` per vertex/edge/property; nothing audited meets that at instance grain. ProvenanceDAG is the correct substrate to extend, not replace |
| **Integrity vector** I(Σ) | `structuralintegrity.js` β_c = ⟨SCI, CSAT, ISI, RCC, UE⟩, never collapsed to one scalar (read earlier this session) | **GO — keep distinct from π_Σ** | See naming-collision note below — must not be confused with WO-2005B's differently-named-but-identically-spelled `computeSCI` |

---

## Naming-Collision Note (carried forward, both prior audits)

| Alias (audit only) | Module / File | Input Shape | Layer Intent |
|---|---|---|---|
| SCI-CONTRADICTION | `structuralintegrity.js` | `(domainReads)` → vector slot | Integrity layer, part of β_c |
| SCI-CONFIRMATION | `structuralconfirmation.js:68` | `(evidenceGraph)` → `{score, groundedness, ...}` | WO-2005B's own export |

No import path links the two. Any statement referencing bare "SCI" without one of these aliases
is ambiguous and should not be used in Specs A-E.

---

## Three-Bucket Synthesis

**Existing (reusable substrate, confirmed live where noted):**
- `entityresolution.js` + `entityregistry.json` — O candidate
- `entitytopologyregistry.js` — R candidate, live-written by `secownershipconnector.js`
- `identitykernel.js` (WO-2004) — E kernel
- `ProvenanceDAG` (WO-1336) — provenance substrate for π_Σ extension
- §22 Absence-Is-Signal — ℒ candidate (not yet code-audited under this protocol)
- Structural confirmation / integrity machinery — WO-2005B (metrics producer), `structuralintegrity.js` (integrity vector)

**Lean-required (not found anywhere audited):**
- Formal G_W (windowed snapshot graph)
- Formal σ boundary bound to G_W
- Σ = ⟨G_Σ, props_Σ, π_Σ⟩ as a constructed object
- Instance-level π_Σ traceability relation
- Explicit M₁-M₄ spine (currently implicit/scattered across the files above)

**Potential adaptation (existing KRYLO machinery, needs reconciliation work, not green-field build):**
- O lifecycle/mutation semantics on top of the existing entity registry
- R predicate vocabulary + temporal validity + v1/v2 identity bridge
- ST consolidation (wire `entitystateledger.js` in, or formally retire it)
- T monotonic/window contract
- SCI-CONTRADICTION vs SCI-CONFIRMATION formal separation in downstream specs

---

## GO Status

- **ARCHITECTURE: GO.** A coherent path from existing KRYLO substrate to the Lean Ontology's
  requirements is established, without requiring existing E/O/R/provenance/integrity machinery to
  be discarded.
- **SPECIFICATION: GO.** Sufficient gap clarity exists to author Specs A-E.
- **IMPLEMENTATION: NOT YET AUTHORIZED.** No Bin-3 work is opened by this document. Specs A-E must
  be drafted and frozen first; each must cite this document rather than re-deriving the gap list.

## Next Artifacts (locked sequence)

1. This document (FINAL Master Reconciliation) — becomes Appendix A of the Architecture-Freeze
   Jira ticket once committed.
2. π_Σ vs Evidence-Tier memo — normative annex for Spec D.
3. G_W / M₁ realiser decision note — virtual vs materialized vs hybrid, feeds Spec B.
4. Specs A-E, each citing this document.
