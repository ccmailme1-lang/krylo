# WO HARDENING — Bottle Test v1.0
## WO-1867 — Input Eligibility & Numeric Binding Gate (IENBG)

---

## HEADER

**WO-1867 — Input Eligibility & Numeric Binding Gate (IENBG)**
Date: 2026-06-24
Author: Mr. XS (analysis) + agent (draft)
Target file(s): `src/engine/ienbg.js` (NEW), `src/engine/querysynthesis.js` (one insertion in `synthesizeQuery()`)

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Sit between classifier and synthesizer and refuse to let under-constrained
or arithmetically-impossible numeric input reach a domain synthesizer.

**Output:** An eligibility verdict `{ eligible, reason, bound }` consumed by `synthesizeQuery()`.

---

## 2. BOUNDARY DECLARATION

**Input contract:** `checkEligibility(domain, numbers, query)` where `domain` is the
classified primary, `numbers` is `extractNumbers(query)`, `query` is the raw string.

**Output contract:**
```
{ eligible: boolean,
  reason:   'OK' | 'INSUFFICIENT_STRUCTURAL_DATA' | 'INVALID_INPUT_STATE',
  bound:    { [role]: number } | {}   // only role-anchored, invariant-passing numbers
}
```

**Explicit exclusions (does NOT touch):**
- Classification / `resolvePrimary()` / domain map — IENBG runs AFTER the domain is chosen.
- The synthesizers' qualitative text — it only governs whether numbers reach them.
- DEF-1864 AMBIGUOUS path — that gate (no-keyword) still runs first, upstream of IENBG.
- WO-1866 Payload Contract Layer — that is the emission boundary; IENBG is the ingestion boundary. Distinct.

---

## 3. ZERO DRIFT CONFIRMATION

- [x] Detection layer touched → IENBG emits no signal and no score; it only validates.
- [ ] Scoring layer touched
- [ ] Inference layer touched
- [ ] UI layer touched

**Drift notes:** Single insertion in `synthesizeQuery()` after the DEF-1864 eligibility
check and before `synthesizerFor()`. On `!eligible`, return the existing AMBIGUOUS-shaped
object extended with `gate: reason` (so the UI can show INSUFFICIENT_STRUCTURAL_DATA instead
of fabricating). On `eligible`, the synthesizer receives `bound` numbers, never the raw orphan set.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** It guarantees that deterministic financial math only ever executes on
numbers that have a verified semantic role and satisfy domain invariants — eliminating
confident fabrication on structurally invalid input.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is a guarantee that a synthesizer
never computes on a number it could not bind to a real field."**

---

## 6. FORMULA / CONTRACT

IENBG is three sub-contracts, evaluated in order. **Two-tier model (RECOMMENDED — see OPEN DECISION):**

### Tier 1 — Qualitative path
- If `numbers` is empty → `{ eligible:true, reason:'OK', bound:{} }`.
  Synthesizer runs qualitative-only (no loan math). Preserves "should I buy a house?".

### Tier 2 — Quantitative path (numbers present)
**(a) Numeric binding (orphan rejection).** A number binds to a role only if a role-anchor
keyword occurs within `N = 4` tokens. Per-domain anchor map, e.g.:
```
REAL_ESTATE: { price: /price|house|home|condo|listing|buy|purchase|asking/,
               down:  /down|down payment|deposit/ }
AUTO:        { price: /price|msrp|sticker|car|vehicle|cost/,
               down:  /down|trade.?in|deposit/ }
```
Numbers with no anchor within window → discarded (kills lonely `55`, AUM `500,000`).

**(b) Required-field check.** If, after binding, a domain's required role set is unmet:
```
required: { REAL_ESTATE: ['price'], AUTO: ['price'] }
```
→ `{ eligible:false, reason:'INSUFFICIENT_STRUCTURAL_DATA', bound:{} }`.
(Numbers existed but none was a real price → do not run quantitative synthesis.)

**(c) Arithmetic invariants.** With bound roles, assert:
```
price > 0
0 <= down <= price
loan = price - down  => loan >= 0
ratio (down/price) ∈ [0, 1]
any derived income/payment >= 0
```
Violation → `{ eligible:false, reason:'INVALID_INPUT_STATE', bound:{} }`.

**Units:** USD for currency roles; ratios dimensionless ∈ [0,1].
**Normalization:** n/a — IENBG emits no 0–100 signal; it is a pre-synthesis validator.

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| `src/engine/ienbg.js` (NEW) | `checkEligibility()`, anchor map, required map, invariants, `IENBG_REJECT` telemetry | — |
| `src/engine/querysynthesis.js` | one block in `synthesizeQuery()`: call `checkEligibility`; `!eligible` → return gated object; `eligible` → pass `bound` to synthesizer | classifier, all synthesizers' qualitative branches, DEF-1864 gate, WO-1866 layer |

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES |
| Does this have a single dominant output? | YES (eligibility verdict) |
| Are all boundaries explicitly defined? | YES |
| Can this be built without touching an undefined dependency? | YES (extractNumbers + DEF-1864 path exist) |
| Does this avoid increasing expressive flexibility in the core? | YES (it strictly narrows what reaches math) |

**Verdict:** PASS (pending OPEN DECISION below)

---

## 9. DEFINITION OF DONE

**Verification:**
1. `grep -n "checkEligibility" src/engine/querysynthesis.js` shows the call in `synthesizeQuery()`.
2. Node harness:
   - IPS doc (`price` absent, orphan `55` + `500000`) → `INSUFFICIENT_STRUCTURAL_DATA`, **no** negative dollars emitted.
   - `$55 home, $500,000 down` → `INVALID_INPUT_STATE` (down>price), **no** computed loan.
   - `should I buy a house?` (no numbers) → eligible, qualitative output, no math.
   - `buy a $350,000 house with $35,000 down` → eligible, bound `{price:350000, down:35000}`, loan=$315,000 ≥ 0.
3. `IENBG_REJECT` telemetry fires on every rejection (step 2 of rollout = visibility).

---

## OPEN DECISION (blocks build until resolved)

**Tier-1 qualitative path: KEEP or DROP?**
- **KEEP (recommended):** no-number queries run qualitative-only. Preserves legit
  directional queries ("should I buy a house?"). Slightly more surface.
- **DROP (strict):** any missing required field → HARD STOP `INSUFFICIENT_STRUCTURAL_DATA`,
  even with zero numbers. Simpler, but blocks qualitative use.

Spec is written for KEEP. Founder sign-off required before code.

---

## NOTES

Rollout order (per Founder): (1) build IENBG, (2) ship `IENBG_REJECT` telemetry to observe
current hallucination rate, (3) THEN classifier hardening (WO-1862 + AUTO/REAL_ESTATE
semantic guards) — which becomes refinement once IENBG catches the dangerous cases.
IENBG does NOT fix wrong-domain *qualitative* output (e.g. "investment vehicle"→AUTO with
no numbers still yields a qualitative car brief); that remains WO-1862's job. Documented so
the gate is not over-credited.
