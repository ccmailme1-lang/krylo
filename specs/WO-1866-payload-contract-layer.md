# WO-1866 — Payload Contract Layer (PCL)
## Drop-in emission guard. Zero drift enforcement.

Date: 2026-06-24
Status: SPEC — PENDING GO

---

## SINGLE RESPONSIBILITY

Validate every payload before it emits. Block or flag any payload that violates the contract. No schema changes in the production flow — this is a gate, not a rewrite.

---

## SEMANTIC LOCK (frozen definitions — never derive one from another)

| Field | Meaning | Source | Never substitute |
|-------|---------|--------|-----------------|
| `fs` | Signal strength (fidelity score) | `pendingAcquisition.fidelityScore` or `tensor.fidelityScore` | confidence, convergenceScore |
| `confidence` | Model certainty scalar | `tensor.confidence` (explicit field only) | fs, convergenceScore |
| `convergenceScore` | Structural agreement across domains | `tensor.convergenceScore` | fs, confidence |
| `DV` | Decision velocity composite — derived metric | `decisionvelocity.js report()` | Never a raw feed input |
| `QDV` | Qualified DV = (convergenceScore × confidence) / DV | Computed in `report()` only | Never assigned directly |
| `decision` | Export gate resolution | `'allow' \| 'deny'` — from `canExport()` | boolean, undefined |

Violations: any assignment of `confidence = fs`, `convergenceScore = fidelityScore`, or `DV` used as a raw input are hard contract failures.

---

## PIPELINE ORDER (deterministic — no cross-stage side effects)

```
ingest → synthesize → detect → score → rank → gate → emit
```

Each stage has one job. No stage reads from a downstream stage. No stage mutates upstream state.

---

## PAYLOAD INVARIANTS (all must pass before emit)

### 1. Domain resolved
- `domain` must be a non-empty string from the canonical 6: `TECHNOLOGY | CAPITAL | KNOWLEDGE | LABOR | MEDIA | OWNERSHIP`
- Fallback drift (`'FINANCIAL'`, `'INVESTMENTS'`, `'GENERAL'`) = INVALID
- If domain cannot resolve → payload state: `AMBIGUOUS`, emit blocked

### 2. Lens matched
- `lens` must be non-null OR explicitly `'UNANCHORED'`
- `'RESTART'` = INVALID — indicates routing failure, not a lens
- Lens must map to a registered LensRegistry entry

### 3. Confidence defined
- `confidence` = `tensor.confidence ?? null`
- `null` is valid (QDV stays null, downstream handles gracefully)
- `confidence = fs` = CONTRACT VIOLATION — blocked

### 4. Decision binary
- `decision` = `'allow' | 'deny'`
- Missing decision on a completed flow = CONTRACT VIOLATION

### 5. Emission completeness (DV contract)
- `flowId` must be present
- `t0` must be stamped (ingest boundary)
- `t2` must be resolved (decision boundary)
- `t1` absence is permitted (HP may not have fired) — degraded but valid
- Missing `t0` or `t2` = incomplete flow, flagged in telemetry

### 6. HP scoring (when qualified)
- `hp.qualified === true` requires: `domains.length >= 2`, `peakScore >= HIGH_CONVERGENCE_FLOOR`, `velocity !== 'DECAYING'`
- HP override of brief domain only valid when `hp.qualified === true`
- HP domain must be from canonical 6

---

## FILE MAP

| File | Change |
|------|--------|
| `src/engine/payloadcontract.js` | NEW — `validatePayload(payload, dvReport)` → `{ valid, violations[] }` |
| `src/engine/consultingexport.js` | Wrap `buildExportPayload()` — call `validatePayload()` before return, attach `_contract` field |
| `src/engine/decisionvelocity.js` | No change — already correct |
| `src/engine/querysynthesis.js` | DEF-1864: `resolvePrimary()` returns `AMBIGUOUS` instead of lens fallback |

---

## CONTRACT MODULE INTERFACE

```js
// src/engine/payloadcontract.js

export const CANONICAL_DOMAINS = new Set([
  'TECHNOLOGY', 'CAPITAL', 'KNOWLEDGE', 'LABOR', 'MEDIA', 'OWNERSHIP'
]);

export const INVALID_LENSES = new Set(['RESTART', 'UNSET', '']);

/**
 * Validates a payload before emission.
 * Returns { valid: bool, violations: string[] }
 * Fail-open: violations are logged, never throw.
 */
export function validatePayload(payload, dvReport = null) {
  const violations = [];

  // 1. Domain
  const domain = payload?.subject?.domain ?? payload?.domains?.[0] ?? null;
  if (!domain || !CANONICAL_DOMAINS.has(domain.toUpperCase())) {
    violations.push(`DOMAIN_INVALID: "${domain}" not in canonical set`);
  }

  // 2. Lens
  const lens = payload?.subject?.lens ?? null;
  if (lens && INVALID_LENSES.has(lens.toUpperCase())) {
    violations.push(`LENS_INVALID: "${lens}" is a routing failure state`);
  }

  // 3. Confidence (semantic check — cannot validate value, only presence)
  const confidence = payload?.signal_snapshot?.confidence ?? null;
  const fs         = payload?.provenance?.fidelity_score ?? null;
  if (confidence !== null && fs !== null && confidence === fs) {
    violations.push(`CONFIDENCE_DRIFT: confidence === fs — semantic substitution detected`);
  }

  // 4. Decision
  if (dvReport !== null) {
    const decision = dvReport?.decision;
    if (decision !== 'allow' && decision !== 'deny') {
      violations.push(`DECISION_MISSING: expected 'allow'|'deny', got "${decision}"`);
    }

    // 5. Emission completeness
    if (!dvReport?.flowId) {
      violations.push('FLOW_ID_MISSING: no flowId on emission');
    }
    if (dvReport?.timestamps?.t0 === null) {
      violations.push('T0_MISSING: ingest boundary not stamped');
    }
    if (dvReport?.timestamps?.t2 === null) {
      violations.push('T2_MISSING: decision boundary not resolved');
    }
  }

  return {
    valid:      violations.length === 0,
    violations,
  };
}
```

---

## HAPPY PATH SCORING FUNCTION (strict — replaces heuristic)

```
signal graph
   ↓
weighted edges: { opportunity, confidence, timeSensitivity }
   ↓
path score = (convergenceScore × confidence × timeSensitivity) / decayFactor
   ↓
ranked action sequence [Near, Mid, Long]
   ↓
export payload
```

Time horizon assignment:
- **Near** (0–90 days): path score ≥ 0.75, velocity = BUILDING
- **Mid** (90 days–12 months): path score ≥ 0.50, velocity ≠ DECAYING
- **Long** (12+ months): path score ≥ 0.25, structural signal present

If no paths meet Near threshold → Near = COLD (explicit, not empty).

---

## BOTTLE TEST

1. Reduces ambiguity? YES — every field has one meaning, enforced at gate
2. Single dominant output? YES — `{ valid, violations[] }` — no interpretation
3. All boundaries defined? YES — canonical domain set, invalid lens set, semantic drift check
4. No undefined dependencies? YES — reads from payload + dvReport only
5. Does not increase expressive flexibility in core? YES — gate only, no new routing logic

---

## DEFINITION OF DONE

- `validatePayload()` exists in `src/engine/payloadcontract.js`
- `buildExportPayload()` calls it before return — `_contract` field attached to payload
- A payload with `domain = 'INVESTMENTS'` fails validation
- A payload with `confidence === fs` fails validation
- A payload with missing `t0` is flagged in violations
- HP qualified payload with `lens = 'RESTART'` is flagged
- All existing builds pass (violations logged, not thrown — fail-open)
