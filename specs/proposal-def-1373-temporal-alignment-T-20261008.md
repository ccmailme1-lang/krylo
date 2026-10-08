# DEF-1373 proposal: define T (temporal alignment) and fix TURBULENT reachability

Status: PROPOSAL for the Founder, 2026-10-08. Not approved, not built. Class E (no measured source exists today; spec first).

## PROBLEM
`classifyConvergenceState({D,V,A,T}, conf)` (convergenceclassifier.js) has two states that can never be reached:
1. **T is a constant** (0.7 in formationadapter.js and conemap.jsx, 0.5 in analysisfield.jsx). TURBULENT needs `V > 0.8 && T < 0.5`; HIGH needs `T >= 0.6`. With T fixed, the T term never discriminates.
2. **V > 0.8 is unreachable by V's own definition.** V is the population standard deviation of a domain's signal confidences, each scaled to 0..1 (analysisfield.jsx:863-866; a single reading gives 0). For values confined to [0,1] the largest possible standard deviation is 0.5. So `V > 0.8` can never be true, whatever T is. Defining T alone does not make TURBULENT reachable.

## PROPOSED SOLUTION (for approval)
**T, per domain, from the signals already in the pool (`getDomainSignals`):**
- Use each signal's real event date (`eventDate`) when the connector carries one (domaingravity.js stores it; EDGAR 8-K, ownership filings do). Do not use `ts`: for polled feeds `ts` is the ingestion time, so its alignment reflects the polling cadence, not whether events line up.
- With N dated signals in the window W (the map window, 30 min of pool, but event dates span days: use the span of the dated events, normalized by the longest span the pool can hold, 365 days for the entity-scoped syncs): `T = 1 - min(1, sigma_t / (0.289 * W_dates))` where `sigma_t` is the standard deviation of the event dates and 0.289 is the standard deviation of a uniform spread over the window (so a uniform spread scores 0 and simultaneous events score 1).
- **Fewer than 2 dated signals: T is not computed.** It is a classified absence (`T = null`, reason "fewer than two dated observations"), never 0.7 or 0.5. The classifier treats `T = null` as unable to satisfy either T condition, so the domain can be BUILDING but not HIGH or TURBULENT. (Absence-Is-Signal, section 1.)
- Thresholds already in the classifier (T < 0.5, T >= 0.6) stay as they are; they are the Founder's values.

**V rescale (separate decision):** to make `V > 0.8` meaningful, normalize V to 0..1 by its maximum, `V' = sigma / 0.5`. Alternative: lower the TURBULENT threshold to a value reachable by sigma (for example 0.3). Either is a Founder value change; the code should not choose.

## COMPONENTS
- `src/engine/convergenceclassifier.js`: accept `T = null` (treated as unmet for HIGH and TURBULENT).
- New pure helper (for example `temporalalignment.js`): `computeT(signals) -> { T | null, n, reason }`.
- Callers: conemap.jsx, formationadapter.js, analysisfield.jsx (replace the constants), structurepanel.jsx (MAP `mapExtras` currently uses T = 0.7).
- Precedent for the pieces: V is already measured this way (analysisfield.jsx:863); `eventDate` already exists in the pool; the T < 0.5 and T >= 0.6 thresholds exist in the classifier. No external reference is claimed for the uniform-spread normalization; it is a choice for the Founder to accept or replace.

## ORTHOGONALITY (section 18)
V (spread of confidence) and T (spread of event time) respond to different quantities: Independent / Low risk / no action. D and A are currently the same number (`A = D = magnitude` in every caller): Fully dependent / High risk / Merge or Separate; not changed here, flagged for a ruling.

## VALIDATION
Unit tests on `computeT`: simultaneous dates -> 1; uniform -> about 0; one dated signal -> null. Classifier tests: `T = null` never returns HIGH or TURBULENT. A live Sysco/Oracle run shows per-domain states that are not all BUILDING; the MAP legend then matches what the MAP can draw. Reachability gate (Full Gate): trace one real query to the classifier call and to the MAP ring color.

## ROLLBACK
Revert the helper and the three caller edits; the constants are restored from git (HEAD before the change).

## GUIDELINES
No code until the Founder approves: (1) the T definition and the null rule, (2) the V rescale or threshold change, (3) whether D and A stay merged.
