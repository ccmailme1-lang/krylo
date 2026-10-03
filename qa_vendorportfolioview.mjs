// qa_vendorportfolioview.mjs — Supplier Structural Intelligence Section 17 exit-criterion proof.
// Live run against a real, bounded vendor population: real vendor -> entity resolution ->
// live EDGAR observation -> canonical ρ -> supplier join -> portfolio retrieval.
//
// Requires as-diff/engine.js running on :4000 (for the /api/edgar proxy).
// Run: node qa_vendorportfolioview.mjs

const realFetch = globalThis.fetch;
globalThis.fetch = (url, opts) => {
  const abs = typeof url === 'string' && url.startsWith('/') ? `http://localhost:4000${url}` : url;
  return realFetch(abs, opts);
};

const { evaluateVendorPortfolio, MAX_PORTFOLIO_SIZE } = await import('./src/engine/vendorportfolioview.js');
const { DISPOSITION } = await import('./src/engine/vendorentityresolution.js');

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };

// A real, bounded, 5-vendor population (well under the 25-vendor ceiling), chosen to exercise
// every disposition honestly:
//  - Lockheed Martin / Boeing: real registry entities, real EDGAR CIKs, real defense primes --
//    the actual persona this spec targets. Expected to carry no fresh 13D/13G activity in a
//    30-day window (large, stable primes rarely draw activist/beneficial-ownership filings) --
//    that is a real NO_EVIDENCE, not a stub.
//  - Aterian, Inc.: NOT a defense prime -- included as a known-positive control, carrying a
//    real, independently-confirmed Schedule 13D filed 2026-10-02 (same filing Ticket 1's QA
//    verified), so this run proves the full live path produces at least one real relationship,
//    not just NO_EVIDENCE everywhere.
//  - "Quonset Point Regional Supply Co": a plausible-looking small-vendor name with no real
//    registry entry -- proves NO_MATCH.
//  - missing vendor name: proves UNRESOLVED.
const vendors = [
  { contractId: 'VA-2026-00142', vendorRole: 'prime', contractStatus: 'active', vendorName: 'Lockheed Martin' },
  { contractId: 'VA-2026-00178', vendorRole: 'prime', contractStatus: 'active', vendorName: 'Boeing' },
  { contractId: 'VA-2026-00201', vendorRole: 'subcontractor', contractStatus: 'active', vendorName: 'Aterian, Inc.', identifiers: { edgar: '0001757715' } },
  { contractId: 'VA-2026-00233', vendorRole: 'subcontractor', contractStatus: 'active', vendorName: 'Quonset Point Regional Supply Co' },
  { contractId: 'VA-2026-00250', vendorRole: 'subcontractor', contractStatus: 'pending', vendorName: '' },
];

console.log(`Bounded ceiling: ${MAX_PORTFOLIO_SIZE}; this run: ${vendors.length} vendors.\n`);

const results = await evaluateVendorPortfolio(vendors, { from: '2026-09-25', to: '2026-10-03' });

ok('portfolio returns one record per vendor', results.length === vendors.length);

const lockheed = results[0], boeing = results[1], aterian = results[2], unknown = results[3], missing = results[4];

console.log('\nLockheed Martin (real defense prime, real CIK):');
ok('disposition RESOLVED', lockheed.resolution.disposition === DISPOSITION.RESOLVED);
ok('contractId preserved on the join', lockheed.contractId === 'VA-2026-00142');
ok('live observation attempted', lockheed.observation?.attempted === true);
ok('relationships is NO_EVIDENCE or a real array (never fabricated)', lockheed.relationships === 'NO_EVIDENCE' || Array.isArray(lockheed.relationships));
console.log('    relationships:', JSON.stringify(lockheed.relationships));

console.log('\nBoeing (real defense prime, real CIK):');
ok('disposition RESOLVED', boeing.resolution.disposition === DISPOSITION.RESOLVED);
ok('live observation attempted', boeing.observation?.attempted === true);

console.log('\nAterian, Inc. (known-positive control -- real Schedule 13D in window):');
ok('disposition RESOLVED (via real EDGAR CIK identifier)', aterian.resolution.disposition === DISPOSITION.RESOLVED);
ok('live observation attempted', aterian.observation?.attempted === true);
ok('at least one real relationship admitted into canonical ρ', Array.isArray(aterian.relationships) && aterian.relationships.length > 0);
if (Array.isArray(aterian.relationships)) {
  console.log('    EXIT CRITERION: real vendor -> entity resolution -> live EDGAR observation -> canonical ρ -> supplier join -> portfolio retrieval:');
  console.log('    contractId:', aterian.contractId, '-> vendor:', aterian.resolution.observedName, '-> canonical entity:', aterian.resolution.resolvedCanonicalId);
  console.log('    -> relationship:', aterian.relationships[0].type, 'between', aterian.relationships[0].part.join(' <-> '));
}

console.log('\nUnknown small vendor (no registry entry):');
ok('disposition NO_MATCH', unknown.resolution.disposition === DISPOSITION.NO_MATCH);
ok('no observation attempted (no resolved entity to observe)', unknown.observation === null);
ok('relationships null, not fabricated', unknown.relationships === null);

console.log('\nMissing vendor name:');
ok('disposition UNRESOLVED', missing.resolution.disposition === DISPOSITION.UNRESOLVED);
ok('no observation attempted', missing.observation === null);

console.log('\nBounded-ceiling enforcement:');
{
  const tooMany = Array.from({ length: MAX_PORTFOLIO_SIZE + 1 }, (_, i) => ({ vendorName: `Vendor ${i}` }));
  try {
    await evaluateVendorPortfolio(tooMany);
    ok('throws when population exceeds the bounded ceiling', false);
  } catch (err) {
    ok('throws when population exceeds the bounded ceiling', /exceeds the bounded ceiling/.test(err.message));
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
