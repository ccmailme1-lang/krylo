// WO-2066 — Metric Adapter Layer
// Late-binding mapper: domain-native output → Decision Invariants (WO-2063 schema).
// Phase 3 only — runs AFTER Domain Package is sealed (Phase 2 complete).
// Read-only access to domain output. No back-propagation. No feedback loop.
// Invariants are derivative outputs — not primary representations.

import { DECISION_INVARIANTS, makeInvariant, makeInvariantSet } from './decisioninvariants.js';
import { assertSealed } from './domainpackage.js';

const _adapters = new Map();

// ── Registration ──────────────────────────────────────────────────────────────

// Register a domain metric adapter.
// adapterFn(frozenDomainOutput) → partial or complete mapping: { [INVARIANT]: { raw, direction, label, sourceMetric, confidence } }
// adapterFn MUST NOT mutate domain output.
// adapterFn MUST NOT reference domain execution internals or trigger upstream re-evaluation.
export function registerMetricAdapter(domain, adapterFn) {
  if (typeof adapterFn !== 'function') {
    throw new Error(`Metric adapter for ${domain} must be a function`);
  }
  _adapters.set(domain, adapterFn);
}

// ── Phase 3: Adaptation ───────────────────────────────────────────────────────

export function adaptToInvariants(sealedPkg) {
  // Phase guard — domain must be sealed before adapter runs
  assertSealed(sealedPkg);

  const invariantSet = makeInvariantSet();

  if (!_adapters.has(sealedPkg.domain)) {
    // No adapter registered for this domain — return empty set (not an error)
    return {
      domain:     sealedPkg.domain,
      subject:    sealedPkg.subject,
      invariants: invariantSet,
      adapted:    false,
      adaptedAt:  Date.now(),
    };
  }

  const adapterFn = _adapters.get(sealedPkg.domain);

  // Frozen deep copy — enforces read-only contract, prevents back-propagation
  const frozenOutput = Object.freeze(JSON.parse(JSON.stringify(sealedPkg.output)));
  const mappings = adapterFn(frozenOutput);

  // Apply mappings — unknown invariant names are silently dropped
  for (const [invariant, fields] of Object.entries(mappings ?? {})) {
    if (DECISION_INVARIANTS.includes(invariant)) {
      invariantSet[invariant] = makeInvariant(invariant, fields);
    }
  }

  return {
    domain:     sealedPkg.domain,
    subject:    sealedPkg.subject,
    invariants: invariantSet,
    adapted:    true,
    adaptedAt:  Date.now(),
  };
}

// ── Phase 4: Composition (cross-domain only) ──────────────────────────────────

// Compose adapted outputs from multiple domains for cross-domain comparison.
// Entry condition: ALL packages must be fully adapted before composition begins.
// Returns side-by-side invariant sets — no merging, no normalization across domains.
export function composeInvariantSets(adaptedOutputs) {
  if (!Array.isArray(adaptedOutputs) || adaptedOutputs.length < 2) {
    throw new Error('Composition requires at least two adapted domain outputs');
  }

  for (const output of adaptedOutputs) {
    if (!output.adapted) {
      throw new Error(
        `Composition blocked: domain "${output.domain}" adaptation is incomplete. All Phase 3 outputs must be ready before Phase 4.`
      );
    }
  }

  return {
    domains:    adaptedOutputs.map(o => o.domain),
    subject:    adaptedOutputs[0].subject,
    sets:       Object.fromEntries(adaptedOutputs.map(o => [o.domain, o.invariants])),
    composed:   true,
    composedAt: Date.now(),
  };
}
