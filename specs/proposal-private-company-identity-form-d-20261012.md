# Proposal: identity for private companies from SEC Form D (the Databento packet)

Status: PROPOSAL for the Founder's decision. Nothing built. Date 2026-10-12.

## What the Databento packet shows
"Databento" is a private company. The packet says "entity not resolved", so no structure is attributed to it and all six domains show field-level activity only. The name resolution built under KRYL-1407 reads the SEC list of LISTED companies, and KRYL-1380 admits only public filers (annual reports, a ticker). A private company can never resolve on that path. The benchmark subjects were all listed companies; the subjects the Founder actually queries (Databento, Daytona, Anduril, Integrated Biosciences) are private. This is a gap in who the product can answer about, not in presentation.

## What exists (measured 2026-10-12 against the SEC index, filings of any form since 2020)
| Query | Result |
|---|---|
| Databento (Form D) | 7 filings; registrants: **Databento Inc. (CIK 0001784241)**, plus look-alikes AVSF - Databento 2026, LLC (2128729) and FDC DATABENTO LLC (2123314) |
| Integrated Biosciences (Form D) | 1 filing: **Integrated Biosciences, Inc. (CIK 0002148371)** |
| Daytona (Form D) | 16 filings, 12 registrants with that word (Daytona Platforms Inc. 1977563, hotel and real-estate vehicles) |
| Anduril (Form D) | 100 hits (cap), 75 registrants with that word, almost all investor SPVs and funds named after the company |

A private company that sold securities under Regulation D has an SEC CIK and files Form D. A Form D states, in the issuer's own words: issuer name and CIK, state and year of incorporation, industry group, the **related persons (executive officers, directors, promoters) by name and role**, the offering (date of first sale, total offering amount, amount sold, number of investors). It does not name the investors.

## Risk that shapes the rule
Look-alike registrants are the norm (investor SPVs named after the company). The identity rule therefore stays the exact legal-name rule already used for counterparties: the query's name with legal suffixes removed must equal exactly ONE Form D issuer's name; "AVSF - Databento 2026, LLC" and "FDC DATABENTO LLC" do not equal "Databento", so Databento resolves to Databento Inc.; a name matched by several issuers stays unresolved; nothing is bound by similarity.

## What would be proposed (each for ratification)
1. **Identity class: SEC registrant that files Form D (private, not listed).** Identity-only admission, anchored on the SEC CIK, verified by the issuer's own Form D under that CIK; labelled "private SEC filer, not listed" wherever shown. This relaxes KRYL-1380's "listed" criterion for this class only.
2. **LABOR for private companies from Form D related persons.** The issuer's own filing states the person's name and role (executive officer, director, promoter). Unlike Forms 3, 4 and 5 the person has no CIK, so identity would be the name as the issuer states it, scoped to that issuer: it needs a ruling on name-scoped person identity, which the Founder excluded for matching. Recommendation: hold until ruled.
3. **CAPITAL for private companies:** the offering (date of first sale, total offering amount, amount sold, investors) as a dated OBSERVATION with amounts quoted as stated, not a relationship: no counterparty is named.

## Not covered by Form D
Companies that never filed a Form D (no SEC CIK) remain unresolved, stated as such. Ownership of a private company is not disclosed in these filings.

## Decision requested
Ratify identity class 1 (private SEC filer from Form D, exact legal name, unique, verified by CIK). It is the prerequisite for any structural analysis of the companies the Founder actually asks about; items 2 and 3 follow only after that and a separate ruling.
