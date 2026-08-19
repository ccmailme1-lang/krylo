// context/index.js — ValidationContext provider registry + capability-scoping.
// Implements SPEC-relationship-validator-operator-contract.md §3 and
// SPEC-relationship-validator-adapter-orchestration-design.md §2.
//
// The orchestrator is the only caller of buildScopedContext(). No operator imports this file's
// providers directly — an operator only ever sees the frozen, key-limited object this function
// returns, per its own declared "Required ValidationContext" in the operator contracts.

import { getEvidence }         from './evidence.js';
import { getLineage }          from './lineage.js';
import { getWorldGraph }       from './worldgraph.js';
import { getSignalState }      from './signalstate.js';
import { getRelationHistory }  from './relationhistory.js';
import { getRegimes }          from './regimes.js';
import { getConfounders }      from './confounders.js';

export const CONTEXT_PROVIDERS = Object.freeze({
  evidence:         getEvidence,
  lineage:          getLineage,
  worldGraph:       getWorldGraph,
  signalState:      getSignalState,
  relationHistory:  getRelationHistory,
  regimes:          getRegimes,
  confounders:      getConfounders,
});

// OPERATOR_CONTEXT_ALLOWLIST — from each operator's "Required ValidationContext" field,
// SPEC-relationship-validator-operators.md §§1-8. Kept here, not duplicated in the orchestrator,
// so there is exactly one place this mapping can drift from the locked contracts.
export const OPERATOR_CONTEXT_ALLOWLIST = Object.freeze({
  TEMPORAL:      Object.freeze(['evidence', 'lineage']),
  LAG:           Object.freeze(['relationHistory']),
  STRUCTURAL:    Object.freeze(['worldGraph']),
  RECURRENCE:    Object.freeze(['relationHistory']),
  ALTERNATIVES:  Object.freeze(['worldGraph']),
  INDEPENDENCE:  Object.freeze(['confounders']),
  STABILITY:     Object.freeze(['regimes', 'relationHistory']),
  INFORMATION:   Object.freeze(['evidence', 'worldGraph', 'signalState']),
});

// buildScopedContext(operatorName, candidate, providerOptions) → ScopedContext
//   providerOptions?: { [providerKey]: options } — per-provider injection options (resolvers,
//   stores, supplied arrays) forwarded to the matching provider call. The orchestrator collects
//   these from whatever the caller of the whole pipeline supplied; providers themselves never
//   reach outside their own arguments.
//
// Absent keys are genuinely ABSENT (`'lineage' in scopedContext` is false for an operator never
// declared to need it) — not merely undefined — per the design doc §2 enforcement requirement.
export function buildScopedContext(operatorName, candidate, providerOptions = {}) {
  const allowed = OPERATOR_CONTEXT_ALLOWLIST[operatorName];
  if (!allowed) {
    throw new Error(`buildScopedContext: unknown operator "${operatorName}"`);
  }
  const scoped = {};
  for (const key of allowed) {
    const provider = CONTEXT_PROVIDERS[key];
    const opts = providerOptions[key] ?? {};
    scoped[key] = () => provider(candidate, opts);
  }
  return Object.freeze(scoped);
}
