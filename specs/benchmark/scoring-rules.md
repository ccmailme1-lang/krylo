# Benchmark v1: operational scoring rules for scorer 1 (frozen with the baseline)

The frozen rubric (planning file, A4) is applied to the delivered analysis text in `specs/benchmark/baseline/<case>.md` by `scripts/benchmark-score.mjs`. These operational rules turn each rubric line into a check; they are applied identically to every case and, at milestones, to every re-run. Raw total 0 to 10; the 1 to 10 scale value is the raw total rounded to the nearest integer (0 reports as 1). The History half of the consistency point is 0 at baseline for every case.

| # | Criterion (points) | Rule |
|---|---|---|
| 1 | Subject alignment (2) | 0 if the page says the subject is not resolved; 1 if resolved with no subject-bound observation; 2 if resolved with subject-bound observations |
| 2 | Relationship coverage and admission (2) | Only the ownership-disclosure type is admitted from live filings. 0 if the question does not concern ownership or no relationship is admitted; 1 if the question concerns ownership plus other domains; 2 if it concerns ownership only. Questions' domains: Q1 O,C,T · Q2 O · Q3 C · Q4 C,O · Q5 T · Q6 L,C · Q7 O · Q8 K,T,C · Q9 M,C · Q10 O,C · Q11 and Q12 all six |
| 3 | Formation integrity (1) | 1 only if formation and cross-domain statements are built from admitted relationships; formation is built from the signal pool, so 0 |
| 4 | Structural depth and synthesis (2) | 1 if admitted relationships and a source-dated temporal section are shown for a question that concerns ownership; 2 requires synthesis across admitted relationships (none exists at baseline); otherwise 0 |
| 5 | Evidence attribution and traceability (1) | 1 if at least three accession-bearing evidence lines are shown and the subject is resolved |
| 6 | Temporal correctness and coverage honesty (1) | 1 if the source-dated relationship-change section with its retrieval basis is shown (or states there is nothing to compare); 0 if absent or the subject is unresolved |
| 7 | Consistency (1) | 0.5 for Analysis and MAP agreeing on a frozen snapshot with no page errors; the History half is 0 at baseline |

Limits, stated: scorer 1 is mechanical and can only see what is on the page; it cannot judge whether a synthesis is good (none exists to judge). The blind second reviewer reads the eight designated cases without scorer 1's scores; disagreements of 2 or more points are listed, not averaged away.
