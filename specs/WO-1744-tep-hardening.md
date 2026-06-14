# WO-1744 — TEP System Hardening & Contract Enforcement

**Status:** PENDING  
**Priority:** High  
**Type:** Additive only — no structural redesign, no module rewrites

---

## Objective

Upgrade the existing TEP execution system into a deterministic, contract-enforced, observable execution spine without changing its architecture or introducing new structural layers.

---

## Core Principle (Non-Negotiable)

> All state transitions are explicit, all contracts are enforced, and all execution is deterministic.

---

## 1. Patch-Based State Transitions

Replace implicit ctx mutation with explicit patch application.

### Adapter output standard
```js
{ patch: { key: value } }
```

### TEP Core — add applyPatch
```js
function applyPatch(ctx, patch) {
  return Object.freeze({
    ...ctx,
    ...patch
  });
}
```

### Execution loop — replace
```js
// BEFORE
ctx = await step(ctx);

// AFTER
const result = await step(ctx);
if (result?.patch) {
  ctx = applyPatch(ctx, result.patch);
}
```

**Constraint:** No direct ctx mutation allowed anywhere. All state changes must pass through patch pipeline.

---

## 2. Read/Write Contracts Per Node

### Node contract field
```js
contract: {
  read: string[];
  write: string[];
}
```

### Enforcement rule (pre-execution)
```js
function enforceReadContract(node, ctx) {
  for (const key of node.contract.read) {
    if (ctx[key] === undefined) {
      throw new TEPError(
        TEPErrorType.CONTRACT_VIOLATION,
        node.id,
        `missing required read: ${key}`
      );
    }
  }
}
```

**Constraint:** Contract validation MUST occur before node execution. Nodes cannot access undeclared ctx fields.

---

## 3. Typed Error System

```js
const TEPErrorType = {
  STRUCTURE_VIOLATION: 'STRUCTURE_VIOLATION',
  CONTRACT_VIOLATION: 'CONTRACT_VIOLATION',
  EXECUTION_FAILURE: 'EXECUTION_FAILURE',
  COMPUTE_FAILURE: 'COMPUTE_FAILURE'
};

class TEPError extends Error {
  constructor(type, nodeId, message) {
    super(`[${type}] ${nodeId}: ${message}`);
    this.type = type;
    this.nodeId = nodeId;
  }
}
```

**Rule:** All errors MUST use TEPError. No generic `throw new Error(...)` in execution path.

---

## 4. Execution Trace Logging

```js
const trace = [];

// Inside execution loop
const start = performance.now();
const result = await step(ctx);
trace.push({
  node: step.id,
  duration: performance.now() - start,
  input: ctx,
  output: result
});

export function getTrace() {
  return trace;
}
```

---

## 5. Contract Enforcement Gate

```js
function enforceContract(node, ctx) {
  for (const key of node.contract.read) {
    if (!(key in ctx)) {
      throw new TEPError(
        TEPErrorType.CONTRACT_VIOLATION,
        node.id,
        `missing read slot: ${key}`
      );
    }
  }
}

// Execution order — mandatory
enforceContract(step, ctx);
const result = await step(ctx);
```

---

## 6. Behavioral Rules (Non-Negotiable)

- No node may directly mutate ctx
- All state changes must occur through patch
- No node may access undeclared ctx fields
- No silent failures allowed
- All errors must be typed via TEPError
- Execution order must remain deterministic

---

## 7. Files

- `src/engine/tep.js` — core (registry + scheduler + applyPatch + enforceContract + trace)
- `src/engine/tepbindings.js` — adapter layer (domain-aware wiring, Option A)
- `src/schema/tepContext.js` — Context Schema v1 (raw / weak / nonConsensus / meta slots)
- `KNOWN_LIMITATIONS.md` — intra-tier order undefined, single accumulator, assertEdgeLegality is forward-compat only

---

## 8. Acceptance Criteria

- ctx is never mutated directly
- Missing ctx fields fail fast
- All errors include nodeId + type
- Trace output shows full execution lineage
- No silent state drift possible
- All node contracts enforced at runtime

---

## 9. Scope Boundary

This WO does NOT include:
- EEG redesign
- DAG execution engine changes (→ WO-1750)
- WO internal logic modifications
- Structural refactors of TEP

---

## Dependencies

- WO-1726 (COMPLETE)
- WO-1734 (COMPLETE)
- WO-1743 (COMPLETE)
