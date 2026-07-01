// WO-2065 — Domain Package Registry
// Declarative registry: mounts Domain Packages into the runtime container.
// Does NOT resolve, rank, or merge domains.
// Plug-in loader only — each domain registers its own implementation independently.

import { DOMAINS, createDomainPackage } from './domainpackage.js';

const _registry = new Map();

// ── Registration ──────────────────────────────────────────────────────────────

// Register a domain implementation.
// implementation must export: execute(subject) → valid domain-native output (four-part structure)
export function registerDomain(domain, implementation) {
  if (!DOMAINS.includes(domain)) {
    throw new Error(`Cannot register unknown domain: ${domain}`);
  }
  if (typeof implementation?.execute !== 'function') {
    throw new Error(`Domain implementation for ${domain} must export execute(subject)`);
  }
  _registry.set(domain, implementation);
}

// ── Mount ─────────────────────────────────────────────────────────────────────

// Mount a Domain Package for a subject — Phase 1 operation.
// Returns an instantiated package + its registered implementation, ready for Phase 2 execution.
export function mountDomainPackage(domain, subject) {
  if (!_registry.has(domain)) {
    throw new Error(`Domain not registered: ${domain}`);
  }
  return {
    pkg:            createDomainPackage(domain, subject),
    implementation: _registry.get(domain),
  };
}

// ── Inspection ────────────────────────────────────────────────────────────────

export function listRegisteredDomains() {
  return [..._registry.keys()];
}

export function isDomainRegistered(domain) {
  return _registry.has(domain);
}
