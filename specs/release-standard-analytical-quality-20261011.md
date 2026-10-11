# Release standard: analytical quality (proposed thresholds, recorded 2026-10-11)

Status: Founder-provided advisory input, recorded as the working release bar. These are proposed KRYLO product-release thresholds, not published Goldman Sachs requirements. Environment: localhost (Dev); nothing deployed.

## Principle

KRYLO does not predict markets or recommend transactions; it detects ecosystem relationships and emerging structures. A customer-facing result must reliably identify meaningful relationships, connect them into defensible structures, and show the evidence behind its interpretation. Polished interface, accurate citations, consistent snapshots and passing tests are necessary and not sufficient.

## The bar

| Measure | Required standard |
|---|---|
| Routine supported queries | 8/10 or higher |
| Representative query benchmark | No persistent weak-result cluster |
| Unsupported material claims | Zero |
| Evidence traceability | All material claims traceable |
| Snapshot and cross-surface consistency | Pass |
| Insufficient evidence | Explicitly withhold unsupported conclusions |

- Structural interpretation must be real: admitted relationships connected across entities and domains where evidence supports them, an explanation of what the structure shows, and established relationships kept distinct from contextual leads. More observations alone do not count.
- Evidence must withstand scrutiny: conflicts, incomplete coverage and uncertainty handled explicitly.
- The standard holds across representative subjects, industries and query types, not a handpicked success; a high average must not conceal a weak tail.
- A rigorous conclusion of "insufficient evidence" does not fail by itself if it states what was examined, what was substantiated and what is missing. A shallow result caused by a product capability gap is not equivalent.
- Recurring 4 to 6 scores are a systemic product defect needing shared architectural or analytical improvement, not normal incremental progress.

## Where KRYLO stands against it (2026-10-11, evidence in this repository)

| Measure | Status | Basis |
|---|---|---|
| Routine supported queries at 8+ | Not met | One subject scored 6 (rubric) and 4 (reviewer) at build f436165; see `rating-broadcom-f436165-20261010.md` |
| Representative query benchmark | Does not exist | No benchmark of analytical scores across subjects, industries and query types has been built; `qa_query_corpus` (57) tests query parsing, not analytical quality; one JPMorgan benchmark run exists (2026-10-06) |
| Unsupported material claims | Not measured | Extraction values are checked as literal slices of filings (44 tests, 10 out-of-sample filings); no population-level claim audit exists |
| Evidence traceability | Improved | Accession, filing date, passage and retrieval basis shown; analytical claims beyond ownership and temporal change are co-presence leads |
| Snapshot and cross-surface consistency | Pass on tested pages | KRYL-1398 in Review; Founder on-screen validation pending |
| Withholding | Partly | Absence classes and "not established" wording exist for ownership and capital events; cross-domain lines are labelled leads |

## Consequences for the plan (`decision-record-evidence-to-formation-build-order-20261010.md`)

- Workstreams 3 and 4 (admitted relationship types; formation consuming admitted relationships) are on the path to this bar; evidence handling alone is not.
- A representative query benchmark with a fixed scoring rubric is a prerequisite for claiming the bar. It is not yet specified.
- Open Founder rulings from the decision record still gate workstreams 3 and 4: which relationship types to ratify; replace or run beside co-presence; whether the temporal comparison migrates onto admitted relationships.
