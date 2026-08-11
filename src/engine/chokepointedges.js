// KRYL-1011 step 3 — grounded application-tier chokepoint edges (Causal Impact Map seed).
//
// Curated, VERIFIABLE dependency facts for the highest-fan-out network chokepoints
// (from the outage material). Each edge is a real functional/domain dependency — what
// a chokepoint GATES — at the granularity of chokepoint-company -> CAPABILITY -> sector/
// transaction-type.
//
// GROUNDING (§22 / §19): we do NOT assert specific "Company X depends on Cloudflare"
// edges — that needs real vendor-dependency data; asserting it unsourced is the
// fabrication trap. Everything here is a verifiable domain fact (Sabre powers airline
// reservations; Visa operates card rails; Cloudflare provides DNS/auth). source =
// 'DOMAIN_DEP_FACT' -> buildImpactMap marks these GROUNDED.
//
// Direction: outbound = "impacts / gates".
//
// IDENTITY NOTE: nodes here are NAME-based (capabilities/transaction-types are not
// registry entities). CIK-anchoring the chokepoint COMPANIES (registry entries + edges
// re-keyed by CIK) is a follow-up for full identity rigor — until then a chokepoint that
// also carries a registry CIK could key differently. Flagged, not hidden.
//
// NOT auto-registered at import: registering writes into the symmetric adjacency map too
// (resolveTopology / surface amplifier), so wiring it live needs an amplifier-interaction
// check first (§4). Call registerChokepointEdges() from the impact-map entry point.

import { registerTypedEdge, TYPED_EDGES } from './entitytopologyregistry.js';
import { realiseSnapshot } from './gwrealiser.js';
import { buildStructure } from './sigmaengine.js';
import { ProvenanceDAG } from './causalos/provenance.js';

const SRC = 'DOMAIN_DEP_FACT';

// [from, to, type] — directed outbound dependency facts.
const EDGES = [
  // Card payment rails
  ['Visa',       'CARD_PAYMENT_RAILS',            'OPERATES'],
  ['Mastercard', 'CARD_PAYMENT_RAILS',            'OPERATES'],
  ['CARD_PAYMENT_RAILS', 'POS_TRANSACTIONS',      'GATES'],
  ['CARD_PAYMENT_RAILS', 'MOBILE_WALLET_PAYMENTS','GATES'],
  // E-commerce payment processing
  ['Fiserv',   'ECOMMERCE_PAYMENT_PROCESSING',    'OPERATES'],
  ['Worldpay', 'ECOMMERCE_PAYMENT_PROCESSING',    'OPERATES'],
  ['ECOMMERCE_PAYMENT_PROCESSING', 'ONLINE_CHECKOUT',       'GATES'],
  ['ECOMMERCE_PAYMENT_PROCESSING', 'PAYMENT_AUTHORIZATION', 'GATES'],
  // DNS / auth / CDN
  ['Cloudflare', 'DNS_AUTH_CDN', 'PROVIDES'],
  ['Akamai',     'DNS_AUTH_CDN', 'PROVIDES'],
  ['DNS_AUTH_CDN', 'TWO_FACTOR_AUTH',       'GATES'],
  ['DNS_AUTH_CDN', 'PAYMENT_AUTHORIZATION', 'GATES'],
  ['TWO_FACTOR_AUTH', 'ONLINE_ACCOUNT_AUTHORIZATION', 'GATES'],
  // Airline reservations
  ['Sabre', 'AIRLINE_RESERVATIONS', 'POWERS'],
  ['AIRLINE_RESERVATIONS', 'FLIGHT_BOOKING',  'GATES'],
  ['AIRLINE_RESERVATIONS', 'TICKETING',       'GATES'],
  ['AIRLINE_RESERVATIONS', 'BAGGAGE_ROUTING', 'GATES'],
  // Clearing / interbank
  ['CLEARING_NETWORKS', 'WIRE_TRANSFERS',     'GATES'],
  ['CLEARING_NETWORKS', 'B2B_SETTLEMENTS',    'GATES'],
  ['CLEARING_NETWORKS', 'PAYROLL_PROCESSING', 'GATES'],
  // EDI supply chain
  ['EDI', 'SUPPLY_CHAIN_PURCHASING', 'GATES'],
  ['EDI', 'INVOICING',               'GATES'],
  ['EDI', 'INVENTORY_RESTOCKING',    'GATES'],
  // shared downstream convergence: account auth enables payment auth
  ['ONLINE_ACCOUNT_AUTHORIZATION', 'PAYMENT_AUTHORIZATION', 'ENABLES'],
];

// CIK-anchored chokepoint companies — real SEC CIKs, verified against SEC
// company_tickers.json (not typed from memory). Company nodes key by CIK so they
// resolve identically through the ERK (toTopologyNodeId -> CIK:xxxx). Capability/
// sector nodes are never companies -> always name-keyed. WORLDPAY intentionally
// absent — currently private (GTCR), no clean standalone SEC CIK; it stays
// name-keyed rather than carry a fabricated identifier (§22).
const COMPANY_CIK = {
  Visa:       '0001403161',
  Mastercard: '0001141391',
  Fiserv:     '0000798354',
  Sabre:      '0001597033',
  Cloudflare: '0001477333',
  Akamai:     '0001086222',
};

let _registered = false;

/**
 * registerChokepointEdges() — idempotent. Registers the grounded chokepoint
 * dependency edges into the topology graph. Call once from the impact-map entry point.
 * @returns {number} edge count registered (0 if already registered this session)
 */
export function registerChokepointEdges() {
  if (_registered) return 0;
  _registered = true;
  for (const [from, to, type] of EDGES) {
    registerTypedEdge({ from, to, type, source: SRC, fromCik: COMPANY_CIK[from], fromLabel: from, toLabel: to });
  }
  return EDGES.length;
}

// KRYL-Lean-Ontology R-side integration — additive, does not change
// registerChokepointEdges() above in any way (same function, same return contract, same
// idempotency flag). entitytopologyregistry.js is treated as the authoritative R
// substrate, per direction — this reads the edges it already holds via gwrealiser.js's
// default (realiseSnapshot() reads live TYPED_EDGES when no override is passed), it does
// not create a second store or duplicate the edges anywhere.
//
// Session-scoped shared ProvenanceDAG, same pattern as edgar8kconnector.js's
// _provenanceDAG — links accumulate across calls rather than resetting.
const _chokepointDAG = new ProvenanceDAG();

// Fixed sigmaId, not a Date.now()-suffixed one — unlike EDGAR filings, this curated data
// doesn't grow between calls (registerChokepointEdges() is a one-time seed, guarded by
// _registered). Repeated calls to this function re-confirm the SAME structure rather than
// spawning a new Σ namespace each time — linkEvidence() is a Set add, so re-linking the
// same (evidence, element) pair on a repeat call is a genuine no-op, not a duplicate.
const CHOKEPOINT_SIGMA_ID = 'CHOKEPOINT_DEPENDENCY_STRUCTURE';

/**
 * buildChokepointStructure() → Σ object (sigmaengine.js's buildStructure() return shape)
 *
 * Ensures the edges exist (calling registerChokepointEdges() is safe/idempotent — it
 * no-ops after the first real call), then realises a Gᵂ snapshot over all time (this
 * curated data has no natural decay window) and builds Σ over the whole graph — no
 * seedId, since this is one cohesive curated structure, not scoped to a single entity.
 *
 * SOURCE-SCOPED (fixed after multi-cycle testing, audit 024): realiseSnapshot()'s default
 * reads the WHOLE shared TYPED_EDGES store. Since other connectors write into that same
 * array, an unscoped read would silently absorb unrelated edges into what is supposed to be
 * a cohesive curated chokepoint structure — a real "prior structural state corrupted by an
 * unrelated write" bug, caught by testing repeated invocation alongside a simulated other
 * connector, not assumed safe. Filtering to this file's own SRC ('DOMAIN_DEP_FACT') keeps
 * this function's Σ scoped to only the edges it itself is responsible for, without touching
 * entitytopologyregistry.js's status as the single shared authoritative R store — the filter
 * happens here, at read time, not by creating a second store.
 */
export function buildChokepointStructure() {
  registerChokepointEdges();
  const ownEdges = TYPED_EDGES.filter(e => e.source === SRC);
  const snapshot  = realiseSnapshot({ window: { start: 0, end: null }, edges: ownEdges });
  return buildStructure({ sigmaId: CHOKEPOINT_SIGMA_ID, snapshot, provenanceDAG: _chokepointDAG });
}

export function getChokepointProvenanceDAG() {
  return _chokepointDAG;
}
