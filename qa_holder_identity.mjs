// qa_holder_identity.mjs -- a beneficial-ownership holder that the filing index does not identify (no CIK, or an all-zero CIK) is not admitted as an identified party; a valid CIK is.
import { admitAndProject, _clearAdmittedForTests } from './src/engine/canonicalrelationshipprojection.js';
import { describeChange } from './src/engine/relationshipchangetext.js';
let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.log('  ✗ ' + l); } };
const mk = (filer) => ({ assertion: { part: ['CIK:0000104169', filer], type: 'HAS_BENEFICIAL_OWNERSHIP_DISCLOSURE', nuId: {}, nuState: {}, evidence: { ts: Date.parse('2024-02-09'), provenance: { accession: '0000104169-24-000007', source: 'SEC_13D_13G_HISTORY', filingDate: '2024-02-09', form: 'SC 13G/A' } } }, meta: { subjectCik: '0000104169', subjectName: 'Walmart Inc.', filerCik: '', filerName: null, source: 'SEC_13D_13G_HISTORY' } });
_clearAdmittedForTests();
console.log('Holder identity at admission');
{
  const zero = mk('CIK:0000000000'); const rz = admitAndProject(zero.assertion, zero.meta);
  ok(rz.admitted === false && /not identified/.test(String(rz.rejection?.reason ?? rz.reason ?? JSON.stringify(rz))), 'an all-zero holder CIK is rejected, with the reason stated');
  const miss = mk(undefined); const rm = admitAndProject(miss.assertion, miss.meta);
  ok(rm.admitted === false, 'a missing holder is rejected');
  const good = mk('CIK:0000102909'); const rg = admitAndProject(good.assertion, good.meta);
  ok(rg.admitted === true, 'a holder with a valid nonzero CIK is admitted');
  const named = mk('VANGUARD GROUP INC'); const rn = admitAndProject(named.assertion, named.meta);
  ok(rn.admitted === true, 'a named holder with no CIK node (the connector\'s name fallback) is unchanged');
}
console.log('Display');
{
  const r = { summary: 'INDETERMINATE', holderName: null, cusip: null, existence: { state: 'INDETERMINATE' }, magnitude: { state: 'NOT_ASSESSED' }, configuration: { state: 'NOT_ASSESSED' }, periods: { E0: '2025-10-15' }, evidence: { asOfE0: null, inP1: [] }, rules: [] };
  let h; try { h = describeChange(r).headline; } catch (e) { h = String(e); }
  ok(/^Holder not identified in the filing index/.test(h), 'an unnamed holder reads "Holder not identified in the filing index"');
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
