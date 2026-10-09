# SPEC (v1.0, review-ready) — KRYL-1386: source-dated relationship change

Date: 2026-10-09 · Status: **review-ready specification. No implementation is authorized by this document.** Supersedes the working draft `SPEC-kryl1386-source-dated-relationship-change-v0.1-DRAFT-20261009.md` (c72e009), which is kept in the repository unchanged.

Authority and contract:
- Settled decisions: `specs/rubric-alphabet-10of10-20261009.md` (all recorded; none reopened here).
- Preserved, unmodified: the locked snapshot contract in `SPEC-relational-change-temporal-axis.md` (KRYL-1334) and its Amendment A (this spec is the method Amendment A calls for), `relationalchange.js` and its five snapshot states, the snapshot freeze point (subject-lookup settlement), and CLAUDE.md section 6 (the five convergence states; nothing here touches it).
- Verified facts cited as **[V#]** come from read-only SEC checks run 2026-10-09 through the local engine (listed in section 12). Anything not so verified is marked **[UNVERIFIED]** with its closing procedure.

---

## 1. PROBLEM

The brief states "temporal deltas not computed". A guest asking what is forming around a company cannot tell which ownership and capital relationships are new, strengthening, weakening, reconfigured, dissolved or unchanged, nor which of those statements are unknown for lack of evidence. The snapshot diff (KRYL-1334) cannot answer this alone: snapshots are retained 90 days and a 12-month comparison needs history older than any snapshot.

## 2. SOLUTION (summary)

Per relationship, compare **two adjacent 12-month periods** on **source event/effective dates** and report three independent classifications: **Existence**, **Magnitude**, **Configuration**. A dimension the evidence cannot support is `INDETERMINATE` with one reason code and an absence class. The result is labeled `basis: source-dated-12m` and is never merged with snapshot-diff states.

## 3. Definitions and date rules

- **Relationship unit (ownership):** `(issuer CIK, reporting-person CIK, share class CUSIP)`. A holder with two classes is two units; units are never compared with each other.
- **Observation:** one SEC Schedule 13G or 13D filing (original or amendment) for a unit, with: accession, form, filing date, event date, reporting-person CIK and name, issuer CIK, CUSIP, class title, percent of class, aggregate shares, sole/shared voting power, sole/shared dispositive power, direct/indirect flags where present, the ownership-5-percent-or-less flag, document locator, and the raw values.
- **Date rule:** the **event date** is the filing's own `eventDateRequiresFilingThisStatement` (new-format filings) or the "Date of Event Which Requires Filing" stated in the document (legacy). If absent, the **filing date** is used and the observation is labeled `dateBasis: filing`. Ingestion or retrieval time is never used. Dates are calendar dates (UTC, no time of day); period bounds are inclusive.
- **Analysis time T** = the snapshot generation time (the freeze point). **P1** = (T − 12 months, T]; **P0** = (T − 24 months, T − 12 months]; **E1** = T; **E0** = T − 12 months.
- **Held as of E:** the latest observation with event date ≤ E and ≥ E − L, reporting percent > 0 and `classOwnership5PercentOrLess` not true. **L = 24 months** (recommended default; rationale: annual-amendment cadence with one missed cycle; Alphabet holders filed 2024-02 and 2026-02 with nothing between [V5]).
- **Latest observation** among several for one unit: greatest event date; ties by latest filing date, then greatest accession. See section 7 for revised or conflicting filings.

## 4. Retrieval requirement (approximately 48 months)

Required coverage: events from **E0 − L = T − 48 months** through T.

**Rules (recommended defaults):**
1. **Two form-type families, always both:** `SCHEDULE 13D, SCHEDULE 13G` (filings from December 2024 [V4]) and `SC 13D, SC 13D/A, SC 13G, SC 13G/A` (earlier [V4]). A query for one family alone is incomplete coverage.
2. **No pagination dependency.** The search proxy's paging parameters are **[UNVERIFIED]**. The conservative method: request the whole 48-month window per family with the hit cap of 100; **if a response returns the cap (100) or an error, split that window into halves and repeat, down to calendar-month windows; a month that still returns the cap, or any request that fails after retries, makes coverage `INCOMPLETE` for the periods it touches.** Observed volumes (Alphabet 7 current and prior-period filings plus 12 in 2023 to 2024 [V2][V3][V4]) are far below the cap.
3. **Request spacing:** at least 1.5 seconds between search requests and 0.4 seconds between document fetches [V7]; the existing retry (3 attempts with backoff) is kept. A request that fails after retries is "not obtained" (absence class b), never "none".
4. **Documents:** one fetch per observation: `primary_doc.xml` for new-format filings [V1]; the filing's main HTML document for legacy filings (name from the search record id, `accession:file`) [V4]. Documents are cached 30 days by the proxy; search results 15 minutes; failures are not cached [V7].
5. **Budget:** typical entity: 2 searches plus about 20 document fetches (about 10 seconds at the spacing above). Where coverage cannot finish inside the 45-second subject-lookup window, the missing windows are reported `COVERAGE_INCOMPLETE` in the snapshot; they are never filled by assumption. A later refresh (explicit, per the snapshot rule) creates a new snapshot with the history that has since arrived.
6. **Source precedence:** SEC filings are the only evidence that establishes ownership existence, magnitude or configuration. Non-filing sources (news, press releases) may corroborate but never establish.

## 5. Existence — NEW · PERSISTING · DISSOLVED · INDETERMINATE

Inputs: held-as-of E0 (H0), held-as-of E1 observation in P1 (O1), termination evidence (X1), coverage adequacy for E0 (C0) and for P1 (C1) (section 8).

```
if X1 (termination evidence dated in P1) and H0:           DISSOLVED
elif H0 and O1 (percent > 0 observation in P1):            PERSISTING
elif O1 and not H0 and C0:                                  NEW
else:                                                       INDETERMINATE (reason below)
```

- **Termination evidence X1 (positive, closed list):** (a) new-format filing with `classOwnership5PercentOrLess = Y` **or** `classPercent = 0` **[V8: both present in the Vanguard Group 2026-03-26 filing]**; (b) legacy filing stating that the filer has ceased to be the beneficial owner of more than five percent of the class, or reporting 0 percent **[parsing UNVERIFIED]**; (c) an explicit termination or amendment document for 13D. Disappearance, no filing, or a lower percent that is still above 0 is not termination.
- **Reason codes:** `H0` and no `O1` and no `X1`: `NO_CURRENT_OBSERVATION`. `O1` and not `H0` and not `C0`: `COVERAGE_INCOMPLETE`. Neither `H0` nor `O1`: not a relationship in scope, nothing is classified. Conflicting evidence (section 7): `INCOMPATIBLE_OBSERVATIONS`.
- Continuity: the unit key (CIK, CUSIP) is the continuity test. A different CIK is a different unit; the link between the two is a **participant change** (section 7), not continuity.

## 6. Magnitude — STRENGTHENING · WEAKENING · NO MATERIAL CHANGE · INDETERMINATE

**Ownership.** Only when existence is `PERSISTING` **and** the E0 observation (held as of E0) and the E1 observation (held as of E1, in P1) are **distinct filings of the same unit**.
- `delta = percent(E1 observation) − percent(E0 observation)`, in percentage points, using the **reported** `classPercent`; no recomputation.
- `delta >= +1.0`: `STRENGTHENING`. `delta <= −1.0`: `WEAKENING`. (Settled; threshold inclusive.)
- `|delta| < 1.0`: `NO MATERIAL CHANGE` only if section 8 holds; otherwise `INDETERMINATE`.
- Rounding: values are compared as reported (two decimals in new-format filings). A `delta` of exactly 1.00 qualifies.
- `NEW` and `DISSOLVED`: magnitude "not assessed" (shown as such, not as a change class).
- A relationship whose E0 and E1 observations are the same filing: `INDETERMINATE (NO_PRIOR_OBSERVATION)`: no distinct pair.
- Share classes: units with different CUSIP are never compared; a filer reporting two classes yields two independent results.

**Capital events (settled: INDETERMINATE in the first version).** Magnitude is `INDETERMINATE (NO_COMPARABLE_MEASURE)`, absence class d, for every capital event. No amount, count or ratio is derived. Amounts stated in the filing are shown as reported facts, not as a magnitude.

## 7. Configuration — RECONFIGURED (rights | participants) · NO MATERIAL CHANGE · INDETERMINATE

- **`RECONFIGURED (rights)`:** between the E0 and E1 observations (distinct filings, same unit), a **category flip** in any of: sole voting power, shared voting power, sole dispositive power, shared dispositive power (zero to non-zero or the reverse), or direct versus indirect ownership flag. A change in the share count within a category is magnitude, not configuration.
- **`RECONFIGURED (participants)`:** a **verified** change in who holds or reports the position. Verification requires documented affiliation or succession: (a) the filing's own identification of a parent or subsidiary or of the related filers (13G items identifying subsidiaries or group members) **[field mapping UNVERIFIED]**, or (b) an entity record in the registry linking the two CIKs, or (c) a filing that states the transfer. The mere coincidence of one reporting person ending and a related-looking name beginning is a **candidate**, not a verification. A filer-name change on the same CIK is never a change.
- Both subtypes are recorded separately; a relationship may carry both.
- **`NO MATERIAL CHANGE`** (configuration): section 8 holds and neither subtype is found.
- **Unverified candidate:** `INDETERMINATE (PARTICIPANT_CHANGE_UNVERIFIED)` with the candidate named and its evidence gap stated.
- **Capital events:** only `RECONFIGURED (participants)` applies: the same event type in both periods with different counterparty sets, verified by documented affiliation. A different counterparty identifier without affiliation is `NEW` for that counterparty.

**Revised, amended and conflicting filings** (applies to every dimension):
- An **amendment** supersedes the earlier filing for the same unit when its event date is later or equal; both remain listed in provenance.
- **Same unit, same event date, different accessions:** the later filing date (then greater accession) is used. If their reported percent or shares differ, the evidence is conflicting: the dimension is `INDETERMINATE (INCOMPATIBLE_OBSERVATIONS)` and both accessions are shown.
- **Two filings the same day for different CUSIPs** are two units [V2].
- A filing with a missing or unparsable percent is not usable for magnitude (`SOURCE_LIMIT`); it can still support existence only if it reports a termination flag.

## 8. Evidence sufficiency

`NO MATERIAL CHANGE` (magnitude or configuration) requires **all five**:
1. Two distinct observations (E0 and E1) of the same unit (same reporting-person CIK and CUSIP).
2. The E1 observation is dated within P1; the E0 observation within L of E0.
3. **Coverage complete** for the whole retrieval window (section 4): both form families, every request succeeded, no window at the cap.
4. The fields needed are present in both: percent for magnitude; the voting, dispositive and direct/indirect fields for configuration.
5. Both documents were obtained and parsed (a failed fetch or parse is "not obtained", not a missing field).

**The seven `INDETERMINATE` reason codes** (one primary reason per result; absence class per the rubric: a = source does not hold it, b = exists but not obtained, c = obtained but insufficient, d = measure not defined):

| Code | Class | Use |
|---|---|---|
| `NO_PRIOR_OBSERVATION` | a or c | no E0 observation within L, or E0 and E1 are the same filing |
| `NO_CURRENT_OBSERVATION` | a or b | held as of E0, no observation in P1 and no termination evidence |
| `COVERAGE_INCOMPLETE` | b | any search window failed, was at the cap, or a family was not queried |
| `INCOMPATIBLE_OBSERVATIONS` | c | different CUSIP or reporting person, different field set, conflicting same-date filings |
| `SOURCE_LIMIT` | b or d | document unparsable or the needed field not extractable (legacy filings, section 10) |
| `NO_COMPARABLE_MEASURE` | d | capital-event magnitude (settled) |
| `PARTICIPANT_CHANGE_UNVERIFIED` | c | candidate participant change without documented affiliation |

**Downstream claim limits** (section 21): the output states evidenced change and sources only; no causation, intent, distress or recommendation; `INDETERMINATE` is shown as unknown, never as stability; a lead is never shown as an established relationship (rubric item 4 ladder).

## 9. Capital events: identity, deduplication, precedence

- **Event record:** `(issuer CIK, event type, counterparty identifier or none, event date)` with source accession, item code and a document locator. Event type comes from the 8-K item classification already in `edgar8kconnector.js`.
- **Deduplication:** an accession and item pair is one event; an `8-K/A` supersedes its original for the same item; the same event reported in an exhibit and the cover filing is one event.
- **Same event type across periods** means identical event type **and** identical counterparty identifier (or both without one). Existence only (section 5 analogue, no `DISSOLVED`).
- **Precedence:** SEC filings establish; a news report (for example the CNBC piece corroborated by the Alphabet 8-K) corroborates and is shown as corroboration, never as the sole basis.
- Magnitude: section 6. Configuration: section 7.

## 10. Legacy filings (before December 2024)

**Verified [V4]:** `SC 13G/A` filings exist for Alphabet in 2023 and 2024 (12 returned); their main documents are HTML text, fetchable through the document proxy. A text-pattern read recovered aggregate shares and CUSIP for two of three sampled filings (Vanguard Group 2024-02-13: 410,957,639 shares, CUSIP 02079K107; 493,782,758 shares, CUSIP 02079K305); it did **not** recover the percent of class reliably (the pattern captured an item number) and found no CUSIP in the Brin filing (51,772 characters).
**Conservative fallback (until the procedure below closes):** a legacy observation can establish that a filing exists and its filer and date, but **cannot** establish `held` (percent > 0 unconfirmed) or magnitude; legacy-only evidence yields `INDETERMINATE (SOURCE_LIMIT)`.
**Closing procedure:** (1) draw 15 legacy `SC 13G/A` and `SC 13D/A` filings across at least 5 different filers and 3 different filing agents; (2) a person reads percent of class, shares, CUSIP, event date and ceased-ownership statements from the SEC pages; (3) the extractor must match all five values on at least 14 of 15; (4) any miss is documented and that filing pattern stays `SOURCE_LIMIT`. Failure condition: fewer than 14 of 15 matches.

## 11. Fields and provenance (every output)

Per relationship: unit key; periods and bounds; the three classifications with subtype list; reason codes with absence class; for each of `asOfE0`, `asOfE1`, `inP1[]`, `termination`: accession, form, filing date, event date and `dateBasis`, percent, shares, CUSIP, voting and dispositive fields, document locator, retrieval time (distinct from the event date); coverage record per form family and window (succeeded / failed / at cap); `basis: source-dated-12m`; `computedAt: T`. Stored values are as reported; derived values are marked `derived` (none are derived in version one).

## 12. Facts verified 2026-10-09, and facts still to verify

**Verified (read-only, local engine):**
- **V1** `primary_doc.xml` is fetchable for `SCHEDULE 13G/13G/A` and carries class title, CUSIP, event date, aggregate shares, class percent, sole/shared voting and dispositive power, reporting-person type.
- **V2** Alphabet 2025-10-09 to 2026-10-09: Vanguard Capital Management 7.48 percent (436,027,408 sh, CUSIP 02079K305) and 6.41 percent (348,894,310 sh, CUSIP 02079K107), 2026-04-29; Vanguard Group 0 percent twice, 2026-03-26 (event 03/13/2026); Sergey Brin 5.81 percent (359,414,947 sh), 2026-02-17.
- **V3** Alphabet 2024-10-09 to 2025-10-08: only Eric Schmidt, 0.97 percent (2025-02-18) then 0.83 percent (2025-08-14).
- **V4** Pre-December-2024 filings are `SC 13G/A`; the current connector filter does not match them; legacy documents are HTML.
- **V5** Holders file annually (Brin 2024-02-12 then 2026-02-17; Vanguard Group 2024-02-13 then 2026-03-26); BlackRock filed in 2024 and has no 2025 or 2026 filing in the search results.
- **V6** 8-K history over two periods exists (Alphabet 13 and 16; Oracle 13 and 11; Sysco 10 and 26).
- **V7** Bursts return empty or HTTP 500; spaced requests return data; the proxy does not cache failures and caches successes 15 minutes (search) and 30 days (documents).
- **V8** The Vanguard Group 2026-03-26 filing carries `classOwnership5PercentOrLess = Y`, `classPercent = 0` and the `notApplicable` flag `N`.

**Still to verify (each has a procedure and a conservative fallback above):** legacy-document extraction (section 10); the search proxy's paging (not needed by the split method); the field mapping for documented affiliation or group members in 13G (section 7); the prior-period values for Brin and the Vanguard entities (2024 filings, read by the closing procedure); whether any 13D/A pair exists for the sample companies.

## 13. Reconciliation with the existing contract (no locked text modified)

| Existing contract | Relationship to this spec | Required amendment (not made here) |
|---|---|---|
| CLAUDE.md section 6 | no conflict (five convergence states, colors) | none |
| KRYL-1334 snapshot diff, 90-day retention, exact-scope comparison | preserved; this spec is a second, separately labeled basis (Amendment A) | none to the locked text; the amendment already exists |
| `relationalchange.js` five states (no PERSISTING, no INDETERMINATE) | unchanged; the source-dated result is a different record type | a later decision may reconcile the vocabularies; until then they stay separate |
| Formation-history scrubber (`FH_GLYPH`) | reads snapshot states only; not changed | a later display decision for the new record |
| Brief and MAP | currently state "temporal deltas not computed" | the statement is replaced by the new record only when the implementation passes the reachability gate |
| `edgar8ksignal.js` / `secownershipconnector.js` lookback of 365 days and a single form family | insufficient for this method | the retrieval change in section 4, with the DEF-1384 lookup state kept |

## 14. Validation matrix

Fixtures F1 to F6 are the real Alphabet filings in section 12; T = 2026-10-09, E0 = 2025-10-09, L = 24 months. Expected outputs list **existence / magnitude / configuration**; "n.a." = not assessed.

| # | Case | Expected |
|---|---|---|
| F1 | Vanguard Group, both classes: held as of E0 (2024-02-13 filings), P1 filing 2026-03-26 with 0% and the 5-percent-or-less flag | `DISSOLVED` / n.a. / n.a. |
| F2 | Vanguard Capital Management, each class: no observation as of E0, P1 filings 2026-04-29 | `NEW` if coverage complete, else `INDETERMINATE (COVERAGE_INCOMPLETE)` / n.a. / n.a.; the two classes are never compared with each other |
| F3 | Vanguard Group to Vanguard Capital Management, no affiliation document in the extracted fields | configuration `INDETERMINATE (PARTICIPANT_CHANGE_UNVERIFIED)`; becomes `RECONFIGURED (participants)` only when affiliation is documented |
| F4 | Sergey Brin: as-of E0 2024-02-12 (within 24 months of E0), P1 filing 2026-02-17 5.81% | `PERSISTING`; magnitude per the 2024 value (read by the closing procedure): `|delta| >= 1.0` strengthening or weakening, else `NO MATERIAL CHANGE` if section 8 holds; until the legacy parse closes: `INDETERMINATE (SOURCE_LIMIT)` |
| F5 | Eric Schmidt: only P0 observations (0.97 then 0.83); none in P1 | `INDETERMINATE (NO_CURRENT_OBSERVATION)`; the −0.14 point change lies inside P0 and is not classified as P0-to-P1 change |
| F6 | BlackRock: held as of E0, nothing since, no termination evidence | `INDETERMINATE (NO_CURRENT_OBSERVATION)`; never `DISSOLVED` |

Boundary and construction cases (expected, **not yet run**):

| # | Case | Expected |
|---|---|---|
| B1 | 4.00 to 5.00, same unit, distinct filings | `PERSISTING / STRENGTHENING / —` (delta +1.00 inclusive) |
| B2 | 5.00 to 4.01 | `PERSISTING / NO MATERIAL CHANGE` if section 8 holds, else `INDETERMINATE` (delta −0.99) |
| B3 | 6.10 to 5.00 | `PERSISTING / WEAKENING` |
| B4 | E0 and E1 resolve to the same filing | magnitude `INDETERMINATE (NO_PRIOR_OBSERVATION)` |
| B5 | Different CUSIP for one filer | independent units; no cross-class delta |
| B6 | One search window returns HTTP 500 after retries | `COVERAGE_INCOMPLETE`; never `NEW`, never `NO MATERIAL CHANGE` |
| B7 | A window returns exactly 100 hits | split to halves then months; if still 100, `COVERAGE_INCOMPLETE` |
| B8 | Percent unchanged within 1.0 but shared voting power 0 to non-zero | `PERSISTING / NO MATERIAL CHANGE / RECONFIGURED (rights)` |
| B9 | Same CIK, filer name changed | no `RECONFIGURED` |
| B10 | Amendment with later event date for the same unit | amendment used; both accessions in provenance |
| B11 | Same unit, same event date, two accessions with different percent | `INDETERMINATE (INCOMPATIBLE_OBSERVATIONS)`, both shown |
| B12 | Event date missing; filing date used | `dateBasis: filing` shown; result computed |
| B13 | Capital event: same type and counterparty identifier in P0 and P1 | existence `PERSISTING`; magnitude `INDETERMINATE (NO_COMPARABLE_MEASURE)` |
| B14 | Capital event: same type, different counterparty, no affiliation | `NEW` for the new counterparty; no `RECONFIGURED` |
| B15 | News report states an ownership change; no filing | not established; shown as corroboration only |
| B16 | Held as of E0 outside L (filing older than 24 months before E0) | not held; with `O1` present: `NEW` if coverage complete else `INDETERMINATE` |
| B17 | Entity with no 13D/13G filings in the window | nothing classified |
| B18 | Legacy filing, percent not recoverable | `INDETERMINATE (SOURCE_LIMIT)` |

## 15. Acceptance checklist (specification review)

1. Every settled decision in the rubric appears here unchanged (section 2 to 8 each cite the rule).
2. Every rule in sections 4 to 10 has inputs, logic, missing-data behavior and a reason code.
3. Each reason code appears in at least one validation case.
4. Every verified fact cites its check; every unverified item has a procedure and a conservative fallback.
5. Section 13 lists every conflict with an existing contract and changes none.
6. No implementation is authorized.

## 16. Exit criteria for this specification exercise

The exercise **ends** when all of the following are true:
1. **Review:** this document is reviewed and approved by the Founder (or returned with changes in one pass); no further drafting rounds are opened unless a numbered review change is issued.
2. **Evidence gaps closed or deferred:** the four unverified items in section 12 each either pass their closing procedure or are explicitly deferred with their conservative fallback in force (the fallbacks are already specified, so deferral blocks nothing).
3. **Implementation planning ticket filed:** a ticket for the implementation plan references this spec and lists the retrieval change, the extractor, the comparison module and the validation fixtures as separate work items. Implementation does not start until that plan is itself approved.
4. **Validation fixtures captured:** F1 to F6 and B1 to B18 exist as stored fixtures with expected outputs (so the later implementation is tested against this specification, not against itself).

Nothing in this specification authorizes implementation, a connector change, the XBRL route, deployment, or any change to a locked contract.
