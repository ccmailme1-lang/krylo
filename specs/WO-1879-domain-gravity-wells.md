# WO HARDENING TEMPLATE
## Thunder in a Bottle — Bottle Test v1.0

---

## HEADER

**WO-1879 — Domain Gravity Wells**
Date: 2026-06-26
Author: Mr. XS / Agent
Target file(s): domaingravity.js (NEW), surfacerouter.js, querysynthesis.js

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Compute per-domain live pressure with polarity from current signal flow, and use it as a weighted bias in domain scoring during query synthesis.

**Output:** `DomainPressure` object per domain — `{ magnitude: number (0–100), polarity: 'constructive' | 'fracture' }`

---

## 2. BOUNDARY DECLARATION

**Input contract:**
- Signal records currently flowing through `surfacerouter.js` (domain-tagged, normalized 0–100 per §16)
- `voidclassifier.js` fracture flags on active signals
- Query string passed to `detectDomain()` in `querysynthesis.js`

**Output contract:**
- `getDomainPressure(domain: string): DomainPressure` — callable by `detectDomain()` as tie-breaker weight
- `getAllDomainPressures(): Record<string, DomainPressure>` — for future UI consumption (WO-1880)

**Explicit exclusions:**
- Does NOT change the 6 locked domain names (TECHNOLOGY · CAPITAL · KNOWLEDGE · LABOR · MEDIA · OWNERSHIP)
- Does NOT touch §16 ingestion contract — reads router state, does not modify it
- Does NOT replace keyword matching in `detectDomain()` — augments scoring only when domains are within 15% of each other (tie-breaker only)
- Does NOT modify `convergenceclassifier.js`, `happypathdisplacementengine.js`, or any HP logic
- Does NOT write back to signal scores or ingestion pipeline

---

## 3. ZERO DRIFT CONFIRMATION

- [x] Detection layer touched → inference does NOT redefine signal schema
  **Note:** `domaingravity.js` reads existing signal records; it does not add new fields to the signal schema.
- [x] Scoring layer touched → output is NOT a recommendation
  **Note:** `DomainPressure` is a bias weight, not a decision. `detectDomain()` still resolves to a single domain string; gravity only breaks ties.
- [ ] Inference layer touched → N/A
- [x] UI layer touched → display does NOT introduce new data dependencies
  **Note:** WO-1880 (Fracture Output Surface) consumes `getAllDomainPressures()`. WO-1879 itself has no UI component.

**Drift notes:** The tie-breaker threshold (15%) must be hardcoded as a named constant `GRAVITY_TIE_THRESHOLD = 0.15` in `domaingravity.js`. It is NOT tunable at runtime. Prevents gravity from overriding clear domain matches.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** Domain Gravity Wells make KRYLO direction-honest — a query arriving during fracture-polarity CAPITAL pressure routes to defensive/short framing rather than producing false constructive output, surfacing the structural asymmetry the market is not yet pricing.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is:** a signed domain pressure reading that tells `detectDomain()` not just which domain is active, but whether that domain is pulling toward opportunity or fracture."

---

## 6. FORMULA / CONTRACT

### DomainPressure type
```
DomainPressure = {
  domain:    string,           // one of the 6 locked domains
  magnitude: number,           // 0–100 (§16 scale — average normalized signal strength in window)
  polarity:  'constructive' | 'fracture',
  signalCount: number,         // N signals contributing to this reading
  windowMs:  number,           // observation window used (default: 300_000ms / 5 min)
}
```

### Magnitude formula
```
magnitude = mean(signal.confidence) across all signals tagged to domain
            within the observation window, normalized 0–100
```
Source: `surfacerouter.js` active signal records (already normalized per §16). No new normalization required.

### Polarity formula
```
fractureRatio = count(signals where voidclassifier flagged OR convergenceState === 'TURBULENT_CONVERGENCE')
                ÷ total signal count for domain in window

polarity = fractureRatio >= 0.40 ? 'fracture' : 'constructive'
```
Threshold `FRACTURE_POLARITY_THRESHOLD = 0.40` — named constant, not tunable at runtime.

### Tie-breaker application in detectDomain()
```
// Only fires when top two domain scores are within GRAVITY_TIE_THRESHOLD of each other
if (Math.abs(scoreA - scoreB) / Math.max(scoreA, scoreB) < GRAVITY_TIE_THRESHOLD) {
  const pressureA = getDomainPressure(domainA);
  const pressureB = getDomainPressure(domainB);
  return pressureA.magnitude >= pressureB.magnitude ? domainA : domainB;
}
```

Units: magnitude is unitless 0–100. polarity is enum string.
Normalization: magnitude conforms to §16 scale (inherits from source signals).

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| `src/engine/domaingravity.js` | NEW — `computeDomainPressure()`, `getDomainPressure()`, `getAllDomainPressures()` | — |
| `src/engine/surfacerouter.js` | ADD — `getActiveSignalsByDomain(domain, windowMs)` export (read-only, no mutation) | All routing logic, queue, TTL, HYDRATION_OP |
| `src/engine/querysynthesis.js` | ADD — tie-breaker call in `detectDomain()` using `getDomainPressure()` | All keyword matching, threshold logic, domain map, everything else |
| `src/engine/voidclassifier.js` | READ ONLY — `domaingravity.js` imports existing fracture flags | No changes |

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES — close domain matches now resolve by live signal context, not arbitrary tie-breaking |
| Does this have a single dominant output? | YES — `DomainPressure` per domain |
| Are all boundaries explicitly defined? | YES — tie-breaker only, threshold named constant, §16 scale inherited |
| Can this be built without touching an undefined dependency? | YES — all dependencies exist: surfacerouter.js, voidclassifier.js, querysynthesis.js |
| Does this avoid increasing expressive flexibility in the core? | YES — does not change domain names, routing logic, or HP system |

**Verdict:** PASS

---

## 9. DEFINITION OF DONE

1. `grep -r "getDomainPressure" src/engine/querysynthesis.js` returns a match
2. `grep -r "GRAVITY_TIE_THRESHOLD" src/engine/domaingravity.js` returns a match
3. `grep -r "FRACTURE_POLARITY_THRESHOLD" src/engine/domaingravity.js` returns a match
4. `grep -r "getActiveSignalsByDomain" src/engine/surfacerouter.js` returns a match
5. QA: query "should I short treasuries" during simulated high-CAPITAL-fracture signal state → domain resolves to CAPITAL, polarity = 'fracture'
6. QA: query "AI chip supply chain" during high-TECHNOLOGY-constructive state → domain resolves to TECHNOLOGY, polarity = 'constructive'
7. Existing `detectDomain()` QA suite (14/14 boundary guards) still passes — no regression

---

## NOTES

- WO-1880 (Fracture Output Surface) depends on this WO. Do not build 1880 before 1879 is complete and verified.
- `getAllDomainPressures()` is exported but not consumed until WO-1880. Export it now — it's the surface the fracture UI reads.
- Doctrine anchor: §20 (Direction Honesty Principle, CLAUDE.md). This WO is the wire that makes §20 operative.
