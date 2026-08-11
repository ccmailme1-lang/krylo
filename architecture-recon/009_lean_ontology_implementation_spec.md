# KRYLO Lean Ontology — Implementation Specification

Status: **FROZEN** (2026-08-10, Founder authorization). Derived from the frozen reconciliation
(audits 001-008, commits `366c9de`, `0ce9d9e`, `0748d12`, `a007489`, `747568e`). One unified
document, per direction — not split into separate A-E tickets. Jira WO pending (blocked on Jira
API token rotation — see architecture-recon session notes; the token in specs/jira.md was
exposed in-session on 2026-08-10 and must be rotated before any live API call using it).

## Purpose

Make the Lean Ontology's primitives (O, E, R, ST, T, SO, ℒ, G_W, σ, Σ, πΣ) operational inside
KRYLO by reusing existing live machinery wherever the reconciliation found it sufficient, and
building only where a real gap was confirmed. Every claim below cites the audit it comes from.

## Reuse — no new code

These primitives are satisfied by existing, live KRYLO code as-is. Nothing here changes.

| Primitive | KRYLO module | Cited |
|---|---|---|
| E | `identitykernel.js` (WO-2004) — `createCanonicalEvent`, `createEvidenceNode`, merge/split | [001] |
| σ | Route-Don't-Aggregate pattern (§21) + WO-2005B's compute-on-demand style | [002] |
| Integrity vector | `structuralintegrity.js` β_c = ⟨SCI, CSAT, ISI, RCC, UE⟩ | [002], [005] |

## Extend — build on top of an existing system, don't replace it

These primitives have a real existing substrate that is insufficient as-is, but the extension
target is named and specific — not a green-field build.

| Primitive | Existing substrate to extend | What's missing | Cited |
|---|---|---|---|
| O | `entityresolution.js` + `entityregistry.json` | Lifecycle timestamps; `createEntity`/`upsertEntity`/`mergeEntity` — currently static, hand-curated, read-only | [003] |
| R | `entitytopologyregistry.js` v2 `TYPED_EDGES` | Closed predicate vocabulary (only `BENEFICIAL_OWNER_OF` observed live); `valid_from`/`valid_to` temporal validity (currently creation-`ts` only); v1/v2 identity-scheme bridge (documented live bug) | [004] |
| ST | `CanonicalEvent.status` (ACTIVE/FRAGMENTED) + `entitystateledger.js` (KRYL-974, built but zero live callers) | Formal reconciliation of which states map to Lean ST; decide whether to wire the ledger in or retire it | [001], [003] |
| T | `Date` wall-clock timestamps throughout | No monotonic source; no `W=[t1,t2]` window contract as a first-class thing — only `computeStructuralMomentum` applies a window filter, and it has zero live callers | [001], [002] |
| SO | Evidence-type descriptors (`evidencetiers.js`) + edge `source` field (`entitytopologyregistry.js`) | No single unified "where did this observation come from" field across O/E/R — two separate naming conventions today | [002], [004] |
| πΣ | `ProvenanceDAG` (WO-1336) — immutable, cycle-checked event lineage | Instance-level link records (`evidence_id ↔ {vertex\|edge\|property}_id`) don't exist yet; current traceability (WO-2005B's `perTypeContribution`) is type-level only | [002], [006] |

## Build — confirmed gap, no existing KRYLO analogue

| Primitive | What's missing | Recommended shape | Cited |
|---|---|---|---|
| G_W | No windowed snapshot graph construct anywhere audited | **Virtual/on-demand query function** over the O/E/R stores (reuse+extend targets above), scoped to a window + ℒ=⊤ filter — NOT a persisted/materialized object. Recommendation locked in [007]. | [007] |
| Σ | No code anywhere constructs `⟨G_Σ, props_Σ, π_Σ⟩` — WO-2005B produces flat metrics only, never reads `.edges` | A new structure-engine function that reads from G_W (once it exists) and the extended R/O substrate, emits an actual vertex/edge/properties object, and attaches πΣ links per element as it's built — not after the fact | [002] |

## Explicit non-goals (per the reconciliation, not to be revisited without new evidence)

- `TypeClassifier.js` stays untouched — downstream consumer, not ontology substrate [audit discussion, not itself a numbered file]
- No new clock/time module invented — extend existing timestamp usage per the T row above, don't build a parallel clock system
- No materialized G_W, per [007]'s locked recommendation, unless a future performance problem is observed and explicitly re-opens that question
- πΣ stays binary — evidence weighting is never folded into it, per [006]

## Dependency order

1. **R extension** (predicate vocabulary, temporal validity, identity bridge) — needed before Σ
   can construct a meaningful E_Σ, since Σ's edges are expected to be real R relationships.
2. **O extension** (lifecycle, create/update) — needed before G_W can treat O as a first-class
   participant rather than a static lookup table.
3. **G_W realiser** (virtual query function, per [007]) — depends on 1 and 2 having stable shapes
   to query against.
4. **πΣ extension** (instance-level provenance links on `ProvenanceDAG`) — can proceed in
   parallel with 1-3; it extends a different existing system.
5. **Σ engine** — depends on G_W (3) and πΣ (4) both being real, since Σ is defined as
   `⟨G_Σ, props_Σ, π_Σ⟩` and needs both a graph source and a traceability mechanism to attach.
6. **T/SO/ST formalization** — naming/contract work, can happen alongside any of the above; not a
   blocking dependency for the others.

## What this document does not do

- It does not assign Jira ticket numbers — per this project's Jira-exclusive-numbering
  convention, that happens when a real ticket is opened, not inside a markdown file.
- It does not authorize writing any code. Per the hard constraint already set: every development
  change gets a frozen spec and Jira WO before build. This document is that spec, in draft form —
  freezing it is a separate, explicit step.
- It does not decide internal implementation details (function signatures, file names, exact
  schema fields) — those belong to whoever implements each item once this spec is frozen and a WO
  is opened.

## Status

**FROZEN.** Authorized to build against, per Founder direction 2026-08-10. Formal Jira WO number
still pending (blocked on token rotation, see header) — implementation proceeds under this frozen
spec in the interim; the WO number will be attached to these commits retroactively once issued.
