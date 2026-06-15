// WO-1751 Phase B + WO-1752 — Consulting Intelligence Import
// WO-1752: Provenance Rehydration & State Reconstruction
// Phase C (cryptographic signing) deferred.
//
// Verification pipeline (WO-1752 locked order):
//   Stage 0  Parse
//   Stage 1  Schema Validation
//   Stage 2  Cryptographic Attestation   ← hash check before any replay work
//   Stage 3  Execution Fidelity          → REPLAY_COMPATIBLE branch
//   Stage 4  Structural Fidelity         (evidence graph / DAG)
//   Stage 5  Analytical Fidelity         (Fs delta ≤ 0.01, ranking parity)
//   → REPLAY_VERIFIED

import {
  EXPORT_FS_GATE,
  MODEL_VERSION,
  ENGINE_VERSION,
  WO_CHAIN,
  RUNTIME_STATE,
  SCHEMA_VERSION,
  computeArtifactHash,
} from './consultingexport.js';

export { RUNTIME_STATE };

export const IMPORT_ERROR = {
  INVALID_SCHEMA:       'INVALID_SCHEMA',
  MISSING_FIELDS:       'MISSING_FIELDS',
  FS_BELOW_GATE:        'FS_BELOW_GATE',
  PARSE_FAILURE:        'PARSE_FAILURE',
  // WO-1752 integrity validators (ordered by pipeline stage)
  HASH_MISMATCH:        'HASH_MISMATCH',        // Stage 2: CorruptedState
  PROVENANCE_INTEGRITY: 'PROVENANCE_INTEGRITY', // Stage 4a: StructuralDeformation
  DAG_INTEGRITY:        'DAG_INTEGRITY',        // Stage 4b: StructuralDeformation
  FIDELITY_MISMATCH:    'FIDELITY_MISMATCH',    // Stage 5: AnalyticalVariance
};

const FS_TOLERANCE = 0.01;

// ── Stage 2: Cryptographic Attestation ───────────────────────────────────────
// Chain-of-custody seal. If hash fails, abort — no downstream work executed.

function stage2HashAttestation(json) {
  const stored = json.meta?.artifact_hash;
  if (!stored) return { pass: true }; // v1751 artifact — no hash present, skip
  const recomputed = computeArtifactHash(json);
  if (stored !== recomputed) {
    return { pass: false, error: IMPORT_ERROR.HASH_MISMATCH, detail: `stored: ${stored}, recomputed: ${recomputed}` };
  }
  return { pass: true };
}

// ── Stage 3: Execution Fidelity ───────────────────────────────────────────────
// REPLAY_VERIFIED: engineVersion AND woChain both match current build.
// REPLAY_COMPATIBLE: schema format supported, but engine/chain differs.
// This determines the final state — not a failure, a branch.

function stage3ExecutionFidelity(json) {
  const rf = json.runtime_fingerprint;
  if (!rf) return { pass: true, state: RUNTIME_STATE.REPLAY_COMPATIBLE }; // v1751

  const engineMatch = rf.engineVersion === ENGINE_VERSION;
  const chainMatch  = JSON.stringify(rf.woChain) === JSON.stringify(WO_CHAIN);

  return {
    pass:  true,
    state: (engineMatch && chainMatch) ? RUNTIME_STATE.REPLAYING : RUNTIME_STATE.REPLAY_COMPATIBLE,
    engineMatch,
    chainMatch,
  };
}

// ── Stage 4: Structural Fidelity ──────────────────────────────────────────────

function stage4ProvenanceIntegrity(json) {
  const sources     = json.provenance?.signal_sources ?? [];
  const snapSignals = json.signal_snapshot?.signals    ?? [];
  if (snapSignals.length === 0) return { pass: true }; // no snapshot to check against

  const snapDomains = new Set(snapSignals.map(s => (s.domain ?? '').toUpperCase()));
  for (const src of sources) {
    const d = (src.domain ?? '').toUpperCase();
    if (d && !snapDomains.has(d)) {
      return { pass: false, error: IMPORT_ERROR.PROVENANCE_INTEGRITY, detail: `domain '${d}' in signal_sources not found in signal_snapshot.signals` };
    }
  }
  return { pass: true };
}

function stage4DAGIntegrity(json) {
  const graph = json.evidence_graph;
  if (!graph) return { pass: true }; // v1751 — skip

  const { nodes = [], edges = [] } = graph;
  const nodeIds = new Set(nodes.map(n => n.id));

  for (const edge of edges) {
    if (!nodeIds.has(edge.from)) {
      return { pass: false, error: IMPORT_ERROR.DAG_INTEGRITY, detail: `edge.from '${edge.from}' references unknown node` };
    }
    if (!nodeIds.has(edge.to)) {
      return { pass: false, error: IMPORT_ERROR.DAG_INTEGRITY, detail: `edge.to '${edge.to}' references unknown node` };
    }
  }

  // Cycle detection (DFS)
  const adj     = new Map(nodes.map(n => [n.id, []]));
  edges.forEach(e => { if (adj.has(e.from)) adj.get(e.from).push(e.to); });

  const visited = new Set();
  const inStack = new Set();

  function hasCycle(id) {
    if (inStack.has(id)) return true;
    if (visited.has(id)) return false;
    visited.add(id);
    inStack.add(id);
    for (const nb of (adj.get(id) ?? [])) {
      if (hasCycle(nb)) return true;
    }
    inStack.delete(id);
    return false;
  }

  for (const id of nodeIds) {
    if (hasCycle(id)) {
      return { pass: false, error: IMPORT_ERROR.DAG_INTEGRITY, detail: `circular reference at node '${id}'` };
    }
  }

  return { pass: true };
}

// ── Stage 5: Analytical Fidelity ─────────────────────────────────────────────

function stage5FidelityIntegrity(json) {
  const exported  = json.provenance?.fidelity_score ?? null;
  const snapConf  = json.signal_snapshot?.confidence ?? null;
  if (exported == null || snapConf == null) return { pass: true }; // v1751 — skip

  const delta = Math.abs(exported - snapConf);
  if (delta > FS_TOLERANCE) {
    return {
      pass:     false,
      error:    IMPORT_ERROR.FIDELITY_MISMATCH,
      detail:   `Fs delta ${delta.toFixed(6)} exceeds tolerance ±${FS_TOLERANCE}`,
      exported: parseFloat(exported.toFixed(6)),
      snapshot: parseFloat(snapConf.toFixed(6)),
    };
  }
  return { pass: true };
}

// ── Validation (full six-stage pipeline) ─────────────────────────────────────

export function validateImport(json) {
  // Stage 1: Schema Validation
  if (!json || typeof json !== 'object') {
    return { valid: false, stage: 1, error: IMPORT_ERROR.INVALID_SCHEMA };
  }
  if (!json.meta?.schema?.startsWith('KRYLO-CONSULTING-EXPORT')) {
    return { valid: false, stage: 1, error: IMPORT_ERROR.INVALID_SCHEMA };
  }
  if (!json.subject || !json.intelligence || !json.provenance) {
    return { valid: false, stage: 1, error: IMPORT_ERROR.MISSING_FIELDS };
  }

  const fs = json.provenance?.fidelity_score ?? 0;
  if (fs < EXPORT_FS_GATE) {
    return { valid: false, stage: 1, error: IMPORT_ERROR.FS_BELOW_GATE, fs };
  }

  const isV1752 = json.meta?.schema === SCHEMA_VERSION;

  // Stage 2: Cryptographic Attestation — ABORT on failure, no downstream work
  if (isV1752) {
    const s2 = stage2HashAttestation(json);
    if (!s2.pass) return { valid: false, stage: 2, error: s2.error, detail: s2.detail };
  }

  // Stage 3: Execution Fidelity — determines REPLAY_VERIFIED vs REPLAY_COMPATIBLE
  const s3           = stage3ExecutionFidelity(json);
  const baseState    = s3.state; // REPLAYING or REPLAY_COMPATIBLE

  // Stage 4 + 5: Structural + Analytical Fidelity (v1752 only)
  if (isV1752) {
    const s4prov = stage4ProvenanceIntegrity(json);
    if (!s4prov.pass) return { valid: false, stage: 4, error: s4prov.error, detail: s4prov.detail };

    const s4dag = stage4DAGIntegrity(json);
    if (!s4dag.pass)  return { valid: false, stage: 4, error: s4dag.error, detail: s4dag.detail };

    const s5 = stage5FidelityIntegrity(json);
    if (!s5.pass)     return { valid: false, stage: 5, error: s5.error, detail: s5.detail, exported: s5.exported, snapshot: s5.snapshot };
  }

  // All stages passed — resolve final state
  const replayState = (baseState === RUNTIME_STATE.REPLAYING && isV1752)
    ? RUNTIME_STATE.REPLAY_VERIFIED
    : baseState;

  const versionMatch = json.meta?.model_version === MODEL_VERSION;
  const timeFrozen   = json.meta?.time_frozen ?? json.meta?.generated ?? null;
  const staleDays    = timeFrozen
    ? Math.floor((Date.now() - new Date(timeFrozen).getTime()) / 86_400_000)
    : null;

  return {
    valid:        true,
    fs,
    versionMatch,
    staleDays,
    stateType:    json.meta?.state_type ?? 'analytical',
    timeFrozen,
    schema:       json.meta?.schema,
    replayState,
    isV1752,
    artifactHash: json.meta?.artifact_hash ?? null,
    engineMatch:  s3.engineMatch ?? false,
    chainMatch:   s3.chainMatch  ?? false,
  };
}

// ── Session reconstruction ────────────────────────────────────────────────────

export function reconstructSession(json, replayState) {
  const { subject, provenance, meta, intelligence, courses_of_action, threats, opportunities, signal_snapshot, evidence_graph, domains, runtime_fingerprint } = json;

  const resolvedState = replayState ?? (meta?.schema === SCHEMA_VERSION ? RUNTIME_STATE.REPLAY_VERIFIED : RUNTIME_STATE.REHYDRATED);

  const tensor = {
    domain:             subject.domain,
    fidelityScore:      provenance.fidelity_score,
    acquisitionState:   provenance.acquisition_state,
    signalSources:      provenance.signal_sources ?? [],
    stateType:          meta?.state_type ?? 'analytical',
    modelVersion:       meta?.model_version ?? null,
    timeFrozen:         meta?.time_frozen ?? meta?.generated ?? null,
    importedAt:         Date.now(),
    isImported:         true,
    // WO-1752
    replayState:        resolvedState,
    replayMode:         resolvedState === RUNTIME_STATE.REPLAYING || resolvedState === RUNTIME_STATE.REPLAY_VERIFIED,
    artifactHash:       meta?.artifact_hash ?? null,
    runtimeFingerprint: runtime_fingerprint ?? null,
    signalSnapshot:     signal_snapshot ?? null,
    evidenceGraph:      evidence_graph ?? null,
    domainStates:       domains ?? null,
    // Stored verbatim for deterministic re-export — prevents re-synthesis drift
    importedPayload: {
      intelligence:      intelligence ?? null,
      courses_of_action: courses_of_action ?? [],
      threats:           threats ?? [],
      opportunities:     opportunities ?? [],
    },
  };

  return {
    lens:  subject.lens  ?? 'GENERAL',
    query: subject.entity ?? '',
    tensor,
  };
}

// ── Acquisition reconstruction ────────────────────────────────────────────────

export function reconstructAcquisition(json) {
  const { provenance, signal_snapshot } = json;

  return {
    fidelityScore:   provenance.fidelity_score,
    state:           provenance.acquisition_state ?? 'ESTIMATED',
    topK:            (provenance.signal_sources ?? []).map(s => ({
      insight: s.insight,
      score:   s.score,
      domain:  s.domain,
      ttv:     s.time_to_value ?? null,
    })),
    provenanceChain: provenance.causal_chain ?? [],
    importedFrom:    json.meta?.schema ?? 'WO-1751-EXPORT',
    convergence:     signal_snapshot?.convergence ?? null,
    signalCount:     signal_snapshot?.signals?.length ?? 0,
  };
}

// ── File parser ───────────────────────────────────────────────────────────────

export async function parseImportFile(file) {
  try {
    const text = await file.text();
    const json = JSON.parse(text);
    return { json, error: null };
  } catch {
    return { json: null, error: IMPORT_ERROR.PARSE_FAILURE };
  }
}
