# DRAFT (not filed) — Inquiry Formation Layer V1: implementation (sparse seed → Available to Examine → EXAMINE → bounded session)

Label on filing: `needs-spec` until the Bottle Test items below are closed for the slice being built. Blocking relationships are plain text.
Governing behavior: the locked Inquiry Formation V1 spec (conversation artifact, 2026-09-25, not yet a committed spec file — see Dependencies).
Code mapping: `specs/CODE-MAPPING-inquiry-formation-v1.md` (Parts 1–4).

## The six required fields (CLAUDE.md §10)

### 1. Original intent
A guest must be able to enter a sparse seed (example: `NVIDIA Microsoft`) without knowing KRYLO's ontology or the relationship to investigate. KRYLO resolves the entities, establishes the structural basis it actually holds for each entity per canonical pressure, shows what is available to examine, lets the guest choose, shows the formed inquiry inside the search box, and only on an explicit EXAMINE creates and runs a bounded analytical session. KRYLO never infers or asserts the relationship. Motivated by the 2026-09-24 validation (queries executed but did not address the question) and by KRYL-1290's ratified principle (guests must not need to know how to formulate a query).

### 2. Acceptance criteria
UI-01..UI-13 from the locked spec, with these recorded decisions applied:
- Dimension = the six canonical pressures; no second taxonomy; no LLM in eligibility.
- Eligibility of a pressure for one entity = at least one attributed observation (`A(domain, scope).formationObservations`) for that entity in that pressure; no observation → not eligible; no provenance → not executable.
- Per-entity listing. A pressure is offered as a PAIR inquiry only when BOTH resolved seed entities establish it. This never states or implies a relationship.
- An unresolved seed name is shown as "ENTITY NOT ESTABLISHED"; it is never dropped, substituted, or covered by another entity's evidence.
- Ordering: independent sources → structural-class diversity → primitive count. Ordering never affects eligibility and never selects or highlights a default.
- Wording: "connector sources" (not "independent sources") until a signal → evidence-node join exists.
- HIGH/MODERATE/LOW: Founder-authored UI parameter. Until set, show the counts only.
- New distinct EXAMINE control; formed inquiry `[SEED + PRESSURE]` inside the search box; the original seed text is never rewritten; no generated question.
- No analytical session and no MAP/BRIEF/RECON/IMPACT before EXAMINE (session creation itself is gated, not just hidden).
- Execution receives the bound (seed entity ids + selected pressure + established evidence); MAP and IMPACT and every "live field" fallback branch honor it; missing evidence → withhold, never a widened read.
- No eligible pressure → a visible structural-withhold state (no field-wide fallback).
- Reselect updates the formed inquiry without altering the seed; reset returns to the seed state with no stale selection.
Full per-criterion test matrix: the locked spec §24, plus a pair-resolution and per-entity-eligibility set.

### 3. Current implementation state — Maturity B (primitives exist; composed capability does not)
Verified live 2026-09-25 (dev app): `resolve('NVIDIA')`/`('Microsoft')` resolve, `TSMC` does not; entity-scoped connectors run with no session and attribute evidence (NVIDIA + Microsoft: CAPITAL 13/10, LABOR 5/4, OWNERSHIP 1/0, TECHNOLOGY 0/1); `fireTopicConnectors` also adds unattributed ambient signals to the same pool; `queryChipSubstrate` returns no eligible dimension even with attributed evidence; sessions are created only in `handleExecute` at the front door plus other paths listed in the mapping; StructurePanel/TargetPacket mount only when a session exists; MAP reads the whole pool with no subject; IMPACT reads topology keyed by the raw query string. Nothing of the Available-to-Examine / EXAMINE flow is built.

### 4. Dependencies (plain text)
- Locked spec must be committed as a spec file (currently a conversation artifact; not in specs/ or Jira).
- Founder design authority (CLAUDE.md §5): appearance and copy of the Available-to-Examine panel, the formed-inquiry line, the EXAMINE control, and the HIGH/MODERATE/LOW parameter. A visual mock is needed before UI slices.
- Registry data: pair members outside the 57-entity registry (e.g. TSMC) need verified identifiers (KRYL-1237/1238 own unverified-name handling).
- KRYL-1324 (semantic integrity boundary): downstream OBSERVATION → RELATIONSHIP → ANSWER STATUS; its materiality rule and relationship admission are prerequisites for the answer-status part, NOT for this ticket's inquiry formation.
- Decision needed for the other execution paths that create sessions (ribbon headline click, geo-disambiguation resume, ingestion builder, history re-run): route through the same gate or explicitly exempt.

### 5. Superseded by / overlapping
- Supersedes (needs a recorded decision, not silent): KRYL-1290 generated inquiry chips (`deriveInquiryPossibilities`, banned by UI-03; already unrendered) and its §6 chip→question transition (already reversed by KRYL-1306).
- Overlaps/uses: KRYL-1306 (query-preserving refinement — the selected-dimension binding mechanism), KRYL-1304 (chip substrate — NOT the eligibility authority), KRYL-1317 (Done; its "Subject + Context + Scope" copy conflicts with UI-01), KRYL-1308 (narrow conflict: it concerns sessions that already exist; this ticket concerns the pre-session gate), KRYL-1287/DEF-1300 (MAP is ambient by design; this ticket requires it to honor the bound), KRYL-1237/1238.
- KRYL-1324 is a sibling, not a superseder.

### 6. Maps to the current KRYLO product model
Yes: §20.8 (expose the relationship, don't make the guest assemble it) and §21 (KRYLO presents substantiated structure; the guest chooses and interprets; no verdict). The available-to-examine list is itself unconditional structural presentation. Whether gating MAP/BRIEF on explicit EXAMINE is acceptable under §21 is a Founder ruling to record on this ticket.

## Bottle Test (CLAUDE.md §10) — honest assessment of the whole ticket
1. Reduces ambiguity — YES.
2. Single dominant output — YES (an explicit formed inquiry that authorizes a bounded session).
3. All boundaries defined — NO: band thresholds, other execution paths, panel/EXAMINE design.
4. No undefined dependencies — NO: committed spec file, verified registry entities, Founder design.
5. Does not increase expressive flexibility in core — YES (no new taxonomy, no generated questions).
Result: 3/5. Per CLAUDE.md, a TBD in a boundary blocks the affected slice. Proposed split at filing, so unblocked engine work is not held by UI design:
- **Slice A (engine, no UI) — buildable once ticketed and authorized:** `resolveSeedEntities` (additive); entity-scoped evidence gather per resolved entity with no session; bound object; per-entity, per-pressure eligibility view; pair-availability rule; observability sort tuple (counts only); tests. Pure functions plus a store-free gather; nothing user-visible changes.
- **Slice B (bound honored downstream):** thread the bound into session creation; make perceptionread/temporalState accept an id set; pass it to MAP and IMPACT; guard the "live field" fallback branches. Needs the §21 ruling and the other-paths decision.
- **Slice C (UI):** `inquiryPhase` state, Available-to-Examine panel, formed-inquiry line, EXAMINE control, withhold state, reset behavior. BLOCKED on Founder design and the band parameter (counts-only is allowed meanwhile).
- **Slice D (data):** registry additions for pair members (TSMC-class) with verified identifiers.

## Explicit non-goals
Query rewriting; generated analytical questions; LLM eligibility; graph pathfinding/centrality; relevance/confidence/recommendation scoring; automatic selection; generic or field-wide fallback; M&A or Supply-Chain modes; a new domain taxonomy; multi-entity (3+) intersection; document-level independence claims.
