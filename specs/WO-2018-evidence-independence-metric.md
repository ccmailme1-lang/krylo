# WO HARDENING — Evidence Independence Metric
## Thunder in a Bottle — Bottle Test v1.0

---

## HEADER

**WO-2018 — Evidence Independence Metric (EIM)**
Date: 2026-06-27
Author: Mr. XS + Agent
Target file(s): src/engine/evidenceindependence.js · src/engine/hptiergate.js
  (read-only consumers: evidencetiers.js, synthesis.evidence[])

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Given an HP candidate's evidence set, compute an Independence Score (0–1)
that measures how much of the evidence comes from structurally distinct,
non-correlated tiers — penalizing single-source confirmation and rewarding
cross-domain, cross-tier corroboration.

**Output:** `{ independenceScore, tierSpread, dominantTierRatio, verdict: 'PASS'|'FAIL' }`
— consumed by hptiergate.js as a prerequisite gate before HP-3 assignment.

---

## 2. BOUNDARY DECLARATION

**Input contract:**
- `evidence[]` — array of EvidenceNode objects from current synthesis (read-only)
- Each EvidenceNode must have: `{ source, tier, confidence }`

**Output contract:**
- `IndependenceResult: { independenceScore, tierSpread, dominantTierRatio, verdict }`
- Consumed by hptiergate.js only. No store writes.
- `verdict: 'PASS'` required for HP-3. HP-2 uses independenceScore as a weight
  modifier only (no hard block).

**Explicit exclusions:**
- No modification of evidence nodes, SCI, or viability scores
- No external API calls — independence is computed from evidence metadata only
- No writes to scpstore.js, convergenceclassifier.js, or metricsengine.js
- No modification of HP-0, HP-1, or HP-2 hard qualification logic

---

## 3. ZERO DRIFT CONFIRMATION

- [x] Scoring layer touched → output is NOT a recommendation
  NOTE: IndependenceResult is a gate qualifier. It does not generate paths,
  alter signal scores, or create new evidence.

- [x] Inference layer touched → result does NOT write back to signal scores
  NOTE: EIM reads evidence metadata only. No mutation path exists.

**Drift notes:** Independence is a structural property of the evidence set,
not a signal score. It measures diversity of source origin — not quality of
individual signals. These are orthogonal.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** The current HP gate (WO-2011) checks for structural domain
presence but not source independence. Three pieces of evidence from TECHNOLOGY
all citing the same analyst report look diverse but are a single-source
confirmation. EIM catches this. HP-3 — the highest designation — must rest
on evidence that would survive the removal of any single source. EIM enforces
that robustness requirement deterministically.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is an Independence
Score — a number from 0–1 that measures how much of the HP evidence survives
the removal of any single tier, blocking HP-3 from being awarded on
single-source convergence dressed as structural corroboration."**

---

## 6. FORMULA / CONTRACT

### Tier spread (structural diversity)

```
tierCounts = groupBy(evidence, e => e.tier)
tierSpread = Object.keys(tierCounts).length  // number of distinct tiers present
```

Maximum meaningful tierSpread = 4 (STRUCTURAL, TRANSACTIONAL, BEHAVIORAL, NARRATIVE).

### Dominant tier ratio (concentration measure)

```
dominantTierCount = max(tierCounts.values())
dominantTierRatio = dominantTierCount / evidence.length
```

High dominantTierRatio = evidence concentrated in one tier = low independence.

### Independence Score

```
independenceScore = clamp(
  (tierSpread / 4) × (1 - dominantTierRatio),
  0, 1
)
```

Interpretation:
- tierSpread = 4, dominantTierRatio = 0.25 → score = 1.0 × 0.75 = 0.75 (strong)
- tierSpread = 1, dominantTierRatio = 1.0 → score = 0.25 × 0.0 = 0.0 (single source)
- tierSpread = 2, dominantTierRatio = 0.5 → score = 0.5 × 0.5 = 0.25 (moderate)

### Verdict gate

```
verdict = independenceScore >= 0.50 ? 'PASS' : 'FAIL'
```

HP-3 requires PASS. HP-2 uses independenceScore as a display annotation only
(no hard block at HP-2 — the Viability Function is the HP-2 gate per WO-2017).

### hptiergate.js integration

```
// Before HP-3 assignment only:
const eim = computeIndependence(evidence);
if (eim.verdict === 'FAIL') {
  return { ...rawHp, qualified: true, tier: 'HP-2',
           tierReason: `Independence gate FAIL — score ${eim.independenceScore.toFixed(2)}` };
}
// PASS → proceed to HP-3
```

### IndependenceResult schema

```js
{
  independenceScore:  number,         // 0–1
  tierSpread:         number,         // 1–4 (distinct tiers present)
  dominantTierRatio:  number,         // 0–1 (concentration)
  verdict:            'PASS' | 'FAIL'
}
```

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| `src/engine/evidenceindependence.js` | NEW — computeIndependence(evidence[]) | — |
| `src/engine/hptiergate.js` | EXTEND — call computeIndependence() before HP-3 assignment; FAIL → cap at HP-2 | HP-0, HP-1, HP-2 logic untouched |

No other files touched.

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity? | YES — independenceScore is a precise formula; verdict is binary |
| Single dominant output? | YES — IndependenceResult, one verdict |
| All boundaries defined? | YES — reads evidence[] metadata only; tier taxonomy from evidencetiers.js |
| No undefined dependencies? | YES — evidence[] with source/tier/confidence exists in current synthesis |
| No expressive flexibility increase in core? | YES — gate only affects HP-3 assignment; all lower tiers untouched |

**Verdict: PASS — BUILD-READY.**
No dependency on WO-2017. Can be built in parallel.

---

## 9. DEFINITION OF DONE

1. All evidence from single tier → tierSpread=1, independenceScore ≤ 0.25, verdict=FAIL.
2. Evidence spread across 4 tiers equally → independenceScore ≥ 0.70, verdict=PASS.
3. FAIL verdict → HP capped at HP-2, not HP-3.
4. PASS verdict → HP-3 assignment proceeds normally (regression).
5. HP-2, HP-1, HP-0 logic unchanged before and after EIM mount.
6. `grep -n "dispatchBatch\|convergence.*set\|metrics.*write"` in evidenceindependence.js → zero.
7. independenceScore always in [0, 1] — no values outside bounds under any input.
