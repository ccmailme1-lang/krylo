// WO-2064 — Domain Package Contract
// Domain Package is the default execution shell — the top-level container in the Russian doll hierarchy.
// Self-sufficient and executable with zero reference to Decision Invariants or Cone rendering logic.
// Output structure locked to four parts: DOMAIN_STATE | COMPONENT_GRAPH | SIGNAL_EVALUATION | CAUSAL_MAP
// No additional top-level structures permitted.

// Six domains — locked per CLAUDE.md §6
import { CANONICAL_DOMAINS } from './ontology.js';
export const DOMAINS = CANONICAL_DOMAINS.map(d => d.toUpperCase()); // KRYL-1065 — sourced from ontology

// Forbidden fields: Decision Invariant names must never appear in domain output
const INVARIANT_NAMES = [
  'cost', 'value', 'time', 'risk', 'leverage', 'flexibility', 'confidence', 'momentum',
  'COST', 'VALUE', 'TIME', 'RISK', 'LEVERAGE', 'FLEXIBILITY', 'CONFIDENCE', 'MOMENTUM',
];

// Required top-level keys in domain output — no additions permitted
const REQUIRED_OUTPUT_KEYS = ['domainState', 'componentGraph', 'signalEvaluation', 'causalMap'];

// WO-2082 — Relationship Semantics Framework
// Every causalMap edge must declare what KIND of relationship it claims — the three
// representations formalized in Wang/Richardson/Robins, "Causal Inference: A Tale of Three
// Frameworks" (Journal of Data Science 24(1), 2026): mechanism (SCM-style), structural
// dependence (DAG-style), or measured/estimated intervention effect (potential-outcomes-style).
// These are different claims, not interchangeable labels for "A causes B."
export const RELATION_TYPES = ['MECHANISTIC', 'STRUCTURAL', 'INTERVENTIONAL'];

export function validateCausalMapEdge(edge) {
  const errors = [];

  if (!edge || typeof edge !== 'object') {
    return { valid: false, errors: ['causalMap edge must be an object'] };
  }
  if (!RELATION_TYPES.includes(edge.relationType)) {
    errors.push(`causalMap edge relationType must be one of: ${RELATION_TYPES.join(', ')}`);
  }
  if (!edge.description || typeof edge.description !== 'string') {
    errors.push('causalMap edge requires a non-empty description');
  }
  if (edge.relationType === 'MECHANISTIC' && !edge.mechanism) {
    errors.push('MECHANISTIC causalMap edge requires a non-empty mechanism field');
  }
  if (edge.relationType === 'INTERVENTIONAL' &&
      (!edge.effect || !['UP', 'DOWN', 'NEUTRAL'].includes(edge.effect.direction))) {
    errors.push('INTERVENTIONAL causalMap edge requires effect.direction (UP | DOWN | NEUTRAL)');
  }

  return { valid: errors.length === 0, errors };
}

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

  // WO-2082: every causalMap edge must declare a typed relationType
  if (Array.isArray(output.causalMap)) {
    output.causalMap.forEach((edge, i) => {
      const result = validateCausalMapEdge(edge);
      if (!result.valid) {
        errors.push(...result.errors.map(e => `causalMap[${i}]: ${e}`));
      }
    });
  } else if ('causalMap' in output) {
    errors.push('causalMap must be an array');
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
