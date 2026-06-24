---
WO: 1857
Title: Supply Chain Connector — Structural Suppressor
Status: FILED
Date: 2026-06-24
---

## HEADER

**WO-1857 — Supply Chain Connector (Open Supply Hub / Versed AI)**
Date: 2026-06-24
Author: Mr. XS
Target file(s): src/engine/connectors/supplychainconnector.js (NEW), src/engine/surfacerouter.js, src/engine/signalconstants.js

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Ingest facility-level supply chain disruption data, normalize to a suppressionFactor (0–1), and dispatch STRUCTURAL_CONTEXT signals via surfacerouter so co-occurring domain-matched signals are downweighted.

**Output:** STRUCTURAL_CONTEXT signal units carrying `suppressionFactor` field — dispatched via dispatchBatch(), no other output path.

---

## 2. BOUNDARY DECLARATION

**Input contract:** Open Supply Hub facility status API (public). Versed AI supply chain graph (requires key — gated behind env var; connector skips gracefully if absent). Facility records filtered to entities present in entitytopologyregistry.

**Output contract:** Signal units:
```
{
  source:           'SUPPLY_CHAIN',
  domain:           ['TECHNOLOGY', 'CAPITAL', 'LABOR'],
  signal:           string,         // e.g. FACILITY_DISRUPTION:TSMC:FAB_14
  confidence:       number (0–100), // normalized disruption severity
  ts:               number,
  polarity:         'NEGATIVE' | 'ABSENT',
  decay:            'WEEKLY',
  topology:         string[],       // affected entity IDs
  suppressionFactor: number (0–1),  // 0 = no suppression, 1 = full suppression
}
```

surfacerouter reads `suppressionFactor` in dispatchBatch and applies it as a confidence multiplier (× (1 - suppressionFactor)) to co-occurring signals sharing topology overlap in the same batch.

**Explicit exclusions:**
- No UI surface for supply chain data
- No direct conviction state modification
- No write to cone pressure formulas
- No political / government procurement data
- Versed AI is optional — connector runs on Open Supply Hub alone if key absent
- No removal of signals from the registry — suppression is multiplicative only

---

## 3. ZERO DRIFT CONFIRMATION

- [x] Detection layer touched → inference does NOT redefine signal schema. suppressionFactor is a field on the signal unit, not a new schema type. surfacerouter reads it as a multiplier at dispatch time only.

**Drift notes:** Suppression is applied upstream of cone pressure — same insertion point as topology amplification (WO-1855). No downstream layer is aware of suppression. Co-weight rule is symmetric with WO-1855 cluster amplifier: amplifier × 1.2 up, suppressionFactor × (1 - f) down.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** Supply chain disruption is the only signal class that is a structural validity constraint on dependent hypotheses, not a probabilistic input — detecting a confirmed facility shutdown before it surfaces as earnings pressure is the definition of knowing first.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is a suppressionFactor that reduces confidence on co-occurring signals when physical dependencies are confirmed disrupted."**

---

## 6. FORMULA / CONTRACT

Suppression application in surfacerouter.dispatchBatch():
```
suppressionSignals = batch.filter(e => e.suppressionFactor !== undefined)

for each suppressionSignal S:
  affectedSignals = batch.filter(e =>
    e.topology.some(t => S.topology.includes(t)) &&
    e.source !== 'SUPPLY_CHAIN'
  )
  for each affected signal A:
    A.confidence = clamp(A.confidence * (1 - S.suppressionFactor), 0, 100)
```

suppressionFactor normalization:
```
Raw input: facility disruption severity score from Open Supply Hub (0–100 scale internally)
suppressionFactor = severity / 100   // 0 = no disruption, 1 = facility fully offline
```

Confidence normalization (connector output):
```
confidence = clamp(severity, 0, 100)  // mirrors suppressionFactor on 0–100 scale
```

Units: suppressionFactor is dimensionless (0–1). confidence is 0–100 per shared pool contract.

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| src/engine/connectors/supplychainconnector.js | NEW — Open Supply Hub client, Versed AI client (optional/gated), normalization, dispatchBatch | — |
| src/engine/surfacerouter.js | dispatchBatch: read suppressionFactor, apply to co-occurring topology-matched signals | All routing logic, TTL, backpressure, queue |
| src/engine/signalconstants.js | Add SIGNAL_SOURCE.SUPPLY_CHAIN, STRUCTURAL_CONTEXT signal type constant | All existing constants |

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES — suppression is a declared formula at a single insertion point |
| Does this have a single dominant output? | YES — suppressionFactor on STRUCTURAL_CONTEXT signal units |
| Are all boundaries explicitly defined? | YES — upstream of surfacerouter only, no conviction or cone touch |
| Can this be built without touching an undefined dependency? | YES — Open Supply Hub is public; Versed AI gated behind env var |
| Does this avoid increasing expressive flexibility in the core? | YES — adds one field and one inverse co-weight rule, symmetric with WO-1855 |

**Verdict:** PASS

---

## 9. DEFINITION OF DONE

- `supplychainconnector.js` dispatches STRUCTURAL_CONTEXT signals with `suppressionFactor` field
- `surfacerouter.js`: grep confirms suppression application block in dispatchBatch
- Co-occurring topology-matched signals have reduced confidence after suppression signal in batch
- Versed AI path skips gracefully when env var absent (no throw)
- grep confirms `source: 'SUPPLY_CHAIN'` in dispatched signal units
- No raw facility data exposed in any UI component
- No regression in existing signal routing (WO-1855 amplifier still applies)

---

## NOTES

Open Supply Hub API: https://opensupplyhub.org — public, facility-level, maps facilities to brands/companies.
Versed AI: enterprise supply chain graph — requires API key (VERSED_AI_KEY env var). Connector runs Open Supply Hub only if key absent.
Suppression is multiplicative and non-destructive — a suppressionFactor of 1.0 reduces confidence to 0 but does not remove the signal from the registry.
Symmetric with WO-1855: topology amplifier pushes confidence up; supply chain suppressor pushes it down. Same insertion point, same contract.
