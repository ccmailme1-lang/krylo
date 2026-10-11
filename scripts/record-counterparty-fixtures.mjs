// Records the SEC search responses the counterparty matching service asks for (live engine on :4000) as tests/fixtures/sec/cp-search-responses.json.
import fs from 'fs';
import { matchCounterparty, _clearCounterpartyCache } from '../src/engine/counterpartymatch.js';
const rec = {};
const searchFn = async (p) => {
  const key = `${p.forms}|${p.entityName}`;
  const r = await fetch('http://localhost:4000/api/edgar?' + new URLSearchParams({ forms: p.forms, dateRange: 'custom', startdt: p.startdt, enddt: p.enddt, hits: p.hits, entityName: p.entityName ?? '' }));
  let hits = []; const ok = r.ok;
  if (ok) { const j = await r.json().catch(() => null); hits = (j?.hits?.hits ?? []).map(h => ({ _id: h._id, _source: { adsh: h._source?.adsh, form: h._source?.form, file_date: h._source?.file_date, ciks: h._source?.ciks, display_names: h._source?.display_names } })); }
  rec[key] = { ok, hits }; return { ok, status: r.status, hits };
};
const cases = [
  ['NVIDIA Corporation', 'Intel Corporation', ''], ['Berkshire Hathaway Inc.', 'Alphabet Inc.', 'with an affiliate of Berkshire Hathaway Inc. ("Berkshire Hathaway") for the sale of'],
  ['Citibank, N.A.', 'The Boeing Company', ''], ['BofA Securities, Inc.', 'Oracle Corporation', ''], ['Bank of America, N.A.', 'Sysco Corporation', 'with Bank of America, N.A., as the administrative agent'],
  ['J.P. Morgan Securities LLC', 'Oracle Corporation', ''], ['Goldman Sachs & Co. LLC', 'Alphabet Inc.', ''], ['Wells Fargo Bank, National Association', 'Tesla, Inc.', ''],
  ['CoBank, ACB', 'Sysco Corporation', ''], ['U.S. Bank National Association', 'Verizon', ''], ['The Bank of New York Mellon Trust Company, N.A.', 'Sysco Corporation', ''],
  ['SK Battery America, Inc.', 'Ford Motor Company', 'and SK Battery America, Inc. ("SKBA," a wholly owned subsidiary of SK On) to build and operate an EV battery plant'],
  ['Morgan Stanley & Co. LLC', 'Alphabet Inc.', ''], ['SK On Co., Ltd.', 'Ford Motor Company', ''],
];
for (const [name, reg, passage] of cases) {
  _clearCounterpartyCache();
  const r = await matchCounterparty({ name, registrant: reg, passage, searchFn, sleep: (ms) => new Promise(r => setTimeout(r, 1600)), gapMs: 1600 });
  console.log(name.padEnd(48), r.outcome.padEnd(22), r.identifier?.value ?? '', r.canonicalName ?? '', r.reason ? '| ' + r.reason.slice(0, 70) : '');
  await new Promise(r => setTimeout(r, 1600));
}
fs.writeFileSync('tests/fixtures/sec/cp-search-responses.json', JSON.stringify({ capturedAt: new Date().toISOString(), responses: rec }));
