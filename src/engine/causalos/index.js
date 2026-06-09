// WO-1336 — Causal Inference OS
// Event-Sourced Causal Inference Operating System.
// Orchestrates L1→L2→L3→L4 under WO-1381 contract.
//
// UX fidelity is subordinate to causal correctness.

import { CausalSubstrate }    from './substrate.js';
import { VectorEngine }       from './vectorengine.js';
import { TAS, ClockType }     from './tas.js';
import { ProvenanceDAG }      from './provenance.js';
import { EpistemicAging }     from './epistemic.js';
import { SystemicLockManager, LockCondition } from './lockmanager.js';
import { ProjectionLayer }    from './projection.js';
import { createEnvelope, validateEnvelope } from './envelope.js';

const OS_VERSION  = '1336.1.0';
const OS_NODE_ID  = 'causal-os-primary';

// ── WO-1705 — Signal Floor Kill Switch ───────────────────────────────────────
// Admission control. Permission layer only — never inside compute layers.
// All three conditions must pass or ingest is rejected before L1 runs.
export const SIGNAL_FLOOR = {
  MIN_CONFIDENCE:      0.72,
  MIN_FIDELITY:        0.50,
  MAX_FRAGILITY_PHASE: 2,
};

export function applySignalFloor(telemetry) {
  const confidence     = telemetry.frameConfidence              ?? 0;
  const fs             = telemetry.fs                           ?? 0;
  const fragilityPhase = telemetry.fragilityPhase?.phase
                         ?? telemetry.fragilityPhase            ?? 0;

  const allow =
    confidence     >= SIGNAL_FLOOR.MIN_CONFIDENCE      &&
    fs             >= SIGNAL_FLOOR.MIN_FIDELITY        &&
    fragilityPhase <= SIGNAL_FLOOR.MAX_FRAGILITY_PHASE;

  return { allow, confidence, fs, fragilityPhase };
}

export class CausalInferenceOS {
  constructor() {
    this.substrate     = new CausalSubstrate();
    this.vectorEngine  = new VectorEngine();
    this.tas           = new TAS();
    this.provenanceDAG = new ProvenanceDAG();
    this.epistemic     = new EpistemicAging();
    this.lockManager   = new SystemicLockManager();
    this.projection    = new ProjectionLayer(this);

    this._replayContext      = 'LIVE';
    this._causality_epoch    = 0;
    this._lastVectorResult   = null;
    this._lastEnvelopeId     = null;
  }

  // Primary ingest entrypoint.
  // telemetry: { substrate_time_ms, signalDensity, lagMs, volatility, frameConfidence, vectors }
  // Returns emergence envelope if triggered, otherwise null.
  ingest(telemetry) {
    if (this.lockManager.locked) return null;

    // WO-1705 — admission gate. Must clear before any L1–L4 computation.
    const gate = applySignalFloor(telemetry);
    if (!gate.allow) {
      const substrate_time = BigInt(Math.round(telemetry.substrate_time_ms ?? Date.now()));
      const killEnvelope = createEnvelope({
        event_type:      'KILL_SWITCH_TRIGGERED',
        subsystem:       'causal-os',
        node_id:         OS_NODE_ID,
        version:         OS_VERSION,
        payload:         { gate, reason: 'SIGNAL_FLOOR_BREACH' },
        substrate_time,
        causality_epoch: this._causality_epoch,
        replay_context:  this._replayContext,
      });
      const parent = this._lastEnvelopeId ? [this._lastEnvelopeId] : [];
      this.provenanceDAG.add(killEnvelope, parent);
      return null;
    }

    try {
      const substrate_time = BigInt(Math.round(telemetry.substrate_time_ms ?? Date.now()));

      // L3 — TAS: advance substrate clock
      this.tas.advance(ClockType.SUBSTRATE, substrate_time);
      this.tas.advance(ClockType.INGESTION, BigInt(Date.now()));

      // L1 — Substrate: always active
      const fields = this.substrate.ingest({
        substrate_time,
        statsReceived:  telemetry.statsReceived   ?? 0,
        signalDensity:  telemetry.signalDensity   ?? 0,
        lagMs:          telemetry.lagMs           ?? 0,
        volatility:     telemetry.volatility      ?? 0,
        frameConfidence: telemetry.frameConfidence ?? 1,
        vectors:        telemetry.vectors         ?? {},
      });

      // L2 — Vector Engine: convergence + emergence
      const vectors = telemetry.vectors ?? {};
      const result  = this.vectorEngine.compute(vectors);
      this._lastVectorResult = { ...result, vectors };

      this._causality_epoch++;

      // Create event envelope for this ingestion tick
      const envelope = createEnvelope({
        event_type:      'TELEMETRY_INGESTED',
        subsystem:       'causal-os',
        node_id:         OS_NODE_ID,
        version:         OS_VERSION,
        payload:         { fields, result },
        substrate_time,
        causality_epoch: this._causality_epoch,
        replay_context:  this._replayContext,
      });

      // L3 — Provenance: record in DAG
      const parent = this._lastEnvelopeId ? [this._lastEnvelopeId] : [];
      this.provenanceDAG.add(envelope, parent);
      this._lastEnvelopeId = envelope.event_id;

      // Emergence detection
      if (result.emergence) {
        return this._emitEmergence(envelope, result, fields, substrate_time);
      }

      return null;

    } catch (err) {
      this.lockManager.check(err);
      if (this.lockManager.locked) {
        this.vectorEngine.lock();
      }
      return null;
    }
  }

  _emitEmergence(parentEnvelope, result, fields, substrate_time) {
    const emergencePayload = {
      trigger: {
        type:          'PHASE_TRANSITION',
        peak_pressure: result.convergenceScore,
        novelty_delta: result.noveltyDelta,
      },
      canonical_payload: {
        confidence:    result.convergenceScore,
        spatial_anchor: {
          x:        fields.densityField,
          y:        fields.temporalPressure,
          strength: result.convergenceScore,
        },
      },
      provenance: {
        classifier_state: {
          stateId:          result.stateId,
          ...result.vectors,
          convergenceScore: result.convergenceScore,
          noveltyDelta:     result.noveltyDelta,
        },
      },
    };

    const emergenceEnvelope = createEnvelope({
      event_type:      'EMERGENCE',
      subsystem:       'causal-os',
      node_id:         OS_NODE_ID,
      version:         OS_VERSION,
      payload:         emergencePayload,
      substrate_time,
      causality_epoch: this._causality_epoch,
      replay_context:  this._replayContext,
      emergence_time:  Date.now(),
    });

    this.provenanceDAG.add(emergenceEnvelope, [parentEnvelope.event_id]);
    this.epistemic.register(
      emergenceEnvelope.event_id,
      result.convergenceScore,
      { domainVolatility: result.vectors?.V ?? 0 },
      Number(substrate_time),
    );

    return emergenceEnvelope;
  }

  // Switch to REPLAY mode — flushes EMA buffers for deterministic reconstruction.
  enterReplay() {
    this._replayContext = 'REPLAY';
  }

  returnToLive() {
    this._replayContext = 'LIVE';
  }

  get locked()  { return this.lockManager.locked; }
  get version() { return OS_VERSION; }
}

export { ProjectionTier } from './projection.js';
export { LockCondition }  from './lockmanager.js';
export { ClockType }      from './tas.js';
