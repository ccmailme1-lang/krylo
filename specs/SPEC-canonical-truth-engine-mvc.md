# SPEC — Canonical Truth Engine / MVC Separation (Analysis Packet)

**Status:** DRAFT, ready for ticket / specification stage. Formalization of the SAB quorum's
ratified architecture (7/7 CONCUR), the Founder's review of it, and verified findings from a live
trace of the current application, 2026-09-27. This document records decisions already made. It
introduces no new design or visual decisions. No code is authorized by this document.

Per CLAUDE.md §10 (Work Order Protocol): this requires its own KRYL ticket, the Bottle Test, and an
explicit Founder "go" before any implementation begins.

**Explicitly out of scope:** the explicit-word-grounding suggestion-assistance material relayed
earlier in the same SAB session was struck by the Founder before this specification was written
("that was not for you, disregard") and informs nothing below. KRYL-1329's grounding rule stands
independently and is unrelated to this document.

## THE GOVERNING PRINCIPLE (Founder-tightened statement — carry forward verbatim)

```
KRYLO HAS ONE TRUTH.
THE INTERFACE DOES NOT CREATE TRUTH.
IT RENDERS TRUTH.
ANALYSIS, MAP, RECON, IMPACT
ARE DIFFERENT WAYS OF INSPECTING THE SAME RESULT.
THE BRIEF IS A DERIVED ARTIFACT.
CONTROLS DEFINE THE OBSERVATION REQUEST.
THEY ARE NOT FINDINGS.
INTERPRETATION DEFINES THE CONTRACT.
OBSERVATION DEFINES WHAT WAS SEEN.
FORMATION DEFINES WHAT RELATIONSHIPS WERE ADMITTED.
EVIDENCE DEFINES WHAT SUPPORTS IT.
STRUCTURAL LIMITS DEFINE WHAT KRYLO DOES NOT KNOW.
```

**Single test for every future change (and the Bottle Test for this rearchitecture):**

> What is the minimum set of facts that every view can legitimately consume without recreating
> interpretation?

No view is permitted to independently reinterpret or recompute the underlying structural result.

## PROBLEM

The analysis packet (Target Packet, Export Brief, and the MAP / RECON / IMPACT tabs) lacks a
single canonical analytical result. Each surface currently has independent authority to assemble
analytical output from underlying state, rather than rendering one shared computed payload.
(`synthesizeQuery()` and the ambient domain-pressure pool in `domaingravity.js` are evidence of
this defect, traced in the current implementation — not the definition of the defect itself; the
architecture must not become dependent on those specific mechanisms surviving a future refactor.)

This was confirmed by live tracing in the current session (see
`project_reconn_narrative_assembly_p1` and the 2026-09-27 query trace) and produces the following
reproducible failures:

1. **Silent subject drop, communicated as volume instead of state.** For the query `vendor platform
   + technology / architecture changes and amazon`, the engine drops `amazon` and the rest of the
   typed text into `NOT CARRIED INTO OBSERVATION`, then presents 176 ambient-field observations
   across 6 domains, followed by Formation, Basis, and Provenance sections. The guest receives no
   clear, early signal that the query was never actually analyzed. The system admits the
   observation does not answer the query, yet continues to behave as if a successful analysis
   occurred. State must precede volume.
2. **Internal identifiers leak into guest-facing text.** Strings such as `KRYL-1220`, `KRYL-1202`,
   `DEF-1301`, `WO-5B`, `WO-1752`, and `SPEC II §5 (LOCKED)` appear directly in the narrative, the
   READ block, and the Brief. These are engineering provenance, not analytical provenance, and must
   not appear on any guest surface in any form, including collapsed or progressively disclosed.
3. **Export Brief renders fully when nothing was established.** With `SUBJECT: NO SUBJECT
   RESOLVED` and `DECISION VERDICT NOT PRODUCED`, the Brief still generates all four sections,
   including empty `PRECURSORS`, `ASSUMPTIONS`, `RISKS`, and `OPPORTUNITIES` rows — manufacturing
   an artifact solely because the export component expects one, creating a false impression of
   analytical completeness.
4. **Control-panel state is mixed with result state in the same view.** Intent Dial, Horizon
   Scrubber, Structural Field, and Signal Scope define the observation *request*. They are not
   findings. Guests must never have to distinguish what they instructed KRYLO to examine from what
   KRYLO actually discovered. These controls must remain a distinct, legible layer, separate from
   the result.

## SOLUTION

These four failures are symptoms of one architectural defect: the analytical surface currently
knows too much about its own implementation machinery, and each view is free to recompute its own
version of the truth. The remedy is two sequenced tracks, so guest-experience improvements are not
blocked by the larger rearchitecture.

### Track 1 — Immediate UX containment (independently shippable now)

- **State before volume, with a semantic boundary.** When a query does not resolve to a subject,
  lead with interpretation and result state; ambient data appears only after the state is clear.
  Hard requirement: **an unresolved query must never be presented as a subject-bound analysis** — a
  visual warning followed by the same volume of ambient observations is insufficient; the system
  must enforce a semantic boundary. Illustrative shape only (not a frozen layout — Design
  Sovereignty remains with the Founder / SAB):
  ```
  QUESTION
  vendor platform + technology / architecture changes and amazon

  INTERPRETATION
  Technology / architecture changes
  Amazon = unresolved subject binding

  RESULT STATE
  FIELD OBSERVATION ONLY

  ────────────────────────
  FIELD OBSERVATION
  This describes the observable TECHNOLOGY field.
  It is not an observation about Amazon.
  ────────────────────────

  SUBJECT-BOUND ANALYSIS
  NOT ESTABLISHED
  ```
- **Remove internal identifiers from every guest-facing render, completely.** Jira/WO/spec
  references (`KRYL-####`, `WO-####`, `DEF-####`, `SPEC ... §...`) move exclusively to logging,
  telemetry, or an engineering-only view. The guest sees `SOURCE / DATE / OBSERVATION /
  RELATIONSHIP / EVIDENCE`, never a ticket number.
- **Suppress full Brief generation when Result State indicates unresolved/unbound.** Render a
  single-page "Unresolved Query" summary instead of the full four-section consulting-brief shape
  with empty rows.

### Track 2 — Canonical architecture (its own ticket, larger scope)

- Establish **one canonical analytical result per analysis execution**, computed once and
  immutable for that execution. A session may contain multiple executions (question, horizon,
  scope, intent, or subject changes); each execution owns its own authoritative result. The
  architectural invariant is canonicality, ownership, and immutability per execution — not any
  particular serialization format.
- Assign clear ownership of every field: one authoritative writer per field; no view recomputes
  its own version.
- **Result State is a property OF the canonical result, not a separate processing stage between
  observation and result.** It is not presentation metadata — every view and the Export Brief
  condition their behavior on it, but it is produced as part of the same execution that produces
  Observation, Formation, Basis, Evidence, and Structural Limits, not as an intermediate step
  before them. Illustrative values (deliberately non-final — the definitive enumeration must not
  be finalized inside this ticket; it is derived from actual execution states and validated
  against real queries before being locked): `SUBJECT-BOUND`, `FIELD-BOUND`, `PARTIALLY-BOUND`,
  `UNRESOLVED`, `NO OBSERVATION`.
- Every view (`ANALYSIS | MAP | RECON | IMPACT`) becomes a pure read-only renderer of the single
  canonical result. The Export Brief becomes a derived, downstream transformation of the same
  result — never a fifth independent analysis layer.
- **Model → View boundary (non-negotiable).** A view may select, order, filter, or visualize
  canonical data. A view may NOT: create a new analytical fact; reinterpret a canonical fact;
  establish a relationship; establish a formation; change evidence status; manufacture an absence;
  substitute an ambient-field observation for a subject observation.
- **Field names inside each section are explicitly not frozen by this document.** Current
  per-domain shapes (`OBSERVES / SIGNAL / RELATIONSHIP / RELEVANCE`, etc.) must be validated
  against real outputs before locking, so the canonical model does not merely relocate existing
  duplication into a cleaner-looking container. Section-level shape ratified to date:
  ```
  00 QUESTION & INTERPRETATION   — the contract: established / not carried / unresolved
  01 OBSERVATION                 — what was seen
  02 FORMATION                   — what relationships were admitted
  03 BASIS                       — population and distribution
  04 EVIDENCE                    — what supports it
  05 STRUCTURAL LIMITS           — what KRYLO does not know
  ```
- Architectural flow (Result State as a property of the canonical result, not an independent
  stage):
  ```
  QUERY / SESSION STATE
          │
          ▼
    INTERPRETATION
          │
          ▼
  STRUCTURAL OBSERVATION
          │
          ▼
  CANONICAL RESULT
  (per execution, immutable)
          │
          ├── RESULT STATE
          ├── OBSERVATION
          ├── FORMATION
          ├── BASIS
          ├── EVIDENCE
          └── STRUCTURAL LIMITS
          │
          ├──────────┬──────────┐
          ▼          ▼          ▼
      ANALYSIS      MAP        RECON
          │          │          │
          └──────────┼──────────┘
                     ▼
                   IMPACT
                     │
                     ▼
              EXPORT BRIEF
                (derived)
  ```
- The CONTROLLER layer (System Status, Intent, Horizon, Structural Field, Signal Scope) remains
  physically and semantically separate from the canonical result. It is UI/session state only,
  feeding the observation request, and is never treated as analysis output.

## COMPONENTS

Current file map (traced, not assumed — evidence of the defect in the present implementation, not
a claim about the future architecture's shape):

| File | Relevant symbols / role |
|---|---|
| `src/engine/reconnpayload.js` | `assembleReconnPayload` (~185), `ratifyIntent` (~43) — existing first step toward the canonical result |
| `src/engine/narrativeassembly.js` | `assembleNarrative` (~243), `questionStage` (~33), `contextStage` (~39) — existing first step toward the Interpretation Contract |
| `src/engine/analysisintent.js` | `buildAnalysisIntent`, `buildInterpretationLedger` (~264) — the `00 · QUESTION & INTERPRETATION` contract |
| `src/components/analysis/targetpacket.jsx` | current primary Model+View consumer; candidate to become a View-only reader of the canonical result |
| `src/components/analysis/intelligencebrief.jsx` | Export Brief; currently calls `synthesizeQuery()` independently (~473); candidate to become a downstream transform |
| `src/components/analysis/recondashboard.jsx` | currently calls `synthesizeQuery()` independently (~30) |
| `src/components/analysis/actionmatrix.jsx` | P4 module; currently calls `synthesizeQuery()` independently (~174) |
| `src/engine/domaingravity.js` | `getQueryDomainPressure`, `getAllDomainPressures`, `getDomainSignals` — ambient pool read directly by several surfaces today; open question for Track 2 is how (or whether) this feeds the canonical result versus remaining a clearly labeled field context that is never presented as answering the guest's query |
| `src/engine/querysynthesis.js` | `synthesizeQuery` — currently invoked independently by 5+ surfaces; the Shared Data/Function Change Gate (CLAUDE.md §2) applies before any call site is touched: lexical, concept, and behavioral trace, classification, then edit |

## VALIDATION

- An unresolved-subject query (e.g. `vendor platform + technology / architecture changes and
  amazon` or equivalent) leads with QUESTION / INTERPRETATION / RESULT STATE and enforces a
  semantic boundary: field observations are never presented as subject-bound analysis.
- No `KRYL-####`, `WO-####`, `DEF-####`, or `SPEC ... §` string appears in any guest-facing render
  of the Target Packet, narrative, READ block, or Export Brief.
- When Result State indicates unresolved/unbound, the Export Brief renders only the single-page
  Unresolved Query summary, never the full four-section shape with empty rows.
- MAP, RECON, and IMPACT all render from one shared canonical result per execution — verified by
  diffing the data each tab actually consumes, not merely by inspecting rendered output.
- No view creates, reinterprets, establishes, or manufactures analytical facts, relationships,
  formations, evidence status, or absences. Views may only select, order, filter, or visualize.
- Result State is present as a property of the canonical result and conditions the behavior of
  every downstream surface.
- The definitive Result State enumeration is derived from actual execution states and validated
  against real queries; it is not locked by this document.
- Every section's field set is validated against real outputs before being frozen, specifically
  confirming that no field requires a view to reinterpret it — each field can be consumed as-is.

## ROLLBACK

Track 1's three fixes ship as small, independently revertible diffs. Track 2 is a larger,
multi-file change that ships behind its own commit boundary; if the canonical result introduces a
regression in any of MAP/RECON/IMPACT/Brief, the system reverts to the current per-surface
independent-assembly behavior.

## GUIDELINES

- No UI rendering or component design work begins on Track 2 until the canonical result structure
  is agreed and ratified in a KRYL ticket — matches both the SAB's directive and the Founder's
  standing "explicit go required" rule.
- This document does not decide exact field names inside sections, the visual treatment of the
  state-before-volume layout, the definitive Result State enumeration, or the design of the
  Unresolved Query Summary. Those remain Founder/SAB design authority (CLAUDE.md §5) and are left
  open.
- Ticket Definition Requirement (CLAUDE.md §10): the eventual KRYL ticket(s) must contain all six
  required fields (original intent, acceptance criteria, current implementation state,
  dependencies, supersession check, product-model fit) before either track is marked Ready.

## Classification for next step

Ready for KRYL ticket formation and Bottle Test. Not ready for implementation — and correctly so.
The next artifact is the ticket / Bottle Test, not further UI design.
