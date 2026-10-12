# Private-company acceptance set v1: FROZEN (2026-10-12, before any implementation of private-company identity)

Approved by the Founder (D7, 2026-10-12): a separate acceptance set for the Founder's real subjects, kept apart from the 35-case benchmark and from the frozen 20-query routine set (both unchanged). Frozen: subjects, queries, expected identity outcomes, scoring and acceptance criteria. Rows are never replaced, reworded or removed after this point; a change is a new version recorded separately. The floor is unchanged: every target packet and MAP scores at least 8 out of 10, from genuine evidence-backed analysis.

## Subjects and queries (8)
| ID | Subject | Query (frozen text) |
|---|---|---|
| PC01 | Databento | What structural relationships are forming around Databento across technology, ownership, and labor? |
| PC02 | Databento | Who has financed Databento, who are its officers and directors, and what has changed recently? |
| PC03 | Integrated Biosciences | What structural relationships are forming around Integrated Biosciences across technology, ownership, and labor? |
| PC04 | Integrated Biosciences | Who has financed Integrated Biosciences, who are its officers and directors, and what has changed recently? |
| PC05 | Daytona | What structural relationships are forming around Daytona across technology, ownership, and labor? |
| PC06 | Daytona | Who has financed Daytona, who are its officers and directors, and what has changed recently? |
| PC07 | Anduril | What structural relationships are forming around Anduril across technology, ownership, and labor? |
| PC08 | Anduril | Who has financed Anduril, who are its officers and directors, and what has changed recently? |
Query A is the Founder's own phrasing (technology, ownership, labor); query B asks for capital, officers and directors, and change over time.

## Expected identity outcomes (identity is judged separately from analytical quality)
| Subject | Baseline outcome (captured 2026-10-12, current build) | Target outcome | Identity source for the target |
|---|---|---|---|
| Databento | UNRESOLVED (no listed registrant; filing index returned no match) | RESOLVED to Databento Inc. | Form D issuer (CIK 0001784241) or GLEIF (LEI 254900DQ2GKA6Q48SJ38): each PENDING ratification |
| Integrated Biosciences | UNRESOLVED (the SEC filing-index lookup failed in the baseline run: stated as not evidence of absence) | RESOLVED to Integrated Biosciences, Inc. | Form D issuer (CIK 0002148371): PENDING ratification |
| Daytona | UNRESOLVED (no match) | UNRESOLVED with the actionable explanation, unless a ratified class returns exactly one entity with that exact name | none defensible: several unrelated registrants and foreign entities carry the name |
| Anduril | RESOLVED from the static registry (ANDURIL INDUSTRIES), carrying no SEC CIK | RESOLVED, with relationships admitted only from sources keyed by identifiers it carries | static registry |

## Baseline (the current outcomes are the baseline; none is counted as coverage)
| ID | Identity | Admitted relationships | Notes |
|---|---|---|---|
| PC01 | UNRESOLVED | 0 | message lists the sources checked, the four not checked, what would resolve it |
| PC02 | UNRESOLVED | 0 | same |
| PC03 | UNRESOLVED | 0 | filing-index lookup failed in this run |
| PC04 | UNRESOLVED | 0 | same |
| PC05 | UNRESOLVED | 0 | same as PC01 |
| PC06 | UNRESOLVED | 0 | same as PC01 |
| PC07 | RESOLVED (registry) | 0 | the page states that the SEC-keyed evidence producers did not run because the entity carries no SEC CIK |
| PC08 | RESOLVED (registry) | 0 | same |
Rubric score at baseline: an unresolved subject scores 0 on every criterion under scorer 1's rules (reported as 1 on the 1 to 10 scale), so PC01 to PC06 are 0.0 raw. PC07 and PC08 are not scored in the baseline: they are resolved with no admitted relationship and are scored under the frozen rubric at evaluation. Captures: `specs/benchmark/private-baseline/` (page text and record per case).

## Scoring and acceptance
1. Each query is scored individually under the frozen rubric (the seven criteria, the mechanical scorer rules in `specs/benchmark/scoring-rules-m1.md`), separately from the other populations; averages never hide a failure; independent blind scores are recorded apart.
2. Identity and analytical quality are reported as two results. Resolving a subject does not imply its packet passes; an unresolved subject does not excuse a fixable pipeline failure.
3. A query passes only when its identity outcome is the expected one AND its packet scores at least 8 out of 10 on genuine, evidence-backed analysis; no relationship is attributed from a similar-name entity or from field-level activity.
4. Every query scoring under 8 is listed with exactly one root-cause class: IDENTITY_CLASS_NOT_RATIFIED, PRODUCER_ELIGIBILITY, NO_RATIFIED_SOURCE, EVIDENCE_NOT_AVAILABLE, or FIXABLE_PIPELINE_DEFECT. A FIXABLE_PIPELINE_DEFECT must be fixed, not reported as a limit.
5. Success is claimed only when all eight pass; otherwise the acceptance is unmet and the failures and causes are reported.
