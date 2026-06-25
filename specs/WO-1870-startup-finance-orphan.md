# WO-1870 — STARTUP_FINANCE Orphan (truthful queryDomain + \b boundaries)
## STATUS: BUILD-READY. Bottle Test PASS.

Reproduced 2× this session (investment-policy doc, founder-profile doc). `STARTUP_FINANCE` is
routable by `resolvePrimary` but absent from `SYNTH_MAP` → falls back to `synthGeneral` (GENERAL
body) while `queryDomain` still reports `STARTUP_FINANCE` → header/body contradiction.

## 1. SINGLE RESPONSIBILITY
**Job:** `queryDomain` reports the domain that ACTUALLY synthesized; stop substring bleed into STARTUP_FINANCE.
**Output:** truthful `queryDomain` string.

## 2. FORMULA / CONTRACT
- In `synthesizeQuery`: `const effectiveDomain = SYNTH_MAP[vector.primary] ? vector.primary : 'GENERAL';`
  return `queryDomain: effectiveDomain` (was `vector.primary`). Any synthesizer-less domain reports
  GENERAL — truthful, matches the GENERAL body.
- `resolvePrimary` STARTUP_FINANCE pattern + `DOMAIN_SCORE_PATTERNS.STARTUP_FINANCE`: add `\b` to
  `startup`, `runway`, `venture`, `bootstrap` (stops `adventure`∈`venture`, etc.). Pure subtraction.

## 3. FILE MAP
| File | Change | Unchanged |
|------|--------|-----------|
| `src/engine/querysynthesis.js` | effectiveDomain in synthesizeQuery; \b on STARTUP_FINANCE (routing + scoring) | every other rule, SYNTH_MAP |

## 4. BOTTLE TEST
Reduces ambiguity YES · single output YES · boundaries YES · no undefined deps YES · no core
flexibility growth YES (it's subtraction + truthful labeling). **PASS.**

## 5. DEFINITION OF DONE
grep `effectiveDomain` in synthesizeQuery. QA: "founder profile … bootstrapped startup seed round"
→ queryDomain GENERAL = body GENERAL (no mismatch); "adventure travel" → not STARTUP_FINANCE;
full domain regression intact.

## NOTE
Truthful-label fix, NOT building synthStartupFinance (that's a feature). If a real STARTUP_FINANCE
synthesizer is later wanted, that's a separate WO; this one removes the contradiction.
