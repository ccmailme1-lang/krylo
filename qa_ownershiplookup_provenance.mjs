// qa_ownershiplookup_provenance.mjs -- DEF-1396. The lookup store, the failure notice and the provenance line.
import { build } from 'esbuild';
import { pathToFileURL } from 'url';
import { join, resolve as presolve } from 'path';
import { markStarted, markSettled, getOutcome, _resetOwnershipLookupStore } from './src/engine/ownershiplookupstore.js';

const out = join(process.cwd(), 'node_modules', '.qa_ownershiplookup_provenance.mjs');
const keepEngineExternal = { name: 'engine-external', setup(b) {
  b.onResolve({ filter: /^\.{1,2}\/.*\.js$/ }, (a) => { const abs = presolve(a.resolveDir, a.path); return abs.includes('/src/') ? { path: pathToFileURL(abs).href, external: true } : null; });
} };
await build({ entryPoints: ['src/components/analysis/structuralbrief.jsx'], bundle: true, format: 'esm', platform: 'node', outfile: out, loader: { '.jsx': 'jsx' }, jsx: 'automatic', logLevel: 'silent', external: ['react', 'react-dom', 'react/jsx-runtime'], plugins: [keepEngineExternal] });
const { canonicalProvenanceLine, ownershipFailureNotice, computeBriefSummary } = await import(pathToFileURL(out).href);

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.log('  ✗ ' + l); } };

console.log('Store: a reader mounting after the event recovers the outcome');
_resetOwnershipLookupStore();
ok(getOutcome('avgo') === null, 'no record before any lookup');
markStarted('avgo', 1000);
ok(getOutcome('avgo').settledAt === null, 'a started lookup is pending');
markSettled('avgo', null, 5000);
ok(getOutcome('avgo').settledAt === 5000 && getOutcome('avgo').error === null, 'a reported success is recoverable afterward (late mount)');
markStarted('avgo', 9000);
ok(getOutcome('avgo').settledAt === null && getOutcome('avgo').error === null, 'a new run resets the earlier outcome to pending (no stale success presented as current)');
markSettled('avgo', 'EDGAR ownership search HTTP 503', 12000);
ok(getOutcome('avgo').error === 'EDGAR ownership search HTTP 503', 'a reported failure is recoverable with its text');
markSettled('cost', null, 1);
ok(getOutcome('cost') && getOutcome('cost').startedAt === 1, 'an outcome without a recorded start is still kept');

console.log('Failure notice separates the lookup from existing relationships');
const withRel = ownershipFailureNotice('the SEC ownership lookup did not respond', 2);
ok(/admitted in this page session/.test(withRel) && /no lookup that reported confirms them for this query/.test(withRel), 'with relationships: states page-session scope and that no reporting lookup confirms them');
ok(!/could not be checked this time/.test(withRel), 'with relationships: never says they could not be checked while listing them');
ok(/absence is not evidence that none exist/.test(withRel), 'with relationships: keeps the absence-is-not-evidence line');
ok(/Ownership observation failed \(x\)/.test(ownershipFailureNotice('x', 0)) && /could not be checked this time/.test(ownershipFailureNotice('x', 0)), 'with none admitted: the original wording is unchanged');
ok(/was admitted/.test(ownershipFailureNotice('x', 1)), 'singular grammar');

console.log('Provenance line');
ok(canonicalProvenanceLine({ provenance: { form: 'SCHEDULE 13G', filingDate: '2026-04-29', accession: '0002100119-26-000179' } }) === 'SCHEDULE 13G · filed 2026-04-29 · accession 0002100119-26-000179', 'form, filing date and accession are shown');
ok(canonicalProvenanceLine({ provenance: { accession: 'A-1' } }) === 'accession A-1', 'a missing field is omitted, not invented');
ok(canonicalProvenanceLine(null) === 'filing not recorded for this admission', 'no evidence is a stated absence');

console.log('Brief summary wording (shared with the MAP panel)');
const subjScope = { kind: 'ENTITY', canonicalId: 'avgo', entity: { name: 'Broadcom Inc.', identifiers: { edgar: '0001730168' } } };
const rels = [{ type: 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE', part: ['a', 'b'] }, { type: 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE', part: ['a', 'c'] }];
const r = computeBriefSummary({ subjScope, activeDomainPressures: [], fieldFormation: null, structuralQuery: null, entityCanonicalRelationships: rels, ownershipFailure: 'the SEC ownership lookup did not respond', ownershipPending: false });
const text = JSON.stringify(r);
ok(/admitted in this page session/.test(text) && !/could not be checked this time/.test(text), 'summary: relationships listed + failure never reads "could not be checked"');
const none = JSON.stringify(computeBriefSummary({ subjScope, activeDomainPressures: [], fieldFormation: null, structuralQuery: null, entityCanonicalRelationships: [], ownershipFailure: 'boom', ownershipPending: false }));
ok(/could not be checked this time/.test(none), 'summary: no relationships + failure keeps the original wording (DEF-1384 behavior)');
const pend = JSON.stringify(computeBriefSummary({ subjScope, activeDomainPressures: [], fieldFormation: null, structuralQuery: null, entityCanonicalRelationships: [], ownershipFailure: null, ownershipPending: true }));
ok(/Checking SEC ownership filings/.test(pend), 'summary: pending state unchanged (DEF-1392)');

console.log('Hook: a reader mounting after the event (server render = first render of a late mount)');
{
  const React = (await import('react')).default ?? (await import('react'));
  const { renderToString } = await import('react-dom/server');
  const { useOwnershipLookup } = await import('./src/components/analysis/useownershiplookup.js');
  const scope = { kind: 'ENTITY', canonicalId: 'avgo2', entity: { identifiers: { edgar: '0001730168' } } };
  const probe = () => { let r; const C = () => { r = useOwnershipLookup(scope, () => 0); return null; }; renderToString(React.createElement(C)); return r; };
  _resetOwnershipLookupStore();
  let h = probe();
  ok(h.pending === true && h.error === null, 'no record: pending (DEF-1392 state unchanged)');
  markStarted('avgo2', Date.now()); markSettled('avgo2', null);
  h = probe();
  ok(h.pending === false && h.error === null, 'event already fired before mount: settled success recovered on first render, no 45 s wait');
  markStarted('avgo2', Date.now());
  h = probe();
  ok(h.pending === true && h.error === null, 'a new run for the same subject is pending again, not the earlier success');
  markSettled('avgo2', 'EDGAR ownership search HTTP 503');
  h = probe();
  ok(h.pending === false && h.error === 'EDGAR ownership search HTTP 503', 'a recovered failure carries its own text, not the timeout text');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
