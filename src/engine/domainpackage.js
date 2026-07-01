// WO-2064 — Domain Package Contract
// Domain Package is the default execution shell — the top-level container in the Russian doll hierarchy.
// Self-sufficient and executable with zero reference to Decision Invariants or Cone rendering logic.
// Output structure locked to four parts: DOMAIN_STATE | COMPONENT_GRAPH | SIGNAL_EVALUATION | CAUSAL_MAP
// No additional top-level structures permitted.

// Six domains — locked per CLAUDE.md §6
export const DOMAINS = ['TECHNOLOGY', 'CAPITAL', 'KNOWLEDGE', 'LABOR', 'MEDIA', 'OWNERSHIP'];

// Forbidden fields: Decision Invariant names must never appear in domain output
const INVARIANT_NAMES = [
  'cost', 'value', 'time', 'risk', 'leverage', 'flexibility', 'confidence', 'momentum',
  'COST', 'VALUE', 'TIME', 'RISK', 'LEVERAGE', 'FLEXIBILITY', 'CONFIDENCE', 'MOMENTUM',
];

// Required top-level keys in domain output — no additions permitted
const REQUIRED_OUTPUT_KEYS = ['domainState', 'componentGraph', 'signalEvaluation', 'causalMap'];

// ── Factory ───────────────────────────────────────────────────────────────────

export function createDomainPackage(domain, subject) {
  if (!DOMAINS.includes(domain)) {
    throw new Error(`Unknown domain: ${domain}. Must be one of: ${DOMAINS.join(', ')}`);
  }
  return {
    domain,
    subject,
    createdAt: Date.now(),
    sealed:    false,
    output:    null,
  };
}

// ── Output validation ─────────────────────────────────────────────────────────

export function validateDomainOutput(output) {
  const errors = [];

  if (!output || typeof output !== 'object' || Array.isArray(output)) {
    return { valid: false, errors: ['output must be a plain object'] };
  }

  // Enforce required four-part structure
  for (const key of REQUIRED_OUTPUT_KEYS) {
    if (!(key in output)) errors.push(`missing required field: ${key}`);
  }

  // Enforce no additional top-level keys
  for (const key of Object.keys(output)) {
    if (!REQUIRED_OUTPUT_KEYS.includes(key)) {
      errors.push(`forbidden top-level field: "${key}" — only domainState, componentGraph, signalEvaluation, causalMap permitted`);
    }
  }

  // Enforce no invariant leakage at top level
  for (const key of INVARIANT_NAMES) {
    if (key in output) {
      errors.push(`invariant leakage: field "${key}" is forbidden in domain output`);
    }
  }

  // domainState: must not contain decision framing, scoring, or invariant mapping
  if (output.domainState) {
    for (const key of INVARIANT_NAMES) {
      if (key in output.domainState) {
        errors.push(`invariant leakage in domainState: field "${key}" is forbidden`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ── Emission ──────────────────────────────────────────────────────────────────

// Emit domain output — validates structure, seals the package
// A sealed package cannot be mutated. Sealing is the Phase 2 → Phase 3 boundary.
export function emitDomainOutput(pkg, output) {
  if (pkg.sealed) {
    throw new Error(`Domain Package for ${pkg.domain} is already sealed — cannot re-emit`);
  }
  const validation = validateDomainOutput(output);
  if (!validation.valid) {
    throw new Error(`Invalid domain output for ${pkg.domain}: ${validation.errors.join('; ')}`);
  }
  return { ...pkg, output, sealed: true, sealedAt: Date.now() };
}

// ── Guards ────────────────────────────────────────────────────────────────────

export function assertSealed(pkg) {
  if (!pkg.sealed) {
    throw new Error(`Domain Package for ${pkg.domain} must be sealed before downstream access`);
  }
}
