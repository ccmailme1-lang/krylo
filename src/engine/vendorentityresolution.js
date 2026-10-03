// vendorentityresolution.js — Supplier Structural Intelligence, Section 4
// (specs/SPEC-external-supplier-structural-intelligence.md).
//
// Objective: Procurement Vendor -> Canonical Entity, with an explicit disposition and full
// provenance on every resolution. Built on top of entityresolution.js's existing identity
// substrate (resolveByIdentifier, resolveCandidates) rather than duplicating its matching
// logic -- this layer adds disposition classification and provenance, nothing else.
//
// "A vendor must not enter canonical relationship evaluation merely because its name
// resembles a public company" (spec Section 4) is enforced by the disambiguation margin
// below: resolve()'s existing single-best-wins behavior is exactly the silent substitution
// this spec prohibits, so this layer never calls resolve() directly -- only resolveCandidates(),
// so ambiguity is visible instead of silently resolved to a winner.

import { resolveByIdentifier, resolveCandidates, createEntity } from './entityresolution.js';

export const DISPOSITION = {
  RESOLVED:          'RESOLVED',
  MULTIPLE_MATCHES:  'MULTIPLE_MATCHES',
  NO_MATCH:          'NO_MATCH',
  UNRESOLVED:        'UNRESOLVED',
};

// Margin required between the best and second-best fuzzy candidate for a name match to
// count as RESOLVED rather than MULTIPLE_MATCHES. Not borrowed from anywhere -- this is a
// new rule this layer owns, because entityresolution.js's resolve() has no disambiguation
// concept at all (it always returns exactly one best-or-null result).
const DISAMBIGUATION_MARGIN = 0.05;

// Identifier sources resolvable against the CURRENT registry schema (identifiers: {edgar,
// fec, uei} -- see src/data/entityregistry.json). CAGE/EIN/DUNS are spec-preferred fields
// (Section 3) the registry does not yet carry; they are retained in provenance below but
// cannot be matched -- an honest limitation, not a silent no-op.
const RESOLVABLE_IDENTIFIER_SOURCES = ['edgar', 'uei', 'ticker'];

/**
 * resolveVendor({vendorName, identifiers, source, sourceRecord}) -> resolution record
 *
 * Required provenance (spec Section 4), always present:
 *   source, sourceRecord, observedName, resolvedCanonicalId (RESOLVED only),
 *   resolutionMethod, observationTimestamp, disposition
 */
export function resolveVendor({ vendorName, identifiers = {}, source = null, sourceRecord = null } = {}) {
  const observationTimestamp = new Date().toISOString();
  const base = {
    source,
    sourceRecord,
    observedName: vendorName ?? null,
    observationTimestamp,
  };

  if (!vendorName || typeof vendorName !== 'string' || !vendorName.trim()) {
    return {
      ...base,
      disposition: DISPOSITION.UNRESOLVED,
      resolvedCanonicalId: null,
      resolutionMethod: null,
      reason: 'no vendor name supplied',
    };
  }

  // Identifier-first -- authoritative, exact. A real identifier match is never ambiguous.
  for (const idSource of RESOLVABLE_IDENTIFIER_SOURCES) {
    const id = identifiers[idSource];
    if (!id) continue;
    let hit = resolveByIdentifier(idSource, id);
    let resolutionMethod = `identifier:${idSource}`;

    // A real, externally-verified identifier supplied directly on the vendor/award record
    // (not inferred, not fuzzy-matched) is the same evidentiary standard
    // secownershipconnector.js's admitIfUnknown() already treats as authoritative identity
    // substrate ("CIK-first lookup before creation makes admission idempotent" -- KRYL-1201).
    // If no canonical entity exists yet for this identifier, admit one now via the same
    // idempotent createEntity() path, rather than returning a false NO_MATCH for an identity
    // that is, in fact, real and verified -- just not yet in the runtime population.
    if (!hit) {
      const created = createEntity({
        canonicalName:    vendorName,
        identifiers:      { [idSource]: id },
        admissionSource:  source ?? 'PROCUREMENT_RECORD',
        admissionEvidence: sourceRecord ?? null,
      });
      if (created) { hit = created; resolutionMethod = `identifier:${idSource}:admitted`; }
    }

    if (hit) {
      return {
        ...base,
        disposition: DISPOSITION.RESOLVED,
        resolvedCanonicalId: hit.canonicalId,
        resolvedIdentifiers: hit.identifiers ?? {},
        resolutionMethod,
        reason: null,
      };
    }
  }

  // Name-based fallback -- the FULL candidate set, so ambiguity surfaces instead of being
  // silently resolved to a single winner.
  const candidates = resolveCandidates(vendorName);

  if (candidates.length === 0) {
    return {
      ...base,
      disposition: DISPOSITION.NO_MATCH,
      resolvedCanonicalId: null,
      resolutionMethod: 'name',
      reason: 'no candidate cleared the match threshold',
    };
  }

  const clearWinner = candidates.length === 1
    || (candidates[0].confidence - candidates[1].confidence) >= DISAMBIGUATION_MARGIN;

  if (clearWinner) {
    const top = candidates[0];
    return {
      ...base,
      disposition: DISPOSITION.RESOLVED,
      resolvedCanonicalId: top.entity.canonicalId,
      resolvedIdentifiers: top.entity.identifiers ?? {},
      resolutionMethod: top.confidence === 1.0 ? 'name:exact' : 'name:fuzzy',
      reason: null,
    };
  }

  return {
    ...base,
    disposition: DISPOSITION.MULTIPLE_MATCHES,
    resolvedCanonicalId: null,
    resolutionMethod: 'name',
    reason: `${candidates.length} candidates within ${DISAMBIGUATION_MARGIN} confidence of each other`,
    candidates: candidates.map(c => ({
      canonicalId:   c.entity.canonicalId,
      canonicalName: c.entity.canonicalName,
      confidence:    c.confidence,
    })),
  };
}

/**
 * resolveVendorBatch(vendors) -> resolution record[]
 * Section 9's portfolio requirement: a real vendor list evaluated in batch, each vendor
 * receiving its own evidence-backed disposition. No relationship/admission logic here --
 * that is a downstream concern (Section 6/8), never this layer's responsibility.
 */
export function resolveVendorBatch(vendors = []) {
  return vendors.map(v => resolveVendor(v));
}
