# Investigation: SEC XBRL company facts as a source for the capital measures

Date: 2026-10-09 · Status: investigation record (read-only). Authorized by the Founder 2026-10-09 (investigate and specify a `data.sec.gov` XBRL route for capital intensity). **No implementation, route, deployment or code change is authorized or made.** Related: rubric item 2 (capital measure semantics), `decision-package-alphabet-rubric-20261009.md` (D4, B9).

## Verified (direct read-only requests, 2026-10-09; one request per company, 1.5 s spacing, User-Agent identifying the service as the engine does)

| Fact | Evidence |
|---|---|
| `https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json` answers HTTP 200 for all three sample issuers | Alphabet 0001652044 (196,729 bytes, 293 ms), Sysco 0000096021 (448 ms), Oracle 0001341439 (278,824 bytes, 72 ms) |
| Taxonomies present: `dei`, `us-gaap`, `ecd`, plus `ffd` for two issuers | 538 to 543 us-gaap concepts per issuer |
| The engine cannot reach this host today | `handleEdgarProxy` targets `efts.sec.gov`; `handleEdgarDocumentProxy` targets `www.sec.gov/Archives`; no route to `data.sec.gov` (`as-diff/engine.js`, lines 1186 and 1767) |

## Fields the three capital measures need, and what exists

Annual 10-K (fiscal-year) data points per concept (count of distinct fiscal-year ends; latest and earliest fiscal year end):

| Concept | Alphabet | Sysco | Oracle |
|---|---|---|---|
| `Revenues` | 12 (2013 to 2025-12-31) | absent | 19 (2008 to 2026-05-31) |
| `RevenueFromContractWithCustomerExcludingAssessedTax` | 9 (2016 to 2024-12-31) | 28 (2017 to 2026-06-27) | 10 (2017 to 2026-05-31) |
| `Assets` | 12 (2014 to 2025) | 19 (2008 to 2026-06-27) | 18 (2009 to 2026-05-31) |
| `PaymentsToAcquirePropertyPlantAndEquipment` (capex) | 13 (2013 to 2025) | **absent** | 17 (2010 to 2026-05-31) |
| `PaymentsToAcquireProductiveAssets` (capex, alternative) | absent | 19 (2008 to 2026-06-27) | absent |
| `PropertyPlantAndEquipmentNet` | 11 (2014 to 2024) | 18 (2009 to 2026-06-27) | 18 (2009 to 2026-05-31) |
| `LongTermDebt` | 11 (2015 to 2025) | 3 (2019 to 2021-07-03) | 1 (2022-05-31) |
| `StockholdersEquity` | 14 (2012 to 2025) | 20 (2007 to 2026-06-27) | 18 (2009 to 2026-05-31) |
| `ProceedsFromIssuanceOfCommonStock` | 0 annual points | absent | 12 (2015 to 2026-05-31) |
| `ProceedsFromIssuanceOfLongTermDebt` | absent | absent | 4 (2008 to 2011) |

## What this establishes for each measure (facts only; the recorded semantics are in the rubric)

- **Capital-intensity change** (numerator, denominator, ratio reported together): the source can supply a numerator (capex, or net property and equipment) and a denominator (revenue, or assets) for each issuer over about 10 to 28 fiscal years. Two sample issuers use different concept names for the same quantity (capex: `PaymentsToAcquirePropertyPlantAndEquipment` for Alphabet and Oracle, `PaymentsToAcquireProductiveAssets` for Sysco; revenue: `Revenues` versus `RevenueFromContractWithCustomerExcludingAssessedTax`, and one issuer switches concept between years). A fixed single-concept rule would return "absent" for a company that reports the quantity under another name.
- **Deployment velocity** (announced, committed, closed, disbursed): the sampled concepts contain realized cash flows (payments) but not commitments or announcements; the commitment and announcement stages come from filings text (8-K), not from XBRL. A "committed-to-deployed" ratio is **not** obtainable from company facts alone.
- **Capital concentration** (distribution across providers): company facts has no holder-level data; it does not apply. The holder source stays Schedule 13D/13G (and 13F or Form D if later authorized).
- **Debt and issuance concepts** are sparse and inconsistent (Sysco debt 3 points ending 2021; Alphabet common-stock issuance 0 annual points), so they cannot be assumed.

## Limitations to carry into any specification

1. **Concept variability:** each measure needs an ordered concept fallback list per quantity, with the concept used recorded in provenance; no match means the measure states its absence (absence class b or d, never an estimate).
2. **Restatements and duplicates:** one fiscal year can have several facts (original 10-K, later 10-K/A, later filings restating the prior year). A selection rule (latest filed value for that period end, with the accession kept) and a conflict rule are required [specification, not yet written].
3. **Period alignment:** fiscal year ends differ (Alphabet 12-31, Sysco late June, Oracle 31 May). Capital-intensity change compares fiscal years of the same issuer only; cross-issuer comparison is out of scope.
4. **Units:** USD only for these concepts; no currency conversion is assumed or needed for the samples [other issuers unverified].
5. **Dimensional facts** (segments) are not in company facts; consolidated values only.
6. **Fair-access and identification:** SEC requires a descriptive User-Agent and rate limits requests; the existing engine pattern (identified User-Agent, spacing, cache) applies.
7. **Delivery path:** a new engine proxy route to `data.sec.gov` is required, and, per the infrastructure note, a new nginx `location` block in production before it can serve live. That production step is not requested or authorized here.

## Not verified (procedure and fallback)

- **Fiscal-year fact selection under restatement:** check 10 issuers with a known restatement; expected result: the latest filed value for the period is selected and the earlier accession is recorded. Fallback: capital intensity unavailable for that issuer-year.
- **Quarterly (10-Q) data for a sub-annual window:** not examined; annual only.
- **Coverage across the guest population** (issuers lacking the capex or revenue concepts under any listed name): sample 30 registry entities; expected result: a coverage percentage per quantity. Fallback: measure unavailable with the missing concept named.
- **Foreign private issuers (no 10-K):** not examined.

## Conclusion

The route is feasible and the data covers the numerator and denominator for capital-intensity change for all three sample issuers; deployment velocity and capital concentration are not served by this source. No decision is requested here; the next artifact would be a route-and-extraction specification (concept fallback lists, restatement rule, provenance fields, tests), written only when requested.
