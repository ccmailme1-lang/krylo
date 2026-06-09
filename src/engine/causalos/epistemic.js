// WO-1336 L3 — Epistemic Aging Engine
// Truth is perishable. Prevents stale emergence artifacts from competing with live convergence.
//
// Decay: C(t) = C₀ · e^(−λΔt)
// λ indexed by: domain volatility + systemic drift + confidence degradation

const LAMBDA_BASE        = 0.0001; // per-ms base decay (~2.8hr half-life at base)
const VOLATILITY_WEIGHT  = 0.6;
const DRIFT_WEIGHT       = 0.3;
const DEGRADATION_WEIGHT = 0.1;

export function computeLambda({ domainVolatility = 0, systemicDrift = 0, confidenceDegradation = 0 } = {}) {
  return LAMBDA_BASE * (
    1 +
    domainVolatility    * VOLATILITY_WEIGHT  +
    systemicDrift       * DRIFT_WEIGHT       +
    confidenceDegradation * DEGRADATION_WEIGHT
  );
}

// C(t) = C₀ · e^(−λ · Δt_ms / 1000)
// Δt_ms: elapsed ms since artifact was created
export function ageConfidence(C0, lambda, delta_t_ms) {
  return C0 * Math.exp(-lambda * delta_t_ms / 1000);
}

export class EpistemicAging {
  constructor() {
    this._artifacts = new Map(); // event_id → { C0, lambda, created_substrate_ms }
  }

  // Register an emergence artifact for aging.
  register(event_id, confidence, lambdaParams = {}, substrate_time_ms) {
    this._artifacts.set(event_id, {
      C0:      confidence,
      lambda:  computeLambda(lambdaParams),
      created: substrate_time_ms,
    });
  }

  // Return current aged confidence for an artifact.
  // Returns 0 if artifact not found.
  query(event_id, current_substrate_ms) {
    const a = this._artifacts.get(event_id);
    if (!a) return 0;
    const delta = Math.max(0, current_substrate_ms - a.created);
    return ageConfidence(a.C0, a.lambda, delta);
  }

  // Evict artifacts whose confidence has decayed below threshold.
  evict(current_substrate_ms, threshold = 0.05) {
    const evicted = [];
    for (const [id, a] of this._artifacts) {
      const delta = Math.max(0, current_substrate_ms - a.created);
      if (ageConfidence(a.C0, a.lambda, delta) < threshold) {
        this._artifacts.delete(id);
        evicted.push(id);
      }
    }
    return evicted;
  }

  get size() { return this._artifacts.size; }
}
