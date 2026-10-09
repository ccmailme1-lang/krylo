# SPEC (DRAFT v0.1) — KRYL-1386: source-dated relationship change (Existence · Magnitude · Configuration)

Date: 2026-10-09 · Status: **DRAFT method specification for review. No implementation is authorized by this document.** It preserves the existing contract until formally reconciled: `SPEC-relational-change-temporal-axis.md` (KRYL-1334, snapshot diff, now with Amendment A), `relationalchange.js` (five snapshot states), CLAUDE.md section 6 (five convergence states, unaffected).

Settled decisions are in `specs/rubric-alphabet-10of10-20261009.md` (and Amendment A). Evidence behind the proposed technical criteria is in `specs/decision-package-alphabet-rubric-20261009.md` (verified facts B1 to B10).

---

## PROBLEM

The brief says "temporal deltas are not computed". A guest asking what is *forming* around a company cannot tell which ownership and capital relationships are new, strengthening, weakening, reconfigured, dissolved or unchanged, nor which of those statements are unknown for lack of evidence. The snapshot diff (KRYL-1334) cannot answer this alone: snapshots are retained 90 days and a 12-month comparison needs historical evidence that predates any snapshot.

## SOLUTION (method)

Compare each relationship across **two adjacent 12-month periods** using **source event/effective dates**, producing three independent classifications. Everything is evidence-first: a dimension that the evidence cannot support is `INDETERMINATE`, with a stated reason; it is never defaulted to "no change".

### 1. Terms and comparison method (settled: window, dates; proposed: lookback L)

- **Relationship unit (ownership):** (issuer, reporting person identified by CIK, share class identified by CUSIP). Two share classes of one holder are two relationships and are never compared with each other.
- **Observation:** one filing for that unit with event date (`eventDateRequiresFilingThisStatement`), reported percent of class, shares, voting and dispositive power fields, form, accession and filing date. Dates used are **event/effective dates**, never ingestion dates; the filing date is the fallback only when no event date is stated, and is labeled as such.
- **Analysis time T** = the snapshot generation time (snapshot rule). **Current period P1** = (T − 12 months, T]. **Prior period P0** = (T − 24 months, T − 12 months]. Period ends: E1 = T, E0 = T − 12 months.
- **Held as of E:** the latest observation with event date ≤ E, no older than **L**, reporting percent > 0. **L (proposed, unresolved): 24 months**, enough for the annual-amendment cadence with one missed cycle (Alphabet holders filed in Feb 2024 and Feb 2026 with nothing between).
- **Source dependency:** the entity-scoped ownership and 8-K syncs must cover **T − 24 − L months = 48 months** of events (today they cover 365 days); both form-type families (`SC 13D/13G` before December 2024, `SCHEDULE 13D/13G` after); requests spaced (about 1.5 s) with the existing retries so a burst failure reads as "not obtained"; the 100-hit cap must not be reached (a response at the cap is incomplete). Until this is built and coverage verified, the prior period is "not observed", not "unchanged".

### 2. Existence — `NEW` · `PERSISTING` · `DISSOLVED` · `INDETERMINATE` (settled)

| Result | Rule |
|---|---|
| `NEW` | Held as of E1 with an observation in P1; **not held as of E0**; **coverage adequate for E0** (section 5). |
| `PERSISTING` | Held as of E0 **and** an observation in P1 reporting percent > 0. |
| `DISSOLVED` | Held as of E0 **and positive evidence of termination** dated in P1: an observation reporting 0 percent or an explicit statement that the filer no longer owns more than 5 percent / has ceased to be a beneficial owner. Disappearance from the record is not evidence of termination. |
| `INDETERMINATE` | Anything else, with a reason code (section 5): for example held as of E0 and no observation in P1 (absence of a filing is not dissolution and is not persistence). |

### 3. Magnitude — `STRENGTHENING` · `WEAKENING` · `NO MATERIAL CHANGE` · `INDETERMINATE` (settled threshold; proposed handling)

**Ownership positions.** Only for relationships with existence `PERSISTING`. `delta = percent(observation held as of E1) − percent(observation held as of E0)`, same CUSIP and same reporting person.
- `delta >= +1.0` point: `STRENGTHENING`. `delta <= −1.0` point: `WEAKENING` (threshold inclusive, settled).
- `|delta| < 1.0` point: `NO MATERIAL CHANGE` **only if** the sufficiency criteria hold (section 5); otherwise `INDETERMINATE`.
- `NEW`, `DISSOLVED`: magnitude not assessed (no comparable pair; the termination or first observation is itself the evidence). It is shown as "not assessed", not as a change class.
- The two observations must be distinct filings. If E0 and E1 resolve to the same filing, magnitude is `INDETERMINATE` (no new observation).

**Capital relationships and capital events (settled: INDETERMINATE in the first version).** A capital event (8-K reported financing, Form D raise) is a dated occurrence, not a standing position. Magnitude is `INDETERMINATE` (reason `NO_COMPARABLE_MEASURE`) until reliable, comparable magnitude evidence and calculation rules exist; no measure is invented from event counts or amounts across non-comparable instruments. Existence for a capital event means: an event of the same type with the same counterparty identifier occurred in the period. `NEW` = in P1 and not in P0 with adequate coverage; `PERSISTING` = in both; `DISSOLVED` does not apply (an event does not terminate); otherwise `INDETERMINATE`.

### 4. Configuration — `RECONFIGURED` · `NO MATERIAL CHANGE` · `INDETERMINATE` (settled: both subtypes)

`RECONFIGURED` carries a **subtype**, recorded separately; a relationship may carry both:
- **`RECONFIGURED (rights)`:** a documented change between the observation held as of E0 and the one held as of E1 in the voting or dispositive power categories (a category moving from zero to non-zero or the reverse, sole versus shared) or in direct versus indirect ownership, as reported in the filings' fields.
- **`RECONFIGURED (participants)`:** a **verified** change in who holds or reports: a different reporting person for the same position, supported by documentation that the entities are affiliated or that one succeeded the other (affiliation confirmed per the five match outcomes in the rubric). A **filer-name change alone is not sufficient** (same CIK, new name is not a change).
- `NO MATERIAL CHANGE` requires both observations compared on the same fields with the same CUSIP and reporting person (section 5). If participant change is suspected but not documented, the result is `INDETERMINATE` with reason `PARTICIPANT_CHANGE_UNVERIFIED` and the candidate noted, never `RECONFIGURED`.
- Capital events: only `RECONFIGURED (participants)` applies (counterparty set differs between periods for the same event type); a different counterparty identifier alone is `NEW` for that counterparty, not a reconfiguration, unless affiliation is documented.

### 5. Evidence sufficiency — `NO MATERIAL CHANGE` versus `INDETERMINATE` (proposed criteria)

`NO MATERIAL CHANGE` (magnitude or configuration) requires **all** of:
1. Two distinct observations (E0 and E1) for the same relationship unit (same CIK, same CUSIP).
2. The E1 observation is dated within P1; the E0 observation is within L of E0.
3. Search coverage complete for both windows and both form-type families: every request succeeded (no HTTP error or timeout) and no response reached the 100-hit cap.
4. The fields needed (percent for magnitude; the rights fields for configuration) are present in both observations.
5. Both documents were parsed (a document that could not be fetched or parsed is "not obtained", not a missing field).

Otherwise `INDETERMINATE`, with exactly one primary reason code and its absence class (rubric: a = source does not hold it, b = exists but not obtained, c = obtained but insufficient, d = measure undefined):
`NO_PRIOR_OBSERVATION` (a or c) · `NO_CURRENT_OBSERVATION` (a or b) · `COVERAGE_INCOMPLETE` (b) · `INCOMPATIBLE_OBSERVATIONS` (c; different CUSIP, different reporting person, different field set) · `SOURCE_LIMIT` (b or d; for example legacy `SC 13G/A` documents not yet parsable) · `NO_COMPARABLE_MEASURE` (d) · `PARTICIPANT_CHANGE_UNVERIFIED` (c).

Observed change never establishes causation; the output states the evidenced change and its sources only (section 21).

### Output record (per relationship)

`{ relationship, periods: {P0, P1, E0, E1}, existence, magnitude, configuration: { class, subtypes[] }, indeterminate_reasons[], observations: { asOfE0, asOfE1, inP1[] } (accession, event date, percent, CUSIP), basis: 'source-dated-12m', computedAt: T }`. It is labeled with its basis and is never merged with the snapshot-diff states.

## COMPONENTS (for the later implementation specification; nothing here authorizes a build)

- 13D/13G field extraction from `primary_doc.xml` (verified fetchable for `SCHEDULE 13G`); legacy `SC 13G/A` documents (format unverified).
- Sync lookback and form-type families in `topicconnectors.js` and the two connectors; request spacing.
- A pure comparison function (new engine module) and fixtures; no change to `inferFormation()` admission logic or to `relationalchange.js` until reconciled.
- Brief and MAP rendering of the three classifications and reason codes (separate decision).

## VALIDATION — cases and expected outcomes

**Real Alphabet fixtures** (T = 2026-10-09, E1 = 2026-10-09, E0 = 2025-10-09, L = 24 months; filings read 2026-10-09):

| Case | Observations | Expected |
|---|---|---|
| Vanguard Group (CIK 0000102909), two classes | held as of E0 via 2024-02-13 `SC 13G/A` (in L); P1: 2026-03-26 `13G/A` reporting 0% | Existence `DISSOLVED` (positive evidence: 0%); magnitude not assessed |
| Vanguard Capital Management (CIK 0002100119), CUSIP 02079K305 and 02079K107 | no observation as of E0; P1: 2026-04-29, 7.48% and 6.41% | Existence `NEW` if coverage adequate for E0 else `INDETERMINATE (COVERAGE_INCOMPLETE)`; magnitude not assessed; the two classes are never compared |
| Vanguard Group to Vanguard Capital Management | participants differ; affiliation not documented in the extracted fields | Configuration `INDETERMINATE (PARTICIPANT_CHANGE_UNVERIFIED)`; `RECONFIGURED (participants)` only if affiliation is documented |
| Sergey Brin (CIK 0001295032) | as-of E0: 2024-02-12 filing (within 24 months); P1: 2026-02-17, 5.81% | Existence `PERSISTING`; magnitude from the 2024-02-12 value (not yet read): `|delta| >= 1.0` strengthening or weakening, else `NO MATERIAL CHANGE` if section 5 holds |
| Eric Schmidt (CIK 0001242463) | P0 only: 0.97% (2025-02-18), 0.83% (2025-08-14); no P1 observation | Existence `INDETERMINATE (NO_CURRENT_OBSERVATION)`; the -0.14 point delta lies inside P0 and is not a P0-to-P1 change |
| BlackRock | held as of E0 (2024-02 filings); no P1 observation, no termination | Existence `INDETERMINATE (NO_CURRENT_OBSERVATION)`; explicitly not `DISSOLVED` |

**Synthetic cases** (unit-level):
- 4.00% to 5.00%, same CUSIP and filer, distinct filings: delta = +1.00 inclusive: `STRENGTHENING`. 5.00% to 4.01%: delta = −0.99: `NO MATERIAL CHANGE` (section 5 satisfied) or `INDETERMINATE` (not satisfied). 6.10% to 5.00%: `WEAKENING`.
- Same CUSIP, E0 and E1 resolve to one filing: magnitude `INDETERMINATE`.
- Different CUSIPs for one filer: never compared (each its own unit).
- A search that returns HTTP 500 for one window: `COVERAGE_INCOMPLETE`, never `NEW` and never `NO MATERIAL CHANGE`.
- A response returning exactly 100 hits: `COVERAGE_INCOMPLETE`.
- Rights change (shared voting power from 0 to non-zero, percent unchanged within 1.0 point): configuration `RECONFIGURED (rights)`, magnitude `NO MATERIAL CHANGE`.
- Filer-name change on the same CIK: no `RECONFIGURED`.
- Capital event: same counterparty identifier and type in P0 and P1: existence `PERSISTING`, magnitude `INDETERMINATE (NO_COMPARABLE_MEASURE)`.
- Entity with no 13D/13G filings: no relationships; nothing is classified.

**Acceptance criteria (per dimension):**
- Existence: each of the four outcomes is reachable from fixtures; absence of a filing is never `DISSOLVED`; `NEW` never returned when prior coverage is incomplete.
- Magnitude: threshold exactly 1.0 inclusive; same-CUSIP only; `NO MATERIAL CHANGE` never returned without section 5; capital events always `INDETERMINATE`.
- Configuration: both subtypes reachable and recorded separately; name change alone never `RECONFIGURED`; unverified participant change never `RECONFIGURED`.
- Sufficiency: every `INDETERMINATE` carries one reason code and an absence class.
- Reachability gate (Full Gate): trace one real query (Alphabet) from the SEC fetch through the comparison to the rendered brief before the work is called validated.

## ROLLBACK

Additive only: a new module, new fetches and a new record. Reverting restores the current "temporal deltas not computed" statement; no change to snapshots, `inferFormation()` or `relationalchange.js`.

## GUIDELINES

**Settled (recorded):** two adjacent 12-month periods on source dates; model of three dimensions with `INDETERMINATE`; 1.0 point threshold, same share class; capital-event magnitude `INDETERMINATE`; both `RECONFIGURED` subtypes, filer-name change alone insufficient; DISSOLVED needs positive evidence; no causation; Amendment A to KRYL-1334.

**Proposed technical criteria, not yet settled:** L = 24 months and the resulting 48-month sync coverage; the exact test for "ceased to own more than 5 percent" (the structured field that carries it is not yet identified; 0% is the confirmed case); how affiliation is documented for `RECONFIGURED (participants)`; the definition of "same capital event type"; handling of legacy `SC 13G/A` documents (format unverified); whether the period anchor T is always the snapshot generation time.

**Not authorized:** implementation, the sync change, the XBRL route, or any change to the snapshot contract, `relationalchange.js`, or CLAUDE.md.
