// WO-1336 L4 — Projection Layer
// View-only. No mutation of substrate or vector engine.
// No observer-dependent truth.
//
// Tier 1 — Analyst:    full provenance DAG + raw vectors + resonance weights
// Tier 2 — Operator:   emergence payload + confidence context
// Tier 3 — Executive:  filtered confidence projection only

export const ProjectionTier = Object.freeze({
  ANALYST:   1,
  OPERATOR:  2,
  EXECUTIVE: 3,
});

export class ProjectionLayer {
  constructor(os) {
    this._os = os; // read-only reference to CausalInferenceOS
  }

  // Project truth surface for a given tier and cone.
  // Throws if OS is locked (causal integrity failure).
  project(coneId, tier = ProjectionTier.OPERATOR) {
    this._os.lockManager.assertProjectionAllowed();

    const substrate  = this._os.substrate.fields();
    const vectorResult = this._os._lastVectorResult;
    const epistemic  = this._os.epistemic;
    const dag        = this._os.provenanceDAG;

    const base = {
      coneId,
      substrate_time: substrate.substrate_time,
      replay_context: this._os._replayContext,
    };

    if (tier === ProjectionTier.ANALYST) {
      return Object.freeze({
        ...base,
        tier:            'ANALYST',
        rawVectors:      vectorResult?.vectors ?? null,
        convergenceScore: vectorResult?.convergenceScore ?? 0,
        noveltyDelta:    vectorResult?.noveltyDelta ?? 0,
        stateId:         vectorResult?.stateId ?? 0,
        emergence:       vectorResult?.emergence ?? false,
        provenanceSize:  dag.size(),
        densityField:    substrate.densityField,
        driftField:      substrate.driftField,
        opacityGradient: substrate.opacityGradient,
      });
    }

    if (tier === ProjectionTier.OPERATOR) {
      return Object.freeze({
        ...base,
        tier:            'OPERATOR',
        convergenceScore: vectorResult?.convergenceScore ?? 0,
        stateId:         vectorResult?.stateId ?? 0,
        emergence:       vectorResult?.emergence ?? false,
      });
    }

    // EXECUTIVE — confidence only
    return Object.freeze({
      ...base,
      tier:       'EXECUTIVE',
      confidence: vectorResult?.convergenceScore ?? 0,
    });
  }
}
