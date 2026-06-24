// src/engine/decisionvelocity.js
//
// WO-1863 — Decision Velocity Instrumentation Layer (segment-timing version)
// Pure observability. No architectural changes. No back-propagation into
// classification. Fail-open: missing timestamps degrade the metric, never
// block execution. Audit-Desk-only output under Two-Zone Doctrine — these
// values are never surfaced to guest view.
//
// PROPAGATION PATTERN: session._dvFlowId carries the flowId across module
// boundaries (t0 → t1 → t2). Call getTracker(session._dvFlowId) at t1/t2
// to retrieve the tracker without threading the instance reference.

import { emitTelemetry } from './telemetry.js';

export const STAGE = Object.freeze({
  INGEST:     't0',   // signal_received_at  — detectDomain() entry
  HAPPY_PATH: 't1',   // happy_path_emitted  — HP filter output
  EMISSION:   't2',   // action_emitted_at   — canExport() / dispatch
});

// monotonic clock, falls back to Date.now() if performance API is absent
const now = () =>
  (typeof performance !== 'undefined' && performance.now)
    ? performance.now()
    : Date.now();

// Module-level registry — keyed by flowId. Enables cross-boundary lookup
// without threading the tracker instance. Bounded to MAX_ENTRIES to prevent
// unbounded growth from abandoned flows (e.g. rapid query changes).
const MAX_ENTRIES = 100;
const _registry   = new Map(); // flowId → tracker

function pruneRegistry() {
  if (_registry.size <= MAX_ENTRIES) return;
  // Evict oldest entry (insertion order — Map preserves it)
  _registry.delete(_registry.keys().next().value);
}

/**
 * Retrieve a tracker by flowId. Returns null if not found — callers must
 * treat null as a no-op (fail-open). Never throws.
 */
export function getTracker(flowId) {
  if (flowId == null) return null;
  return _registry.get(flowId) ?? null;
}

/**
 * Remove a tracker from the registry after emission. Call at t2 after
 * .emit() so completed flows don't accumulate.
 */
export function releaseTracker(flowId) {
  if (flowId != null) _registry.delete(flowId);
}

/**
 * Creates a request- or session-scoped velocity tracker and registers it
 * by flowId for cross-boundary lookup.
 *
 * One tracker per decision flow. Reusing across flows corrupts deltas —
 * instantiate at signal entry (t0) and release after emission (t2).
 *
 * @param {string|null} flowId - stable identifier for this decision flow
 *   (e.g. session.id or a query hash). Attach to session as _dvFlowId so
 *   t1/t2 boundaries can call getTracker(session._dvFlowId).
 */
export function createVelocityTracker(flowId = null) {
  const marks = Object.create(null); // { t0, t1, t2 }

  const tracker = {
    flowId,

    /**
     * Stamp a pipeline boundary. Idempotent per stage: the FIRST mark wins,
     * so duplicate hooks under load cannot skew the measurement.
     */
    mark(stage, ts = now()) {
      if (!Object.values(STAGE).includes(stage)) return this; // unknown stage: ignore
      if (marks[stage] === undefined) marks[stage] = ts;
      return this;
    },

    markIngest(ts)    { return this.mark(STAGE.INGEST, ts); },
    markHappyPath(ts) { return this.mark(STAGE.HAPPY_PATH, ts); },
    markEmission(ts)  { return this.mark(STAGE.EMISSION, ts); },

    /**
     * Compute the velocity report at the emission boundary.
     *
     * Returns a structurally complete object even when timestamps are
     * missing (fail-open): unmeasurable fields are null and `valid` is false.
     * Callers MUST NOT branch execution on this — telemetry only.
     *
     * @param {object} [opts]
     * @param {number} [opts.convergenceScore] - existing engine field, optional
     * @param {number} [opts.confidence]        - existing engine field, optional
     */
    report({ convergenceScore = null, confidence = null } = {}) {
      const { t0, t1, t2 } = marks;

      const hasIngest   = typeof t0 === 'number';
      const hasHappy    = typeof t1 === 'number';
      const hasEmission = typeof t2 === 'number';

      const dv = (hasIngest && hasEmission) ? (t2 - t0) : null;

      const ingestToClassify = (hasIngest && hasHappy)   ? (t1 - t0) : null;
      const classifyToEmit   = (hasHappy && hasEmission) ? (t2 - t1) : null;

      let qdv = null;
      if (dv !== null && convergenceScore !== null && confidence !== null) {
        qdv = (convergenceScore * confidence) / Math.max(dv, 1);
      }

      return {
        flowId,
        valid: dv !== null,
        dv,
        segments: { ingestToClassify, classifyToEmit },
        qdv,
        timestamps: {
          t0: hasIngest   ? t0 : null,
          t1: hasHappy    ? t1 : null,
          t2: hasEmission ? t2 : null,
        },
        complete: hasIngest && hasHappy && hasEmission,
      };
    },

    /**
     * Emit the velocity report to the telemetry sink and return it.
     * Fail-open: any error in emitTelemetry is swallowed — telemetry must
     * never propagate into the decision pipeline. Releases the tracker from
     * the registry after emission.
     */
    emit({ convergenceScore = null, confidence = null } = {}) {
      const velocity = this.report({ convergenceScore, confidence });
      try {
        emitTelemetry({ type: 'DECISION_VELOCITY', ...velocity });
      } catch {
        // Telemetry failure is non-fatal — pipeline continues unaffected
      }
      releaseTracker(flowId);
      return velocity;
    },
  };

  // Register for cross-boundary lookup
  if (flowId != null) {
    _registry.set(flowId, tracker);
    pruneRegistry();
  }

  return tracker;
}
