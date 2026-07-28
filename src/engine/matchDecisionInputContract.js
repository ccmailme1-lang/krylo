// src/engine/matchDecisionInputContract.js — query domain → Decision Input Contract, or null.
//
// Deliberately reuses the EXISTING domain classification (detectDomain()'s vector.primary,
// already computed once per query inside synthesizeQuery()) rather than re-parsing query text
// with a second, independent keyword matcher. Two independently-computed classifications of the
// same query is exactly the bug class this session fixed twice already (KRYL-DEFECT-0001) —
// not repeating that pattern here.

import homePurchaseDIC from '../intake/contracts/homePurchaseDIC.js';

const DIC_BY_DOMAIN = {
  REAL_ESTATE: homePurchaseDIC,
};

/**
 * resolveDecisionInputContract — real domain (already classified) → its DIC, or null if this
 * domain doesn't have one yet (Career/Retirement DICs are deferred, not built in this WO).
 * @param {string} domainPrimary — vector.primary from the domain classification already run
 *   this query inside synthesizeQuery(). Not a second classification pass.
 */
export function resolveDecisionInputContract(domainPrimary) {
  return DIC_BY_DOMAIN[domainPrimary] ?? null;
}
