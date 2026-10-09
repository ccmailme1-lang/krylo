# Decision package: remaining open decisions, Alphabet 10/10 rubric

Date: 2026-10-09. Prepared read-only: nothing in the rubric, specifications or code was modified. Four sections are kept apart: **A. Recorded decisions**, **B. Verified facts**, **C. Conflicts to reconcile**, **D. Proposed decisions** (with a default), **E. Questions that need your judgment** (only those).

## A. Recorded decisions (already settled; not revisited here)

All in `specs/rubric-alphabet-10of10-20261009.md` (commits through ddb290c and 8e5728f):

| Item | Settled |
|---|---|
| Snapshot | Frozen per query; every surface renders from it; timestamp shown; explicit atomic refresh; freeze point = when the subject lookups settle (success, failure or 45 s timeout); failed or timed-out lookup is "unavailable", never absence |
| KRYL-1386 model | Existence / Magnitude / Configuration, each with INDETERMINATE; DISSOLVED needs positive evidence of termination; NO MATERIAL CHANGE needs adequate evidence in both periods; no causation |
| Window | Two adjacent 12-month periods on source event dates; INDETERMINATE when history is insufficient |
| Ownership magnitude method | Change in percentage points of class (threshold number not set) |
| Ownership record | Field groups (identity, position, rights, timing, provenance, qualification), five counterparty match outcomes, admission rule |
| Capital measure semantics | Concentration (distribution, observed-scope only), deployment velocity (announced, committed, closed, disbursed kept apart; "commitment velocity" when only commitments are evidenced), capital-intensity change (numerator, denominator, ratio together) |
| Divergence semantics | Fracture requirements, four-level evidence ladder, five admission rules |

CLAUDE.md section 6 (checked): locks the **five convergence states and their colors**. It does not contain the relationship-change states, so adopting the multidimensional model does not conflict with section 6. (DEF-1373, five-state measured classifier: committed f5662fe, 1a5e770.)

## B. Verified facts (read-only checks run 2026-10-09 through the local engine)

1. **13D/13G position fields are extractable.** For filings under the form type `SCHEDULE 13G` / `13G/A`, the structured `primary_doc.xml` is fetchable through the existing `/api/edgar-document` proxy and contains: `securitiesClassTitle`, `issuerCusipNumber`, `eventDateRequiresFilingThisStatement`, `reportingPersonBeneficiallyOwnedAggregateNumberOfShares`, `classPercent`, `soleVotingPower`, `sharedVotingPower`, `soleDispositivePower`, `sharedDispositivePower`, `typeOfReportingPerson`. The search metadata alone (what the connector reads today) has none of these. Documents are cached 30 days by the proxy.
2. **Alphabet, current period (2025-10-09 to 2026-10-09), 5 filings:** Vanguard Capital Management 13G 2026-04-29: 7.48% (436,027,408 shares) and 6.41% (348,894,310) (two filings, CUSIP 02079K305 and 02079K107, i.e. two share classes, both titled "Common Stock"); Vanguard Group 13G/A 2026-03-26: 0% / 0 shares (event 03/13/2026); Sergey Brin 13G/A 2026-02-17: 5.81% (359,414,947).
3. **Alphabet, prior period (2024-10-09 to 2025-10-08), 2 filings, both Eric Schmidt:** 0.97% (2025-02-18) then 0.83% (2025-08-14), a change of -0.14 points. No Vanguard, Brin or BlackRock filing exists in this window.
4. **Older filings use a different form type.** Filings before the December 2024 rule change are `SC 13G/A`, not `SCHEDULE 13G/A`. The connector's form filter (`SCHEDULE 13D,SCHEDULE 13G`) does not match them. Alphabet's `SC 13G/A` filings 2023-02 to 2024-02 exist (12 returned for 2023 to 2024: Vanguard 2024-02-13 twice, Brin 2024-02-12, BlackRock 2024-02-01/12, Schmidt 2024-02-14, Page 2023-02-14, Schmidt 2023-02-14). BlackRock appears in 2024 and not in 2025 or 2026: an absence that is not evidence of dissolution. **Not verified:** whether the older `SC 13G/A` documents are structured XML or HTML text (my check of one failed to run).
5. **Annual-amendment cadence means a 24-month window leaves most holders without a prior-period observation.** Brin filed 2024-02-12 and 2026-02-17 with nothing between; Vanguard Group filed 2024-02-13 then 2026-03-26. For these holders the prior-period position would come from a filing outside Oct 2024 to Oct 2025.
6. **8-K coverage over 730 days exists:** Alphabet 13 (prior) and 16 (current); Oracle 13 and 11; Sysco 10 and 26. Sysco 13D/G prior-period query returned HTTP 500 once and succeeded on retry elsewhere.
7. **SEC burst behavior:** back-to-back requests returned empty results or HTTP 500; with 1.5 s spacing they returned data. The engine does not cache failures (success is cached 15 min for search, 30 days for documents). A failed call must be read as "not obtained", never "none" (absence class b).
8. **Entity-scoped syncs look back 365 days** (`topicconnectors.js`, both ownership and 8-K); the search cap is 100 hits per request (ownership connector `MAX_HITS`), enough for these samples.
9. **Capital sources:** the engine can reach `efts.sec.gov` (search) and `www.sec.gov/Archives` (documents). It cannot reach `data.sec.gov` XBRL company facts (no route; a new route would also need a new nginx location per the infra note). Revenue, assets and capital-expenditure series for capital intensity are therefore not available today; the three capital measures read DATA UNAVAILABLE. Not verified: 13F holder tables and Form D coverage for the sample companies.
10. **Today's "fracture" is a different thing from the decided one.** `domaingravity.js` marks a domain fracture when at least 40% of its signals are negative, absent or from a turbulent event. That is a per-domain polarity share, not a justified cross-domain comparison. The brief's KNOWLEDGE fracture (Alphabet, 5 signals, magnitude 19) is this per-domain rule.

## C. Conflicts to reconcile

1. **`specs/SPEC-relational-change-temporal-axis.md` (KRYL-1334, LOCKED by the Founder 2026-09-29)** conflicts with the recorded KRYL-1386 decisions on four points:
   - it computes change **only between two persisted Formation snapshots** and forbids inferring change from current observations; the recorded window compares **source-dated filings across two 12-month periods**, which are not snapshots;
   - snapshot **retention is 90 days**, so snapshots alone can never span 12-month periods;
   - its state vocabulary is the five states in `relationalchange.js`; the recorded model is the three dimensions (and PERSISTING exists in neither today);
   - its DISSOLUTION is "no longer established"; the recorded rule requires positive evidence of termination.
   One way to hold both: keep KRYL-1334's snapshot diff as the mechanism for formation-level change, and treat the 12-month source-dated comparison as a second, separately labeled evidence basis for the named-entity ownership and capital relationships. That needs your ruling (E2).
2. **Authored capital measure texts** in the domain panel are narrower than the recorded semantics (concentration is top-holder share of holder-level holdings; deployment velocity is a committed-to-deployed conversion rate; capital-intensity change is a percent change in capital employed over output). Reconcile at the step 2 specification.
3. **Fracture:** the recorded semantics require a justified cross-domain comparison, while the running behavior is a per-domain polarity share (B10). The per-domain polarity stays as a field fact; cross-domain fracture is new.
4. **Snapshot freeze and DEF-1384** ("Checking SEC ownership filings"): consistent; the settle point is the same terminal state the DEF-1384 hook already computes (success, failure, 45 s).

## D. Proposed decisions (each with a default; none is recorded)

### D1. Ownership magnitude threshold (unresolved)
- **Decision:** the percentage-point change at which STRENGTHENING / WEAKENING applies.
- **Settled:** method is points of class (rubric item 3).
- **Evidence:** B2, B3. Observed real deltas: Schmidt -0.14 points (0.97 to 0.83); Vanguard Group to 0%; Brin 5.81 (no prior). SEC Rule 13d-2(a) deems a 1% acquisition or disposition of a class material for Schedule 13D amendments (named convention; the wording should be checked against the rule text before it is cited in a specification).
- **Recommended default:** **1.0 percentage point**, compared only between filings for the **same CUSIP (share class)** and the same reporting person.
- **Alternatives:** 0.5 point (more sensitive; would flag small drifts such as Schmidt only above 0.5, so -0.14 stays NO MATERIAL either way); 2.0 points (misses most single-year changes among 5 to 8 percent holders).
- **Acceptance criteria and test cases:** Schmidt 0.97 to 0.83 (-0.14) = NO MATERIAL CHANGE; a 5.0% to 6.1% change = STRENGTHENING; 6.1% to 5.0% = WEAKENING; two different CUSIPs for one filer are never compared with each other; exactly 1.0 point = meets the threshold (inclusive).
- **Dependency and insufficient-evidence consequence:** needs D3 extraction; if either period lacks a same-class filing, magnitude is INDETERMINATE.

### D2. KRYL-1386 evidence criteria per dimension (unresolved)
- **Existence:** a relationship is observed in a period if a filing is dated within it **or the latest filing on or before the period end is within 36 months** (position as of the period end). NEW: observed in the current period and not as of the prior period end, with adequate prior-period coverage. PERSISTING: observed in both. DISSOLVED: a filing in the current period reporting 0% or "ceased" (positive evidence), or an explicit termination document. Otherwise INDETERMINATE. Example from B: Vanguard Group's 2026-03-26 filing reports 0% while two Vanguard entities appear with 7.48% and 6.41%: existence of the Vanguard Group link is DISSOLVED by positive evidence, and the Vanguard Capital Management link is NEW or a RECONFIGURATION of participants (see Configuration). BlackRock absent in 2025 and 2026 is INDETERMINATE, not DISSOLVED.
- **Magnitude:** D1 for ownership. For capital events the default is **INDETERMINATE in the first version** (events are not comparable in amount across periods without a stated denominator); existence and configuration still apply.
- **Configuration (RECONFIGURED), default: both of** (a) a change in the rights fields (sole versus shared voting or dispositive power, direct versus indirect) and (b) a change in participants (new filer entity, restructuring such as Vanguard Group to Vanguard Capital Management and Vanguard Portfolio Management). Description-text changes alone do not count.
- **Alternatives:** rights only, or participants only (each misses a real case in B).
- **Acceptance criteria and test cases:** the Alphabet filings in B2 to B4 as a fixed regression case: Schmidt NO MATERIAL CHANGE (magnitude), Vanguard Group DISSOLVED + participant RECONFIGURATION, BlackRock INDETERMINATE, Brin PERSISTING with magnitude INDETERMINATE (no prior-period filing, as-of lookback bound permitting).
- **Dependencies:** D3, D6 (730 days plus form-type families), C1 ruling.

### D3. Ownership-field extractability and schema
- **Verified:** B1 (extractable for `SCHEDULE 13G/13D`); unverified for legacy `SC 13G/A` (B4).
- **Recommended default:** extract the fields in B1 into the admitted relationship record as **reported** values (never derived), with provenance (accession, document locator `primary_doc.xml`, filing date, event date), unknown when a tag is absent; match counterparties only by identifier containment (CIK) with the five outcomes; one document fetch per filing (cached 30 days).
- **Alternatives:** extract only percent of class and shares first; or extract lazily when the guest expands a relationship.
- **Acceptance:** all fields in B1 populate for the 7 Alphabet filings; a missing tag stays unknown; two filings by one filer on the same day for different CUSIPs are two positions.
- **Insufficient evidence:** a failed document fetch is "not obtained", not a missing field.

### D4. Capital-measure sources and calculation rules
- **Verified:** B9.
- **Recommended default:** v1 limits to what is obtainable today: **concentration as observed-scope concentration among the 13D/13G holders of the issuer** (top holder share and the number of filers, labeled with scope and period; never complete concentration); **deployment velocity unavailable** (no announced, committed, closed, disbursed series is extracted; shown as absence class b/d); **capital-intensity change unavailable** until an XBRL source is authorized. Capital events are shown as events with amounts only where the 8-K or exhibit states them.
- **Alternatives:** authorize a `data.sec.gov` XBRL company-facts route now (enables revenue, assets and capex ratios; needs a new proxy route and nginx location, and a comparability rule for fiscal periods and restatements); or parse 10-K exhibits (heavy, fragile).
- **Acceptance and test cases:** Alphabet shows concentration with its observed scope; capital intensity either computed from stated numerator and denominator or shown unavailable with the exact source named.
- **Consequence of insufficient evidence:** the measure states its absence class; it is never estimated.

### D5. Fracture materiality and evidence thresholds
- **Verified:** B10.
- **Recommended default for the first version:** keep per-domain fracture polarity as it is (a field fact) and **show the observations behind it** without a toggle; classify any **cross-domain** divergence as a **lead** only, because no reproducible materiality rule or justified alignment basis is defined yet.
- **Alternatives:** define a numeric cross-domain rule now (for example opposing polarity between a justified pair, each side with at least a stated number of dated subject-bound observations in the same period); the numbers are yours.
- **Acceptance:** the KNOWLEDGE fracture lists its 5 observations with source and date; no cross-domain pair is labeled fracture; the ladder level is shown for each pair.

### D6. 730-day SEC lookback dependency (verified feasibility)
- **Findings:** data exists for both periods (B6) and failures are not cached (B7). Required changes: (1) lookback 365 to 730 days in both entity syncs (and 36 months for the as-of position, D2); (2) query both form-type families (`SCHEDULE 13D/13G` and `SC 13D/13G`) for filings before December 2024; (3) space requests (about 1.5 s) and keep the retry (3 attempts) so a burst failure reads as "not obtained"; (4) the hit cap of 100 is sufficient for the sampled companies.
- **Consequence if not done:** the prior period is largely empty and most dimensions read INDETERMINATE (the recorded behavior).

## E. Questions that genuinely need your judgment

1. **Magnitude threshold:** accept 1.0 percentage point (same CUSIP), or give a number? (D1)
2. **KRYL-1334 reconciliation:** may the locked KRYL-1334 spec be amended so that source-dated 12-month comparison is allowed as a second evidence basis alongside persisted snapshots, with the five-state vocabulary replaced by the three dimensions? (C1)
3. **Capital-event magnitude in v1:** INDETERMINATE (default), or define a rule? (D2)
4. **XBRL source:** authorize a `data.sec.gov` company-facts route for capital intensity, yes or no? (D4)
5. **Cross-domain fracture in v1:** leads only (default), or define a numeric rule now? (D5)
6. **Configuration scope:** both rights and participant changes (default)? Your last paste repeated the magnitude answer, so this one is unanswered. (D2)

Everything else in D has a default that can proceed once these are answered. Nothing here authorizes implementation.
