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
    registerTypedEdge({ from, to, type, source: SRC, fromLabel: from, toLabel: to });
  }
  return EDGES.length;
}
