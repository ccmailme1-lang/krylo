// domainsignalresolution.js — WO-1A (KRYL-1230).
//
// The ordinary source → facet → provenance → normalized-signal path for the 12
// authored Class-E measures. ONE seam: resolveClassEMeasure(). Wired producers
// plug into WIRED_PRODUCERS — WO-1B/C/D (shared-source connectors) and WO-5B
// (subject binding, which supplies the `subject` scope every measure needs).
//
// Today no producer is wired, so every measure resolves to a DERIVED structural
// absence that names the exact missing source class and the required scope —
// the honest-absence experience becomes specific instead of a static label
// (impl-plan §0 / CLAUDE.md §20).
//
// Invariants (fail-closed):
//   - never fabricate, estimate, zero-fill, or interpolate a value;
//   - a producer's facet is REJECTED unless facet.domain_id === the asked domain
//     (no cross-domain substitution — §17 / integration-contract);
//   - the facet must be a real signalfacet.js SignalFacet (provenance +
//     source_set_hash + repro), or it does not count as resolved.

import { domainIntelligence } from './domainintelligence.js';
import { makeSignalFacet } from './signalfacet.js';

export const RESOLUTION_VERSION = 'wo-1a';

// measureKey -> producer({ domain, measureKey, def, scope, subject? }) =>
//   { facet }  — a makeSignalFacet result; facet.domain_id MUST === domain
//   { absent: { reason } }
//   null       — nothing to say -> falls through to derived absence
// WO-1B/C/D/WO-5B populate this; empty at WO-1A.
export const WIRED_PRODUCERS = Object.freeze({});

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// WO-1A signal-unit convention for a Class-E measure: a single authored-scale
// value. Producers build their facet's signal_unit with this so the resolution
// layer has one shape to read (asdiff units are also accepted — see readFacet).
export function classEValueUnit(value) {
  return { kind: 'class-e-measure', scale: '0-100', value };
}

function numericFromUnit(u) {
  if (u == null) return null;
  if (typeof u.value === 'number') return u.value;
  if (typeof u.signal === 'number') return u.signal;      // asdiff SignalUnit
  if (typeof u.intensity === 'number') return u.intensity;
  return null;
}

function readFacet(facet, domain, measureKey, requiredSourceClass, requiredScope) {
  const absent = (reason, extra = {}) => ({
    status: 'STRUCTURAL_ABSENCE', absenceClass: 'structural', reason,
    requiredSourceClass, requiredScope, ...extra,
  });
  if (!facet || facet.domain_id !== domain)
    return absent(`producer for ${measureKey} did not return a ${domain} facet`, { crossDomainRejected: true });
  if (!facet.source_set_hash || !facet.provenance)
    return absent(`${measureKey} facet is missing provenance / source_set_hash`);
  const raw = numericFromUnit(facet.signal_unit);
  if (typeof raw !== 'number' || Number.isNaN(raw))
    return absent(`${measureKey} facet carried no numeric signal`);
  return {
    status: 'FACET',
    value: clamp(Math.round(raw), 0, 100),
    provenance: facet.provenance,
    source_set_hash: facet.source_set_hash,
    repro: facet.repro ?? null,
    facet_id: facet.facet_id,
    requiredSourceClass,
    requiredScope,
  };
}

// Resolve one authored Class-E measure at the given scope ('field' | 'subject').
// `producers` defaults to WIRED_PRODUCERS; override is a test/unit-of-work seam
// for WO-1B/C/D (each wires its own producer and can resolve against it in
// isolation before touching the shared map).
export function resolveClassEMeasure({ domain, measureKey, scope = 'field', subject = null, producers = WIRED_PRODUCERS }) {
  const D = String(domain ?? '').toUpperCase();
  const def = domainIntelligence(D)?.signalDefs?.[measureKey];
  if (!def || def.maturity !== 'AUTHORED')
    return { status: 'NOT_AUTHORED', reason: `${D}.${measureKey} is not an authored measure` };

  const requiredSourceClass = def.sourceClass ?? null;
  const requiredScope = def.scope ?? 'subject';

  const producer = producers?.[measureKey];
  if (typeof producer === 'function') {
    let out = null;
    try { out = producer({ domain: D, measureKey, def, scope, subject }); } catch { out = null; }
    if (out && out.facet)  return readFacet(out.facet, D, measureKey, requiredSourceClass, requiredScope);
    if (out && out.absent) return {
      status: 'STRUCTURAL_ABSENCE', absenceClass: 'structural',
      reason: out.absent.reason ?? 'wired producer withheld', requiredSourceClass, requiredScope,
    };
    // null -> derived absence below
  }

  const scopeGap = requiredScope === 'subject' && scope !== 'subject';
  return {
    status: 'STRUCTURAL_ABSENCE',
    absenceClass: 'structural',
    reason: scopeGap
      ? `subject-scoped measure; no subject bound (WO-5B) and no wired source`
      : `no wired source`,
    requiredSourceClass,
    requiredScope,
  };
}

// All authored measures for a domain, resolved — [ [measureKey, result], ... ].
export function resolveDomainMeasures(domain, scope = 'field', subject = null) {
  const di = domainIntelligence(domain);
  return Object.entries(di?.signalDefs ?? {})
    .filter(([, d]) => d?.maturity === 'AUTHORED')
    .map(([measureKey]) => [measureKey, resolveClassEMeasure({ domain, measureKey, scope, subject })]);
}

// Kept for symmetry with facetproducers.js — a producer helper that builds a
// contract-compliant Class-E facet. WO-1B/C/D use this.
export function makeClassEFacet({ domain, measureKey, value, provenance, source_set_hash, repro, ts = Date.now() }) {
  return makeSignalFacet({
    facet_id: `classe:${domain}:${measureKey}:${ts}`,
    domain_id: domain,
    ontology: 'CLASS_E_MEASURE',
    producer_id: provenance?.producer ?? 'class-e',
    source_set_hash,
    lineage_id: `classe:${domain}:${measureKey}`,
    timestamp: ts,
    provenance,
    signal_unit: classEValueUnit(value),
    repro,
  });
}
