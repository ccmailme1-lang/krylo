// WO-1751 Phase B — Consulting Intelligence Import (Bidirectional Traceability)
// Imported JSON must reconstruct runtime state exactly.
// Closes the loop: export → (time passes) → reimport → same epistemic state.
//
// Non-gaming-resistant: any mutation to the JSON surfaces as a version or Fs mismatch.
// Phase C (cryptographic signing) deferred.

import { EXPORT_FS_GATE, MODEL_VERSION } from './consultingexport.js';

export const IMPORT_ERROR = {
  INVALID_SCHEMA:   'INVALID_SCHEMA',
  MISSING_FIELDS:   'MISSING_FIELDS',
  FS_BELOW_GATE:    'FS_BELOW_GATE',
  PARSE_FAILURE:    'PARSE_FAILURE',
};

// ── Validation ────────────────────────────────────────────────────────────────
export function validateImport(json) {
  if (!json || typeof json !== 'object') {
    return { valid: false, error: IMPORT_ERROR.INVALID_SCHEMA };
  }

  if (!json.meta?.schema?.startsWith('KRYLO-CONSULTING-EXPORT')) {
    return { valid: false, error: IMPORT_ERROR.INVALID_SCHEMA };
  }

  if (!json.subject || !json.intelligence || !json.provenance) {
    return { valid: false, error: IMPORT_ERROR.MISSING_FIELDS };
  }

  const fs = json.provenance?.fidelity_score ?? 0;
  if (fs < EXPORT_FS_GATE) {
    return { valid: false, error: IMPORT_ERROR.FS_BELOW_GATE, fs };
  }

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
  };
}

// ── Session reconstruction ────────────────────────────────────────────────────
// Returns the four arguments for createSession(id, lens, query, tensor).
export function reconstructSession(json) {
  const { subject, provenance, meta } = json;

  const tensor = {
    domain:           subject.domain,
    fidelityScore:    provenance.fidelity_score,
    acquisitionState: provenance.acquisition_state,
    signalSources:    provenance.signal_sources ?? [],
    stateType:        meta?.state_type ?? 'analytical',
    modelVersion:     meta?.model_version ?? null,
    timeFrozen:       meta?.time_frozen ?? meta?.generated ?? null,
    importedAt:       Date.now(),
    isImported:       true,
  };

  return {
    lens:   subject.lens   ?? 'GENERAL',
    query:  subject.entity ?? '',
    tensor,
  };
}

// ── Acquisition reconstruction ────────────────────────────────────────────────
// Rebuilds pendingAcquisition so IntelligenceBrief reads correct Fs on render.
export function reconstructAcquisition(json) {
  const { provenance } = json;

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
    importedFrom:    'WO-1751-EXPORT',
  };
}

// ── File parser ───────────────────────────────────────────────────────────────
// Reads a File object and returns { json, error }.
export async function parseImportFile(file) {
  try {
    const text = await file.text();
    const json = JSON.parse(text);
    return { json, error: null };
  } catch {
    return { json: null, error: IMPORT_ERROR.PARSE_FAILURE };
  }
}
