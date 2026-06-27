# WO HARDENING — Viability Function (HP Stress Gate)
## Thunder in a Bottle — Bottle Test v1.0

---

## HEADER

**WO-2017 — Viability Function (HP Stress Gate)**
Date: 2026-06-27
Author: Mr. XS + Agent
Target file(s): src/engine/viabilityfunction.js · src/engine/hptiergate.js
  (read-only consumers: structuralconfirmation.js, evidencetiers.js)

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Given an HP candidate's evidence set, compute a Viability Score (0–1),
inject a POWER_DISCONTINUITY stress event, recompute Viability under stress,
and return PASS if post-stress viability ≥ 50% of pre-stress viability.
FAIL blocks HP-2+ qualification regardless of other scores.

**Output:** `{ viability, stressedViability, viabilityRatio, verdict: 'PASS'|'FAIL' }`
— consumed by hptiergate.js as a prerequisite gate before HP tier assignment.

---

## 2. BOUNDARY DECLARATION

**Input contract:**
- `evidence[]` — array of EvidenceNode objects from current synthesis (read-only)
- `SCI` — Structural Confirmation Index from structuralconfirmation.js (read-only)
- `domainPressures` — current domain pressure map from surfacerouter.js (read-only)

**Output contract:**
- `ViabilityResult: { viability, stressedViability, viabilityRatio, verdict }`
- Consumed by hptiergate.js only. No writes to any store or engine.
- `verdict: 'PASS'` required for HP-2 and HP-3. HP-1 and HP-0 unaffected.

**Explicit exclusions:**
- No modification of evidence nodes or SCI score
- No external API calls — stress simulation is deterministic from existing signals
- No writes to scpstore.js, convergenceclassifier.js, or metricsengine.js
- No modification of HP-0 or HP-1 qualification logic

---

## 3. ZERO DRIFT CONFIRMATION

- [x] Scoring layer touched → output is NOT a recommendation
  NOTE: ViabilityResult is a gate verdict only. PASS/FAIL controls HP tier
  eligibility but does not alter signal scores or path topology.

- [x] Inference layer touched → result does NOT write back to signal scores
  NOTE: No path from viabilityfunction.js back to convergenceclassifier.js,
  metricsengine.js, or dispatchBatch().

**Drift notes:** Stress simulation is read-only. POWER_DISCONTINUITY is a
synthetic perturbation applied to a copy of the evidence set — it does not
mutate production evidence or domain pressure state.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** HP currently qualifies on structural domain presence and
convergence score. A path can reach HP-2 with strong evidence that collapses
under the first real disruption. The Viability Function closes this gap:
a path that cannot survive a POWER_DISCONTINUITY shock is not a Happy Path —
it is a fragile consensus dressed as structure. The gate enforces this
distinction deterministically.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is a PASS/FAIL
verdict on whether an HP candidate's structural evidence survives a
POWER_DISCONTINUITY stress injection — blocking fragile paths from
reaching HP-2 or HP-3 regardless of their convergence score."**

---

## 6. FORMULA / CONTRACT

### Viability Score (pre-stress)

```
viability = weighted_mean(
  evidence.map(e => evidenceTierWeight(e.tier) × e.confidence)
)
```

Tier weights (from EVIDENCE_DESCRIPTORS, evidencetiers.js):
- STRUCTURAL (Tier 1 — POWER_INFRA, PERMITS, FREIGHT): weight = 1.0
- TRANSACTIONAL (Tier 2 — contracts, filings): weight = 0.70
- BEHAVIORAL (Tier 3 — hiring, spending): weight = 0.45
- NARRATIVE (Tier 4 — analyst reports, press): weight = 0.20

### POWER_DISCONTINUITY stress injection (deterministic)

Stress models a sudden disruption to power/infrastructure availability.
Applied as a suppression multiplier to Tier 1 evidence only:

```
stressedEvidence = evidence.map(e =>
  e.tier === 'STRUCTURAL'
    ? { ...e, confidence: e.confidence × 0.30 }  // 70% suppression
    : e
)
stressedViability = weighted_mean(stressedEvidence)
```

Rationale: POWER_DISCONTINUITY directly attacks structural evidence
(infrastructure, permits, logistics). Narrative and transactional evidence
are unaffected by the stress event — they remain at face value.

### Verdict gate

```
viabilityRatio = stressedViability / viability   // 0–1
verdict = viabilityRatio >= 0.50 ? 'PASS' : 'FAIL'
```

Interpretation: PASS = path retains ≥50% of pre-stress viability under
infrastructure shock. FAIL = path depends too heavily on structural
conditions that can disappear.

### hptiergate.js integration

```
// Before HP-2/HP-3 assignment:
const vr = computeViability(evidence, SCI, domainPressures);
if (vr.verdict === 'FAIL') {
  return { ...rawHp, qualified: false, tier: 'HP-1',
           tierReason: `Viability gate FAIL — ratio ${vr.viabilityRatio.toFixed(2)}` };
}
```

HP-0 and HP-1 are unaffected by the viability gate.

### ViabilityResult schema

```js
{
  viability:        number,         // 0–1, pre-stress
  stressedViability: number,        // 0–1, post-stress
  viabilityRatio:   number,         // 0–1, stressedViability / viability
  verdict:          'PASS' | 'FAIL'
}
```

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| `src/engine/viabilityfunction.js` | NEW — computeViability(evidence, SCI, domainPressures) | — |
| `src/engine/hptiergate.js` | EXTEND — call computeViability() before HP-2/HP-3 tier assignment; FAIL → force HP-1 | HP-0, HP-1 logic untouched |

No other files touched.

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity? | YES — PASS/FAIL is binary; viabilityRatio is a precise scalar |
| Single dominant output? | YES — ViabilityResult, one verdict |
| All boundaries defined? | YES — stress is deterministic; tier weights sourced from evidencetiers.js; no external data |
| No undefined dependencies? | YES — evidence[], SCI, and domainPressures all exist in current synthesis pipeline |
| No expressive flexibility increase in core? | YES — gate only affects HP-2/HP-3 assignment; signal engine untouched |

**Verdict: PASS — BUILD-READY.**

---

## 9. DEFINITION OF DONE

1. All-Tier-1 evidence, ratio < 0.50 after stress → verdict = FAIL.
2. Mixed evidence (Tier 1 + Tier 4), stress → Tier 4 maintains value → ratio likely ≥ 0.50 → PASS.
3. No Tier 1 evidence at all → viability unchanged under stress → verdict = PASS.
4. FAIL verdict in hptiergate.js → HP tier capped at HP-1.
5. PASS verdict → existing HP-2/HP-3 logic proceeds normally (regression).
6. `grep -n "dispatchBatch\|convergenceclassifier.*set\|metricsengine"` in viabilityfunction.js → zero.
7. viabilityRatio always = stressedViability / viability (not hardcoded).
