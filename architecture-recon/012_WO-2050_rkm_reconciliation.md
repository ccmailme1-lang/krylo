# WO-2050 (rkmstore.js) — Reconciliation Against the Lean Ontology

Status: Architecture Recon / NOT a build spec. Bin-1 (what exists) vs Bin-2 (what Lean
requires) only. No code changed to produce this document. No wiring authorized by this
document — per direction, no further wiring until this reconciliation settles.

Evidence Standard identical to 001-004: every claim cites source file/line or an actual
grep result run during this pass. NOT FOUND / UNVERIFIED / INFERRED where evidence is
insufficient.

## 0. Live-wiring facts, established before any semantic mapping

These facts change the shape of every question below, so they're stated first:

- **6 confirmed consumers** of `rkmstore.js`: `cirgate.js` (`getById`), `cifengine.js`
  (`listAll`), `cipipelinerun.js` (`listAll`), `edgar8kconnector.js` (`createObject`,
  the only writer), `edgar8kevidence.js` (`getById`), `edgar8ksignal.js` (`getById`).
  This sits at the base of the CI-F→CI-R→RBCS chain CLAUDE.md already documents as having
  "a real call path via cipipelinerun.js, wired into app.jsx's EDGAR sync chain" — i.e.
  this reconciliation is about a system already flagged elsewhere as live infrastructure,
  not a fresh discovery of aliveness, but this is the first pass that reads its actual
  internal shape against the Lean contracts.
- **`OBJECT_TYPE.EVENT` is the only object type ever instantiated anywhere in `src/`.**
  `COMMITMENT`/`RELATIONSHIP`/`ENTITY_STATE`/`CONSTRAINT` are defined in the enum but zero
  `createObject` calls use them (grep across all of `src/` for
  `OBJECT_TYPE\.(EVENT|COMMITMENT|RELATIONSHIP|ENTITY_STATE|CONSTRAINT)` outside
  `rkmstore.js` itself returns exactly one hit: `edgar8kconnector.js:198`,
  `OBJECT_TYPE.EVENT`). This directly affects the table below — "RealityObject
  (RELATIONSHIP) → R" and "RealityObject(ENTITY_STATE) → ST" are questions about
  **types that don't exist in production yet**, not about live behavior.
- **`genealogy` is passed as `{}` at the only live creation site**
  (`edgar8kconnector.js:207`). The five genealogy arrays are real, well-designed fields —
  but empty in every RealityObject KRYLO has actually created through this path.
- **`supersedeObject`, `mergeObjects`, `flagContradiction`, `retractObject` — zero external
  callers anywhere in `src/`.** The entire lifecycle-management half of this file is built,
  correct-looking, and dormant — same pattern already documented in audits 001/002 for
  WO-2004's `attachSCI`/`attachDomainPressures` and WO-2005B's `computeStructuralSuite`.

## 1. RealityObject → O or E?

**Finding: neither cleanly — `id` serves E's role, `identityId` serves O's role, and the
file's own header comment doesn't match the one live caller's actual usage.**

`rkmstore.js`'s header (line 9) states: "identitykernel.js is read-only input (identityId
anchor only)" — implying `identityId` is meant to anchor to WO-2004's
`CanonicalEvent.identityId` (an **E** identity).

But the only live caller does something different. `edgar8kconnector.js:185-197`:
```
const entityCard  = entityName ? resolveEntity(entityName) : null;  // entityresolution.js — O
const canonicalId = entityCard?.canonicalId ?? null;
...
createObject({ identityId: canonicalId, objectType: OBJECT_TYPE.EVENT, ... })
```
`identityId` is populated from `entityresolution.js`'s `canonicalId` — an **O** reference
(which company this filing is about), not a WO-2004 **E** reference. `identitykernel.js`
is not even imported by `edgar8kconnector.js`.

So, precisely: **`RealityObject.id` (the `robj_...` the store generates) is the object's
own E-identity when `objectType === EVENT`. `RealityObject.identityId` is an O-attribution
foreign key** — in the one live path, pointing at `entityresolution.js`'s registry, not at
WO-2004. This is a real, working O→E attribution link, just not the one the header comment
describes.

## 2. Is `genealogy` actually R?

**Finding: no — genealogy links RealityObject ids to other RealityObject ids (knowledge
claims), not real-world Objects to each other. It's closer to ProvenanceDAG's parent_ids
lineage than to R.**

Evidence: `mergeObjects` (line 239) sets `derivedFrom: [idA, idB, ...]` where `idA`/`idB`
are `robj_...` store ids — i.e. "this knowledge claim was derived from these other
knowledge claims," the same shape as `ProvenanceDAG.add(envelope, parent_ids)`'s
`parent_ids` (audit — `causalos/provenance.js`, read earlier this session). `causedBy`/
`causes`/`dependsOn`/`enables` follow the same id-to-id-within-the-store shape (inferred
from the `derivedFrom` pattern and the field's co-location in the same `genealogy` object;
no live call site populates the other four fields to confirm their exact semantics beyond
structure — marked `UNVERIFIED` for `causedBy`/`causes`/`dependsOn`/`enables` specifically,
`derivedFrom`'s shape is `CONFIRMED` via `mergeObjects`/`supersedeObject`'s actual code).

This answers the user's own framing question directly: genealogy is "relationships between
knowledge claims," not "real-world relationships with stable subject/object identity." **It
is not R.** It is a second, RealityObject-scoped lineage mechanism sitting alongside
`ProvenanceDAG`'s event-scoped lineage mechanism — two lineage systems, neither of which is
R in the Lean sense (R connects Objects, e.g. Company A owns Company B; genealogy and
ProvenanceDAG both connect knowledge/evidence artifacts to each other).

## 3. Is `evidence[]` actually πΣ?

**Finding: no, and precisely why — it's real evidence linkage, but at the wrong grain
(object-level, not structural-element-level) and self-defined identifiers, not references
into any shared evidence store.**

`edgar8kconnector.js:192-194`:
```
const evidenceIds = items.length > 0
  ? items.map(i => `${accNo}::item-${i}`)
  : [`${accNo}::main`];
```
These are synthesized strings (accession number + item number), constructed fresh by this
connector — not `identitykernel.js` `EvidenceNode.id` values, not
`entitytopologyregistry.js` edge references, not anything from a shared evidence registry.
They ARE real (traceable back to an actual SEC filing item), just locally-scoped to this
connector's own naming convention.

More importantly: rc3's πΣ is `⊆ (E∪R) × (VΣ∪EΣ∪propsΣ)` — it links evidence to individual
**structural elements** of a Σ object (one specific vertex, one specific edge, one specific
property). `RealityObject.evidence[]` links evidence to **the whole RealityObject** — one
undifferentiated bag of evidence per knowledge claim, no per-element breakdown.

This matches the user's own hypothesis exactly: `evidence[]` is **evidence membership**, a
real and useful precursor, not πΣ itself. The correct relationship (not yet built anywhere)
would be: a Σ element derived from a RealityObject inherits traceability to that
RealityObject's `evidence[]` entries, mediated through `linkEvidence()` (this session's πΣ
extension to `ProvenanceDAG`) rather than by treating `evidence[]` as a second, competing
πΣ implementation.

## 4. Is `epistemicWeights[]` actually EvidenceTier?

**Finding: it's A tier-weighting table, but the codebase has THREE independently-tuned
ones, not one canonical EvidenceTier — this is a real finding, not a defect, but it changes
what "EvidenceTier" means as a term.**

```
rkmstore.js:17-22            EPISTEMIC_WEIGHT:        STRUCTURAL=1.0, OPERATIONAL=0.8, FINANCIAL=0.7, NARRATIVE=0.3 (no SPECULATIVE)
identitykernel.js:20-26      TIER_STABILITY_WEIGHT:   STRUCTURAL=0.90, OPERATIONAL=0.70, FINANCIAL=0.50, NARRATIVE=0.25, SPECULATIVE=0.10
structuralconfirmation.js:40-46  TIER_WEIGHT:         STRUCTURAL=0.50, OPERATIONAL=0.25, FINANCIAL=0.15, NARRATIVE=0.10, SPECULATIVE=0.10
```
Same 4-5 `EPISTEMIC_CLASS` keys (from `evidencetiers.js`, the one shared descriptor
source), three different numeric weight tables. This is **documented as intentional** —
`rkmstore.js:15-16`'s own comment: "Different from identitykernel TIER_STABILITY_WEIGHT —
those govern graph topology. These govern groundedness." Each file's weight table answers a
different local question (identity stability vs. structural confirmation score vs. truth
stability) from the same shared classification.

Implication for the memo-006 rule ("EvidenceTier remains orthogonal to πΣ"): that rule
still holds, but "EvidenceTier" isn't a single number — it's the shared `EPISTEMIC_CLASS`
classification, weighted differently per consuming subsystem. πΣ must stay binary
regardless of which of the three weight tables (or a future fourth) is asking the
question — this finding strengthens memo 006's case rather than complicating it, but the
reconciliation doc should stop implying there's one "EvidenceTier weight" to point πΣ away
from. There are three, by design.

## 5. Is `EPISTEMIC_STATE` actually ST?

**Finding: no — and the code already proves the user's orthogonality hypothesis directly,
because `RealityObject` has TWO separate fields for exactly this distinction.**

`createObject`'s params include both:
```
state          = 'UNKNOWN',                    // free-form — the represented thing's state
epistemicState = EPISTEMIC_STATE.OBSERVED,      // enum — status of OUR KNOWLEDGE about it
```
And the live call site uses both, differently: `edgar8kconnector.js:203-204`:
```
state:            'DISCLOSED',                  // ontological — what happened to the filing
epistemicState:   EPISTEMIC_STATE.VERIFIED,     // epistemic — how sure we are
```
This is exactly the split the user described as a hypothesis ("ST describes the state of
the represented thing... EPISTEMIC_STATE may describe the epistemic status of our
knowledge about it... potentially orthogonal — we should not collapse them merely because
both are called 'state'") — confirmed directly from the code, not inferred. **`state` maps
to Lean **ST**. `epistemicState` maps closer to **ℒ** (observation truth-value) than to
ST** — `KNOWN`/`OBSERVED`/`VERIFIED`/`GROUNDED` are gradations of "how confirmed is this,"
`DISPUTED` is closer to a contested/unresolved state, `RETRACTED` is closest to an explicit
⊥, `UNKNOWN` maps directly to `?`. This is a real, richer ℒ implementation than anything
found in audits 001-004 for this codebase's absence-is-signal doctrine — worth flagging
back against that earlier gap (memory: "§22 Absence-Is-Signal... this doctrine is NOT
automatically enforced in SCI, RBCS, or availability filtering" — `rkmstore.js`'s
`EPISTEMIC_STATE` may be a stronger existing candidate for formalizing ℒ than what audit
005 had available when it marked that row `SYNTHESIS`, not independently code-audited).

## 6. Lifecycle → T/ST semantics?

`observedAt`/`validFrom`/`validUntil` (real Date-ISO-string fields, populated at the one
live call site from the filing's actual date) plus the append-only `epistemicHistory[]`
audit trail (`{state, at, sourceId, reason}` per transition) is a genuinely stronger T+ST
combination than WO-2004's two-value `status` field. `supersedeObject` is designed to
correctly close out a `validUntil` and chain a successor — but, per §0, has zero live
callers, so this richer lifecycle is available capability, not yet exercised behavior.

## Table, restated with Bin-1 evidence attached (not assumption)

| rkmstore construct | Lean role (initial guess) | What the code actually shows |
|---|---|---|
| `RealityObject.id` | — | Serves as **E**'s own identity when `objectType===EVENT` (the only type in live use) |
| `RealityObject.identityId` | O or E | **O** in the one live path (entityresolution.js `canonicalId`) — contradicts the file's own header comment, which describes it as an E-anchor |
| `genealogy` | R | **Not R** — knowledge-claim-to-knowledge-claim lineage, structurally closer to `ProvenanceDAG.parent_ids` than to a real-world relationship. Empty (`{}`) at the only live call site |
| `evidence[]` | πΣ | **πΣ precursor, not πΣ** — real evidence linkage, but object-grain not element-grain, and self-scoped ids not shared references |
| `epistemicWeights[]` | EvidenceTier | **A** tier weighting, one of three independently-tuned tables sharing the same `EPISTEMIC_CLASS` source classification |
| `EPISTEMIC_STATE` | ST | **Not ST — closer to ℒ.** `state` (the other, separate field) is the actual ST candidate |
| lifecycle (`observedAt`/`validFrom`/`validUntil`/`epistemicHistory`) | T/ST | Real and richer than WO-2004's, but the mutation functions that would exercise it have zero live callers |

## The architectural question, answered

> Does the existing Lean implementation absorb/adapt rkmstore, or does rkmstore become the
> runtime substrate underneath the Lean contracts?

Based on the evidence above: **rkmstore becomes runtime substrate underneath specific Lean
contracts it already serves well (ℒ via `epistemicState`, ST via `state`, T via the
timestamp fields), while genealogy and evidence[] need a thin translation layer rather than
being treated as R or πΣ directly.** Concretely:

- **ℒ**: `RealityObject.epistemicState` is a stronger candidate than anything audit 005 had
  when it marked that row `SYNTHESIS` (doctrine-only, not code-audited). This should
  replace that row's evidence basis.
- **ST**: `RealityObject.state` (the free-form field, not `epistemicState`) is a real ST
  candidate — but it's untyped/freeform (`'DISCLOSED'` is a string, not a member of any
  enum) — needs a closed vocabulary decision, same category of gap as R's predicate
  vocabulary (audit 004).
- **R**: still `NOT FOUND` as a real-world-Object-to-Object relationship. `genealogy` is a
  second lineage system, not R — it does not close audit 004's gap, it's a separate finding.
- **πΣ**: `evidence[]` should feed INTO `ProvenanceDAG.linkEvidence()` (this session's
  extension) as a translation step — "for each Σ element derived from this RealityObject,
  link it to every id in `evidence[]`" — rather than being read as πΣ directly. This is
  additive glue code, not a replacement of either system.
- **O**: `RealityObject.identityId` already correctly anchors to `entityresolution.js` in
  the one live path — this is a confirmation, not a gap. No change needed.

## What this means for the "no parallel representation" adoption criterion

Two real lineage systems now exist side by side (`ProvenanceDAG` and `rkmstore.genealogy`)
and two real evidence-linkage systems exist side by side (`ProvenanceDAG.linkEvidence`,
built this session, and `RealityObject.evidence[]`, live since WO-2050). Per the adoption
exit criterion, these need one declared relationship, not silent coexistence. Given
`genealogy` is unpopulated in live use (§0) and `evidence[]` operates at object-grain,
the lowest-risk reconciliation is: **`RealityObject.evidence[]` feeds `ProvenanceDAG` via
translation, `genealogy` is left as rkmstore's own internal concern (it's about knowledge
claims, not world objects — never was competing with R), and `ProvenanceDAG` remains the
one system answering element-level πΣ questions.** This is a proposed direction, not a
decision made unilaterally here — flagged for confirmation before any code changes.

## Addendum — can lineage be represented using existing Lean primitives and relations,
## without introducing a seventh primitive?

**Answer: yes — no seventh primitive is needed — but only once "lineage" is split into
four things that were being discussed as one. Three of the four already have a home. The
fourth (knowledge lineage) is the one genuinely new distinction this addendum draws.**

| Category | What it actually relates | Lean home | Status |
|---|---|---|---|
| **World lineage** | Real-world Object to real-world Object (e.g. Company A owns Company B) | **R** | Already built — `entitytopologyregistry.js` `TYPED_EDGES`, this session |
| **Knowledge lineage** | One `RealityObject` (a knowledge claim) derived from/caused by/dependent on another `RealityObject` | **Neither O, E, R, nor πΣ** | This is RKM's `genealogy` — see verdict below |
| **Evidence provenance** | A raw Event/Relationship supporting one specific vertex/edge/property of a Σ structure | **πΣ** | Already built — `ProvenanceDAG.linkEvidence()`, this session |
| **Temporal validity** | When a fact holds (start/end) | **T** | Already built — `validFrom`/`validTo` (R), `timeWindow` (E), `observedAt`/`validFrom`/`validUntil` (RealityObject) |

Three of the four categories were never actually missing anything — they map cleanly onto
R, πΣ, and T as already built. The only real question is the second row.

### Verdict — ontology-level (frozen, 2026-08-11 Founder decision)

**Lean R is a directed predicate edge, not constrained to O→O by rc3. E→E relationships
(e.g. `CAUSES`, `DEPENDS_ON`, `ENABLES`) can legitimately satisfy the R contract. Lineage
therefore does NOT require a seventh primitive — this conclusion is solid and closes the
ontology question.**

**What does NOT follow from that, and is explicitly not decided here:** that RKM's
`genealogy` must be migrated into `TYPED_EDGES`, or that every genealogy predicate is
promoted into canonical R. That is a Bin-3 implementation/adoption decision — governed by
each predicate's semantic classification, provenance, temporal requirements, and which
system is authoritative for it — not an ontology-level question. The frozen ontology-level
decision is narrower than "all RKM genealogy becomes R":

> The Lean Ontology permits lineage relationships to be represented as R when their
> semantics satisfy the R contract. Lineage is not a seventh primitive. Whether any
> particular RKM genealogy predicate is actually promoted into the canonical R substrate is
> a separate implementation/adoption decision, made per-predicate, later.

### The M3/M4 caution — not disproven, carried forward as a live consideration

The concern raised earlier in this addendum — that world-relationship facts (R) and
knowledge-claim-derivation facts (genealogy) are different *categories*, and collapsing
them risks the same error this codebase's own M4-must-never-become-M3 doctrine exists to
prevent — is **not resolved by "R is endpoint-agnostic."** Endpoint-agnosticism is a
statement about R's formal shape; it says nothing about whether `Event B CAUSED Event A`
and `Company A BENEFICIAL_OWNER_OF Company B` should receive identical downstream treatment
once they're both sitting in the same `TYPED_EDGES` array. They may not — they may belong
to different domain vocabularies with different consumers, even while both are validly
R-shaped. This is exactly the open question the Bin-3 adoption work has to answer per
predicate, not something this reconciliation resolves by declaring R's shape permissive.

**Net result: the ontology is closed — six primitives, no seventh. The implementation
question (which predicates get promoted, which stay internal to rkmstore.js, which system
is authoritative for each) remains open and belongs to adoption work, not architecture.**

## Status

Reconciliation only. No wiring performed. Next step, per direction: settle this
relationship before any further integration work (the `edgar8kconnector.js`/`secowner-
shipconnector.js` live-path wiring already in progress should not proceed further until
this is confirmed).
