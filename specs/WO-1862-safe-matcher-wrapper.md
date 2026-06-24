# WO HARDENING — Bottle Test v1.0
## WO-1862 — Safe Matcher Wrapper

---

## HEADER

**WO-1862 — Safe Matcher Wrapper**
Date: 2026-06-24
Author: Mr. XS (filed via agent)
Target file(s): `src/engine/safematcher.js` (NEW), `src/engine/querysynthesis.js` (integration only)

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Convert a raw query into a matchable token string that contains ONLY
natural-language words, so the existing `resolvePrimary()` regex rules never match
against structured-identifier substrings (camelCase tokens, snake_case, JSON keys).

**Output:** A boundary-clean token string + a `structured` flag.

---

## 2. BOUNDARY DECLARATION

**Input contract:** `safeTokenize(raw: string)` — any string (natural language,
camelCase identifier, snake_case, JSON fragment, punctuation-joined).

**Output contract:**
```
{ clean: string,        // lowercase, space-delimited, NL tokens only
  structured: boolean }  // true when input is (or is dominated by) identifier-shaped tokens
```
- `clean` is idempotent: `safeTokenize(safeTokenize(x).clean).clean === safeTokenize(x).clean`
- Pure function. No module state. No I/O.

**Explicit exclusions (does NOT touch):**
- The 60+ routing rules in `resolvePrimary()` — unchanged.
- `DOMAIN_SCORE_PATTERNS` / `scoreDomains()` — unchanged.
- The domain map / lens map — unchanged.
- Semantic over-breadth (e.g. `property` matching `property tax`) — OUT of scope.
  That is a rule-ordering/context problem, fixed case-by-case in `resolvePrimary()`
  (see property-tax fix, SHA pending). A tokenizer cannot fix it.
- Stem-family collisions (finance/financing, operate/operational) — OUT of scope.
  `\b` boundaries do not separate stem families; that needs per-rule exact-token
  tightening. Split to a follow-up WO. Do not fold it in here (would violate §1).

---

## 3. ZERO DRIFT CONFIRMATION

- [x] Detection layer touched → inference does NOT redefine signal schema
  - Note: safematcher only normalizes the input string; emits no signal, no score.
- [ ] Scoring layer touched
- [ ] Inference layer touched
- [ ] UI layer touched

**Drift notes:** The only write into `querysynthesis.js` is at the top of
`detectDomain()`: replace the ad-hoc `(query ?? '').toLowerCase().replace(...)`
preamble with `safeTokenize()`. If `structured === true`, return the existing
DEF-1864 AMBIGUOUS vector (`{ primary:'AMBIGUOUS', state:'HOLD', resolutionEligible:false }`).
No routing rule is edited.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** Structured telemetry and identifier strings can currently impersonate
user intent and force a domain classification; this WO denies non-natural-language
input the ability to drive routing, closing the structured-input contamination surface.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is a token string the
classifier can trust never contains a structured-identifier substring."**

---

## 6. FORMULA / CONTRACT

`safeTokenize(raw)`:

1. Split `raw` on whitespace and punctuation `[\s{}\[\]":,;()/\\]+` → raw tokens.
2. For each raw token, classify:
   - **STRUCTURED** if it matches `/[a-z][A-Z]/` (camelCase/PascalCase boundary)
     OR `/[a-z0-9]_[a-z0-9]/i` (snake_case interior) — i.e. multiple words fused
     without whitespace.
   - **NATURAL** otherwise.
3. STRUCTURED tokens are DROPPED from `clean` (never split into matchable words —
   splitting `jobOfferPackage`→`job offer package` is the bug, not the fix).
4. `clean` = NATURAL tokens, lowercased, single-space joined, then the existing
   `PROPER_NOUN_EXCLUSIONS` strip and `\s*\+\s*` collapse applied (preserve current behavior).
5. `structured` = `true` when at least one STRUCTURED token existed AND no NATURAL
   token carries domain signal (i.e. `clean` is empty or whitespace).

**Units:** n/a (string transform).
**Normalization:** n/a — this module emits no 0–100 signal; it is pre-ingestion.

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| `src/engine/safematcher.js` (NEW) | `safeTokenize()` + token classifiers | — |
| `src/engine/querysynthesis.js` | `detectDomain()` preamble calls `safeTokenize`; `structured===true` → AMBIGUOUS return | all routing rules, `scoreDomains`, domain/lens maps, every synthesizer |

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES |
| Does this have a single dominant output? | YES |
| Are all boundaries explicitly defined? | YES |
| Can this be built without touching an undefined dependency? | YES (DEF-1864 AMBIGUOUS path + validation suite already exist) |
| Does this avoid increasing expressive flexibility in the core? | YES (it narrows what the core will match) |

**Verdict:** PASS

---

## 9. DEFINITION OF DONE

**Verification:**
1. `grep -n "safeTokenize" src/engine/querysynthesis.js` shows the call inside `detectDomain()`.
2. `node validation/validate.mjs` — group C (`C_structured_input.json`) passes;
   `DEF-CAMELCASE-CAREER` (`jobOfferPackage`→AMBIGUOUS) and `DEF-CAMELCASE-RETIREMENT`
   (`retirementSavingsModel`→AMBIGUOUS) resolve.
3. Groups A / B / D / E remain green (zero regressions).

---

## NOTES

WO-1862 addresses structured-input bleed ONLY. It will NOT prevent property-tax-style
leakage (semantic over-breadth) or stem-family collisions — those are distinct defect
classes with distinct fixes. Prerequisite WO-1724 (\b boundary patch) is COMPLETE.
