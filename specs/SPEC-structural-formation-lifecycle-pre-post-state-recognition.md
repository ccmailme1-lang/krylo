# SPEC — Structural Formation Lifecycle: Relational Formation/Representation Alignment + Pre/Post-State Recognition

Status: **TWO COUPLED GAPS IDENTIFIED — NOT BUILT. Gap 2 was corrected twice in this same
session.** First: a full 31-connector inventory found a live, correctly-built instance-level
relational pathway (`entitytopologyregistry.js`) that an earlier pass in this conversation missed
and incorrectly declared closed. Second: that finding was itself overclaimed — the registry's
edges are entity-to-entity (`Organization A → Organization B`), a different ontological subject
than `identitykernel.js`'s evidence-instance-to-evidence-instance graph. Gap 2 is not solved; it's
now precisely scoped as a representation-alignment question, not a missing-capability question.
Design record from an extended architecture verification discussion (2026-08-12), relayed from an
external AI across many rounds; each substantive claim was checked against real code in this
conversation before being recorded here — not accepted at face value.
Date: 2026-08-12
Target file(s) if ever built: `src/engine/entitytopologyregistry.js` (live, real relational
edges — entity-level), `src/engine/connectors/secownershipconnector.js` (built correctly, needs a
sync trigger), `src/engine/identitykernel.js` (dormant, evidence-level graph),
`src/engine/connectors/edgar8kevidence.js` (the one live CanonicalEvent producer, still
zero-edge), doctrine addition to CLAUDE.md §22.

---

## PROBLEM — two gaps, coupled as producer/consumer, not independent

**Gap 1 — Taxonomy.** CLAUDE.md §22 (Absence-Is-Signal) requires absence to be classified:
STRUCTURAL / TEMPORAL / ANOMALOUS / FILTERED. All four describe a signal that **isn't there**.
None describe a signal that **is there, weakly, but hasn't crossed the threshold required to
count as structurally persistent**. No fifth bucket exists for "present but sub-threshold."

**Gap 2 — Relational Formation.** Traced live, this session: the only live `CanonicalEvent`
producer, `edgar8kevidence.js`'s `runEdgar8KEvidenceSync()`, builds every event with
`edges: []` — its own comment: *"no causal edges asserted between filings — none are observed."*
Every node in the live graph has zero edges, always. `identitykernel.js`'s `fragmentationPoints`
(nodes with no inbound edge except root seeds) is therefore currently **degenerate** in the live
path: with no edges anywhere, it cannot distinguish "a weak relationship exists but hasn't
strengthened" from "no relationship was ever asserted." It just detects "has no edges," which is
trivially true of every node today.

**Why these are coupled, not two separate items — revised per the ontological-subject
correction below:** not simply Gap 2 = producer → Gap 1 = consumer. More precisely: **Gap 2 =
relational substrate/formation → Gap 1 = lifecycle classification.** What constitutes an
admissible relationship determines what SUB-THRESHOLD can mean; what SUB-THRESHOLD must classify
determines what relational evidence the substrate must expose. Closing Gap 2 without Gap 1 gives
real edges with no principled way to say what they mean epistemically (risk of premature "this is
structure" claims). Closing Gap 1 without Gap 2 gives a well-defined category that stays
permanently empty, or gets pointed at the wrong substrate. They need to be designed against each
other, not sequentially.

**The sharper risk, specifically for Gap 2:** `identitykernel.js`'s merge machinery already
speaks fluent graph language — "structural similarity," "nodes," "edges," "merge" — while
currently operating on zero actual relationships. `computeStructuralSimilarity` really does
compare shared evidence (`seedId` overlap) and shared type (`evidenceType` Jaccard) between two
event graphs — but shared evidence-type and shared seedId overlap is **node-attribute
similarity**, not a relationship anyone asserted between the nodes. Wiring `shouldMerge`/
`mergeEvents` into the live pipeline *before* Gap 2 is closed would produce output that looks
exactly like structural formation — same field names, same thresholds — while actually only
reflecting "these share some evidence types and overlapping time windows." Not a missing
feature — a sophisticated-looking mechanism that could be trusted as relational before it is one.

**Empirical check of the EDGAR 8-K pipeline, this session — no theorizing from field names.** Read
`toEvidenceNode()` (`edgar8kevidence.js`) and its upstream `createObject()` call
(`edgar8kconnector.js`) directly:
- `content`/`summary` are both labels describing the filing itself (`"8-K — {eventClass}"`,
  `"SEC 8-K — items: X. Filed {date}."`) — not references to another object.
- `metadata` keys (`cik`, `accessionNumber`, `ticker`, `canonicalName`, `eventClass`, `items`,
  `materiality`, `groundedness`, `sourceURL`, `filingDate`) all describe attributes of *this*
  filing. None reference a different filing or entity.
- `seedId` equals `id` — it's the node's own identity key, not a link elsewhere.
- `entityKey` is co-membership only, by the adapter's own comment: partitions by
  `(entity, eventClass)`, explicitly acknowledged as coarse — *"two separate executive changes a
  year apart still land in one event... Inventing a date-proximity threshold here would be
  fabricating identity."*
- `genealogy: {}` on the raw `RealityObject` (`edgar8kconnector.js`) — hardcoded empty. A second
  designed-but-unpopulated relational hook, one layer upstream of `predecessorIds`/`successorIds`.

**Conclusion for EDGAR 8-K specifically: not a criteria-definition problem, a data problem.** No
field at any layer of that one pipeline currently carries a cross-object reference.

**Correction, from a full connector inventory this session — do not stop at EDGAR.** An earlier
pass concluded no connector produces instance-level relational evidence and treated the inventory
as closed. That conclusion was wrong. Continuing the inventory across all 31 connectors found:

- **`patentsviewconnector.js` → `entitytopologyregistry.js` is real, live, and instance-level.**
  `runPatentsViewSync()`'s migration-tracking path groups real patents by real `inventor_id`; when
  one inventor's patents split across 2+ real `assignee_organization` values in a 90-day window,
  it calls `registerInventorMigrationEdge(sourceOrg, destOrg)` — a real edge between two real named
  organizations, deterministically derived, not fabricated. **Confirmed live end to end:**
  `runPatentsViewSync()` is called from `app.jsx:787,820` → edge lands in
  `entitytopologyregistry.js` → read by `causalimpactmap.js` → rendered by `causalimpactview.jsx`,
  which is mounted at `analysisidlefield.jsx:1645` as the live "IMPACT" tab.
- **`secownershipconnector.js` is the same shape, built correctly, but unwired.** Real SEC
  13D/13G ownership edges (subject company ↔ beneficial owner, CIK pairs — its own comment:
  *"structurally guaranteed entity pair... not extracted from prose"*), routed through the actual
  `Gᵂ → σ → Σ → πΣ` path (`gwrealiser.js`/`sigmaengine.js`), not through `identitykernel.js`.
  `runSecOwnershipSync()` itself has **zero callers** — real mechanism, same dormant pattern as
  `identitykernel.js`'s merge machinery, just in a different file.
- **`signalgenealogy.js` has real, live edges too** (via `reconlayer.js`), but at the wrong
  granularity for this purpose — a hand-authored prior over signal *categories*
  (`CONSTRUCTION_PERMITS →CAUSES→ POWER_INFRA`), not asserted relationships between specific
  evidence instances.

**Revised Gap 2 finding — corrected a second time, this session, for overclaiming the first
correction.** It is not "KRYLO has no live producer of instance-level relational evidence" — that
was wrong. But it is also not simply "solved by `entitytopologyregistry.js`" — that was an
overcorrection. The precise finding requires distinguishing the **ontological subject** of the
relationship:

- `entitytopologyregistry.js`'s edges connect **entities** — `Organization A → Organization B`,
  derived from an inventor's migration between employers. Real, live, instance-level, but the
  subject is *entity-to-entity*.
- `identitykernel.js`'s `EvidenceGraph` nodes are **individual pieces of evidence** — one filing,
  one document. A relationship it would need is *evidence-instance-to-evidence-instance*: does
  this specific piece of evidence relate to that specific piece of evidence.

An entity-level relationship does not automatically imply anything about a relationship between
specific pieces of evidence concerning those entities. These are different subjects, not
interchangeable substrates. Gap 2 is therefore **renamed: Relational Formation / Representation
Alignment.** The capability to produce real, live, instance-level relational edges is proven to
exist (disproving the original "KRYLO can't do this at all" framing) — what remains open is (1)
which existing representation is the semantically valid substrate for the structural-formation
lifecycle Gap 1 defines, given the two are different ontological subjects, and (2) how that
representation would be composed with `EvidenceNode`/`CanonicalEvent` without silently collapsing
"these two entities are connected" into "this evidence constitutes structure" — a category error
the taxonomy in Gap 1 exists specifically to prevent.

**Status, precisely:** Gap 1 — unresolved, definitional (SUB-THRESHOLD doesn't exist as a
governed state anywhere). Gap 2 — partially resolved empirically (the capability-gap framing is
disproven), unresolved architecturally (which substrate, and how it composes, remains open).
EDGAR 8-K's zero-relational-data finding stays scoped to that one connector — not generalized into
a KRYLO-wide limitation, since `entitytopologyregistry.js` demonstrates the wider claim was false.

---

## SOLUTION

### 2A — Relational Formation / Representation Alignment — substrate and composition

**Not "which mechanism to invent" — "which existing representation is the valid substrate,
given two exist at different ontological levels."** `entitytopologyregistry.js` is a live, real,
*entity-level* relational edge store, fed today by `patentsviewconnector.js` (confirmed live) and
correctly built by `secownershipconnector.js` (confirmed unwired, needs a sync trigger, not a
redesign). `identitykernel.js`'s `predecessorIds`/`successorIds` are a *second*, separate, empty
hook on a *different* data structure (`EvidenceNode` — individual pieces of evidence, not
entities) — still real, still unpopulated.

The open design question is not which path is "highest-leverage" by virtue of already being
live — it's which ontological subject Gap 1's taxonomy is actually about:
1. **If the taxonomy is about entity relationships** (do these two organizations have a
   structurally persistent connection), `entitytopologyregistry.js` may be directly usable —
   real, live edges already exist at that level.
2. **If the taxonomy is about evidence relationships** (does this specific piece of evidence
   relate to that specific piece of evidence, the way `identitykernel.js`'s `EvidenceGraph` is
   shaped), the registry does not answer that question — an entity connection doesn't establish
   an evidence connection. This path still requires either new EDGAR ingestion (confirmed this
   session: no field currently carries a cross-object reference) or a different connector that
   captures evidence-level references, not just entity-level ones.

Any admissible relationship type, in either path, has to ground in a real observable field, not a
plausible-sounding category invented for the occasion, and must not silently substitute one
ontological subject for the other — same discipline already applied to `DOMAIN_PRECURSORS` and
the CICE rewrite table earlier tonight: the mechanism is implemented here, the actual
admissible-type vocabulary is a Founder content decision.

### 2B — Taxonomy (the consumer)

**Three-state lifecycle, replacing an implicit true/false:**

```
ABSENT  →  SUB-THRESHOLD (present, not yet structurally persistent)  → [REDEMPTION] → STRUCTURALLY PERSISTENT
```

**Redemption** names the transition event itself — the discrete moment a SUB-THRESHOLD
relationship crosses the merge condition and becomes STRUCTURALLY PERSISTENT. A relationship
doesn't drift into structure, it gets redeemed into it — a specific, evaluable event with its own
conditions (`shouldMerge`'s thresholds) and its own operation (`mergeEvents`), not a side effect
of a score creeping upward.

`fragmentationPoints` does not itself implement or classify SUB-THRESHOLD — per Gap 2 above, it's
currently degenerate in the live path. Once Gap 2 supplies real edges, it becomes a genuine
observable that may supply evidence for the state — not before.

**The transition mechanism already exists, unwired, and was traced this session (not just
inspected in isolation):**
- `shouldMerge(eventA, eventB, thresholds)` — entity-key absolute gate (KRYL-1092) → structural
  similarity above `tau_structural` (0.60, boosted toward 0.90 when STRUCTURAL-tier evidence is
  present) → temporal overlap above `tau_temporal` (0.30, computed from real `timeWindow`
  timestamps) → merged stability doesn't drop below either input's own stability. Real,
  relational (not attribute-only, per KRYL-1092's documented fix), non-circular against the
  stability computation.
- `mergeEvents(eventA, eventB)` — unions the graphs, rebuilds continuity/branching/
  stability/fragmentation from the result. Zero live callers.
- `shouldSplit(event, thresholds)` — reverse transition, stability floor + fragmentation ceiling.
  Zero live callers, consistent with the rest.
- Persistence: real. `edgar8kevidence.js` stores `CanonicalEvent`s in a live module-level `Map`,
  read by `whytracepanel.jsx` in production. But it **rebuilds each event from scratch every
  sync** rather than calling `shouldMerge`/`mergeEvents` incrementally — the store persists, the
  merge lifecycle is bypassed entirely, today.
- Provenance: real and deliberately walled off. `createCanonicalEvent` emits a lineage event via
  `identitylineage.js`, whose own header forbids import by `structuralconfirmation.js`/
  `metricsengine.js`/`domaingravity.js` — a real, intentional boundary against self-referential
  scoring loops, not a gap.

**A live foothold for the vocabulary already exists, at a different granularity:**
`reconlayer.js`'s `detect_blind_spots()` flags `missingClass: 'COUPLING'` live in production
(RECON tab) when two domains diverge — domain-level aggregate scores, not
`identitykernel.js`'s node/edge graph. Same conceptual neighborhood, different granularity,
currently unconnected.

---

## WHAT THIS IS NOT (guardrails, verified against real code this session)

- **Not a new Lean Ontology primitive.** Both gaps are a mechanism (2A) and a state classification
  (2B) within the existing structural lifecycle — the ontology (O/E/R/ℒ/Gᵂ/Σ/πΣ) stays closed.
- **Not the same axis as SCI.** `structuralconfirmation.js`'s own header: *"Post-formation
  only — never influences identity."* SCI scores how well-grounded an already-formed structure's
  evidence is, independent of whether the formation transition happened. Stays separate.
- **Not `convergenceclassifier.js`'s D/V/A/T vector.** Verified: the one live caller
  (`analysisidlefield.jsx`'s `deriveProxy`) builds `dependency_count` from raw event count, not
  relational structure. Reusing the threshold+hysteresis *pattern* is reasonable; reusing its
  current semantics or calling event-count "relational density" is not.
- **Not an assertion of a suppressing mechanism.** Sub-threshold relationships are described
  epistemically ("evidence of a weak relational configuration that has not yet crossed the
  conditions required for structural persistence"), not causally, unless a real suppressing
  mechanism is actually evidenced.
- **Not "add edges" as a blanket instruction.** Gap 2's resolution is specifically: which
  observable fields justify an asserted relationship, under Projection-not-Prediction — not a
  mandate to populate `predecessorIds`/`successorIds` with whatever's convenient.

---

## COMPONENTS

| Component | Status |
|---|---|
| `entitytopologyregistry.js` (real instance-level edge store) | **Exists, live, populated.** Fed by `patentsviewconnector.js`'s inventor-migration edges (confirmed real, deterministic, not fabricated) |
| `patentsviewconnector.js` → registry → `causalimpactview.jsx` | **Confirmed live end-to-end** — `runPatentsViewSync()` called from `app.jsx:787,820`, rendered at `analysisidlefield.jsx:1645` ("IMPACT" tab) |
| `secownershipconnector.js` (real ownership edges via Gᵂ→σ→Σ→πΣ) | Exists, code-complete, correctly routed — `runSecOwnershipSync()` has **zero callers** |
| `signalgenealogy.js` edges (via `reconlayer.js`) | Exists, live, but category-level prior, not instance-level evidence — wrong granularity for Gap 2 |
| `predecessorIds`/`successorIds` on `EvidenceNode` (2nd, separate hook) | Defined, exists, **populated nowhere, read nowhere** — a different data structure than the registry above |
| `fragmentationPoints` (Gap 1 candidate evidence source, `identitykernel.js` path only) | Exists, live, but **degenerate** in the `edgar8kevidence.js` path (zero edges everywhere) |
| `shouldMerge` / `mergeEvents` / `shouldSplit` (Redemption mechanism) | Exists, code-complete, traced this session end-to-end, **zero live callers** |
| `CanonicalEvent` persistent store | Exists, live (`edgar8kevidence.js`'s `_events` Map), read by `whytracepanel.jsx` — but rebuilt from scratch each sync, never incrementally merged |
| Provenance/lineage on formation events | Exists, live, deliberately isolated from scoring per `identitylineage.js`'s own boundary |
| `detect_blind_spots` COUPLING concept (live vocabulary foothold) | Exists, live, `reconlayer.js` — different granularity than `identitykernel.js` |
| SUB-THRESHOLD as a named, classified state (Gap 1) | Does not exist anywhere — not in §22, not in code, not yet evaluated against the registry's real edges |
| Temporal-confirmation requirement on Redemption | Not yet designed — implementation question, not preselected (see VALIDATION) |

---

## VALIDATION

Not applicable — nothing authorized to build yet. If this is ever specced for implementation,
Definition of Done would need to cover at minimum:

**Gap 2 (Relational Formation):**
- Every asserted relationship traces to a real, observable field on the `EvidenceNode`(s)
  involved — no relationship asserted from inference, pattern-matching, or plausibility alone.
- `predecessorIds`/`successorIds` (or whatever mechanism is chosen) are populated by a
  deterministic, reviewable process — same discipline as `DOMAIN_PRECURSORS`/CICE's rewrite
  table: the agent implements the matcher, the Founder owns the vocabulary/criteria.

**Gap 1 (Taxonomy):**
- SUB-THRESHOLD is representable as a distinct, classified state — not collapsed into any of
  §22's four absence categories, and not silently promoted to STRUCTURALLY PERSISTENT.
- The Redemption transition is discrete (a state change), not a smoothly increasing confidence
  score standing in for the decision.
- SCI and the formation-state remain architecturally separate.
- No code path describes a sub-threshold relationship as actively "suppressed" without real
  evidence of a suppressing mechanism.
- The Redemption transition is not caused by a single unsubstantiated transient observation.
  Whether hysteresis specifically is the correct mechanism is an implementation design question,
  not preselected here.

**Coupling check (both gaps together):**
- The taxonomy's SUB-THRESHOLD boundary conditions are validated against what Gap 2's
  relationship-formation mechanism can actually produce — not designed in isolation and hoped to
  fit.

---

## ROLLBACK

Nothing built — design record only.

---

## GUIDELINES

- Don't add a seventh Lean Ontology primitive. Gap 2 is a mechanism, Gap 1 is a state
  classification, both within the existing structural lifecycle.
- Don't wire `shouldMerge`/`mergeEvents` into any live pipeline before Gap 2 is closed — doing so
  would produce output that looks relational (right field names, real thresholds) while actually
  only reflecting node-attribute similarity, not asserted relationships.
- Don't treat "add edges" as sufficient instruction for Gap 2 — the actual design question is
  which observable fields justify an asserted relationship.
- Don't conflate the formation-state with SCI, or reuse `convergenceclassifier.js`'s event-count
  semantics as if they were relational.
- Don't assert a causal suppression mechanism without evidence.
- `identitykernel.js`'s merge/split mechanics and `reconlayer.js`'s live COUPLING detection are
  two real, uncomposed pieces at different granularities — any future work here is composition of
  what exists, not a new build from zero.
- Don't substitute `entitytopologyregistry.js`'s entity-level edges for evidence-level
  relationships without justification. "Organization A and Organization B are connected" does not
  establish "this piece of evidence relates to that piece of evidence" — different ontological
  subjects. Treating them as interchangeable because both are technically "relational data" is
  the same category of error as treating similarity as a relationship.
