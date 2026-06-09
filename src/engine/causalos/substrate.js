// WO-1336 L1 — Causal Substrate (Reality Layer)
// Always active. Never gated. Never suppressed by classifier state.
// Ingests telemetry and emits density/drift/opacity fields.
// Rendering cannot mutate substrate state.

const SUBSTRATE_VERSION = '1.0.0';

export class CausalSubstrate {
  constructor() {
    this._fields = {
      densityField:   0,
      driftField:     0,
      opacityGradient: 1,
      temporalPressure: 0,
    };
    this._substrate_time = 0n;
    this._active = true; // always active — no idle state
  }

  // Ingest raw telemetry. Returns updated field state.
  // substrate_time must be BigInt (enforced by TAS upstream).
  ingest({ substrate_time, statsReceived = 0, signalDensity = 0, lagMs = 0, volatility = 0, frameConfidence = 1, vectors = {} }) {
    if (substrate_time < this._substrate_time) {
      throw new Error(`CLOCK_DESYNC: substrate_time ${substrate_time} < last ${this._substrate_time}`);
    }
    this._substrate_time = substrate_time;

    const { D = 0, V = 0, A = 0, T = 0 } = vectors;

    this._fields.densityField     = clamp01(signalDensity);
    this._fields.driftField       = clamp01(lagMs / 1000);
    this._fields.opacityGradient  = clamp01(frameConfidence * (1 - volatility * 0.5));
    this._fields.temporalPressure = clamp01(0.35 * D + 0.35 * A + 0.20 * T + 0.10 * (1 - V));

    return this.fields();
  }

  fields() {
    return {
      ...this._fields,
      substrate_time: this._substrate_time,
      version: SUBSTRATE_VERSION,
    };
  }

  get active() { return this._active; }
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}
