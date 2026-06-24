---
WO: 1854
Title: Structural Void Classifier
Status: FILED
Date: 2026-06-23
---

## Single Responsibility
Detect when an expected signal event fails to occur within a defined WINDOW for a given domain, and dispatch it as a first-class ABSENT signal into the shared pool.

## Boundary Declaration
IN SCOPE:
- Add `polarity` field to the shared pool signal contract: `'POSITIVE' | 'NEGATIVE' | 'ABSENT'`
- Define expected event classes per domain (e.g., CAPITAL expects earnings, insider activity, rate moves)
- Detect void condition: expected event class not fired within threshold WINDOW
- Dispatch ABSENT signal via `dispatchBatch()` into surfacerouter.js — same contract as all signals

OUT OF SCOPE:
- UI surface for ABSENT signals (separate WO)
- Prediction of when the event will occur
- Government or policy signal sourcing
- Any modification to cone rendering or MCV calculation

## Zero Drift
This WO touches signal ingestion only. It does not change: surfacerouter routing logic, cone pressure calculation, MCV, convergence classifier, or any UI component.

## Strategic Leverage Statement
Most systems detect what happened. Structural voids — no insider buying despite favorable conditions, no hiring despite record earnings, no permitting despite population growth — are often more informative than positive events. They reveal suppressed momentum. This WO makes absence a first-class detection object, not a missing data state.

## Output Gravity
Single output: ABSENT-polarity signals dispatched into the shared pool, indistinguishable in routing from POSITIVE or NEGATIVE signals. surfacerouter receives them and routes them to the appropriate cone at standard weight.

## Formula / Contract
Signal unit extension:
```
{
  source: string,
  domain: 'TECHNOLOGY' | 'CAPITAL' | 'KNOWLEDGE' | 'LABOR' | 'MEDIA' | 'OWNERSHIP',
  signal: string,
  confidence: number (0–100),
  ts: number,
  polarity: 'POSITIVE' | 'NEGATIVE' | 'ABSENT'   // NEW FIELD
}
```

Void condition:
```
ABSENT fired when:
  expectedEventClass registered for domain
  AND threshold WINDOW elapsed (configurable per class)
  AND no matching POSITIVE or NEGATIVE signal received in WINDOW
```

## File Map
- `src/engine/surfacerouter.js` — accept polarity field (non-breaking, defaults to 'POSITIVE' if absent)
- `src/engine/voidclassifier.js` — NEW: expected event registry + void detection loop
- `src/engine/signalconstants.js` — add POLARITY constants

## Bottle Test
1. Reduces ambiguity? YES — ABSENT is a defined state, not a missing data condition
2. Single dominant output? YES — ABSENT-polarity signals via dispatchBatch()
3. All boundaries defined? YES — ingestion layer only, no UI, no cone logic
4. No undefined dependencies? YES — surfacerouter contract is locked, extension is additive
5. Does not increase expressive flexibility in core? YES — adds one field, does not change routing or scoring logic

## Definition of Done
- `polarity` field accepted by surfacerouter without breaking existing signals
- `voidclassifier.js` registers at least one expected event class per domain
- ABSENT signal dispatched and confirmed in surfacerouter log
- grep confirms `polarity: 'ABSENT'` present in dispatched signal unit
- No regression in existing POSITIVE signal flow
