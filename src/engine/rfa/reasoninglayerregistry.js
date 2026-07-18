// reasoninglayerregistry.js — KRYL-1067 RFA Reasoning Layer Registry (RLR).
// The registry every reasoning engine registers through before entering the Fabric. It does NOT
// reason — it governs. A manifest declares an engine's contract; validateManifest() is the gate
// (CI-callable), and missing provenance requirements BLOCK registration (AC: provenance-required).
//
// Manifest fields (per spec): engine_id, version, inputs, outputs, dependencies,
// provenance_required, sandbox, status. Kept as plain objects here (a YAML file is just a
// serialization of this shape — validateManifest is the schema authority either way).
// Doctrine: §22 — a missing required field is a classified rejection, never a silent default.

export const MANIFEST_FIELDS = Object.freeze([
  'engine_id', 'version', 'inputs', 'outputs', 'dependencies', 'provenance_required', 'sandbox', 'status',
]);

export const ENGINE_STATUS = Object.freeze(['SPEC', 'SANDBOX', 'ACTIVE', 'RETIRED']);
const SEMVER = /^\d+\.\d+\.\d+$/;

/**
 * validateManifest(m) — schema gate. Returns { valid, errors[] }.
 * Enforced: all fields present; version is semver; inputs/outputs/dependencies are arrays;
 * status in ENGINE_STATUS; provenance_required is boolean AND, if true, sandbox must be declared
 * (a provenance-bearing engine cannot run unsandboxed without an explicit sandbox contract).
 */
export function validateManifest(m) {
  const errors = [];
  if (!m || typeof m !== 'object') return { valid: false, errors: ['manifest must be an object'] };
  for (const f of MANIFEST_FIELDS) if (!(f in m)) errors.push(`missing required field: ${f}`);
  if (m.engine_id != null && typeof m.engine_id !== 'string') errors.push('engine_id must be a string');
  if (m.version != null && !SEMVER.test(m.version)) errors.push(`version must be semver (x.y.z), got "${m.version}"`);
  for (const arr of ['inputs', 'outputs', 'dependencies']) {
    if (arr in m && !Array.isArray(m[arr])) errors.push(`${arr} must be an array`);
  }
  if ('status' in m && !ENGINE_STATUS.includes(m.status)) errors.push(`status must be one of ${ENGINE_STATUS.join('|')}`);
  if ('provenance_required' in m && typeof m.provenance_required !== 'boolean') errors.push('provenance_required must be boolean');
  // AC: missing provenance requirement blocks deployment — a provenance-bearing engine needs a sandbox contract.
  if (m.provenance_required === true && !m.sandbox) errors.push('provenance_required engine must declare a sandbox contract');
  return { valid: errors.length === 0, errors };
}

export function createRegistry() { return { engines: new Map() }; }

/**
 * register(reg, manifest) — validate then admit. Invalid manifests are REJECTED (throw), never
 * partially admitted. A version bump on an existing engine is allowed; the prior version is kept
 * in history (AC: version changes require ADR — the history is the audit anchor for that ADR).
 */
export function register(reg, manifest) {
  const v = validateManifest(manifest);
  if (!v.valid) {
    const e = new Error(`RLR: manifest rejected for "${manifest?.engine_id ?? '?'}": ${v.errors.join('; ')}`);
    e.code = 'E_MANIFEST_INVALID'; e.errors = v.errors; throw e;
  }
  const prev = reg.engines.get(manifest.engine_id);
  const history = prev ? [...(prev.history ?? []), { version: prev.version, at: prev.registeredAt }] : [];
  reg.engines.set(manifest.engine_id, { ...manifest, registeredAt: Date.now(), history });
  return reg.engines.get(manifest.engine_id);
}

export function getManifest(reg, engineId) { return reg.engines.get(engineId) ?? null; }
export function listManifests(reg) { return [...reg.engines.values()]; }

// The current RFA engines, declared as manifests. This is the single place the Fabric's engine
// set is enumerated — RDG (KRYL-1068) builds the dependency DAG from exactly these.
export const RFA_ENGINE_MANIFESTS = Object.freeze([
  { engine_id: 'tof',   version: '1.0.0', inputs: ['temporal_observations'], outputs: ['invariance_record'], dependencies: [],            provenance_required: true,  sandbox: 'observer', status: 'ACTIVE' },
  { engine_id: 'stamp', version: '1.0.0', inputs: ['edge', 'invariance_record'], outputs: ['stamped_edge'], dependencies: ['tof'],        provenance_required: true,  sandbox: 'observer', status: 'ACTIVE' },
  { engine_id: 'ar',    version: '0.1.0', inputs: ['explanation_bundle'], outputs: ['mechanism_bundle'],    dependencies: [],              provenance_required: true,  sandbox: 'reasoning', status: 'SANDBOX' },
  { engine_id: 'cf',    version: '0.1.0', inputs: ['mechanism_bundle'],   outputs: ['constraint_report'],   dependencies: ['ar'],          provenance_required: true,  sandbox: 'reasoning', status: 'SANDBOX' },
  { engine_id: 'edl',   version: '0.1.0', inputs: ['mechanism_bundle'],   outputs: ['deduction_bundle'],    dependencies: ['ar', 'tof', 'stamp'], provenance_required: true, sandbox: 'reasoning', status: 'SANDBOX' },
  { engine_id: 'adcl',  version: '0.1.0', inputs: ['mechanism_bundle', 'deduction_bundle', 'constraint_report'], outputs: ['coherence_revision_bundle'], dependencies: ['ar', 'edl'], provenance_required: true, sandbox: 'reasoning', status: 'SANDBOX' },
]);

// Build a registry pre-loaded with the RFA engines (the Fabric's default registry).
export function buildRfaRegistry() {
  const reg = createRegistry();
  for (const m of RFA_ENGINE_MANIFESTS) register(reg, m);
  return reg;
}
