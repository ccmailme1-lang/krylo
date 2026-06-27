# WO HARDENING TEMPLATE
## Thunder in a Bottle — Bottle Test v1.0

---

## HEADER

**WO-2010 — Identity Bridge: Wire computeTruthDynamics into useMetricVisibility**
Date: 2026-06-27
Author: Mr. XS
Target file(s): src/components/analysis/targetpacket.jsx · src/components/analysis/intelligencebrief.jsx · src/components/analysis/actionmatrix.jsx

---

## 1. SINGLE RESPONSIBILITY CHECK

> What is the one structural job this module does?

**Job:** Thread the output of `computeTruthDynamics()` from `identitydynamics.js` into `useMetricVisibility()` at all three MetricStrip mount points, activating the Phase 1 fracture interrupt that is currently dormant because `dynamics` defaults to `null`.

> What is the one dominant output type this produces?

**Output:** `dynamics` object — `{ velocity, lifecycle, field }` — passed as second argument to `useMetricVisibility(metrics, dynamics)`, enabling live fractureDensity and per-identity velocity reads.

---

## 2. BOUNDARY DECLARATION

> What does this module receive as input?

**Input contract:**
- `synthesis?.canonicalId` — identity key for per-identity velocity/lifecycle. Null until CanonicalEvent IDs flow through synthesis; gracefully degrades to null velocity (treated as STABLE) when missing.
- No new props. No new context. Reads from existing `synthesis` object already present at each mount point.

> What does this module produce as output?

**Output contract:**
- `dynamics` — result of `computeTruthDynamics(identityId)` — passed to `useMetricVisibility`. No component renders this directly. It is consumed inside the hook and produces `visibility.triggers`.

> What does this module NOT touch?

**Explicit exclusions:**
- `metricvisibility.js` — no changes. FSM logic is locked.
- `useMetricVisibility.js` — no changes. Hook signature already accepts `dynamics`.
- `identitydynamics.js` — no changes. `computeTruthDynamics` is called, not modified.
- `metricstrip.jsx` — no changes.
- Scoring, routing, synthesis, or ingestion layers — untouched.

---

## 3. ZERO DRIFT CONFIRMATION

- [x] UI layer touched → display does NOT introduce new data dependencies: `dynamics` is computed from the existing lineage event store; no new external data source introduced.

**Drift notes:** `computeTruthDynamics` reads from `identitylineage.js` event store — same store WO-2007/2008 write to. No new dependency chain. System-wide `fractureDensity` is always live regardless of identityId.

---

## 4. STRATEGIC LEVERAGE STATEMENT

> "What asymmetry does this WO surface, protect, measure, or exploit?"

**Statement:** Activates the hard fracture interrupt in the epistemic visibility controller — the layer that forces CRITICAL escalation during structural breakdown — which is currently never reachable because the dynamics channel is null.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is: a live fractureDensity signal reaching the Phase 1 guard in the MetricStrip FSM."**

---

## 6. FORMULA / CONTRACT

**Wire contract (identical at all three mount points):**

```js
// 1. Import
import { computeTruthDynamics } from '../../engine/identitydynamics.js';

// 2. Compute (inside component, after synthesis is available)
const dynamics = useMemo(
  () => computeTruthDynamics(synthesis?.canonicalId ?? null),
  [synthesis?.canonicalId]
);

// 3. Pass to hook (replace existing call)
const visibility = useMetricVisibility(metrics, dynamics);
```

**Identity ID resolution:**
- `synthesis?.canonicalId` → per-identity velocity is live (post-WO-2004 rollout)
- `null` → `computeStabilityVelocity(null)` returns null; velocity defaults to STABLE in FSM
- `computeFractureDensity()` is called with no args inside `computeTruthDynamics` — system-wide, always live regardless of identityId

**Graceful degradation:** When identityId is null or has < 2 events in lineage, `velocity` is null → `dynamics.velocity?.direction` is undefined → FSM reads 'STABLE'. `fractureDensity` still fires if system-wide event store shows FRAGMENTED ratio ≥ 0.90.

Units: none (structural pass-through).
Normalization: N/A — fractureDensity is already 0–1 per WO-2008 contract.

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| `src/components/analysis/targetpacket.jsx` | Add `computeTruthDynamics` import; add `dynamics` useMemo; add second arg to `useMetricVisibility` call | All render logic, metric computation, visibility consumption |
| `src/components/analysis/intelligencebrief.jsx` | Same three-line change | All render logic, metric computation, visibility consumption |
| `src/components/analysis/actionmatrix.jsx` | Same three-line change | All render logic, metric computation, visibility consumption |
| `src/engine/identitydynamics.js` | Read-only | Everything |
| `src/engine/metricvisibility.js` | Read-only | Everything |
| `src/hooks/useMetricVisibility.js` | Read-only | Everything |
| `src/components/analysis/metricstrip.jsx` | Read-only | Everything |

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES — removes the silent null-dynamics gap; fracture gate is now reachable |
| Does this have a single dominant output? | YES — `dynamics` object at each mount point |
| Are all boundaries explicitly defined? | YES — three files, three identical changes, nothing else touched |
| Can this be built without touching an undefined dependency? | YES — `computeTruthDynamics` is exported and stable; identityId null path is handled |
| Does this avoid increasing expressive flexibility in the core? | YES — no new logic, no new states, no new FSM paths |

**Verdict:** PASS

---

## 9. DEFINITION OF DONE

```bash
# All three mount points import computeTruthDynamics
grep -n "computeTruthDynamics" src/components/analysis/targetpacket.jsx src/components/analysis/intelligencebrief.jsx src/components/analysis/actionmatrix.jsx

# All three pass dynamics to useMetricVisibility
grep -n "useMetricVisibility(metrics, dynamics)" src/components/analysis/targetpacket.jsx src/components/analysis/intelligencebrief.jsx src/components/analysis/actionmatrix.jsx

# Build passes
npm run build
```

All three greps must return one match per file. Build must be clean.

---

## NOTES

**Why `synthesis?.canonicalId` and not `synthesis?.queryDomain`:**
`queryDomain` (e.g. 'TECHNOLOGY') is a routing label, not an identity key. The lineage store is indexed by CanonicalEvent IDs from WO-2004. Passing a domain string would always miss and return null velocity. `canonicalId` is the correct future-proof key; null is the correct current-state value.

**Current effect at build time:** fractureDensity becomes live (system-wide event store already exists); velocity stays STABLE until real canonicalIds flow from WO-2004 rollout. That is the correct behavior — the WO does not pretend to do more than it does.
