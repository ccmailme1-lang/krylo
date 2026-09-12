# Asset Disposition Record — KRYLO Autonomous Inquiry Chips

**Pre-Implementation Reconciliation**
**Status: LOCKED prior to implementation**

## Disposition Summary

| Asset                           | Disposition                | Relationship to v1.1                         |
|----------------------------------|----------------------------|-----------------------------------------------|
| `intentparser.js` / WO-1342       | **EXTEND, DO NOT REPLACE** | Retained deterministic linguistic/semantic substrate |
| `completionchips.js` / KRYL-1222  | **KEEP, DISTINCT LAYER**   | Retained refinement layer (post-question only) |
| `WO-1718-chip-query-builder.md`   | **SUPERSEDE / DEAD**       | Retired; incompatible with governing constraint |

Implementation of Autonomous Inquiry Chips (v1.1) must not begin until these three dispositions
are formally recorded. This file is that record.

---

## 1. `intentparser.js` / WO-1342 — EXTEND, DO NOT REPLACE

**Ruling:** Analysis Intent sits above ParsedIntent. They answer different questions and must
remain distinct.

| Existing ParsedIntent                         | New Analysis Intent                           |
|------------------------------------------------|------------------------------------------------|
| What linguistic/semantic signals are present?  | What analytical question is the user forming?  |
| `normalized_verb`                               | OBJECTIVE + QUESTION                            |
| `entities`                                       | SUBJECT                                         |
| `domains`                                        | OBSERVATIONAL SCOPE                             |
| `ambiguity_score`                                | Not equivalent; remains parser uncertainty      |
| Deterministic parse artifact                     | Higher-level analytical interpretation          |

**Architectural rule**
- ParsedIntent is linguistic/semantic parsing.
- Analysis Intent is analytical interpretation.
- ParsedIntent may contribute evidence to Analysis Intent.
- ParsedIntent does not represent or replace Analysis Intent.

**Correct pipeline**
```
USER INTEREST → ParsedIntent (WO-1342) → inquiry possibilities → QUESTION → Analysis Intent → existing KRYLO flow
```

**Forbidden**
- Replacing WO-1342 with a new parser.
- Creating two competing systems that both claim ownership of "intent."

Resolves the Orthogonal Axis Integrity question (CLAUDE.md §18) raised during the pre-build audit.

---

## 2. `completionchips.js` / KRYL-1222 — KEEP, DISTINCT LAYER

**Ruling:** No collision. The three chip families serve different stages and must remain
semantically distinct.

| Surface                | Question it answers                                              |
|-------------------------|--------------------------------------------------------------------|
| Trending                | What are people examining?                                        |
| Autonomous Inquiry      | What could I examine from what I just expressed?                  |
| Completion               | What information is missing from the question I am already forming? |

**Lifecycle**
```
USER INTEREST
     │
     ▼
AUTONOMOUS INQUIRY CHIPS
     │
     ▼
ANALYTICAL QUESTION
     │
     ├── COMPLETION CHIPS (KRYL-1222)
     │         └── fill useful missing parameters
     │
     ▼
KRYLO ANALYSIS
```

Trending remains an independent discovery/context surface.

**Locked roles**
- Inquiry = discovery
- Completion = refinement
- Trending = external/current context

**Critical constraint:** Completion chips must never become the mechanism that generates
Inquiry chips. Doing so would re-introduce the QueryContext prerequisite that v1.1 explicitly
rejects.

UI must provide semantic differentiation between the three chip families; visual style alone is
insufficient.

---

## 3. `WO-1718-chip-query-builder.md` — SUPERSEDE / DEAD

**Ruling:** WO-1718 is superseded by KRYLO Autonomous Inquiry Chips Specification v1.1.

Its sequential slot-chain model —
```
SITUATION → FLOOR → HORIZON → CONTEXT
```
— is incompatible with the governing constraint:

> KRYLO does not require a fully formed query before it can help formulate one.

**Specific violations of v1.1:** §4 Natural-Language Independence & Partial Intent, §5
Autonomous Inquiry Generation, §6 Chip → Question Transition, §10 Responsibility Boundary, §12
Guest & Demo Requirements, §13 Explicit Non-Goals (required form), AC-01, AC-03, AC-08, AC-09,
AC-10, §15 Governing Constraint.

**Disposition language (recorded):**

> WO-1718 is superseded by KRYLO Autonomous Inquiry Chips Specification v1.1. Its SLOT-chain
> interaction model is retired and must not be implemented. Any future query-formulation
> implementation must conform to v1.1's partial-intent, non-sequential, inquiry-discovery model.

Confirmed via repo grep: WO-1718's SLOT-chain UI was never built (no `SLOT`-chain markup exists
in `analysisidlefield.jsx`) — this is a spec-level supersession, not a code migration.

---

## Resulting Architecture (Locked)

```
                    USER
                      │
                 raw interest
                      │
                      ▼
              ┌─────────────────┐
              │  ParsedIntent   │
              │    WO-1342      │
              │                 │
              │ linguistic      │
              │ semantic parse  │
              └────────┬────────┘
                       │
                       ▼
             AUTONOMOUS INQUIRY
                  KRYL v1.1
                       │
             possible things
              to examine
                       │
                       ▼
             ANALYTICAL QUESTION
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
       editable question   Completion Chips
                           KRYL-1222
              │
              ▼
        ANALYSIS INTENT
          five dimensions
              │
              ▼
        existing KRYLO flow
              │
              ▼
 SUBJECT → OBSERVABLE SUBSTRATE → FORMATION
```

Independently:
```
TRENDING
   └── discovery / context surface
```

## Key Architectural Ruling

There is one user-intent pipeline, not two competing intent systems:

- **ParsedIntent** = what the language contains
- **Analysis Intent** = what analytical question that language represents
- **Inquiry Chips** = mechanism for moving from incomplete interest to an analytical question
- **Completion Chips** = mechanism for refining an already-formed question
- **Trending** = contextual discovery
- **WO-1718** = retired

## Implementation Gate

Work on Autonomous Inquiry Chips may begin only after: this disposition record is committed,
`WO-1718-chip-query-builder.md` is marked superseded in its own file header, and a Jira ticket
exists per the Ticket Definition Requirement (CLAUDE.md §10) — not yet created; hold until
explicit go.
