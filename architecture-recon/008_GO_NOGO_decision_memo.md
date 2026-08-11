# KRYLO Lean Ontology — GO / NO-GO Decision Memo

Status: Architecture Recon / NOT a build spec. Formal decision artifact, consolidating audits
001-007. No code changed to produce this document.

## The question being decided

"Can the Lean Ontology (rc3) be adopted as an architectural layer for KRYLO by composing and
extending existing, live primitives — without discarding what already works and without
inventing ontology elements that violate the Non-Invention Rule (rc3 §13)?"

This memo does **not** decide "should we start writing implementation code." That is a separate,
later gate — see Scope of this decision, below.

## Evidence base

| Audit | Subject | Commit |
|---|---|---|
| 001 | WO-2004 Identity Kernel — field-level extraction | `366c9de` |
| 002 | WO-2005B Structural Confirmation Engine — field-level extraction | `366c9de` |
| 003 | O (Object) exhaustive scan | `0ce9d9e` |
| 004 | R (Relationship) exhaustive scan | `0ce9d9e` |
| 005 | FINAL Master Reconciliation (all primitives, one table) | `0748d12` |
| 006 | πΣ vs Evidence-Tier normative memo | `a007489` |
| 007 | G_W/M₁ Realiser Decision Note (recommends virtual) | `747568e` |

## Decision, by primitive (as established in 005, restated here for the formal record)

| Lean primitive | Decision |
|---|---|
| O | GO — adapt/reconcile existing `entityresolution.js` + `entityregistry.json` |
| E | GO — reuse `identitykernel.js` (WO-2004) as-is |
| R | GO — adapt/reconcile existing `entitytopologyregistry.js` (already live, already SEC-filing-sourced) |
| ST | GO — formalize/adapt existing lifecycle mechanisms (`CanonicalEvent.status`, `entitystateledger.js`) |
| T | GO — formalize a temporal/window contract on top of existing timestamps; no monotonic clock exists yet, must be defined |
| SO | GO — reconcile existing evidence-descriptor and edge-source fields into one naming convention |
| ℒ | GO — define normalization, **with the standing caveat that this row is doctrinal, not yet code-audited** (carried forward from 005) |
| σ | GO — bind existing Route-Don't-Aggregate pattern to whichever G_W realization is chosen |
| G_W | ARCHITECTURAL GAP, resolved in 007 — recommendation: virtual/on-demand (Option B), not materialized |
| Σ | ARCHITECTURAL GAP — no existing code constructs `⟨G_Σ, props_Σ, π_Σ⟩`; WO-2005B is a candidate metrics *producer* for a future Σ engine, not Σ itself |
| π_Σ | ARCHITECTURAL GAP at instance level — `ProvenanceDAG` is the correct substrate to *extend*, per 006, not replace |
| Integrity (I(Σ)) | GO — keep `structuralintegrity.js`'s vector and WO-2005B's SCI-CONFIRMATION distinct (naming-collision note, 001/002/005) |

**10 of 12 rows: GO (reuse or adapt/reconcile existing KRYLO machinery).**
**2 of 12 rows: confirmed architectural gap (G_W has a resolved recommendation; Σ and π_Σ do
not yet — they are exactly what Specs B/C/D exist to close).**

## Decision

**GO — for architecture and specification work.**

Justification, restated from 005: this is not a green-field ontology implementation. The
majority of Lean Ontology's required primitives already have live, working, real-world-tested
KRYLO analogues (O via entity resolution wired into real EDGAR connectors; E via WO-2004; R via
entity-topology edges live-written from real SEC filings; provenance via ProvenanceDAG; evidence
weighting via evidencetiers.js/structuralconfirmation.js; integrity via structuralintegrity.js's
vector). The confirmed gaps (Σ, instance-level π_Σ) are specific, bounded, and each has a named
existing system to build *on top of* rather than build from nothing.

**NO-GO would have been the correct call if** the audits had found O, E, R, and provenance all
absent — that would mean adopting the Lean Ontology requires inventing a parallel identity/event/
relationship/provenance system alongside KRYLO's existing ones, which the Non-Invention Rule
(rc3 §13, "compose first, invent second") would itself forbid without first proving no composition
path exists. That is not what was found.

## Scope of this GO — what it does and does not authorize

| In scope (authorized by this GO) | Out of scope (NOT authorized by this GO) |
|---|---|
| Drafting Specs A-E (architecture/interface specifications) | Writing or merging any implementation code |
| Referencing audits 001-007 as the frozen evidence base for those specs | Refactoring `TypeClassifier.js`, connectors, or any existing file |
| Opening an Architecture-Freeze Jira ticket with this memo + 005 as attachments | Opening any Jira ticket with a build/implementation label |
| Further spec-level reconciliation (e.g. resolving M₃/M₄ boundary details inside Spec C/E) | Creating a Jira WO number under KRYL for any of this — per project convention (Jira-exclusive numbering), a real ticket number is assigned when a human opens the ticket, not by this document |

**Implementation authorization is a separate, later gate**, reached only after Specs A-E are
individually drafted, reviewed, and frozen. This memo does not pre-authorize that gate — each
spec earns its own "Go" the same way every WO in this codebase always has (CLAUDE.md §11,
"No code is written without a WO and explicit 'Go.'").

## What would change this decision

- If a future spec draft (A-E) discovers that reconciling an existing system (e.g.
  `entitytopologyregistry.js`'s v1/v2 identity split) requires changes so large they amount to a
  rewrite rather than an extension, that specific spec's GO should be re-evaluated — it would not
  automatically revoke this memo's overall GO, since the finding would be local to one primitive.
- If the ℒ row's doctrinal-only status (flagged in 005 and repeated here) is code-audited and
  found not to match what's claimed, that row's GO should be revisited before Spec E (M-Spine /
  Temporal Semantics, which depends on ℒ) is frozen.

## Sign-off

This memo records the architectural finding and the reasoning behind it. It is not a Founder
approval record — that happens at the Architecture-Freeze Jira ticket this memo is meant to
attach to, per the sequence already established (CLAUDE.md-equivalent WO protocol: no code
without an explicit Go from Mr. XS).
