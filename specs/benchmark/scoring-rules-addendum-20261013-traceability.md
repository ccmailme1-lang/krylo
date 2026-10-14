# Scoring rules addendum, 2026-10-13: traceability for entities with no SEC filings

Founder ratification (2026-10-13): cited USPTO and GLEIF records are valid traceability evidence for non-SEC entities. Traceability must reflect the actual cited source and its identity or patent claim; SEC accession numbers are not required when the entity has no SEC filings. No other rubric criterion changes.

Criterion 5 (evidence attribution and traceability, 1 point) is unchanged for every entity with SEC filings: at least 3 SEC accession numbers on the page, a synthesis, and no unsupported label. For an entity identified by its GLEIF LEI (the page carries "IDENTITY: GLEIF LEI <LEI>"), the count is the SEC accession numbers plus each distinct USPTO granted-patent record cited on the page ("accession US<number>", each with the table's statement of the assignee) plus the cited GLEIF record (LEI, legal name, status, registration). The threshold stays at 3, with a synthesis and no unsupported label.

Implemented in scripts/benchmark-score-routine.mjs and scripts/benchmark-score-current.mjs (`citedRecords`). Scores of SEC-filing entities do not change: the 35-case benchmark and the 20-case routine set were re-scored under both rules with no difference.
