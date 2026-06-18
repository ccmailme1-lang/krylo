# WO-1764 — Proper Noun Bleed (querysynthesis.js)

STATUS: BACKLOG — scoped, not built.
ORIGIN: Batch IDs 161–180 (2026-06-16). "Google" fires as a domain trigger
in every query in the batch. No synthesizer should be selected based on a
company name.

## Problem

`detectDomain()` in `src/engine/querysynthesis.js` has no proper noun
exclusion pass. Company names, product names, and brand terms are scored
against the keyword set as if they were domain signals. "Google" appearing
in a query should be neutral — it says nothing about whether the query is
about AUTO, REAL_ESTATE, CAREER, HEALTH, etc.

Same bug class as WO-1724 (ARK substring match in `normalizer.js`) but
located in `querysynthesis.js`'s own router, which WO-1724 does not cover.

## Confirmed instances

| Proper noun | Batch | Queries affected | Notes |
|-------------|-------|-----------------|-------|
| "Google"    | 161–180 | All 20 — systematic | Every query fires `google` as trigger |

## Likely scope beyond Google

Any company name present in the keyword sets would exhibit the same behavior:
- "Apple" → could match HEALTH (apple/nutrition?) or other false paths
- "Amazon" → OWNERSHIP (real estate?) 
- "Ford" → already confirmed via "afford" (WO-1761b) but also as a direct brand name
- "Meta" → could match keyword fragments
- Named individuals (e.g. "Dalio", "Musk") — already handled via WO-1725
  entity attribution, but querysynthesis.js router is separate

## Fix shape

**Option A (preferred):** Proper noun exclusion list in `detectDomain()` —
maintain a `PROPER_NOUN_EXCLUSIONS` set of known company/brand names; strip
matches before keyword scoring runs. Low overhead, surgical.

**Option B:** Require keyword matches to co-occur with non-proper-noun domain
signals before domain is assigned. Higher precision but more complex.

Option A is the right starting shape — same pattern as the existing age-guard
and duration-strip in `extractNumbers()`. Additive, no architecture change.

## Relationship to other WOs

- WO-1724: same bug class, `normalizer.js` — ship together or sequence 1724 first
- WO-1761(b): word-boundary fix — should ship before or with this WO
- WO-1725: entity attribution — different layer, not a fix for this problem

## Dependencies

- WO-1761(b) word-boundary fix (reduces noise before this fix lands)

## Not started

No code written. Spec only.
