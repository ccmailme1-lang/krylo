// WO-1744 — Tiered Execution Pipeline (TEP) v1
// Core runtime. Domain-free — no signal logic here.
// All domain bindings live in tepbindings.js (Option A architecture).
//
// 5 hardening patches:
//   Patch 1: applyPatch() — centralized immutable state transition
//   Patch 2: read/write contract enforcement per node
//   Patch 3: typed error system (TEPErrorType + TEPError)
//   Patch 4: execution trace logging (getTrace / clearTrace)
//   Patch 5: enforceContract() gate before every step

// ── Patch 3: Typed error system ───────────────────────────────────────────────

export const TEPErrorType = {
  STRUCTURE_VIOLATION: 'STRUCTURE_VIOLATION', // malformed node definition
  CONTRACT_VIOLATION:  'CONTRACT_VIOLATION',  // read/write path breach
  EXECUTION_FAILURE:   'EXECUTION_FAILURE',   // node.execute() threw
  COMPUTE_FAILURE:     'COMPUTE_FAILURE',     // post-execute invariant violated
};

export class TEPError extends Error {
  constructor(nodeId, type, detail = '') {
    super(`[TEP:${type}] node=${nodeId} — ${detail}`);
    this.nodeId = nodeId;
    this.type   = type;
    this.detail = detail;
  }
}

// ── Path resolution ───────────────────────────────────────────────────────────
// Supports dot-notation: 'raw.signals' → ctx.raw.signals
function resolvePath(obj, path) {
  return path.split('.').reduce((cur, key) => cur?.[key], obj);
}

// ── Patch 1: Immutable state transition ───────────────────────────────────────
// Patch is slot-level (top-level keys of TepContext). No deep merge.
// Adapters must return { patch: { slotName: value } } — never mutate ctx directly.
function applyPatch(ctx, patch) {
  return Object.assign({}, ctx, patch);
}

// ── Patch 2: Contract enforcement ────────────────────────────────────────────
function enforceReadContract(ctx, node) {
  for (const path of node.contract.read) {
    if (resolvePath(ctx, path) === undefined) {
      throw new TEPError(
        node.id,
        TEPErrorType.CONTRACT_VIOLATION,
        `required read path '${path}' not present in context`,
      );
    }
  }
}

function enforceWriteContract(patch, node) {
  for (const key of Object.keys(patch)) {
    if (!node.contract.write.includes(key)) {
      throw new TEPError(
        node.id,
        TEPErrorType.CONTRACT_VIOLATION,
        `undeclared write key '${key}' — add to node.contract.write`,
      );
    }
  }
}

// ── Patch 5: Pre-step enforcement gate ───────────────────────────────────────
function enforceContract(ctx, node) {
  if (!node.id || typeof node.id !== 'string') {
    throw new TEPError('UNKNOWN', TEPErrorType.STRUCTURE_VIOLATION, 'node.id missing or non-string');
  }
  if (!Array.isArray(node.contract?.read) || !Array.isArray(node.contract?.write)) {
    throw new TEPError(node.id, TEPErrorType.STRUCTURE_VIOLATION, 'node.contract must have read[] and write[]');
  }
  if (typeof node.execute !== 'function') {
    throw new TEPError(node.id, TEPErrorType.STRUCTURE_VIOLATION, 'node.execute must be a function');
  }
  enforceReadContract(ctx, node);
}

// ── assertEdgeLegality — forward-compat only (see KNOWN_LIMITATIONS.md) ──────
// Tier tags are a coarse lint hint. Execution order is always array order.
export function assertEdgeLegality(fromNode, toNode) {
  if ((fromNode.tier ?? 0) > (toNode.tier ?? 0)) {
    console.warn(
      `[TEP:EDGE] downward tier flow: ${fromNode.id}(tier ${fromNode.tier}) → ${toNode.id}(tier ${toNode.tier}) — permitted but suspicious`,
    );
  }
}

// ── Patch 4: Trace log ────────────────────────────────────────────────────────
let _trace = [];
export function getTrace()  { return [..._trace]; }
export function clearTrace() { _trace = []; }

// ── Primary pipeline runner ───────────────────────────────────────────────────
// nodes:      TEPNode[] — executed sequentially in array order
// initialCtx: TepContext — must have at minimum a populated raw slot
// Returns:    { ctx: TepContext, trace: TraceEntry[] }
export function runTEP(nodes, initialCtx) {
  _trace = [];
  let ctx = { ...initialCtx };

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    // Patch 5: contract gate fires before every node
    enforceContract(ctx, node);

    // Patch 4: snapshot input for trace (shallow-frozen read copy)
    const inputSnapshot = JSON.parse(JSON.stringify(ctx));
    const t0 = Date.now();

    // Execute
    let patch;
    try {
      const result = node.execute(ctx);
      if (!result || typeof result !== 'object' || !('patch' in result)) {
        throw new TEPError(node.id, TEPErrorType.COMPUTE_FAILURE, 'execute() must return { patch: {...} }');
      }
      patch = result.patch;
    } catch (e) {
      if (e instanceof TEPError) throw e;
      throw new TEPError(node.id, TEPErrorType.EXECUTION_FAILURE, e.message);
    }

    // Patch 2: write contract verification
    enforceWriteContract(patch, node);

    // Patch 1: immutable application
    ctx = applyPatch(ctx, patch);

    // Patch 4: record trace entry
    _trace.push({
      nodeId:     node.id,
      tier:       node.tier ?? null,
      durationMs: Date.now() - t0,
      input:      inputSnapshot,
      output:     patch,
    });

    // Forward-compat edge legality check (non-blocking)
    if (i < nodes.length - 1) {
      assertEdgeLegality(node, nodes[i + 1]);
    }
  }

  return { ctx, trace: [..._trace] };
}
