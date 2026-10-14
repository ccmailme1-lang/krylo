# Benchmark v1: current build report (complete architecture, capital-event admission through History)

Date: 2026-10-14 · Build: commit 232b703 plus the working tree · Environment: localhost (Dev) · Matrix, questions and rubric: the frozen v1 set (planning-pass-benchmark-matching-store-20261011.md, A6). Scorer 1 only; the independent second reviewer's scores are outstanding and are kept separate. The baseline (specs/benchmark/baseline*, baseline-scores.json) is unchanged.

## Headline

| | Baseline | Current build 2026-10-12 | Change |
|---|---|---|---|
| Mean raw score (0 to 10) | 5.6 | 9.1 | +3.6 |
| Mean, unrounded | 5.557 | 9.143 | +3.586 |
| Distribution (1 to 10 scale: cases) | {"1":2,"5":12,"7":17,"8":4} | {"8":7,"9":16,"10":12} | |
| Cases at or above 8 (the release target) | 4 of 35 | 35 of 35 | +31 |
| Question 1 cases, mean raw | 6.5 | 9.1 | |

## By criterion (mean points; maximum in brackets)

| Criterion | Baseline | Current build 2026-10-12 |
|---|---|---|
| Subject alignment [2] | 1.9 | 2.0 |
| Relationship coverage and admission [2] | 0.7 | 1.8 |
| Formation integrity [1] | 0.0 | 1.0 |
| Structural depth and synthesis [2] | 0.6 | 1.3 |
| Evidence attribution and traceability [1] | 0.9 | 1.0 |
| Temporal correctness and coverage honesty [1] | 0.9 | 1.0 |
| Consistency across Analysis, MAP and History [1] | 0.5 | 1.0 |

## By case

| Case | Subject | Q | Baseline | Now | Change | Coverage now (needed domains with an admitted relationship) |
|---|---|---|---|---|---|---|
| C01 | Sysco | 1 | 6.5 | 10.0 | +3.5 | 3/3 |
| C02 | Sysco | 3 | 4.5 | 10.0 | +5.5 | 1/1 |
| C03 | Sysco | 7 | 7.5 | 10.0 | +2.5 | 1/1 |
| C04 | Oracle | 1 | 6.5 | 9.0 | +2.5 | 3/3 |
| C05 | Oracle | 5 | 4.5 | 10.0 | +5.5 | 1/1 |
| C06 | Oracle | 8 | 4.5 | 9.0 | +4.5 | 3/3 |
| C07 | Oracle | 11 | 0.0 | 9.0 | +9.0 | 6/6 |
| C08 | Tesla | 1 | 6.5 | 9.0 | +2.5 | 3/3 |
| C09 | Tesla | 6 | 4.5 | 9.0 | +4.5 | 2/2 |
| C10 | Tesla | 9 | 4.5 | 9.0 | +4.5 | 2/2 |
| C11 | Tesla | 11 | 0.0 | 9.0 | +9.0 | 6/6 |
| C12 | Costco | 6 | 4.5 | 8.0 | +3.5 | 1/2 |
| C23 | Costco | 1 | 6.5 | 8.0 | +1.5 | 1/3 |
| C24 | Costco | 10 | 6.5 | 8.0 | +1.5 | 1/2 |
| C13 | Boeing | 1 | 6.5 | 9.0 | +2.5 | 3/3 |
| C14 | Boeing | 3 | 4.5 | 9.0 | +4.5 | 1/1 |
| C15 | Boeing | 4 | 6.5 | 9.0 | +2.5 | 2/2 |
| C16 | Boeing | 12 | 6.5 | 9.0 | +2.5 | 6/6 |
| C17 | Verizon | 1 | 6.5 | 8.0 | +1.5 | 2/3 |
| C18 | Verizon | 2 | 7.5 | 9.0 | +1.5 | 1/1 |
| C19 | Verizon | 10 | 6.5 | 8.0 | +1.5 | 1/2 |
| C20 | Intel | 1 | 6.5 | 10.0 | +3.5 | 3/3 |
| C21 | Intel | 3 | 4.5 | 10.0 | +5.5 | 1/1 |
| C22 | Intel | 4 | 6.5 | 10.0 | +3.5 | 2/2 |
| C25 | Broadcom | 1 | 6.5 | 8.0 | +1.5 | 2/3 |
| C26 | Broadcom | 2 | 7.5 | 9.0 | +1.5 | 1/1 |
| C27 | Broadcom | 5 | 4.5 | 9.0 | +4.5 | 1/1 |
| C28 | Broadcom | 12 | 6.5 | 8.0 | +1.5 | 5/6 |
| C29 | Netflix | 1 | 6.5 | 10.0 | +3.5 | 3/3 |
| C30 | Netflix | 8 | 4.5 | 9.0 | +4.5 | 3/3 |
| C31 | Netflix | 9 | 4.5 | 9.0 | +4.5 | 2/2 |
| C32 | Boston Scientific | 1 | 6.5 | 10.0 | +3.5 | 3/3 |
| C33 | Boston Scientific | 3 | 4.5 | 10.0 | +5.5 | 1/1 |
| C34 | Boston Scientific | 7 | 7.5 | 10.0 | +2.5 | 1/1 |
| C35 | Boston Scientific | 10 | 6.5 | 10.0 | +3.5 | 2/2 |

## By question

| Q | Cases | Baseline mean | Now mean | Change |
|---|---|---|---|---|
| 1 | 10 | 6.5 | 9.1 | +2.6 |
| 2 | 2 | 7.5 | 9.0 | +1.5 |
| 3 | 4 | 4.5 | 9.8 | +5.3 |
| 4 | 2 | 6.5 | 9.5 | +3.0 |
| 5 | 2 | 4.5 | 9.5 | +5.0 |
| 6 | 2 | 4.5 | 8.5 | +4.0 |
| 7 | 2 | 7.5 | 10.0 | +2.5 |
| 8 | 2 | 4.5 | 9.0 | +4.5 |
| 9 | 2 | 4.5 | 9.0 | +4.5 |
| 10 | 3 | 6.5 | 8.7 | +2.2 |
| 11 | 2 | 0.0 | 9.0 | +9.0 |
| 12 | 2 | 6.5 | 8.5 | +2.0 |

## By domain: cases (of 35) in which an admitted relationship covers the domain

| Domain | Baseline | Current build 2026-10-12 |
|---|---|---|
| OWNERSHIP | 33 | 35 |
| CAPITAL | 0 | 25 |
| TECHNOLOGY | 0 | 32 |
| KNOWLEDGE | 0 | 32 |
| LABOR | 0 | 35 |
| MEDIA | 0 | 32 |

Baseline admitted only ownership-disclosure relationships (the only type produced from live evidence). TECHNOLOGY, KNOWLEDGE, LABOR and MEDIA still have no admitted relationship type.

## Material changes

- Improved by 1 point or more: 35 cases (C01, C02, C03, C04, C05, C06, C07, C08, C09, C10, C11, C12, C23, C24, C13, C14, C15, C16, C17, C18, C19, C20, C21, C22, C25, C26, C27, C28, C29, C30, C31, C32, C33, C34, C35).
- Regressed by 1 point or more: 0 cases (none).
- Within 1 point: 0 cases.

## Synthesis labels against their evidence, and Analysis / MAP / History agreement

- Statements checked: 497 across 35 cases. Statements whose status or evidence did not hold up: 0.
- Analysis and MAP show the same formation: 35 of 35 resolved cases.
- History rebuilt from the store shows the same formation and relationship count as Analysis: 35 of 35 resolved cases.

## Cases not at the target, and why

Most remaining points are lost on relationship coverage: only OWNERSHIP and CAPITAL have admitted relationship types, so any question about TECHNOLOGY, KNOWLEDGE, LABOR or MEDIA scores 0 on coverage, and multi-domain questions cover at most two of their domains. Questions that open with "Across" still select that word as the subject (C07, C11).

## Limits stated

- Scorer 1 is mechanical (rules in scoring-rules-m1.md) and sees only what is on the page and in the probe; it cannot judge the quality of a synthesis beyond whether its labels are supported by its evidence. The independent reviewer's scores on the eight designated cases (C01, C04, C08, C13, C17, C20, C25, C29) are outstanding and are not mixed with these.
- The file store (as-diff/data/canonical_store.jsonl) is the effective durable store in this environment: PostgreSQL is not reachable on this machine, and the engine's code notes it was unreachable from the VPS on 2026-10-03.
- Capture method as for the baseline: one page session per subject, a new snapshot per case, SEC documents and stored history reused within a subject; run on localhost. Nothing is deployed and /v1/canonical-store is not exposed in production.
- Cases ran grouped by subject, not strictly C01 to C35 (as in the baseline).
