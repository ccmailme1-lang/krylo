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

import { registerTypedEdge } from './entitytopologyregistry.js';

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
