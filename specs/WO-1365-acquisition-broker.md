# WO-1365 — Acquisition Broker

**STATUS:** SPEC COMPLETE  
**DATE:** 2026-06-01  
**DEPENDS ON:** WO-1364 (Cascade Payload), WO-1360 (Fs Engine), WO-1362 (OLP Surface)  
**RELATED:** WO-1336 L3 Middleware Integrity (not a replacement — narrower scope)

---

## Purpose

The Acquisition Broker is the arbitration layer between the cascade intake and the OLP output surface. It receives the WO-1364 acquisition contract, fans out to the relevant engines, arbitrates their responses, and returns a single consensus envelope upstream.

No engine speaks directly to the output. Everything routes through the broker.

---

## Position in the Pipeline

```
Cascade Chain (WO-1363)
        ↓
Acquisition Payload (WO-1364)
        ↓
[ ACQUISITION BROKER ]  ← WO-1365
   ├── Signal Intelligence Engine
   ├── Oracle Runtime (OLP candidate)
   └── Fidelity Gate (WO-1360 Fs)
        ↓
Consensus Envelope
        ↓
OLP Output Surface (WO-1362)
```

---

## Inputs

WO-1364 acquisition contract:
```json
{
  "acquisition": { "intent", "lens", "domain", "signals" },
  "telemetry":   { "signalStrength", "fidelityScore", "capitalFloor" },
  "criteria":    { "<domain-specific k/v pairs>" }
}
```

---

## Engine Fan-Out

| Engine | Input Consumed | Output |
|--------|---------------|--------|
| Signal Intelligence | `acquisition.signals` + `telemetry.signalStrength` | Signal pressure score per domain |
| Oracle Runtime | `acquisition.domain` + `criteria` + `telemetry.capitalFloor` | OLP candidate (action/velocity/entropy) |
| Fidelity Gate (WO-1360) | `telemetry.fidelityScore` | VALIDATED / ESTIMATED / BLOCKED |

---

## Arbitration Logic

1. **Gate check** — if `fidelityScore < 0.50`: return `BLOCKED`. No OLP rendered.
2. **Signal weight** — normalize signal pressure scores across activated signal domains.
3. **Consensus score** — `(signalWeight × 0.40) + (fidelityScore × 0.60)`
4. **Status classification:**
   - `consensus ≥ 0.85` → `VALIDATED`
   - `consensus ≥ 0.50` → `ESTIMATED`
   - Signal contradicts OLP → `FRACTURE`
   - Fs blocked → `BLOCKED`
5. **Confidence** — derived from consensus score, passed to OLP surface for display.

---

## Consensus Envelope (Output)

```json
{
  "status": "VALIDATED | ESTIMATED | FRACTURE | BLOCKED",
  "olp": {
    "action":   "...",
    "velocity": "...",
    "entropy":  "...",
    "rationale": "..."
  },
  "confidence": 0.87,
  "domain": "HOME",
  "lens": "student",
  "arbitration": {
    "signal_weight":    0.72,
    "fidelity_weight":  0.87,
    "consensus_score":  0.80
  },
  "sessionId": "sess_7A2F",
  "timestamp": 1780000000
}
```

---

## Surface Behavior (WO-1362)

| Status | OLP Card | Confidence | Note |
|--------|----------|------------|------|
| VALIDATED | Full render | Shown | Premium gate applies |
| ESTIMATED | Dimmed render | Shown | Premium gate applies |
| FRACTURE | Fracture state | Shown | Signals contradict — flag displayed |
| BLOCKED | No render | Hidden | "Insufficient telemetry" message |

---

## WO-1336 Relationship

The broker operates at the acquisition scope only. It does NOT:
- Replace WO-1336 L3 Middleware Integrity
- Touch the Causal Substrate (L1)
- Modify provenance DAGs

WO-1336 remains the system-wide integrity layer. The broker is a narrower, acquisition-scoped arbitration that feeds into it — not a replacement.

---

## Open Items

1. Signal Intelligence pressure score API — not yet formalized. Broker stub can return mock signal weights until live.
2. Oracle Runtime Phase B — mock OLP candidates until live engine. Broker uses mock data from WO-1362 OLP_DATA in Phase A.
3. FRACTURE state visual design — needs Founder approval before build.
4. Premium gate enforcement — broker must know user tier before surfacing VALIDATED/ESTIMATED output (depends on paywall WO).
