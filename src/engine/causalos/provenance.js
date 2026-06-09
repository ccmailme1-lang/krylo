// WO-1336 L3 — Provenance DAG
// Every emergence artifact must maintain full causal lineage.
// Immutable. Replay-safe. Deterministic traversal. Cycles impossible.
//
// Chain: signal → vector update → resonance → classification → emergence → projection

export class ProvenanceDAG {
  constructor() {
    this._nodes   = new Map(); // event_id → { envelope, parent_ids: string[] }
    this._sealed  = new Set(); // event_ids that have been finalized
  }

  // Add an event node. parent_ids must already exist (or be empty for root events).
  // Returns the event_id. Throws on cycle detection or duplicate.
  add(envelope, parent_ids = []) {
    const id = envelope.event_id;

    if (this._nodes.has(id)) {
      throw new Error(`PROVENANCE_BREAK: duplicate event_id ${id}`);
    }

    // Cycle detection: none of our ancestors can reference us
    for (const pid of parent_ids) {
      if (this._wouldCreateCycle(pid, id)) {
        throw new Error(`PROVENANCE_BREAK: cycle detected at ${id} via ${pid}`);
      }
    }

    this._nodes.set(id, Object.freeze({ envelope, parent_ids: [...parent_ids] }));
    return id;
  }

  // Trace full causal lineage from an event back to roots.
  // Returns ordered array: [root, ..., direct_parent, event].
  trace(event_id) {
    if (!this._nodes.has(event_id)) return [];
    const visited = new Set();
    const chain   = [];

    const walk = (id) => {
      if (visited.has(id)) return;
      visited.add(id);
      const node = this._nodes.get(id);
      if (!node) return;
      for (const pid of node.parent_ids) walk(pid);
      chain.push(node.envelope);
    };

    walk(event_id);
    return chain;
  }

  has(event_id) { return this._nodes.has(event_id); }
  size()        { return this._nodes.size; }

  _wouldCreateCycle(start_id, target_id) {
    if (start_id === target_id) return true;
    const node = this._nodes.get(start_id);
    if (!node) return false;
    return node.parent_ids.some(pid => this._wouldCreateCycle(pid, target_id));
  }
}
