// vendorportfolioview.js — Supplier Structural Intelligence, Sections 8/9/17
// (specs/SPEC-external-supplier-structural-intelligence.md).
//
// Supplier -> ρ join + bounded portfolio evaluation. Composes Ticket 2's resolution layer
// (vendorentityresolution.js) with the repaired, now-ρ-reaching EDGAR connector (Ticket 1,
// secownershipconnector.js's runTargetedOwnershipObservation) and canonical ρ's own query
// surface (findAdmittedRelationshipsFor). Does not duplicate any of their logic.
//
// Section 8's join: Contract / Award -> Vendor -> Canonical Entity -> ρ. A relationship is
// NEVER attached to a contractId unless the vendor on that contract actually resolved to a
// canonical entity first -- see the disposition gate in evaluateOneVendor below.

import { resolveVendor, DISPOSITION } from './vendorentityresolution.js';
import { runTargetedOwnershipObservation } from './connectors/secownershipconnector.js';
import { findAdmittedRelationshipsFor } from './canonicalrelationshipprojection.js';
import { nodeId, NODE_LABELS } from './entitytopologyregistry.js';

// Section 9 — bounded portfolio constraint. One live EDGAR full-text-search call per
// RESOLVED vendor that carries an EDGAR CIK, run SEQUENTIALLY (not Promise.all) so this
// proof never bursts more than one concurrent request at efts.sec.gov. 25 sequential calls
// is the documented ceiling for this first proof: large enough to exercise the portfolio
// path, small enough that even worst-case per-call latency keeps the whole batch well under
// a minute and nowhere near EDGAR's public rate limits. Raising this ceiling is a deliberate
// decision for a later ticket, never a silent default.
export const MAX_PORTFOLIO_SIZE = 25;

export async function evaluateVendorPortfolio(vendors, observationWindow) {
  if (!Array.isArray(vendors)) throw new Error('evaluateVendorPortfolio: vendors must be an array');
  if (vendors.length > MAX_PORTFOLIO_SIZE) {
    throw new Error(
      `evaluateVendorPortfolio: population of ${vendors.length} exceeds the bounded ceiling ` +
      `of ${MAX_PORTFOLIO_SIZE} (spec Section 9) -- split into smaller batches, this ceiling ` +
      `is not raised silently`
    );
  }

  const results = [];
  for (const vendor of vendors) {
    // Sequential by design -- see MAX_PORTFOLIO_SIZE comment above. A failure on one vendor
    // must never abort the batch for the rest (Section 9: failure/retry behavior documented,
    // every vendor gets a disposition).
    results.push(await evaluateOneVendor(vendor, observationWindow));
  }
  return results;
}

async function evaluateOneVendor(vendor, observationWindow) {
  const resolution = resolveVendor({
    vendorName:   vendor.vendorName,
    identifiers:  vendor.identifiers ?? {},
    source:       vendor.source ?? 'PROCUREMENT_RECORD',
    sourceRecord: vendor.contractId ?? null,
  });

  const record = {
    contractId:     vendor.contractId ?? null,
    customerId:     vendor.customerId ?? null,
    vendorRole:     vendor.vendorRole ?? null,
    contractStatus: vendor.contractStatus ?? null,
    resolution,
  };

  // Section 8: no join without a real resolution. MULTIPLE_MATCHES/NO_MATCH/UNRESOLVED never
  // reach the observation or relationship stage -- the contract record stays an unlinked fact,
  // never silently attached to a guessed entity.
  if (resolution.disposition !== DISPOSITION.RESOLVED) {
    return { ...record, observation: null, relationships: null };
  }

  const cik = resolution.resolvedIdentifiers?.edgar;
  if (!cik) {
    // Section 13's private-company boundary: resolved to a real canonical entity, but that
    // entity carries no EDGAR CIK, so the one live source wired in this proof cannot observe
    // it. This is an honest absence, not a failure -- NO_EVIDENCE, not an error.
    return {
      ...record,
      observation: { attempted: false, reason: 'resolved entity has no EDGAR CIK -- EDGAR source not applicable to this vendor' },
      relationships: 'NO_EVIDENCE',
    };
  }

  let obs;
  try {
    obs = await runTargetedOwnershipObservation({
      entityCik:   cik,
      canonicalId: resolution.resolvedCanonicalId,
      ...(observationWindow ?? {}),
    });
  } catch (err) {
    // Explicit, visible failure -- never a silently dropped vendor (Section 9 failure/retry
    // requirement). The caller sees exactly which vendor failed and why.
    return { ...record, observation: { attempted: true, error: err.message }, relationships: null };
  }

  if (obs.error) {
    return { ...record, observation: { attempted: true, sourceCallCount: 1, error: obs.error }, relationships: null };
  }

  const entityNodeId = nodeId(cik, undefined);
  const admitted = findAdmittedRelationshipsFor(entityNodeId);

  // Section 10: a structural-change state (NEW/PERSISTENT/RECONFIGURED/DISSOLVED/UNSUPPORTED)
  // is only known at the moment of an admission call -- it is a property of THIS CALL's
  // classifyChange() result (canonicalrelationship.js), never stored on the relationship
  // itself. obs.rhoAdmitted carries that real predicate for whatever this call just admitted;
  // a relationship admitted in an EARLIER call/session (found via findAdmittedRelationshipsFor
  // but absent from this call's rhoAdmitted) has no known state here -- left null rather than
  // fabricated, per Section 10's "only states the type has actually defined and the evidence
  // satisfies" rule.
  const stateById    = new Map(obs.rhoAdmitted.map(a => [a.relationship.id, a.predicate]));
  // Same honesty rule as structuralState above: full evidence provenance (accession, exact
  // filing date) only exists transiently on THIS call's admission result (canonicalrelationship.js's
  // admitRelationship() returns it in historyEntry but admitAndProject() does not persist it
  // anywhere queryable afterward -- a real, named limitation of the current ρ store, not
  // something this ticket's bounded scope extends to fix). A relationship found via
  // findAdmittedRelationshipsFor that this call did not freshly admit gets evidence: null,
  // never a fabricated one.
  const evidenceById = new Map(obs.rhoAdmitted.map(a => [a.relationship.id, a.historyEntry?.provenance ?? null]));

  return {
    ...record,
    observation: {
      attempted: true,
      sourceCallCount: 1, // documents Section 9's one-request-per-vendor accounting for this proof
      matched: obs.matched,
      total: obs.total,
      rhoAdmittedThisCall: obs.rhoAdmitted.length,
      error: null,
    },
    relationships: admitted.length === 0
      ? 'NO_EVIDENCE'
      : admitted.map(rho => ({
          id: rho.id,
          type: rho.type,
          phiClass: rho.phiClass,
          part: rho.part.map(id => NODE_LABELS[id] ?? id),
          evidence: evidenceById.get(rho.id) ?? null,
          structuralState: stateById.get(rho.id) ?? null,
        })),
  };
}
