// WO-1745 — Protocol Registry & Evidence Contract
// Governance layer for all persona protocols (WO-1736–1739+).
//
// RULE (LOCKED): Protocols produce evidence and signals only.
//   Protocols do not produce conclusions.
//   Conclusions belong to WEAK → NC → SYNTH.
//
// Reference implementation: WO-1739 (Khoo Protocol) — aiinfrastructure.js

// ── Output item schemas ───────────────────────────────────────────────────────
// These are the only permitted output primitives from a registered protocol.

export function evidenceItem(type, domain, score, threshold) {
  const active = score > threshold;
  return {
    type,
    domain,
    score,
    threshold,
    state:  active ? 'ELEVATED' : 'BELOW_THRESHOLD',
    active,
  };
}

export function signalItem(domain, score, threshold) {
  return {
    domain,
    score,
    state:  score > threshold ? 'ACTIVE' : 'INACTIVE',
    active: score > threshold,
  };
}

export function provenanceItem(source, domain, ts = Date.now()) {
  return { source, domain, ts };
}

// ── Protocol definitions ──────────────────────────────────────────────────────

const PROTOCOLS = {
  GASS_BENECKE: {
    id:           'GASS_BENECKE',
    name:         'Regulatory Convergence Window',
    owner:        'WO-1736',
    version:      '2.0',
    domains:      ['KNOWLEDGE', 'MEDIA', 'TECHNOLOGY', 'CAPITAL'],
    outputFields: ['triggered', 'velocityState', 'phaseA', 'phaseC', 'microWindow',
                   'macroWindow', 'knowledgeScore', 'mediaScore', 'technologyScore',
                   'capitalScore', 'enforcementDelta', 'fs', 'ts'],
  },
  CORNERSTONE: {
    id:           'CORNERSTONE',
    name:         'HNW Client Convergence Overlay',
    owner:        'WO-1737',
    version:      '1.1',
    domains:      ['TECHNOLOGY', 'CAPITAL', 'OWNERSHIP'],
    outputFields: ['triggered', 'phase', 'phaseA', 'phaseB', 'phaseC',
                   'technologyScore', 'capitalScore', 'ownershipScore',
                   'techCapitalDelta', 'fs', 'fsQualified', 'ts'],
  },
  LACAZE: {
    id:           'LACAZE',
    name:         'Critical Materials Demand Signal',
    owner:        'WO-1738',
    version:      '1.1',
    domains:      ['TECHNOLOGY', 'CAPITAL', 'OWNERSHIP', 'MEDIA'],
    outputFields: ['triggered', 'phase', 'phaseA', 'phaseB', 'phaseC',
                   'technologyScore', 'capitalScore', 'ownershipScore', 'mediaScore',
                   'fs', 'fsQualified', 'ts'],
  },
  KHOO: {
    id:           'KHOO',
    name:         'AI Infrastructure Demand Signal',
    owner:        'WO-1739',
    version:      '1.0',
    domains:      ['TECHNOLOGY', 'CAPITAL', 'OWNERSHIP'],
    outputFields: ['protocol', 'triggered', 'evidence', 'signals', 'provenance',
                   'fs', 'fsQualified', 'ts'],
  },
};

export function getProtocol(id)   { return PROTOCOLS[id] ?? null; }
export function listProtocols()   { return Object.values(PROTOCOLS); }

// ── Runtime output contract enforcement ───────────────────────────────────────
// Call with the raw output object from any protocol function.
// Throws PROTOCOL_CONTRACT_VIOLATION on any forbidden field.
//
// Forbidden fields are conclusion/narrative/prediction artifacts that belong
// exclusively to the WEAK → NC → SYNTH layer — never inside a protocol output.

const FORBIDDEN_OUTPUT_KEYS = new Set([
  'leadTime',
  'conclusion',
  'conclusions',
  'narrative',
  'narratives',
  'recommendation',
  'recommendations',
  'action',
  'prediction',
]);

export function validateOutputContract(output, protocolId = 'UNKNOWN') {
  if (!output || typeof output !== 'object') {
    throw new Error(`PROTOCOL_CONTRACT_VIOLATION [${protocolId}]: output must be an object`);
  }

  for (const key of Object.keys(output)) {
    if (FORBIDDEN_OUTPUT_KEYS.has(key)) {
      throw new Error(
        `PROTOCOL_CONTRACT_VIOLATION [${protocolId}]: '${key}' is a conclusion field — ` +
        `protocol outputs must be observables only. Conclusions belong to WEAK→NC→SYNTH.`
      );
    }
  }
}

// Version enforcement — throws if protocol's registered version doesn't match caller expectation
export function assertVersion(protocolId, expectedVersion) {
  const def = PROTOCOLS[protocolId];
  if (!def) {
    throw new Error(`PROTOCOL_REGISTRY: unknown protocol '${protocolId}'`);
  }
  if (def.version !== expectedVersion) {
    throw new Error(
      `PROTOCOL_VERSION_MISMATCH [${protocolId}]: expected ${expectedVersion}, registered ${def.version}`
    );
  }
}
