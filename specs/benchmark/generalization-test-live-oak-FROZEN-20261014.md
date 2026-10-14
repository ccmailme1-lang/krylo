# Generalization test: an unseeded company (Live Oak Bancshares), FROZEN 2026-10-14

Founder direction (2026-10-14): "The acceptance target remains 100% of the 63 frozen cases, with a separate generalization test using an unseeded company like Live Oak Bancshares to establish that KRYLO is genuinely dynamic."

## Purpose
The 63 frozen cases measure the product on companies it was developed against. This test asks whether KRYLO produces a real analysis for a company it was NOT built around. It is reported separately and never counted in the 63.

## Unseeded, verified before the run
Live Oak Bancshares is not in the static registry (`resolve("Live Oak Bancshares")`, `resolve("Live Oak")`, `resolve("LOB")` all return null), in no curated alias, in no fixture and in no benchmark file (searched `src`, `src/data`, `specs/benchmark/*.json`).

## Rules (set before the run)
1. No company-specific change of any kind: no registry entry, alias, curated page, identifier, fixture, special case or tuning. The code run is the code of the commit under test.
2. The questions below are fixed here before the first run. They are the same shapes the frozen sets use (question shapes 1, 3, 6, 10 of the benchmark), with the subject replaced.
3. Scored by the frozen rubric and the same scorer (scorer 1), per case, with the domains each question names recorded below before scoring. Reported with the 8-or-better count and the per-criterion detail, separately from the 63.
4. A result is reported as it is. A case that does not reach 8 is reported with the reason; no case is re-run to improve it except to separate a transient capture failure (a lookup that timed out), and any re-run is disclosed.
5. Beyond the score, the report states what was resolved (identity class, identifier), which sources ran, which were ineligible and why, and what the analysis does not establish.

## Questions
| ID | Shape | Question | Domains named |
|---|---|---|---|
| LO1 | benchmark Q1 | What structural relationships are forming around Live Oak Bancshares across ownership, technology, and capital? | OWNERSHIP, TECHNOLOGY, CAPITAL |
| LO2 | benchmark Q3 | What capital events involving named counterparties were reported for Live Oak Bancshares in the last 12 months? | CAPITAL |
| LO3 | benchmark Q6 | What do labor and capital activity around Live Oak Bancshares show, and what connects them? | LABOR, CAPITAL |
| LO4 | benchmark Q10 | What does the evidence not establish about the ownership and capital structure of Live Oak Bancshares? | OWNERSHIP, CAPITAL |
