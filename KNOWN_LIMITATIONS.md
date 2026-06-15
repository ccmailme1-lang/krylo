# TEP v1 Known Limitations
WO-1744 — Required disclosure per spec.

## 1. Intra-tier order is undefined

Nodes within the same tier have no guaranteed execution order. The pipeline runs nodes sequentially in the array order passed to `runTEP()`. If two nodes share the same `tier` value, their relative order is entirely caller-determined.

**Impact:** A caller could accidentally place a TIER.META node before a TIER.WEAK node and the pipeline would not reject it — only the read contract enforcement would catch the missing slot.

**Mitigation:** `assertEdgeLegality()` emits a console warning on downward tier flows but does not block execution. This is intentional — blocking would make the pipeline too rigid for non-standard compositions.

---

## 2. Single accumulator

`TepContext` is a single shared object flowing through all nodes. There is no per-node state isolation beyond the slot ownership enforced by write contracts.

**Impact:** A node that writes a slot with a large object holds that memory for the entire pipeline run. Nodes cannot garbage-collect intermediate results mid-pipeline.

**Mitigation:** Slots are shallow-replaced on each `applyPatch()` call (not deep-merged), so stale sub-keys do not accumulate. Trace snapshots are JSON-serialized copies, not references.

---

## 3. `assertEdgeLegality` is forward-compat only

The current implementation of `assertEdgeLegality()` emits a warning but does not enforce any structural constraint. It exists as a forward-compatibility hook for WO-1750 (EEG v2 — Dependency-Driven DAG Runtime), which will replace the tier-based linting with true dependency graph validation.

**Impact:** Illegal tier flows (e.g., META → WEAK) are not blocked in TEP v1. They will surface only as CONTRACT_VIOLATION errors when the downstream node's read contract fails.

**Upgrade path:** WO-1750 replaces the tier-loop scheduler with a topological sort. At that point, `assertEdgeLegality` becomes a hard enforcement gate backed by the adjacency list.
