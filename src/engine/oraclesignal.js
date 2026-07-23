// src/engine/oraclesignal.js
// WO-1300 — Signal-Fidelity-Oracle Contract (SFO-1.0)
// Single normalization boundary. All UI reads scoring data from OracleSignal only.
// UI is forbidden from computing scores. This function is the only place that derives them.

import { classifyConvergenceState, applyTransitionPolicy } from './convergenceclassifier.js';
import { recordConvergenceTransition } from './convergencefingerprint.js';

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

// Handles two field paths used across the codebase:
//   signal.fidelity             — useingest / app.jsx stubs
//   signal.fidelity_components  — oracleview internal format
function extractFidelity(signal) {
  const f = signal.fidelity ?? signal.fidelity_components ?? {};
  return {
    m_checksum:  clamp(f.m_checksum  ?? 0, 0, 1),
    t_telemetry: clamp(f.t_telemetry ?? 0, 0, 1),
    e_viral:     clamp(f.e_viral     ?? 0, 0, 1),
    docs:        clamp(f.docs        ?? 0, 0, 1),
    voice:       clamp(f.voice       ?? 0, 0, 1),
  };
}

function deriveConfidence(signal) {
  const fid = extractFidelity(signal);
  const hasBreakdown = fid.m_checksum > 0 || fid.t_telemetry > 0 || fid.e_viral > 0;
  if (hasBreakdown) {
    return clamp(
      fid.m_checksum  * 0.40 +
      fid.t_telemetry * 0.30 +
      fid.docs        * 0.20 +
      fid.voice       * 0.09 +
      fid.e_viral     * 0.01,
      0, 1
    );
  }
  return clamp(signal.fs ?? 0, 0, 1);
}

function deriveVector(signal) {
  const fid = extractFidelity(signal);
  const D   = fid.m_checksum;
  const V   = fid.t_telemetry;
  const A   = fid.e_viral;
  const T   = clamp((V + A) / 2, 0, 1);
  const telemetryConfidence = clamp((D + V + A) / 3, 0, 1);
  return { vector: { D, V, A, T }, telemetryConfidence };
}

// Deterministic precedence adapter — canonical-first, signal fallback.
// Precedence: canonical → signal → null-safe defaults.
// tensor is merged (canonical wins per-key, signal fills missing keys).
export function toOracleViewModel(canonical, signal) {
  const meta = canonical?.meta ?? {};

  const title =
    meta.query ??
    signal?.title ??
    "Awaiting Signal...";

  const convergence =
    canonical?.inference?.convergence ??
    signal?.score ??
    0;

  const tensor = {
    ...(signal?.tensor ?? {}),
    ...(canonical?.tensor ?? {}),
  };

  return {
    meta,
    title,
    convergence,
    tensor,
    projection: canonical?.projection ?? null,
    source: canonical ? "canonical" : "signal",
  };
}

// applyHysteresis: true in single-signal display contexts (oracleview)
//                  false for bulk node mapping (signalToNode loops)
export function normalizeToOracleSignal(signal, { applyHysteresis = false } = {}) {
  if (!signal) return null;

  const confidence                      = deriveConfidence(signal);
  const { vector, telemetryConfidence } = deriveVector(signal);
  const raw                             = classifyConvergenceState(vector, telemetryConfidence);
  const convergenceResult               = applyHysteresis ? applyTransitionPolicy(raw) : raw;

  // value: canonical 0-1 signal quality score
  // signal.fs and signal.score are synonymous 0-1 trust metrics
  const value = clamp(signal.fs ?? signal.score ?? 0, 0, 1);

  // KRYL-1097 — producer: record the observed convergence transition for the focused signal.
  // Display/hysteresis path only (not bulk node loops), identified signals only, dedupe on
  // state-change. Side-effect only — never throws, never touches the derived value above (FR-5).
  if (applyHysteresis && signal.id != null) {
    recordConvergenceTransition(signal.id, { state: convergenceResult.label, score: value });
  }

  return {
    id:           signal.id ?? `os_${Date.now()}`,
    value,
    state:        convergenceResult.label,
    stateId:      convergenceResult.stateId,
    confidence,
    trend:        'stable',  // Phase A default — requires historical comparison to compute
    theme:        convergenceResult.theme,
    priority:     clamp(value * confidence, 0, 1),
    timestamp:    signal.born ?? signal.timestamp ?? Date.now(),
    vector,
    // WO-1026: character-level traceability chain — passed through from raw signal
    traceability: signal.traceability ?? [],
    _raw:         signal,
  };
}
