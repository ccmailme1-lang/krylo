// Domain Pair Thesis — extracted from conemap.jsx (was a local const there) so it can be shared
// without a circular import. Pre-existing, already-approved registry, not new doctrine invented
// for the connector layer. Used by both the live cone rendering (FlowArc labeling) and the
// Formation Relationship Connector Layer's domain-adjacency candidate rule.
export const ARC_THESIS = {
  'capital+technology':   'WATCH: LIQUIDITY FLOW',
  'capital+ownership':    'WATCH: ASSET TRANSFER',
  'capital+labor':        'WATCH: COST PRESSURE',
  'capital+media':        'WATCH: NARRATIVE SHIFT',
  'capital+knowledge':    'WATCH: YIELD SIGNAL',
  'legal+career':         'WATCH: EXECUTIVE EVENT',
  'labor+media':          'WATCH: NARRATIVE BREAK',
  'labor+technology':     'WATCH: DISPLACEMENT SIGNAL', // was keyed 'technology+labor' — sort-order
                                                          // bug meant this never resolved (fell to
                                                          // the generic fallback instead)
  'legal+technology':     'WATCH: REGULATORY SIGNAL',
  'knowledge+ownership':  'WATCH: IP TRANSFER',
  'knowledge+labor':      'WATCH: TALENT PRESSURE',
  'media+ownership':      'WATCH: BRAND TRANSFER',
  // 2026-08-10 — closes the remaining canonical pairs (was 9/15, all others fell to generic
  // 'POSSIBLE CATALYST'). Same domain-adjacency thesis, not a causal claim (see arcThesis below).
  'knowledge+technology':  'WATCH: INNOVATION TRANSFER', // R&D / patent pipeline becoming deployable tech
  'knowledge+media':       'WATCH: DISCLOSURE EVENT',    // research/IP becoming public narrative
  'labor+ownership':       'WATCH: EQUITY TRANSFER',     // workforce stake / control shift
  'media+technology':      'WATCH: DISTRIBUTION SHIFT',  // platform-driven reach change
  'ownership+technology':  'WATCH: ACQUISITION SIGNAL',  // tech M&A — control over productive capacity
};

export function arcThesis(a, b) {
  return ARC_THESIS[[a, b].sort().join('+')] ?? 'POSSIBLE CATALYST';
}

// KRYL-1065 ontology guard: domain lists alias against ontology.js, never redeclare (§17 is the
// single source). ARC_THESIS also has 'legal'/'career' pairs (a different, non-canonical
// vocabulary) — those are excluded when this registry is used as a candidate-pair source for the
// Formation layer, which operates strictly on the locked six.
import { isCanonicalDomain } from './ontology.js';

// Every ARC_THESIS pair where both sides are canonical domains, as [domainA, domainB] tuples
// (uppercased to match Formation.formation_id, which is the signal-domain casing).
export function canonicalDomainPairs() {
  return Object.keys(ARC_THESIS)
    .map(key => key.split('+'))
    .filter(([a, b]) => isCanonicalDomain(a) && isCanonicalDomain(b))
    .map(([a, b]) => [a.toUpperCase(), b.toUpperCase()]);
}
