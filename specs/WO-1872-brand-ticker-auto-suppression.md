# WO-1872 — Brand-as-Ticker / Investment-Context AUTO Suppression
## STATUS: SPEC — carries regression risk (heuristic). Bottle Test: borderline (see §4).

Reproduced this session: car-brand names that are also public tickers (`Tesla`, `Rivian`, `Ford`)
route an investment query to AUTO. The `\b` fix (WO-985b2ba) stopped substring bleed but NOT this
semantic collision — `\btesla\b` still matches "buy tesla stock" → AUTO.

## 1. SINGLE RESPONSIBILITY
**Job:** In a clear investment/portfolio context, a car-brand mention is a ticker, not a vehicle →
do not route AUTO on a brand alone.
**Output:** corrected primary domain (AUTO suppressed when brand-only + investment context).

## 2. FORMULA / CONTRACT
- `INVESTMENT_CONTEXT = /investment policy|investment objective|asset allocation|portfolio|\bequit(y|ies)\b|\bstocks?\b|\bshares?\b|\bbonds?\b|securities|brokerage|ticker|holdings?/i` (conservative — strong signals only, NOT bare "invest").
- In `resolvePrimary` AUTO rule: if `INVESTMENT_CONTEXT.test(q)` AND the only AUTO signal is a brand
  name (no explicit `car|suv|truck|lease|dealer|drive|mpg`), do NOT return AUTO.
- Brand + explicit automotive term (e.g. "buy a Tesla to drive") still routes AUTO.

## 3. FILE MAP
| File | Change | Unchanged |
|------|--------|-----------|
| `src/engine/querysynthesis.js` | INVESTMENT_CONTEXT guard on the AUTO brand branch | non-brand AUTO terms, all other domains |

Relation: overlaps WO-1862 (Safe Matcher) thematically; this is the AUTO-specific semantic guard.

## 4. BOTTLE TEST
Reduces ambiguity YES · single output YES · boundaries YES · no undefined deps YES ·
**no core flexibility growth — RISK**: adds a cross-cutting context condition; mixed queries
("lease a car vs invest the cash") could mis-suppress. Mitigation: conservative INVESTMENT_CONTEXT +
require brand-ONLY. **Verdict: PASS with regression-QA gate** (must pass a mixed-query suite).

## 5. DEFINITION OF DONE
QA: "buy tesla stock / rivian holdings in my portfolio" → NOT AUTO; "buy a Tesla / lease a Rivian"
→ AUTO; mixed-query regression suite green; full domain regression intact.
