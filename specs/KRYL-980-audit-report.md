# KRYL-980 — Phase 0 Audit Report

**Ticket:** KRYL-980 — Concept-level "Why" Trace Audit
**Date:** 2026-07-04
**Scope:** Determine whether KRYLO's existing evidence chain already provides a human-legible, end-to-end "why was this detected" trace, before specifying any new build.

## Audit Surface (files actually read)

- `src/engine/identitykernel.js` — WO-2004, CanonicalEvent identity resolution, merge/split
- `src/engine/identitylineage.js` — WO-2007B, identity mutation event bus
- `src/engine/structuralconfirmation.js` — WO-2005B, SCI computation
- `src/engine/evidencetiers.js` — WO-2005A, evidence taxonomy (governance layer, no scoring)
- `src/engine/identitydynamics.js` — WO-2008, temporal formation dynamics
- `specs/WO-2004-canonical-event-identity-kernel.md` — canonical identity spec (referenced, not re-read in full; code matches header description)

## a. Coverage Matrix — module → role → evidence contribution type

| Module | Role | What it already exposes |
|---|---|---|
| `evidencetiers.js` | Governance taxonomy | Every evidence type has a **named, human-legible role**: `epistemicClass` (STRUCTURAL/OPERATIONAL/FINANCIAL/NARRATIVE/SPECULATIVE), `canonicalRole` (e.g. `CAUSAL_PRECURSOR`, `ANOMALY_DETECTOR`, `ENTITY_LINKED`), `persistence`, `decayModel`. This alone answers "what *kind* of thing is this evidence and why does its class matter" — no scoring, pure descriptor. |
| `structuralconfirmation.js` (`computeSCI`) | SCI computation | Returns `{ score, groundedness, coveredTypes, classCoverage, discountedTypes }`. `coveredTypes` names every evidence type that contributed; `classCoverage` breaks that down by epistemic tier; `discountedTypes` names which entity-bound types were discounted for lacking verification, **and the entity-verification reason is inspectable** (`ENTITY_DISCOUNT` applied when `entityBound && !verified`). This is a real, working type-level "why" trace already. |
| `identitylineage.js` (`getHistory`) | Identity mutation trace | Full, queryable, timestamped event history per `identityId`: `CREATED / NODE_ADDED / MERGED / FRAGMENTED`, each with `trigger`, `stabilityBefore`, `stabilityAfter`. This answers "why did this CanonicalEvent's identity evolve the way it did" — already a legible causal trace, already auditable via `getHistory(identityId)`. |
| `identitydynamics.js` | Temporal formation dynamics | `computeStabilityVelocity` / `computeTruthLifecycle` classify *how fast and in what direction* belief is forming (FORMING/STABLE/FRACTURING; NASCENT→RESOLVED phases), read-only over the lineage stream. Answers "is this still forming or has it settled," a dimension COMPASS's static concept-bottleneck snapshot doesn't have. |
| `identitykernel.js` (`shouldMerge`/`shouldSplit`) | Merge/split predicates | The actual boolean logic (`computeStructuralSimilarity`, `computeTemporalOverlap`, stability comparison) is inspectable code, not opaque — the *predicate values* aren't currently surfaced as part of any exported trace object, only consumed internally. |

## b. Gap Table

| Gap | Severity | Remedy or status |
|---|---|---|
| **No per-node attribution, only per-type.** `computeSCI`'s internal loop already computes `contribution = cal.anchorStrength * independence` **per individual evidence type**, weighted by `tw` (tier weight) — but this per-type contribution number is computed into the running `raw` sum and then **discarded**; only the final aggregate `score` and the type *names* (not their individual contribution values) are returned. | Medium | **Remedy, not a rebuild**: expose the already-computed per-type `contribution` value that's currently thrown away inside `computeSCI`'s loop. This is a return-shape change to an existing function, not a new attribution formula. No w_i × f_i × t_i invention needed — the real number already exists one line before it's discarded. |
| **No single joined "why" object.** Identity lineage, SCI, and truth dynamics are each independently queryable (`getHistory`, `computeSCI`, `computeTruthDynamics`) but nothing currently joins them into one explanation surface for a UI/consumer to read in one call. | Low-Medium | **Remedy, not a rebuild**: a thin join/presentation function that calls the three existing exports and assembles their outputs into one response shape. This is legitimately new code, but it's a join over existing outputs, not a new scoring/attribution subsystem. |
| **No structured provenance graph, only a flat event list.** `getHistory()` returns a chronological list, not a graph tying specific evidence nodes to specific score contributions (the `trace_edges[]` concept from the earlier draft). | Low | Only worth building if a consumer actually needs graph traversal rather than a flat trace — recommend deferring until a concrete UI/consumer requirement names this need. Not required to close the "why was this detected" ask. |

## c. Recommendation: **GAP-LIST** (but small)

Two of three prior drafts' assumptions don't hold up: this does **not** need a new `w_i × f_i × t_i` attribution formula (KRYL-977/976-dependent), and it does **not** need `KRYL-976`/`KRYL-977` to exist first. The real gap is much smaller than the original Phase-1 build spec assumed:

1. Expose the per-type `contribution` value already computed (and discarded) inside `computeSCI()`.
2. Write a thin join function over `identitylineage.getHistory()` + `structuralconfirmation.computeSCI()` (with the fix above) + `identitydynamics.computeTruthDynamics()`.

Both are small, low-risk, additive changes to already-existing, already-working code — not a new subsystem. No new primitives, no new ontology, no dependency on unbuilt tickets. This satisfies the original ticket's mandate: audit first, and only build what the audit actually finds missing.
