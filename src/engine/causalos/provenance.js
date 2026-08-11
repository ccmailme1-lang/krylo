// WO-1336 L3 — Provenance DAG
// Every emergence artifact must maintain full causal lineage.
// Immutable. Replay-safe. Deterministic traversal. Cycles impossible.
//
// Chain: signal → vector update → resonance → classification → emergence → projection

export class ProvenanceDAG {
  constructor() {
    this._nodes   = new Map(); // event_id → { envelope, parent_ids: string[] }
    this._sealed  = new Set(); // event_ids that have been finalized

    // KRYL-Lean-Ontology πΣ extension (additive — does not change add()/trace()/has()/
    // size() above, which remain the existing event→event causal-lineage mechanism).
    //
    // πΣ ⊆ (E∪R) × (VΣ∪EΣ∪propsΣ), per architecture-recon/006 (πΣ vs Evidence-Tier memo):
    // a many-to-many relation from evidence (Event or Relationship ids — this class does
    // not care which, it only stores id strings) to structural elements of a Σ object.
    // BINARY ONLY — no score, no weight, no confidence field anywhere in this relation.
    // Evidence-tier weighting stays in evidencetiers.js/structuralconfirmation.js,
    // strictly downstream and separate, per memo 006's normative rule.
    this._piSigmaLinks = new Map(); // elementKey -> Set<evidence_id>
    this._evidenceToElements = new Map(); // evidence_id -> Set<elementKey>
  }

  // elementKey — stable string identity for one Σ structural element. Not exported as a
  // class method dependency; callers (the future Σ engine) build their own element
  // references and pass sigmaId/elementType/elementId separately so this class never has
  // to know anything about Σ's internal shape.
  static elementKey(sigmaId, elementType, elementId) {
    return `${sigmaId}::${elementType}::${elementId}`;
  }

  // linkEvidence(evidence_id, sigmaId, elementType, elementId) — records that a specific
  // vertex, edge, or property of a specific Σ object is traceable to a specific evidence
  // instance. elementType must be 'vertex' | 'edge' | 'property' (VΣ/EΣ/propsΣ). Idempotent
  // — linking the same pair twice is a no-op, not an error or a duplicate.
  linkEvidence(evidence_id, sigmaId, elementType, elementId) {
    if (!evidence_id || !sigmaId || !elementId) return;
    if (elementType !== 'vertex' && elementType !== 'edge' && elementType !== 'property') {
      throw new Error(`PROVENANCE_BREAK: invalid elementType "${elementType}" — must be vertex|edge|property`);
    }
    const key = ProvenanceDAG.elementKey(sigmaId, elementType, elementId);
    if (!this._piSigmaLinks.has(key)) this._piSigmaLinks.set(key, new Set());
    this._piSigmaLinks.get(key).add(evidence_id);
    if (!this._evidenceToElements.has(evidence_id)) this._evidenceToElements.set(evidence_id, new Set());
    this._evidenceToElements.get(evidence_id).add(key);
  }

  // isTraceable(sigmaId, elementType, elementId) → boolean — the literal rc3 Traceability
  // Invariant check for one element: does at least one evidence link exist? This is the
  // ONLY question πΣ answers. It does not return a count, a score, or a confidence — a
  // caller wanting "how many" or "how strong" is asking an Evidence-Tier question, not a
  // πΣ question (memo 006).
  isTraceable(sigmaId, elementType, elementId) {
    const key = ProvenanceDAG.elementKey(sigmaId, elementType, elementId);
    const links = this._piSigmaLinks.get(key);
    return !!links && links.size > 0;
  }

  // evidenceFor(sigmaId, elementType, elementId) → string[] of evidence_ids, or [].
  // Exposed for callers that need to walk from a structural element to its actual
  // supporting evidence (e.g. an audit trail UI) — still binary at the πΣ layer itself;
  // this just enumerates the many-to-many relation, it doesn't rank or weight it.
  evidenceFor(sigmaId, elementType, elementId) {
    const key = ProvenanceDAG.elementKey(sigmaId, elementType, elementId);
    return [...(this._piSigmaLinks.get(key) ?? [])];
  }

  // elementsSupportedBy(evidence_id) → string[] of elementKeys this evidence backs.
  // The reverse direction of evidenceFor — one piece of evidence can support many
  // structural elements, per rc3's explicit many-to-many requirement.
  elementsSupportedBy(evidence_id) {
    return [...(this._evidenceToElements.get(evidence_id) ?? [])];
  }

  // isFullyTraceable(sigmaId, elements) → boolean — checks the Traceability Invariant
  // across a whole set of elements at once: [{elementType, elementId}, ...]. Returns
  // false the moment any single element lacks evidence — matches rc3's "a structure
  // containing any vertex/edge/property that violates the Traceability Invariant MUST
  // NOT be asserted" (audit 002's citation of the rc3 §8 restatement).
  isFullyTraceable(sigmaId, elements = []) {
    return elements.every(({ elementType, elementId }) => this.isTraceable(sigmaId, elementType, elementId));
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
