# Open Defects & Requests — tracker

Last updated: 2026-10-07. Source: `specs/` file status lines and git log only.
**Jira status is NOT verified here.** krylo.atlassian.net is unreachable from the cloud session. Check Jira before acting on any status below (CLAUDE.md §23).

## Not filed in Jira

| # | File | Type | Raised | Status in file | Open item |
|---|---|---|---|---|---|
| 1 | `def-draft-subject-selection-collapses-into-entity-resolution.md` | Defect | 2026-10-07 | DRAFT | Founder ruling on which Query Contract governs; merge or link with #A3; trace the `NEGOTIATION OPEN` header. Bottle Test BLOCKED. |
| 2 | `def-subject-resolution-admits-subject-not-in-query-20261006.md` | Defect | 2026-10-06 | DRAFT | Environment where observed not recorded (Dev or Prod). |
| 3 | `ticket-draft-timeline-change-marks.md` | Feature | 2026-10-05 | APPROVED for build (Founder GO) | Needs a KRYL number. Build in Dev only until filed. |
| 4 | `spec-field-signal-vs-entity-attribution.md` | Product requirement | 2026-10-05 | DRAFT | Not an implementation ticket. Decide whether it needs one. |
| 5 | `DEF-2011-analysis-entry-flash.md` | Defect | — | OPEN | Old DEF numbering. Jira mapping unknown. |

## Filed 2026-10-05 as KRYL-1359 to KRYL-1363 (commit 2527796)

The commit filed these five together. The file-to-number mapping is not recorded, and the files still say "Not filed in Jira".

| # | File | Type |
|---|---|---|
| A1 | `defect-thematic-concepts-treated-as-named-entities.md` | Defect |
| A2 | `request-no-formation-structural-synthesis.md` | Request |
| A3 | `request-subject-scope-survives-analytical-queries.md` | Request |
| A4 | `spec-management-identified-conditions-phase1.md` | Spec |
| A5 | `work-order-field-scan-structural-candidates.md` | Work order |

Action: record each file's KRYL number in its status line, from Jira.

## Overlap to resolve

- #1 and A3 both require an explicit unresolved-subject state instead of a silent fall-back to `FIELD SCAN — NO SUBJECT RESOLVED`.
- #2 (subject resolution admits a subject not in the query) is the inverse failure of #1 (a subject in the query is lost). Same function: `subjectScope()` in `src/engine/subjectscope.js`.

## Session blockers (2026-10-07)

- The shell safety check is failing, so commits are pending. This file and #1 are untracked until committed.
- krylo.org and the data-feed hosts are blocked by the network policy, so no live queries can run from the cloud session.
