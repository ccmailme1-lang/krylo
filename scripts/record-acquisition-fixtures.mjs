// KRYL-1409: records the SEC search responses the counterparty matching asks for when matching the OTHER principal of an acquisition (live engine on :4000) as tests/fixtures/sec/acq-search-responses.json.
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
  ['Spirit AeroSystems Holdings, Inc.', 'BOEING CO', ''], ['Frontier Communications Parent, Inc.', 'Verizon Communications Inc.', ''], ['Warner Bros. Discovery, Inc.', 'Netflix, Inc.', ''],
  ['Penumbra, Inc.', 'Boston Scientific Corp', ''], ['VMware, Inc.', 'Broadcom Inc.', ''], ['Axonics, Inc.', 'Boston Scientific Corp', ''],
  ['Boeing Company', 'Spirit AeroSystems Holdings, Inc.', ''], ['JRD Unico, Inc.', 'SYSCO CORP', ''],
];
for (const [name, reg, passage] of cases) {
  _clearCounterpartyCache();
  const r = await matchCounterparty({ name, registrant: reg, passage, searchFn, sleep: (ms) => new Promise(r => setTimeout(r, 1600)), gapMs: 1600 });
  console.log(name.padEnd(48), r.outcome.padEnd(22), r.identifier?.value ?? '', r.canonicalName ?? '', r.reason ? '| ' + r.reason.slice(0, 70) : '');
  await new Promise(r => setTimeout(r, 1600));
}
fs.writeFileSync('tests/fixtures/sec/acq-search-responses.json', JSON.stringify({ capturedAt: new Date().toISOString(), responses: rec }));
