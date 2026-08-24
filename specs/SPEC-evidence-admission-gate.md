# SPEC — Evidence Admission Gate (EAG)

**Status:** RATIFIED (naming + EAC1-EAC5 contract) 2026-08-22/23, Founder. Written 2026-08-22 at
explicit Founder direction ("can you create the spec"), to close the dependency chain blocking
KRYL-1202 (Formation-Driven Closed-Loop Perception) via KRYL-1170 (CEPH-001 x KRYLCF
reconciliation).

## Scope, resolved: NARROW

Mapped every connector's real consumers 2026-08-22: ~25+ connectors call directly into `app.jsx`
today with zero existing gate. EAG does **not** retrofit those existing call sites. EAG gates only
the *new* path: a KRYL-1202 Observation Request's returned evidence, re-entering to produce a
Formation revision. This is now confirmed as the correct scope, not just the cheaper one — see
KRYL-1202's v1 Compatibility Rule (comment on that ticket, 2026-08-23): v1 deliberately routes new
evidence through the *existing* dispatch/provenance/Formation-inference substrate rather than
retrofitting or reinventing it. A broad retrofit of all existing connectors remains a separate,
unscoped, future initiative if ever wanted — not required by anything filed today.

## Naming collision found while writing this (RESOLVED — ratified 2026-08-22/23)

Two unrelated things share the name "Structural Integrity Layer" / "SIL v0.2" in this
repository:

1. **KRYLCF-1's SIL** — the Cognitive Fabric doctrine's evidence-admission authority, locked in
   the flow `Evidence -> Structural Integrity -> Cognitive Fabric -> Action`. Never implemented —
   confirmed by `specs/KRYLCF-1-through-6-canonical.md`: *"No mechanism for how raw external data
   becomes a validated SIL artifact... the actual admission process, interface, or queue is never
   specified anywhere in KRYLCF-1 through 6."*
2. **`specs/KRYL-RSCH-2026-07-StructuralIntegrityLayer.md`** — a real, partially-built, frozen v0.2
   research note (`src/engine/structuralintegrity.js`, live, wired into the OWNERSHIP report). An
   *internal self-audit instrument* over KRYLO's own already-computed formations (SCI/ISI/RCC). Its
   own text: "Internal Assurance Layer, not Universal Reasoning Auditor," "not a reasoning engine,"
   "never asserts truth and never increases interpretive strength," "audits [the Formation
   existence floor], never gates it."

These are opposite roles (#1 is an upstream evidence gate that doesn't exist; #2 is a downstream
self-audit tool that does exist and is explicitly forbidden from gating anything). This spec
proposes the working name **Evidence Admission Gate (EAG)** for #1's missing mechanism, so that
building it does not collide with, extend, or get confused with the already-built and already-
locked KRYL-RSCH-2026-07 instrument. **EAG is not a rename of KRYL-RSCH-2026-07's layer and must
never touch its code.** Same naming-hygiene pattern already applied in KRYL-1170 (renaming
CEPH-001's "arbitration" away from KRYLCF-2's Edge Arbitration Protocol). Final name is a Founder
call, not an agent call — same rule KRYL-1170 states explicitly.

## PROBLEM

KRYLO has real connectors producing raw evidence (`src/engine/connectors/*.js` — EDGAR, Companies
House, Wayback, EIA, etc.) and a real Cognitive Fabric doctrine (KRYLCF-1 through 6, all Jira
status "To Do") that assumes validated artifacts already exist before any Cognitive Fabric node
reasons over them. Nothing in the codebase or in KRYLCF-1 through 6 defines the layer in between:
how a raw connector payload becomes a "validated artifact" a Cognitive Fabric node (or, per
KRYL-1202, a Formation-generated Observation Request) is allowed to consume.

This gap is why KRYL-1202 (Formation-Driven Closed-Loop Perception) cannot reach build-ready: its
own spec requires "the request must be routable through the existing KRYLO evidence-intake
architecture and ultimately subject to SIL admission" (F5/§8), and that admission step is
confirmed absent, not merely unwired.

## SOLUTION (contract-level only — this spec does not design transport/queue/storage)

Define the minimum admission contract: what must be true of a piece of raw evidence before it may
be treated as a validated artifact usable downstream (by Cognitive Fabric nodes, by a KRYL-1202
Observation Request re-entry, or by any future consumer). Scoped narrowly on purpose — KRYLCF-5
(Memory Model) and KRYLCF-6 (Governance Model) are themselves unspecified backlog items, and this
spec must not invent their content.

**EAG's authority (mirrors KRYLCF-1's authority model, §"Authority model" in the canonical doc):**
- Validates candidate evidence only. Does not interpret, does not reason, does not create edges,
  does not assert structural claims.
- Does not overlap KRYL-RSCH-2026-07's instrument — that layer audits *already-computed KRYLO
  formations*; EAG validates *raw evidence before it becomes an artifact*. Different inputs,
  different point in the pipeline, no shared code path.
- Produces: an admitted artifact (or an explicit, first-class rejection record — never a silent
  drop, mirroring the Quarantine Ledger pattern already locked in KRYL-RSCH-2026-07 §6a).
- Does not produce: facts, validated relationships, structural truth, confidence scores.

**Minimum admission contract (EAC1-EAC5):**
- **EAC1 — Source identity.** Every candidate carries a real, traceable source (an existing
  connector's identity — reuses the `{source, domain, signal, confidence, ts}` tagging already
  locked in CLAUDE.md §12 Signal Ingestion Architecture; no new tagging scheme).
- **EAC2 — Provenance chain.** The candidate's lineage back to its originating connector call must
  be reconstructible (reuses existing provenance mechanisms per CLAUDE.md §2's "no second state
  store" default — extend `causalos/provenance.js` if it already covers this shape; do not invent
  a parallel provenance store).
- **EAC3 — Structural admissibility check.** A candidate is admitted only if it does not
  immediately contradict an already-admitted artifact under the same identity/time-window (the
  contradiction check itself reuses existing groundedness/`g_e` machinery already locked in
  KRYL-RSCH-2026-07 — EAG does not define a second contradiction metric).
- **EAC4 — Explicit rejection, never silent drop.** A candidate that fails EAC1-EAC3 produces a
  first-class rejection record (payload hash, failing check, timestamp) — never a null/undefined
  return, per CLAUDE.md §1 Absence-Is-Signal.
- **EAC5 — No confidence elevation.** Admission is binary (admitted / rejected). EAG must never
  compute or attach a confidence/strength score — that would duplicate `g_e` and violate CLAUDE.md
  §18 Orthogonal Axis Integrity.

## COMPONENTS (what this spec touches vs. explicitly does not)

**In scope for a future implementation ticket (not this spec):**
- One new pure-function module implementing EAC1-EAC5 as a gate in front of whatever currently
  lets a connector payload reach a consumer.
- A rejection ledger, reusing existing storage patterns (`rkmstore.js` or equivalent) — not a new
  store.

**Explicitly out of scope / non-goals:**
- No new transport, queue, or topic mechanism (KRYLCF's own gap list confirms none is specified
  anywhere yet — inventing one here would be exactly the "SIL Validation Queue" mistake the
  canonical doc already flagged and rejected as an unfounded inferred placeholder).
- No Cognitive Fabric node behavior (CCP/EAP remain untouched, KRYL-CF-002/004 scope).
- No change to KRYL-RSCH-2026-07's `structuralintegrity.js` — different layer, not extended, not
  renamed, not merged.
- No implementation authorization — this is a spec only.

## DEPENDENCIES

- KRYL-1170 (naming collision + no-bypass requirement) — this spec is the concrete mechanism
  KRYL-1170's SOLUTION section explicitly says is "NOT yet designed."
- KRYLCF-1 (doctrine authority this must comply with).
- KRYL-RSCH-2026-07-StructuralIntegrityLayer.md (must not collide with — naming and scope both).
- CLAUDE.md §12 (Signal Ingestion Architecture — reuse existing tagging, don't invent new).
- KRYL-1202 (the actual consumer waiting on this — its Observation Requests need EAC1-EAC5 to
  pass through something real).

## VALIDATION

- [x] Founder resolves the naming collision — RATIFIED 2026-08-22/23 as "Evidence Admission Gate."
- [x] Founder ratifies EAC1-EAC5 as the correct minimum contract — RATIFIED 2026-08-22/23.
- [x] Scope resolved NARROW (new KRYL-1202 path only, not a retrofit of existing connectors).
- [ ] Grep-confirmed after any implementation: zero code path lets a KRYL-1202 Observation Request
  re-entry reach Formation inference without passing through the EAC1-EAC5 gate.
- Bottle Test (CLAUDE.md §10) passes before any build ticket opens against this spec.

## ROLLBACK

Spec-only artifact at filing time — nothing to roll back. If a future implementation needs
reverting, standard git history on whatever commit builds it, no special mechanism required.

## GUIDELINES

- Positioning: this is a detection-time evidence-quality gate, not a forecasting mechanism — stays
  inside "We don't predict. We detect."
- Do not let this spec's existence be read as authorization to build KRYLCF-2/3/4/5/6 — those
  remain their own, separately-gated backlog items.
