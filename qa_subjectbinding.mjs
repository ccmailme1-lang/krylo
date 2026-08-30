// qa_subjectbinding.mjs — WO-5B stage 5B-2 (KRYL-1234).
// Evidence binds by IDENTIFIER CONTAINMENT, never semantic similarity. The
// negative cases are the point. Run: node qa_subjectbinding.mjs

import { facetBelongsToSubject, bindFacetsToSubject, subjectAttribution } from './src/engine/subjectbinding.js';
import { makeSignalFacet } from './src/engine/signalfacet.js';
import { subjectScope } from './src/engine/subjectscope.js';
import { buildQueryContext } from './src/engine/querycontext.js';
import { getDomainEvidenceFacets, registerEvidenceFacetSource } from './src/engine/domainsignalresolution.js';
import { patentsViewEvidenceSource, setPatentsViewSignals } from './src/engine/facetproducers/patentsviewfacets.js';
import { A } from './src/engine/adsubject.js';

let pass = 0, fail = 0;
const ok = (l, c) => { if (c) { pass++; console.log(`  ✓ ${l}`); } else { fail++; console.log(`  ✗ ${l}`); } };

const anduril  = subjectScope('Is Anduril a good acquisition target?');     // no identifiers
const palantir = subjectScope('Is Palantir overvalued?');                   // edgar 0001321655
const decisionFrame = subjectScope(buildQueryContext('should we open a second facility or expand'));

const facet = (domain, subjectBlock, extra = {}) => makeSignalFacet({
  facet_id: `t:${domain}:${Math.random().toString(36).slice(2)}`,
  domain_id: domain, ontology: 'DOMAIN_EVIDENCE', producer_id: 'test',
  source_set_hash: `hash:${domain}:${JSON.stringify(subjectBlock)}`,
  provenance: { source: 'test-source', semantics: 'test', ...(subjectBlock ? { subject: subjectBlock } : {}), ...extra },
  signal_unit: { kind: 'evidence', scale: '0-100', level: 50 },
  repro: { config: {}, source_refs: [], producer_version: 't-1' },
});

// ── POSITIVE ────────────────────────────────────────────────────────────────
ok('Anduril facet (canonicalId) binds to Anduril',
   facetBelongsToSubject(facet('TECHNOLOGY', { canonicalId: 'anduril-industries' }), anduril).bound === true);
ok('Palantir facet (edgar identifier) binds to Palantir',
   facetBelongsToSubject(facet('CAPITAL', { identifier: { source: 'edgar', id: '0001321655' } }), palantir).bound === true);
ok('zero-padded vs unpadded edgar id both bind',
   facetBelongsToSubject(facet('CAPITAL', { identifier: { source: 'edgar', id: '1321655' } }), palantir).bound === true);

// ── NEGATIVE — the cases that matter ────────────────────────────────────────
{
  const r = facetBelongsToSubject(facet('TECHNOLOGY', { canonicalId: 'palantir-technologies' }), anduril);
  ok('Palantir evidence does NOT bind to Anduril (both defense/tech — similarity is irrelevant)',
     r.bound === false && /not "anduril-industries"/.test(r.reason));
}
{
  // a real field-level PatentsView facet whose provenance TEXT contains "ANDURIL"
  // (assignee list) but carries NO subject attribution block
  const pv = facet('TECHNOLOGY', null, { assignees: ['ANDURIL', 'LOCKHEED'], note: 'assignee activity' });
  const r = facetBelongsToSubject(pv, anduril);
  ok('field-level PatentsView facet does NOT become an Anduril observation because "ANDURIL" appears in the dataset',
     r.bound === false && /no subject attribution|field-level/.test(r.reason));
}
{
  const r = facetBelongsToSubject(facet('CAPITAL', { identifier: { source: 'edgar', id: '0001321655' } }), anduril);
  ok('an identifier that resolves to a DIFFERENT entity does NOT bind',
     r.bound === false && /resolves to "palantir-technologies"/.test(r.reason));
}
{
  const r = facetBelongsToSubject(facet('CAPITAL', { identifier: { source: 'edgar', id: '9999999999' } }), palantir);
  ok('an unresolvable identifier does NOT become a subject observation',
     r.bound === false && /did not resolve/.test(r.reason));
}
ok('a name-string attribution ("Anduril") does NOT bind (not the contract shape)',
   facetBelongsToSubject({ provenance: { subject: 'Anduril' }, domain_id: 'TECHNOLOGY' }, anduril).bound === false);
ok('a facet with no provenance.subject does NOT bind',
   facetBelongsToSubject(facet('MEDIA', null), anduril).bound === false);
ok('non-ENTITY scope (decision frame) → nothing binds',
   facetBelongsToSubject(facet('TECHNOLOGY', { canonicalId: 'anduril-industries' }), decisionFrame).bound === false);

// ── containment preserves lineage ──────────────────────────────────────────
{
  const f = facet('TECHNOLOGY', { canonicalId: 'anduril-industries' });
  const [bound] = bindFacetsToSubject([f], anduril);
  ok('bound facet keeps its own source_set_hash + lineage_id untouched',
     bound.source_set_hash === f.source_set_hash && bound.lineage_id === f.lineage_id && bound.boundVia === 'canonicalId');
}

// ── getDomainEvidenceFacets + A(d, Subject) end to end ─────────────────────
setPatentsViewSignals([
  { id: 'a1', source: 'PATENTSVIEW', domain: 'TECHNOLOGY', signal: 'ASSIGNEE_ACCELERATION:AI:ANDURIL', confidence: 64, ts: Date.now() },
]);
registerEvidenceFacetSource(patentsViewEvidenceSource);
ok('getDomainEvidenceFacets(TECHNOLOGY, {subject: AndurilScope}) → [] (PatentsView facet carries no subject attribution)',
   getDomainEvidenceFacets('TECHNOLOGY', { subject: anduril }).length === 0);
ok('getDomainEvidenceFacets(TECHNOLOGY) field scope → the PatentsView facet is still there',
   getDomainEvidenceFacets('TECHNOLOGY').length === 1);
ok('getDomainEvidenceFacets(TECHNOLOGY, {subject: decisionFrame}) → [] (non-entity)',
   getDomainEvidenceFacets('TECHNOLOGY', { subject: decisionFrame }).length === 0);
ok('A(TECHNOLOGY, Anduril).observations === [] despite "ANDURIL" in the live PatentsView dataset',
   A('TECHNOLOGY', anduril).observations.length === 0);
setPatentsViewSignals([]);

// ── helper ─────────────────────────────────────────────────────────────────
ok('subjectAttribution({canonicalId}) → {canonicalId}', JSON.stringify(subjectAttribution({ canonicalId: 'x' })) === '{"canonicalId":"x"}');
ok('subjectAttribution({identifier}) stringifies id', subjectAttribution({ identifier: { source: 'edgar', id: 123 } }).identifier.id === '123');
ok('subjectAttribution({}) → null', subjectAttribution({}) === null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
