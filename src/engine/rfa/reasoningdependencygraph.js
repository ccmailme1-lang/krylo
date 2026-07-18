// reasoningdependencygraph.js — KRYL-1068 RFA Reasoning Dependency Graph (RDG).
// Builds the execution dependency DAG from RLR manifests (reasoninglayerregistry.js). Governs
// execution ORDER; does not reason. AC: CI fails on execution cycles; artifact-lineage traversal.
// v3 note: AR↔EDL bidirectional refinement is a VERSIONED loop (ADCL), NOT an execution cycle —
// so detectCycles() operates on execution edges only; the refinement loop never enters this graph.
import { listManifests } from './reasoninglayerregistry.js';

/**
 * buildGraph(registry) → { nodes:Set, edges:Map<id,Set<dep>> } from manifest.dependencies.
 * edge a→b means "a depends on b" (b must run before a).
 */
export function buildGraph(registry) {
  const nodes = new Set();
  const edges = new Map();
  for (const m of listManifests(registry)) {
    nodes.add(m.engine_id);
    edges.set(m.engine_id, new Set(m.dependencies ?? []));
  }
  // ensure dependency targets exist as nodes even if unregistered (flagged by validate)
  for (const deps of edges.values()) for (const d of deps) if (!nodes.has(d)) nodes.add(d);
  return { nodes, edges };
}

/**
 * detectCycles(graph) → string[][] — every execution cycle as a node path. Empty = acyclic (CI-pass).
 * DFS with a recursion stack; a back-edge to a node on the stack is a cycle.
 */
export function detectCycles(graph) {
  const cycles = [];
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map([...graph.nodes].map(n => [n, WHITE]));
  const stack = [];
  const visit = n => {
    color.set(n, GRAY); stack.push(n);
    for (const dep of graph.edges.get(n) ?? []) {
      if (color.get(dep) === GRAY) {
        const i = stack.indexOf(dep);
        cycles.push([...stack.slice(i), dep]);
      } else if (color.get(dep) === WHITE) visit(dep);
    }
    stack.pop(); color.set(n, BLACK);
  };
  for (const n of graph.nodes) if (color.get(n) === WHITE) visit(n);
  return cycles;
}

/**
 * topoOrder(graph) → string[] execution order (deps first). Throws E_DEPENDENCY_CYCLE if cyclic —
 * this is the CI gate the AC requires (CI fails on dependency cycles).
 */
export function topoOrder(graph) {
  const cycles = detectCycles(graph);
  if (cycles.length) {
    const e = new Error(`RDG: dependency cycle(s): ${cycles.map(c => c.join('→')).join(', ')}`);
    e.code = 'E_DEPENDENCY_CYCLE'; e.cycles = cycles; throw e;
  }
  const order = [], seen = new Set();
  const visit = n => {
    if (seen.has(n)) return;
    for (const dep of graph.edges.get(n) ?? []) visit(dep);
    seen.add(n); order.push(n);
  };
  for (const n of graph.nodes) visit(n);
  return order;
}

/**
 * lineage(graph, engineId) → string[] transitive dependency closure (artifact-lineage traversal).
 * The AC targets <200ms; this is a bounded DFS over a tiny fixed graph — microseconds in practice.
 */
export function lineage(graph, engineId) {
  const out = [], seen = new Set();
  const visit = n => {
    for (const dep of graph.edges.get(n) ?? []) {
      if (!seen.has(dep)) { seen.add(dep); out.push(dep); visit(dep); }
    }
  };
  visit(engineId);
  return out;
}
