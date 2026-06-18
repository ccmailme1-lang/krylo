# WO-1767 — Weighted Domain Superposition Layer

STATUS: BACKLOG — spec locked, not built.
ORIGIN: Batch analysis 2026-06-17. Post-WO-1724/1764 diagnostic.
LAYER: Domain resolution + synthesis routing. Replaces terminal binding.
CLASS: ARCHITECTURE — representation model change.

---

## 1. Problem

`detectDomain()` currently returns a single string:

```js
export function detectDomain(query, lens) {
  // ...
  return 'REAL_ESTATE';  // terminal binding
}
```

This is **terminal binding**: all domain information except the winner is
discarded at resolution time. Downstream synthesis, scoring, and acquisition
broker operate on a scalar label with no uncertainty information.

Consequences:
- "rent, career, capital" → REAL_ESTATE (rent wins) — CAREER and CAPITAL lost
- Multi-stable queries synthesize the wrong domain confidently
- No downstream module can recover from a bad domain assignment
- The 7-plateau: stable triads produce 7s; everything else collapses because
  domain diversity is destroyed before synthesis begins

---

## 2. Scope boundary

This WO DOES:
- Change `detectDomain()` to return a domain vector instead of a string
- Update all direct callers of `detectDomain()` to consume the vector
- Implement an explicit collapse policy boundary (the only place vectors
  become strings is at the presentation layer)
- Wire WO-1766 ambiguity gate into the resolution path

This WO does NOT:
- Change any synthesizer internals
- Change Fs scoring weights
- Add new synthesizers (LABOR gap is a separate WO)
- Change ingress, normalizer, or acquisition broker schemas

---

## 3. Domain vector type

```js
// DomainVector — replaces the string return of detectDomain()
{
  primary: string,           // highest-weight domain label
  weights: {                 // normalized weights, sum = 1.0
    [domainLabel]: number
  },
  state: 'HARD' | 'SOFT' | 'HOLD',  // from WO-1766 classifyAmbiguity()
  entropy: number,           // from WO-1766
  resolutionEligible: boolean
}
```

On `state === 'HOLD'`: `primary = 'AMBIGUOUS'`, `weights = {}`.
On `state === 'HARD'`: `primary` holds the sole domain, weights may show
secondary entries but primary weight ≥ 0.65.
On `state === 'SOFT'`: `primary` is the highest-weight domain, but 2+ entries
are present with meaningful weight (each ≥ 0.15).

---

## 4. Collapse policy boundary

**Rule: No implicit string casting below the synthesis layer.**

The only permitted collapse points are:

1. **`synthesizerFor(vector)`** — maps a DomainVector to a synthesizer function.
   On HARD: routes to primary domain's synthesizer (existing behavior).
   On SOFT: routes to primary synthesizer but passes full weight vector for
   context injection (synthesizer may use secondaries for hedge language).
   On HOLD: returns null — no synthesis runs.

2. **Presentation layer** — `targetpacket.jsx`, `intelligencebrief.jsx`,
   `actionmatrix.jsx`. These may display `vector.primary` as a label string.
   They must never pass the vector into engine functions as a string.

**FORBIDDEN** anywhere below the synthesis layer:
```js
const domain = detectDomain(query, lens);  // old scalar usage — banned
someEngine(domain);  // passing a string into engine functions
```

**REQUIRED** pattern:
```js
const vector = detectDomain(query, lens);  // returns DomainVector
const synthesizer = synthesizerFor(vector);
if (synthesizer) { ... }
```

---

## 5. synthesizerFor() routing rules

```js
// src/engine/querysynthesis.js
export function synthesizerFor(vector) {
  if (!vector.resolutionEligible) return null;

  // HARD: direct map
  if (vector.state === 'HARD') {
    return SYNTH_MAP[vector.primary] ?? synthGeneral;
  }

  // SOFT: primary synthesizer with secondary context injection
  if (vector.state === 'SOFT') {
    const primary = SYNTH_MAP[vector.primary] ?? synthGeneral;
    return (query, tensor) => primary(query, tensor, {
      secondaryDomains: Object.entries(vector.weights)
        .filter(([d]) => d !== vector.primary)
        .sort(([,a],[,b]) => b - a)
        .slice(0, 2)
    });
  }

  return null;
}
```

The `secondaryDomains` context parameter is an optional extension hook.
Existing synthesizers that don't accept it will ignore it (no breaking change).
Future synthesizers may use it to add hedge language or multi-domain framing.

---

## 6. Caller update map

All current call sites of `detectDomain()` that consume a string return:

| File                                    | Usage                          | Required change                    |
|-----------------------------------------|--------------------------------|------------------------------------|
| `src/components/analysis/analysisidlefield.jsx` | `detectDomain(query, lens)` stored as `domain` string | Store as vector; pass `vector.primary` where label is needed |
| `src/engine/acquisitionbroker.js`       | `domain` field on payload      | Accept `vector.primary` or 'AMBIGUOUS' |
| `src/engine/querysynthesis.js`          | Internal SYNTH_MAP lookup      | Replace with `synthesizerFor(vector)` |
| `src/engine/ingress.js`                 | Does not call `detectDomain()` | No change                          |

Audit via grep before build: `grep -rn "detectDomain(" src/`

---

## 7. Weighted synthesis — SOFT state behavior (v1)

In v1, SOFT state synthesis is conservative:

- Primary synthesizer runs
- Secondary context injected as optional parameter
- Existing synthesizers produce identical output (they ignore the extra param)
- No new synthesizer blending in v1

v2 (future WO) may implement true synthesis blending — generating output that
draws from multiple domain synthesizers weighted by the vector. v1 establishes
the representation without requiring synthesizer rewrites.

---

## 8. HOLD state behavior

`state === 'HOLD'` → `synthesizerFor()` returns null.

`analysisidlefield.jsx` must handle null synthesizer:
- Display "Insufficient signal to synthesize" (existing insufficient-signal path)
- Fs = 0 (acquisition broker receives domain: 'AMBIGUOUS', Fs gate blocks)
- No OLP output generated

This is not a new UI state — it is the existing LOW_FIDELITY / BLOCKED path.
No UI changes required.

---

## 9. No-regression contract

The following must produce identical output before and after this WO:

- Any query that currently produces a HARD resolution (dominant single domain)
  must produce identical synthesis output post-WO. HARD state = existing
  behavior preserved exactly.
- Fs scoring for HARD queries: no change.
- Protected domain gate (medical/disability entities): runs before ambiguity
  gate, returns string that is wrapped into a synthetic HARD vector internally.

---

## 10. Failure modes

| Failure                              | Behavior                                            |
|--------------------------------------|-----------------------------------------------------|
| WO-1766 not present                  | Build fails — domainambiguitygate.js is a required import |
| vector.weights sum ≠ 1.0             | Normalize on read — do not throw                    |
| SYNTH_MAP missing primary domain     | Fall through to synthGeneral (existing behavior)    |
| Caller passes vector.primary as string to engine | Lint rule — see §11                     |
| SOFT state + no secondary synthesizer | Conservative: primary only, no blend               |

---

## 11. Lint enforcement (collapse policy)

Add to `eslint.config.js`:

```js
// Prevent detectDomain() result from being used as a string directly
// Pattern: detectDomain(...) must be stored, not inline-passed
```

This is a documentation-level lint note for v1. Enforcement via AST rule is
a v2 concern when adopters are confirmed. For now: code review gate only.

---

## 12. Dependencies

- WO-1766 (Domain Ambiguity Gate) — REQUIRED. Must be complete before this WO
  starts. `classifyAmbiguity()` is a hard import dependency.
- WO-1724 (normalizer.js) — COMPLETE
- WO-1764 (querysynthesis.js) — COMPLETE

---

## 13. Files modified

- `src/engine/querysynthesis.js` — `detectDomain()` return type + `synthesizerFor()` added
- `src/components/analysis/analysisidlefield.jsx` — caller update
- `src/engine/acquisitionbroker.js` — caller update (accept AMBIGUOUS domain)

File created:
- `src/engine/domainambiguitygate.js` (WO-1766)

---

## 14. Validation criteria

BAU harness: `qa_wo1767_superposition.mjs`

Required test vectors:

| Query                                        | Expected vector state | Expected primary | Notes                         |
|----------------------------------------------|-----------------------|------------------|-------------------------------|
| "buy a house in Austin"                      | HARD                  | REAL_ESTATE      | Existing routing preserved    |
| "should I roll over my 401k into an IRA"     | HARD                  | RETIREMENT       | Existing routing preserved    |
| "I'm a pro Valorant player, what do I do next" | SOFT               | CAREER           | LABOR co-active in secondaries |
| "rent career capital growth"                 | SOFT                  | CAREER or CAPITAL | 3-way co-active              |
| "xqc streaming future"                       | SOFT or HOLD          | MEDIA or AMBIGUOUS | Depends on signal strength  |
| Calling detectDomain() on existing HARD query and running through synthesizer | PASS | — | No-regression check |

All vectors must pass + no-regression suite must be 100% before COMPLETE.

---

## 15. What this does NOT unlock (honest accounting)

Fixing terminal binding is necessary but not sufficient to break the 7-plateau.

The plateau also requires:
- A first-class LABOR synthesizer (no WO filed as of 2026-06-17)
- Second-order meta-signal amplification consuming multi-domain SOFT outputs
  (WO-1741/1722 territory)
- HYBRID IDENTITY GRAPH for personas that are latent IP nodes (players →
  creators transition model)

WO-1766/1767 establishes the representation layer that makes those possible.
They do not implement them.
