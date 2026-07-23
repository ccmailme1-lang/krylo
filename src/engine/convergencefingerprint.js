// src/engine/convergencefingerprint.js
// KRYL-1097 — Convergence Fingerprint Registry & Replay Artifact
//
// Captures the OBSERVED convergence trajectory of an execution as a canonical, immutable,
// provenance-linked artifact. Records only — it introduces NO new convergence algorithm and
// NEVER mutates convergence calculations. It is a read-only consumer of whatever
// convergenceclassifier already emits over the life of an execution (FR-5).
//
// In scope (spec): define artifact · generate from observed data only · immutable once sealed ·
//   provenance to execution/replay/analysis · replay exposes it read-only.
// Out of scope (spec): classification, similarity, clustering, ML, genealogy, UI, confidence scoring.

export const FINGERPRINT_VECTOR_VERSION = 1; // bump only if the artifact field set/order changes

// in-progress trajectories — mutable ONLY until sealed
const openTrajectories = new Map(); // executionId → [{ state, score, ts }]
// sealed registry — immutable
const registry    = new Map();      // fingerprintId → frozen fingerprint
const byExecution = new Map();      // executionId   → fingerprintId

// ── deterministic content hash (FNV-1a-32 over stable-stringified content) ──────
// Same convention as identitykernel.js / aiae.js — inspectable, no crypto dependency.
function stableStringify(v) {
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stableStringify(v[k])).join(',') + '}';
  }
  return JSON.stringify(v);
}
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * recordConvergenceSample — append one observed convergence sample to an in-progress trajectory.
 * @param {string} executionId
 * @param {{state:string, score:number, ts?:number}} sample — observed only; not computed here.
 * @returns {number} current sample count
 * @throws if the execution is already sealed (immutability, FR-3)
 */
export function recordConvergenceSample(executionId, { state, score, ts = Date.now() }) {
  if (byExecution.has(executionId)) {
    throw new Error(`convergencefingerprint: execution ${executionId} is sealed — immutable (FR-3)`);
  }
  if (!openTrajectories.has(executionId)) openTrajectories.set(executionId, []);
  openTrajectories.get(executionId).push({ state, score, ts });
  return openTrajectories.get(executionId).length;
}

/**
 * sealFingerprint — freeze the observed trajectory into an immutable, provenance-linked artifact.
 * Idempotent: re-sealing a sealed execution returns the existing fingerprint.
 * @param {string} executionId
 * @param {{replayId?:string, analysisId?:string}} provenance
 * @returns {object} frozen Convergence Fingerprint
 */
export function sealFingerprint(executionId, provenance = {}) {
  if (byExecution.has(executionId)) return registry.get(byExecution.get(executionId));

  const trajectory = (openTrajectories.get(executionId) ?? []).map(s => ({ state: s.state, score: s.score, ts: s.ts }));
  const prov = { executionId, replayId: provenance.replayId ?? null, analysisId: provenance.analysisId ?? null };

  // contentHash = deterministic identity (excludes sealedAt so it is replay-reproducible, NFR)
  const contentHash = fnv1a(stableStringify({
    vectorVersion: FINGERPRINT_VECTOR_VERSION, executionId, trajectory, provenance: prov,
  }));
  const fingerprintId = `cf_${executionId}_${contentHash}`;

  const fingerprint = Object.freeze({
    fingerprintId,
    vectorVersion: FINGERPRINT_VECTOR_VERSION,
    provenance:   Object.freeze(prov),
    trajectory:   Object.freeze(trajectory.map(Object.freeze)),
    sampleCount:  trajectory.length,
    contentHash,
    sealed:       true,
    sealedAt:     Date.now(), // metadata only — NOT part of contentHash/identity
  });

  registry.set(fingerprintId, fingerprint);
  byExecution.set(executionId, fingerprintId);
  openTrajectories.delete(executionId);
  return fingerprint;
}

/** getFingerprint — read-only retrieval by id (FR-6). */
export function getFingerprint(fingerprintId) {
  return registry.get(fingerprintId) ?? null;
}

/** getFingerprintByExecution — read-only retrieval by originating execution (FR-6). */
export function getFingerprintByExecution(executionId) {
  const id = byExecution.get(executionId);
  return id ? registry.get(id) : null;
}

/** _resetRegistry — test-only teardown. */
export function _resetRegistry() {
  openTrajectories.clear(); registry.clear(); byExecution.clear();
}
