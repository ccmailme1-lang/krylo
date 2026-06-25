# WO-1873 — AUTO Numeric Binding (extend IENBG to AUTO)
## STATUS: BUILD-READY. Bottle Test PASS.

WO-1867 numeric binding covers REAL_ESTATE only. AUTO leans on `detectVehiclePrice` (MSRP lookup) +
a down clamp, so it's less exposed — but a stated asset/income figure can still become a car price
when no MSRP is detected. Extend the same anchor + plausibility contract to AUTO for parity.

## 1. SINGLE RESPONSIBILITY
**Job:** An AUTO price must anchor to vehicle/purchase context AND be a plausible vehicle magnitude;
stated assets/income never become a car price. MSRP lookup remains the preferred source.
**Output:** `{ price, down }` for AUTO, or insufficient.

## 2. FORMULA / CONTRACT (mirror `bindRealEstateNumbers`)
- `bindAutoNumbers(query)` in `ienbg.js`: price binds if anchored (window 32) to
  `/price|msrp|sticker|\bcar\b|vehicle|cost|buy|paying|financ/i` AND in plausibility range
  **[$1,000, $500,000]** (vehicle band). Down binds via down/trade-in anchor (window 12), < price.
- Resolution order in `synthAuto`/gate: `detectVehiclePrice(query)` MSRP → bound price → default $35k.
  If numbers present, none bind to price, AND a money-magnitude number exists with NO MSRP detected →
  INSUFFICIENT (don't read assets as a car price). Small scalars → qualitative default.
- Reuse the unified groundedness/eligibility shape from WO-1867.

## 3. FILE MAP
| File | Change | Unchanged |
|------|--------|-----------|
| `src/engine/ienbg.js` | add `bindAutoNumbers` / `checkAutoEligibility` (mirror RE) | RE binding |
| `src/engine/querysynthesis.js` | AUTO branch in synthesizeQuery uses it (parallel to REAL_ESTATE) | synthAuto internals, detectVehiclePrice |

## 4. BOTTLE TEST
Reduces ambiguity YES · single output YES · boundaries YES · no undefined deps YES (extends 1867) ·
no core flexibility growth YES (narrows). **PASS.**

## 5. DEFINITION OF DONE
QA: "$15B assets, drives a Tesla" → AUTO price not $15B (MSRP/withheld, never billions); "buy a
$32,000 Honda, $5k down" → price 32k/down 5k; "buy a CR-V" (MSRP) → 32k; regression intact.
Depends on WO-1867 (done).
