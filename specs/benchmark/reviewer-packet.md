# Blind second-reviewer packet, benchmark v1 (baseline)

Score these eight cases independently, before seeing any other score. Do not open `specs/benchmark/baseline-scores.json`.

Cases (each file holds the question, the build and snapshot identity, the delivered analysis page text and the MAP brief text): `specs/benchmark/baseline/C01.md`, `C04.md`, `C08.md`, `C13.md`, `C17.md`, `C20.md`, `C25.md`, `C29.md` (the Question 1 case of each of eight subjects).

Rubric (0 to 10 total; 0 reports as 1), applied to the delivered analysis only:

| Criterion | Points |
|---|---|
| Subject alignment | 0 to 2 |
| Relationship coverage and admission correctness | 0 to 2 |
| Formation integrity (admitted relationships only) | 0 to 1 |
| Structural depth and synthesis quality | 0 to 2 |
| Evidence attribution and traceability | 0 to 1 |
| Temporal correctness and coverage honesty | 0 to 1 |
| Consistency across Analysis, MAP and History | 0 to 1 (History is not yet migrated: score that half 0) |

Return one line per case: case id, the seven criterion scores, the total, and a sentence on the main reason for the structural-depth score.
