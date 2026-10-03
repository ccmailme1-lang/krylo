// qa_secownershipconnector_formfix.mjs — live verification that secownershipconnector.js's
// corrected EDGAR root-form code ('SCHEDULE 13D,SCHEDULE 13G', was 'SC 13D,SC 13G') actually
// admits a real HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE relationship against the real EDGAR data,
// through the local /api/edgar proxy (as-diff/engine.js, must be running on :4000).
//
// Run: node qa_secownershipconnector_formfix.mjs

const realFetch = globalThis.fetch;
globalThis.fetch = (url, opts) => {
  const abs = typeof url === 'string' && url.startsWith('/') ? `http://localhost:4000${url}` : url;
  return realFetch(abs, opts);
};

const { runTargetedOwnershipObservation } = await import('./src/engine/connectors/secownershipconnector.js');
const { findAdmittedRelationshipsBetween } = await import('./src/engine/canonicalrelationshipprojection.js');

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };

// CIK 0001757715 = Aterian, Inc. -- confirmed real SCHEDULE 13D filing on 2026-10-02 via direct
// EDGAR query during this session (not guessed).
console.log('Aterian, Inc. (CIK 0001757715) -- real recent SCHEDULE 13D filing:');
{
  const result = await runTargetedOwnershipObservation({
    entityCik: '0001757715',
    canonicalId: 'test:aterian',
    from: '2026-09-25',
    to: '2026-10-03',
  });
  ok('no error', !result.error);
  ok('matched at least one real filing', result.matched > 0);
  ok('at least one EAG admission (admitAndDispatch)', result.admitted.length > 0);
  // The requirement that actually matters for Supplier Structural Intelligence: does this
  // reach canonical ρ (admitAndProject), not just the older EAG signal-dispatch path.
  ok('at least one canonical ρ admission (admitAndProject)', result.rhoAdmitted.length > 0);
  if (result.rhoAdmitted[0]) {
    const rel = result.rhoAdmitted[0].relationship;
    console.log('    rho relationship type:', rel.type, '| predicate:', result.rhoAdmitted[0].predicate);
    // Independently verify via the real query path a portfolio join will actually use --
    // not just trusting the admission call's own return value.
    const found = findAdmittedRelationshipsBetween(rel.part[0], rel.part[1]);
    ok('independently queryable via findAdmittedRelationshipsBetween', found.length > 0);
  }
  if (result.error) console.log('    error:', result.error);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
