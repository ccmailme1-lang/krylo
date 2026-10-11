# Decision record: evidence-to-formation build order

Date: 2026-10-10 · Status: DRAFT for team review · Environment: localhost (Dev) only; nothing pushed or deployed · Author: assistant, from Founder direction and existing artifacts. No code or probes were run for this record.

## 1. Objective

For any resolved entity, a cross-domain question returns a structure built from admitted, time-comparable relationships. It names exactly which evidence is missing. It is frozen per run, so the same question gives the same answer. The entity used in testing is the instrument, never the subject of this record.

## 2. Decisions already settled (closed; not reopened)

- Comparison window: two adjacent 12-month periods.
- Ownership magnitude threshold: 1.0 percentage point, same class (CUSIP) and reporting person.
- Capital-event magnitude: INDETERMINATE in the first version.
- RECONFIGURED has two subtypes (documented rights change; verified participant change). A filer-name change alone is insufficient.
- Cross-domain fracture is a lead only in the first version.
- Snapshot frozen when the subject lookups settle (success, failure or the 45-second timeout), with an explicit atomic refresh. Draft spec: `SPEC-analytical-snapshot-implementation-v0.1-DRAFT-20261009.md` (KRYL-1389).

## 3. Why this order

The rubric (`rubric-alphabet-10of10-20261009.md`, Scoring A) caps the overall rating at 6 whenever the one-snapshot gate fails, whatever the analysis quality. Same-page evidence (rating file `rating-broadcom-25ccc17-20261010.md`, addendum) shows the gate failing. Snapshot freeze is therefore a precondition for any rating increase.

## 4. Pipeline breaks (entity-independent)

| # | Break | Evidence |
|---|---|---|
| 1 | Capital event class is dropped before formation observations and the brief; no amounts or counterparties are extracted | `edgar8ksignal.js` puts `eventClass` (from item codes via `parseItems`/`classifyEventClass`) on the signal packet. `adsubject.js`, `perceptionread.js` and `structuralbrief.jsx` contain no `eventClass` reference. |
| 2 | Only the ownership-disclosure relationship type is produced from live filings | `secownershipconnector.js` admits `HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE`; no capital or technology relationship type is admitted from live evidence. |
| 3 | The temporal comparison has its own retrieval path and result store and does not read canonical relationships or feed formation | `relationshipchangeservice.js` (in-memory `_results`), separate from `canonicalrelationshipprojection.js`. The KRYL-1386 spec section 13 states the two record types stay separate. |
| 4 | Cross-domain lines are signal-pool co-presence, not admitted relationships | The brief labels them "not admitted ρ". |
| 5 | The signal pool moves between runs of the same query | Rating file addendum: pairs 1, 3, 1; capital magnitude 74, 78, 77; signals 191, 192, 173; same bound count. |

Correction recorded: an earlier statement that capital filings reach the pool as "source and date only" was wrong at the pool level (event class is present) and right at the guest level (it is not rendered). Scope of break 1 is narrower than first stated.

## 5. Build sequence

1. **Snapshot freeze (workstream 1, first priority).** Frozen analytical snapshot and atomic refresh per the draft spec. Closes break 5.
2. **Capital-event extraction (workstream 2, in parallel).** Step A: carry the existing event class through to the subject-bound observation and the guest-facing result. Step B: extract content (amount, instrument, counterparty) from the primary filing text. Magnitude stays INDETERMINATE. Closes break 1.
3. **Canonical relationship integration (workstream 3).** Define and ratify the additional relationship types the evidence supports (the set is closed); migrate the temporal comparison onto admitted, time-comparable relationships. Closes breaks 2 and 3.
4. **Formation boundary (workstream 4).** Formation consumes only admitted relationships and their evidence. Co-presence remains only as explicitly labelled contextual leads, never presented as an admitted relationship or formed structure. Closes break 4.
5. **DEF-1394** (undefined `listWithAnd`): deferred unless it blocks a workstream or the acceptance journey.

No further workstreams are opened. Presentation and provenance polish, new connectors and deployment are out of scope.

## 6. Acceptance gate (every ticket)

A ticket counts as product progress only when the integrated result shows all of:

- At least two entities: one registry-resolved and one admitted at runtime.
- Frozen, reproducible inputs within each snapshot, with explicit atomic refresh.
- A changed answer to a cross-domain question, based on admitted, time-comparable relationships, that materially improves the structural interpretation (not wording or metadata).
- Evidence supporting the formed structure and precise identification of missing evidence.
- Existing regression suites green (query corpus, journeys, brief-reconcile, relationship-change suites).
- No fabricated relationships, magnitude claims or causal explanations.

Each ticket names the break it closes. A fix that leaves the answer unchanged does not count.

## 7. Reconciliation against current artifacts

**XBRL investigation (`xbrl-capital-fields-investigation-20261009.md`).**
- No `data.sec.gov` route exists in the engine or `src` (grep confirmed 2026-10-10); production would need a new nginx location block, not authorized.
- The source can supply capital-intensity numerator and denominator (annual, consolidated, concept-fallback lists needed). It cannot supply deployment velocity (commitments live in filing text) or capital concentration (no holder-level data).
- Open in that record: restatement selection rule, coverage sample across entities, route-and-extraction spec ("written only when requested").
- Consequence: workstream 2 (event extraction from 8-K text) is separate from the XBRL capital-intensity job. XBRL is authorized for investigation and specification only.

**Cross-entity inconsistency between canonical relationships and the temporal result.** UNVERIFIED. No spec, test or commit in the repository records it by name, and the session transcript could not be read from the working sandbox. It is listed as a Founder-reported claim until a pointer to its record is supplied; it is not cited as a finding.

## 8. Open decisions (Founder / team)

1. Ratify the additional relationship types (workstream 3).
2. Formation: replace the current co-presence mechanism, or run it beside admitted relationships as labelled leads (workstream 4). Replacement must be declared as a replacement (CLAUDE.md section 4, architecture-first).
3. Whether the temporal comparison migrates onto admitted relationships (workstream 3).
4. Authoritative fields for capital-event extraction (workstream 2, step B).
5. Retrieval time on the temporal block (cached record up to 10 minutes old reads as current): file or defer.
6. A go for each workstream before any code (CLAUDE.md section 10). This record is not a go.

## 9. Risks

- Workstreams 3 and 4 may be Class C (specification and implementation diverge); each needs a Founder ruling before any edit.
- Workstream 2 step B depends on what filing text can be parsed reliably; unverified.
- The signal pool and canonical relationships overlap; workstream 4 must not create a second parallel store (CLAUDE.md section 2 hard stop).

## 10. Not authorized by this record

Code changes, probes, pushing, deployment, XBRL route build, or moving any ticket to Deploy to Prod.

## Amendment A (2026-10-11) - PROPOSAL UNDER DISCUSSION, NOT ADOPTED: the interpretation layer and the quality measure

Status: a proposal from a review the Founder is discussing with the team. It is not a decision and authorizes nothing; the workstreams below are not planned or ticketed until the Founder adopts them.

Source: Founder-provided review. The build order above (workstreams 1 to 4) is the structural foundation; it stops when formation consumes admitted relationships. The objective is consistent analytical quality across subjects and queries, so these would be added as workstreams, not follow-on enhancements:

| # | Workstream | Closes |
|---|---|---|
| 5 | Relationship discovery coverage: admit meaningful relationship types across all six domains, not ownership disclosures alone (extends workstream 3) | A: coverage |
| 6 | Structural synthesis: connect admitted relationships into one explanation of the ecosystem, with every material claim linked to the relationships and source evidence behind it | B: synthesis, traceability |
| 7 | Structural significance: state what a supported structure shows about participants, dependencies, concentration, control or change, only where evidence supports it; otherwise say so | B: significance |
| 8 | Quality measure: a small fixed benchmark (subjects and questions across industries, fixed 1 to 10 rubric, before and after scores), built alongside the work and scored once per milestone | C: measurement |

Boundaries: formation is not a verdict (CLAUDE.md section 21); KRYLO must not invent significance to raise a score, and "evidence does not support a structural conclusion" is a valid, rigorous result. The benchmark stays small and light (Founder, 2026-10-11): no per-ticket re-scoring. Target for routine supported queries: 8/10 or higher; repeated 4 to 6 means the system has not met the objective. Sequence and tickets for workstreams 5 to 8 need the Founder's rulings on workstreams 3 and 4 first. Settled temporal rules stay settled.
