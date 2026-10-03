// qa_vendorentityresolution.mjs — Supplier Structural Intelligence Section 4 live verification.
// Run: node qa_vendorentityresolution.mjs

import { resolveVendor, resolveVendorBatch, DISPOSITION } from './src/engine/vendorentityresolution.js';
import { createEntity } from './src/engine/entityresolution.js';

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };

console.log('RESOLVED — real registry entity, exact name:');
{
  const r = resolveVendor({ vendorName: 'Lockheed Martin', source: 'TEST', sourceRecord: 'contract-123' });
  ok('disposition RESOLVED', r.disposition === DISPOSITION.RESOLVED);
  ok('resolvedCanonicalId = lockheed-martin', r.resolvedCanonicalId === 'lockheed-martin');
  ok('resolutionMethod recorded', typeof r.resolutionMethod === 'string');
  ok('provenance: source present', r.source === 'TEST');
  ok('provenance: sourceRecord present', r.sourceRecord === 'contract-123');
  ok('provenance: observedName present', r.observedName === 'Lockheed Martin');
  ok('provenance: observationTimestamp present', typeof r.observationTimestamp === 'string');
}

console.log('RESOLVED — real registry entity, via known alias:');
{
  const r = resolveVendor({ vendorName: 'RTX' }); // Raytheon Technologies alias
  ok('disposition RESOLVED', r.disposition === DISPOSITION.RESOLVED);
  ok('resolvedCanonicalId = raytheon-technologies', r.resolvedCanonicalId === 'raytheon-technologies');
}

console.log('RESOLVED — real registry entity, via real EDGAR CIK identifier:');
{
  const r = resolveVendor({ vendorName: 'whatever string appears on the award record', identifiers: { edgar: '0000936468' } });
  ok('disposition RESOLVED', r.disposition === DISPOSITION.RESOLVED);
  ok('resolvedCanonicalId = lockheed-martin (via CIK, not name)', r.resolvedCanonicalId === 'lockheed-martin');
  ok('resolutionMethod = identifier:edgar', r.resolutionMethod === 'identifier:edgar');
}

console.log('NO_MATCH — real string, no plausible registry entity:');
{
  const r = resolveVendor({ vendorName: 'Xyzzy Quantum Noodle Supply Co' });
  ok('disposition NO_MATCH', r.disposition === DISPOSITION.NO_MATCH);
  ok('resolvedCanonicalId null', r.resolvedCanonicalId === null);
}

console.log('UNRESOLVED — missing/empty vendor name:');
{
  const r1 = resolveVendor({ vendorName: '' });
  const r2 = resolveVendor({ vendorName: null });
  const r3 = resolveVendor({});
  ok('empty string -> UNRESOLVED', r1.disposition === DISPOSITION.UNRESOLVED);
  ok('null -> UNRESOLVED', r2.disposition === DISPOSITION.UNRESOLVED);
  ok('missing field -> UNRESOLVED', r3.disposition === DISPOSITION.UNRESOLVED);
}

console.log('MULTIPLE_MATCHES — real ambiguity, proven by forcing two real runtime entities within the disambiguation margin:');
{
  // Two genuinely distinct runtime-admitted entities (different canonicalIds, no creation
  // collision) each carrying an alias that normalizes to the identical "ATLAS DEFENSE" --
  // a query for that string cannot honestly pick a winner between them.
  createEntity({ canonicalName: 'Atlas Defense Western Corp', aliases: ['Atlas Defense Group'], domainTags: ['TECHNOLOGY'] });
  createEntity({ canonicalName: 'Atlas Defense Eastern Corp', aliases: ['Atlas Defense Holdings'], domainTags: ['CAPITAL'] });

  const r = resolveVendor({ vendorName: 'Atlas Defense' });
  ok('disposition MULTIPLE_MATCHES', r.disposition === DISPOSITION.MULTIPLE_MATCHES);
  ok('resolvedCanonicalId null (no silent substitution)', r.resolvedCanonicalId === null);
  ok('candidates array has 2 entries', Array.isArray(r.candidates) && r.candidates.length === 2);
  if (r.candidates) console.log('    candidates:', r.candidates.map(c => `${c.canonicalName} (${c.confidence.toFixed(2)})`).join(', '));
}

console.log('Batch — real portfolio-style list, mixed dispositions:');
{
  const results = resolveVendorBatch([
    { vendorName: 'Boeing' },
    { vendorName: 'Northrop Grumman' },
    { vendorName: 'Totally Unknown Vendor LLC' },
    { vendorName: '' },
  ]);
  ok('batch returns 4 records', results.length === 4);
  ok('record 1 RESOLVED (Boeing)', results[0].disposition === DISPOSITION.RESOLVED);
  ok('record 2 RESOLVED (Northrop Grumman)', results[1].disposition === DISPOSITION.RESOLVED);
  ok('record 3 NO_MATCH', results[2].disposition === DISPOSITION.NO_MATCH);
  ok('record 4 UNRESOLVED', results[3].disposition === DISPOSITION.UNRESOLVED);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
