// WO-1074 — Concurrency Isolation Topology
// Maps and enforces isolated execution domains.
// INVARIANT: domains may not share mutable state; reads across domain boundaries
// are permitted only via explicit export declarations.
// Extends the LockCondition vocabulary from lockmanager.js — does not replace it.

export const IsolationDomain = Object.freeze({
  KERNEL:     'KERNEL',
  INFERENCE:  'INFERENCE',
  PROJECTION: 'PROJECTION',
  INGRESS:    'INGRESS',
  REPLAY:     'REPLAY',
});

export const ConcurrencyViolation = Object.freeze({
  DOMAIN_COLLISION:       'DOMAIN_COLLISION',
  UNAUTHORIZED_EXPORT:    'UNAUTHORIZED_EXPORT',
  CIRCULAR_DEPENDENCY:    'CIRCULAR_DEPENDENCY',
  DOMAIN_NOT_REGISTERED:  'DOMAIN_NOT_REGISTERED',
  DOUBLE_ACQUISITION:     'DOUBLE_ACQUISITION',
});

export class ConcurrencyError extends Error {
  constructor(code, detail) {
    super(`CONCURRENCY_ISOLATION [${code}]: ${detail}`);
    this.name = 'ConcurrencyError';
    this.code = code;
  }
}

export class ConcurrencyIsolationTopology {
  constructor() {
    this._domains      = new Map(); // domainId → { exports: Set, acquired: bool }
    this._exportMatrix = new Map(); // `${from}→${to}` → Set of permitted keys
    this._log          = [];
    this._violations   = [];

    // Register built-in domains
    for (const d of Object.values(IsolationDomain)) {
      this._domains.set(d, { exports: new Set(), acquired: false });
    }

    // Default export topology — KERNEL → INFERENCE only; INFERENCE → PROJECTION only
    this._permit(IsolationDomain.KERNEL,    IsolationDomain.INFERENCE,  ['vectorResult', 'causalFrame']);
    this._permit(IsolationDomain.INFERENCE, IsolationDomain.PROJECTION, ['projectionPayload', 'inferenceOutput']);
    this._permit(IsolationDomain.INGRESS,   IsolationDomain.KERNEL,     ['telemetry', 'envelope']);
    this._permit(IsolationDomain.REPLAY,    IsolationDomain.PROJECTION, ['replaySnapshot']);
  }

  _permit(from, to, keys) {
    const edge = `${from}→${to}`;
    if (!this._exportMatrix.has(edge)) this._exportMatrix.set(edge, new Set());
    for (const k of keys) this._exportMatrix.get(edge).add(k);
  }

  // Register a custom domain.
  registerDomain(id) {
    if (this._domains.has(id)) {
      throw new ConcurrencyError(ConcurrencyViolation.DOUBLE_ACQUISITION, `domain "${id}" already registered`);
    }
    this._domains.set(id, { exports: new Set(), acquired: false });
  }

  // Declare an additional export permission.
  permitExport(from, to, keys = []) {
    if (!this._domains.has(from)) throw new ConcurrencyError(ConcurrencyViolation.DOMAIN_NOT_REGISTERED, `from: "${from}"`);
    if (!this._domains.has(to))   throw new ConcurrencyError(ConcurrencyViolation.DOMAIN_NOT_REGISTERED, `to: "${to}"`);
    // Circular dependency check — simple two-hop
    const reverse = `${to}→${from}`;
    if (this._exportMatrix.has(reverse)) {
      throw new ConcurrencyError(ConcurrencyViolation.CIRCULAR_DEPENDENCY, `${from} ↔ ${to} creates circular export`);
    }
    this._permit(from, to, keys);
  }

  // Acquire exclusive write access to a domain.
  acquire(domainId) {
    const domain = this._domains.get(domainId);
    if (!domain) throw new ConcurrencyError(ConcurrencyViolation.DOMAIN_NOT_REGISTERED, `domain: "${domainId}"`);
    if (domain.acquired) throw new ConcurrencyError(ConcurrencyViolation.DOUBLE_ACQUISITION, `domain "${domainId}" already acquired`);
    domain.acquired = true;
    this._log.push({ action: 'ACQUIRE', domainId, ts: Date.now() });
  }

  // Release write access to a domain.
  release(domainId) {
    const domain = this._domains.get(domainId);
    if (!domain) throw new ConcurrencyError(ConcurrencyViolation.DOMAIN_NOT_REGISTERED, `domain: "${domainId}"`);
    domain.acquired = false;
    this._log.push({ action: 'RELEASE', domainId, ts: Date.now() });
  }

  // Validate that a key export from one domain to another is permitted.
  assertExportAllowed(from, to, key) {
    const edge    = `${from}→${to}`;
    const allowed = this._exportMatrix.get(edge);
    if (!allowed || !allowed.has(key)) {
      const v = { code: ConcurrencyViolation.UNAUTHORIZED_EXPORT, from, to, key, ts: Date.now() };
      this._violations.push(v);
      throw new ConcurrencyError(ConcurrencyViolation.UNAUTHORIZED_EXPORT, `"${key}" is not permitted from "${from}" → "${to}"`);
    }
  }

  topologyMap() {
    const edges = {};
    for (const [edge, keys] of this._exportMatrix) {
      edges[edge] = [...keys];
    }
    return { domains: [...this._domains.keys()], edges };
  }

  get violations() { return [...this._violations]; }
  get log()        { return [...this._log]; }
}
