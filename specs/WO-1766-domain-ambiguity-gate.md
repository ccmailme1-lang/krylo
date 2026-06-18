# WO-1766 — Domain Ambiguity Gate

STATUS: BACKLOG — spec locked, not built.
ORIGIN: Batch analysis 2026-06-17. Post-WO-1724/1764 diagnostic.
LAYER: Pre-resolution gating. Sits between tokenization and domain commitment.
CLASS: ARCHITECTURE — probabilistic gating, not ingress hygiene.

---

## 1. Problem

After WO-1724/1764 (lexical hygiene), the system still executes:

```
token → single highest-confidence domain wins → everything else discarded
```

This is a **decision policy failure**, not a parsing failure. Even with clean
tokenization, a single valid token match fires a hard domain lock with no
intermediate state. There is no mechanism to model genuine ambiguity.

Consequences:
- Multi-stable queries (players, career transitions, gig economy) collapse to
  the first strong financial domain match.
- LABOR is pre-absorbed into RETIREMENT / FINANCE because those domains fire
  first on shared vocabulary (income, earnings, rate, cap).
- No query can survive as multi-domain once a hard lock fires.

The 7-plateau in batch scoring is a direct consequence: stable-triad formation
(creator economy: MEDIA + CAPITAL + OWNERSHIP all co-present) produces 7s.
Queries without a pre-formed triad collapse to ≤6 because the ambiguity
resolves to the wrong single domain before synthesis begins.

---

## 2. Scope boundary

This WO does NOT:
- Change `detectDomain()` return type (that is WO-1767)
- Change any synthesizer
- Touch ingress, normalizer, or acquisition broker
- Replace existing domain routing rules

This WO ONLY:
- Adds an ambiguity scoring function that runs before domain commitment
- Produces a resolution eligibility flag and entropy measure
- Provides a classification of query resolution state (HARD / SOFT / HOLD)

The output of this WO feeds WO-1767. It has no UI surface of its own.

---

## 3. Resolution state taxonomy

| State | Condition                              | Meaning                                       |
|-------|----------------------------------------|-----------------------------------------------|
| HARD  | single domain score > threshold margin | one domain dominates — safe to commit         |
| SOFT  | two or more domains within margin band | multi-domain viable — do not collapse          |
| HOLD  | no domain exceeds minimum confidence   | insufficient signal — defer, do not synthesize |

Threshold definitions (v1 — calibratable):

- `HARD_MARGIN`: winning domain score must exceed second-place by ≥ 0.35
- `MIN_CONFIDENCE`: winning domain score must be ≥ 0.25 (absolute, not relative)
- `SOFT_BAND`: any domain within 0.35 of winner qualifies as co-dominant

---

## 4. Entropy model

Shannon entropy over the domain score distribution:

```
H = -Σ p_i * log2(p_i)   where p_i = score_i / Σ scores
```

Interpretation:
- H near 0: one domain dominates → HARD candidate
- H near log2(N): uniform distribution → HOLD candidate
- H between → SOFT candidate

v1 thresholds (calibratable):
- H < 1.0  → HARD eligible
- H > 2.2  → HOLD eligible
- 1.0 ≤ H ≤ 2.2 → SOFT

Resolution state = intersection of margin check AND entropy check.
If margin says HARD but entropy says SOFT → resolve as SOFT.
The more conservative classification always wins.

---

## 5. Token elasticity signal

In addition to entropy, measure token elasticity:

> How many domains does the winning token co-activate?

A token is **elastic** if it scores above `MIN_CONFIDENCE` in ≥ 2 domains.
Elastic tokens weaken the HARD classification.

Example:
- "rent" post WO-1724 → REAL_ESTATE (primary), CAREER (secondary, rent/income)
- elasticity = 2 → HARD threshold raised by 0.1 per elastic token

This prevents false-HARD from single-token dominant queries.

---

## 6. Output contract

```js
// src/engine/domainambiguitygate.js

/**
 * @param {Object} domainScores  — { DOMAIN_NAME: number (0–1) }
 * @returns {AmbiguityResult}
 */
export function classifyAmbiguity(domainScores) {
  return {
    state: 'HARD' | 'SOFT' | 'HOLD',
    entropy: number,           // Shannon H over distribution
    winner: string | null,     // top domain name, null on HOLD
    winnerScore: number,       // top domain score
    coActive: string[],        // all domains within SOFT_BAND of winner
    resolutionEligible: boolean // false on HOLD
  };
}
```

`domainScores` is produced by the existing keyword scoring logic in
`detectDomain()` — this function receives the scores before the winner is
selected, not after.

`resolutionEligible: false` means: do not commit to a domain label this cycle.
WO-1767 consumes this flag to decide whether to return a vector or defer.

---

## 7. HOLD behavior

When `state === 'HOLD'`:
- No domain is assigned
- No synthesizer is invoked
- Acquisition broker receives `domain: 'AMBIGUOUS'`
- Fs scoring treats AMBIGUOUS as a penalized state (existing LOW_FIDELITY path)
- UI receives no synthesis output — the existing "insufficient signal" path fires

HOLD is not an error state. It is an honest representation of query underspecification.

---

## 8. Failure modes

| Failure                             | Behavior                                          |
|-------------------------------------|---------------------------------------------------|
| All domain scores = 0               | HOLD (no signal)                                  |
| Single domain scores = 1, rest = 0  | HARD (degenerate case — correct behavior)         |
| domainScores missing a domain       | Treat as 0 — no throw                            |
| Elastic token inflates wrong domain | SOFT or HOLD — conservative bias is correct       |
| Entropy NaN (log of 0)              | Guard: replace 0-score terms with ε=1e-10         |

---

## 9. What this does NOT fix

- LABOR synthesizer gap: LABOR is weakly modeled. This gate correctly produces
  SOFT or HOLD on player/gig queries — but there is still no synthesizer to
  consume a LABOR-dominant vector. That is a WO-176x range concern.
- Weighted synthesis: SOFT state still needs a consumer. WO-1767 provides that.
  Without WO-1767, SOFT behaves like HOLD (conservative fallback).

---

## 10. Dependencies

- WO-1724 (normalizer.js word boundaries) — COMPLETE
- WO-1764 (proper noun exclusions) — COMPLETE
- WO-1767 (weighted domain superposition) — must land before SOFT state produces
  output other than fallback

## 11. File to create

`src/engine/domainambiguitygate.js`

No modifications to existing files in this WO. WO-1767 wires the gate into
`detectDomain()`.

---

## 12. Validation criteria

BAU harness: `qa_wo1766_ambiguity_gate.mjs`

Required test vectors:

| Query type              | Expected state | Notes                               |
|-------------------------|----------------|-------------------------------------|
| "buy a house in Austin" | HARD           | REAL_ESTATE clear dominant          |
| "I'm a pro Valorant player thinking about my future" | SOFT | CAREER + LABOR co-active |
| "xqc"                   | HOLD           | proper noun only, no domain signal  |
| "rent career capital"   | SOFT           | three domains co-active              |
| "should I roll over my 401k into an IRA" | HARD | RETIREMENT clear |
| empty string            | HOLD           | no signal                           |

All 6 vectors must pass before WO-1766 is marked COMPLETE.
