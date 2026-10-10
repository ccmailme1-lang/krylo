# Broadcom rating, build f436165 (localhost, Dev)

Date: 2026-10-10 · Rubric: `specs/rubric-alphabet-10of10-20261009.md` · Committed (f436165), not pushed, not deployed. Tickets in Review: KRYL-1398 (snapshot), KRYL-1399 (capital events).

**Overall: 6 / 10 (upper edge).** The snapshot gate now passes on the pasted page, so the rubric's cap at 6 no longer applies. The analysis itself is not materially better for this subject, so the number does not move.

## Checks on the pasted page

| Check | Result |
|---|---|
| Snapshot time shown, Refresh control present | Pass: "Analysis snapshot: 2026-10-10 18:44:19 EDT" with "Refresh analysis" |
| Header observations = brief field signals | Pass: 198 = 198 |
| Per-domain observations sum = field signals | Pass: 114 + 31 + 25 + 20 + 5 + 3 = 198 |
| By Domain CAPITAL = brief CAPITAL | Pass: pressure 76, 114 signals on both |
| Evidence lines carry class and accession | Pass: e.g. `CAPITAL — EDGAR_8K · EARNINGS_ANNOUNCEMENT · 2026-09-02 · 0001730168-26-000076` |
| Relationship change pinned, retrieval time shown | Pass: "Retrieved 2026-10-10 18:44:28 EDT · fixed for this analysis snapshot until it is refreshed" |
| Retrieval basis under NEW and DISSOLVED | Pass (unchanged) |
| Capital-event lines (amount, instrument, named parties) | None shown for this subject (see below) |
| MAP agrees with the left brief | Not visible in the paste; verified in the automated live run (left brief = MAP brief), not on this page |
| Same query, repeated, without refresh | Not exercised by this paste |

## Rubric table

| Item | Result | Evidence in the payload | Absence class |
|---|---|---|---|
| 1 Temporal change | Partly (upper) | Ownership existence and configuration with accessions; retrieval time and basis visible; magnitude not assessed; no capital-event comparison | c; d |
| 2 Capital structure | Partly (low) | Each capital 8-K now shows its event class, date and accession. No amount, instrument or counterparty is shown: none of the shown filings carries a capital-event item (1.01, 2.01, 2.03, 3.02). All three subject measures unavailable. | c (not stated); d |
| 3 Ownership detail | Partly | Percent, CUSIP, form, accession, dates; voting and dispositive rights absent | b |
| 4 Cross-domain | Partly | Three pairs co-present; CAPITAL↔OWNERSHIP has dated evidence on both sides; LABOR incomplete; technology is field context only | b |
| Gate: one snapshot | Pass | Within the snapshot every figure on the page agrees; a new query or a Refresh produces a new snapshot by design | |

## Finding

Four of the eight evidence rows are `UNKNOWN_MATERIAL_EVENT` (Item 8.01, "Other Events"). Step B reads only filings carrying 1.01, 2.01, 2.03 or 3.02, so these are not read. Filings reported under 8.01 can state financings; whether these do is not known. Extending the read to 8.01 filings is outside KRYL-1399 as defined and needs a decision.

## Reviewer score on the same page

GPT: 4/10 (product-quality view). Points taken: the answer is mostly co-presence; the three subject-bound pairs are not admitted relationships; the only admitted relationships are ownership disclosures; 76/100 and 74/100 are field context; 198 field observations against 17 subject-bound observations and 2 admitted relationships are different levels of evidence; the relationship-change section is more rigorous than the core answer. One point checked: extracted capital-event fields are not in this EVIDENCE section because none of this subject's shown filings carries a capital-event item (see Finding). The differences between the 6 (rubric) and the 4 (product view) are the same breaks listed in `decision-record-evidence-to-formation-build-order-20261010.md`: break 2 (one relationship type), break 3 (temporal result separate from relationships), break 4 (formation is co-presence). Workstreams 3 and 4 of that record address them and need Founder rulings first.
