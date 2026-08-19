// signalstate.js — ValidationContext provider: Σ, πΣ (domain pressure + classifier state).
// Implements SPEC-relationship-validator-operator-contract.md §3 `signalState`.
//
// CONDITIONALLY LIVE-WIRED: getDomainSignals(domain) takes one of the 6 canonical §17 domains,
// not an arbitrary entity id. Only wireable when the candidate's endpoints ARE domain names
// (a domain-to-domain RelationCore, e.g. TECHNOLOGY→CAPITAL — the worked example used
// throughout the Validator design conversation). For entity-to-entity relations, this
// correctly returns null (§22 structural absence) rather than guessing at an entity→domain
// resolution that doesn't exist anywhere in this codebase.

import { getDomainSignals } from '../../domaingravity.js';
import { CANONICAL_DOMAINS } from '../../ontology.js';

const DOMAIN_SET = new Set(CANONICAL_DOMAINS.map(d => d.toUpperCase()));

// getSignalState(candidate) → { source: Signal[], target: Signal[] } | null
export function getSignalState(candidate) {
  const src = (candidate?.sourceId ?? '').toUpperCase();
  const tgt = (candidate?.targetId ?? '').toUpperCase();
  if (!DOMAIN_SET.has(src) || !DOMAIN_SET.has(tgt)) return null;
  return Object.freeze({
    source: Object.freeze(getDomainSignals(src)),
    target: Object.freeze(getDomainSignals(tgt)),
  });
}
