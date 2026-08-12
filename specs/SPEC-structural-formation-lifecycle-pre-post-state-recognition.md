# SPEC — Structural Formation Lifecycle: Relational Formation + Pre/Post-State Recognition

Status: **TWO COUPLED GAPS IDENTIFIED — NOT BUILT.** Design record from an extended architecture
verification discussion (2026-08-12), relayed from an external AI across many rounds; each
substantive claim was checked against real code in this conversation before being recorded here
— not accepted at face value.
Date: 2026-08-12
Target file(s) if ever built: `src/engine/identitykernel.js` (dormant mechanism),
`src/engine/connectors/edgar8kevidence.js` (the one live CanonicalEvent producer),
`src/engine/reconlayer.js` (live, adjacent mechanism), doctrine addition to CLAUDE.md §22.

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

**Why these are coupled, not two separate items:** Gap 2 is the producer — it's what would
generate real candidate relationships. Gap 1 is the consumer — it's what determines whether a
given piece of relational evidence counts as absent, sub-threshold, or persistent. Closing Gap 2
without Gap 1 gives real edges with no principled way to say what they mean epistemically (risk
of premature "this is structure" claims). Closing Gap 1 without Gap 2 gives a well-defined
category that stays permanently empty. They need to be designed against each other, not
sequentially — the taxonomy's boundaries should reflect what real relational evidence can
actually look like; the relationship-formation mechanism should know what classification its
output needs to satisfy.

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

---

## SOLUTION

### 2A — Relational Formation (the producer)

Not inventing a mechanism from zero. `createEvidenceNode` (`identitykernel.js`) already defines
`predecessorIds`/`successorIds` on every node — checked this session: **nothing anywhere in the
codebase ever populates these with a real value, and nothing reads them to build edges.** It's an
existing, designed, empty slot, not a gap requiring a new field.

The open design question is narrower than "add edges": **what relationships between existing
EvidenceNodes can be asserted from fields that are actually observable today, under
Projection-not-Prediction — without inventing causality?** Real fields currently on
`EvidenceNode`: `seedId`, `evidenceType`, `content`, `metadata`, `timestamp`,
`predecessorIds`/`successorIds` (empty), plus `entityKey` at the `CanonicalEvent` level.
Any admissible relationship type has to ground in one of these, not a plausible-sounding category
invented for the occasion — same discipline already applied to `DOMAIN_PRECURSORS` and the CICE
rewrite table earlier tonight: the mechanism is implemented here, the actual admissible-type
vocabulary is a Founder content decision, not something to enumerate unprompted in this spec.

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
| `predecessorIds`/`successorIds` on `EvidenceNode` (Gap 2 hook) | Defined, exists, **populated nowhere, read nowhere** — confirmed via grep this session |
| Admissible-relationship-type definition (Gap 2 design question) | Does not exist — needs grounding against real observable fields, vocabulary is a Founder content decision |
| `fragmentationPoints` (Gap 1 candidate evidence source) | Exists, live, but **degenerate** in the one live path (zero edges everywhere) |
| `shouldMerge` / `mergeEvents` / `shouldSplit` (Redemption mechanism) | Exists, code-complete, traced this session end-to-end, **zero live callers** |
| `CanonicalEvent` persistent store | Exists, live (`edgar8kevidence.js`'s `_events` Map), read by `whytracepanel.jsx` — but rebuilt from scratch each sync, never incrementally merged |
| Provenance/lineage on formation events | Exists, live, deliberately isolated from scoring per `identitylineage.js`'s own boundary |
| `detect_blind_spots` COUPLING concept (live vocabulary foothold) | Exists, live, `reconlayer.js` — different granularity than `identitykernel.js` |
| SUB-THRESHOLD as a named, classified state (Gap 1) | Does not exist anywhere — not in §22, not in code |
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
