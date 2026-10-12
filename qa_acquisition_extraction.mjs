// qa_acquisition_extraction.mjs -- KRYL-1409. Acquisition candidates from the Item text of real 8-Ks (tests/fixtures/sec/8k-acq-*.htm, public SEC filings).
// Positives (both directions, pending and completed), the false positives the rule must reject (credit, warrant, indemnification, non-prosecution, sales),
// and the cases it must not guess (several targets).
import fs from 'fs';
import { htmlToText, itemBodies } from './src/engine/connectors/edgar8kcontent.js';
import { extractAcquisitions } from './src/engine/connectors/edgar8kacquisition.js';

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.log('  ✗ ' + l); } };
const run = (file, registrant) => extractAcquisitions({ bodies: itemBodies(htmlToText(fs.readFileSync('./tests/fixtures/sec/' + file, 'utf8'))), registrant, accession: file });
const one = (r) => r.candidates.length === 1 ? r.candidates[0] : null;

console.log('Pending agreements where the filer acquires (Item 1.01)');
{
  let c = one(run('8k-acq-verizon-2024-09-05-1.01_7.01_9.01.htm', 'Verizon Communications Inc.'));
  ok(c && c.otherParty.name === 'Frontier Communications Parent, Inc.' && c.filerRole === 'ACQUIRER' && c.dealStatus === 'PENDING' && c.item === '1.01', 'Verizon / Frontier Communications Parent, Inc.: acquirer, PENDING (France Merger Sub is the filer\'s vehicle, not a party)');
  ok(c && /Frontier Communications Parent/.test(c.otherParty.passage) && /Merger/.test(c.otherParty.passage), 'the passage is the filing\'s own sentence naming the other party');
  c = one(run('8k-acq-netflix-2025-12-05-1.01_7.01_9.01.htm', 'Netflix, Inc.'));
  ok(c && c.otherParty.name === 'Warner Bros. Discovery, Inc.' && c.filerRole === 'ACQUIRER', 'Netflix (December 2025) / Warner Bros. Discovery, Inc.: the financing banks named later are not principals');
  c = one(run('8k-acq-netflix-2026-01-20-1.01_7.01_9.01.htm', 'Netflix, Inc.'));
  ok(c && c.otherParty.name === 'Warner Bros. Discovery, Inc.', 'Netflix (amended and restated agreement, January 2026): the same other party');
  c = one(run('8k-acq-boeing-2024-07-01-1.01_7.01_9.01.htm', 'BOEING CO'));
  ok(c && c.otherParty.name === 'Spirit AeroSystems Holdings, Inc.' && c.filerRole === 'ACQUIRER', 'Boeing / Spirit AeroSystems Holdings, Inc.');
  c = one(run('8k-acq-bostonscientific-2024-01-08-1.01_9.01.htm', 'Boston Scientific Corp'));
  ok(c && c.otherParty.name === 'Axonics, Inc.', 'Boston Scientific / Axonics, Inc.');
  c = one(run('8k-acq-bostonscientific-2026-01-15-1.01_9.01.htm', 'Boston Scientific Corp'));
  ok(c && c.otherParty.name === 'Penumbra, Inc.', 'Boston Scientific / Penumbra, Inc. (heading written "ITEM 1.01 ENTRY INTO ..." in upper case)');
}

console.log('Completed acquisition (Item 2.01)');
{
  const c = one(run('8k-acq-broadcom-2023-11-22-2.01_2.03_8.01_9.01.htm', 'Broadcom Inc.'));
  ok(c && c.otherParty.name === 'VMware, Inc.' && c.filerRole === 'ACQUIRER' && c.dealStatus === 'CLOSED' && c.item === '2.01', 'Broadcom / VMware, Inc.: acquirer, CLOSED (Holdco and the Merger Subs are vehicles)');
}

console.log('The filer is the target');
{
  const c = one(run('8k-acq-spirit-2024-07-01-1.01_2.03_5.02_8.01_9.01.htm', 'Spirit AeroSystems Holdings, Inc.'));
  ok(c && /Boeing Company/.test(c.otherParty.name) && c.filerRole === 'TARGET' && c.dealStatus === 'PENDING', 'Spirit\'s own 8-K: the filer is the TARGET and Boeing the acquirer (read from "Sphere Acquisition Corp. ... wholly owned subsidiary of Boeing")');
}

console.log('Not acquisitions (must yield none)');
{
  const cases = [
    ['8k-acq-broadcom-2023-08-16-1.01_2.03_8.01_9.01.htm', 'Broadcom Inc.', 'a credit agreement'],
    ['8k-acq-intel-2025-08-29-1.01_8.01_9.01.htm', 'Intel Corp', 'a warrant and stock agreement with the US government'],
    ['8k-acq-tesla-2025-09-05-1.01_9.01.htm', 'Tesla, Inc.', 'an indemnification agreement'],
    ['8k-acq-boeing-2025-06-04-1.01_9.01.htm', 'BOEING CO', 'a non-prosecution agreement'],
  ];
  for (const [f, reg, what] of cases) { const r = run(f, reg); ok(r.candidates.length === 0 && r.skipped.length > 0, `${what}: no candidate, reason ${r.skipped[0]?.reason}`); }
  let r = run('8k-acq-intel-2025-09-15-2.01_7.01_9.01.htm', 'Intel Corp'); ok(r.candidates.length === 0 && r.skipped[0].reason === 'DISPOSITION', 'Intel completing the sale of Altera to an affiliate of Silver Lake: a disposition, not an acquisition');
  r = run('8k-acq-intel-2025-03-28-2.01_9.01.htm', 'Intel Corp'); ok(r.candidates.length === 0, 'Intel completing the sale of its NAND business to SK hynix (assets, filer is the seller): none');
}

console.log('Not guessed');
{
  const r = run('8k-acq-sysco-2026-03-30-1.01_9.01.htm', 'SYSCO CORP');
  ok(r.candidates.length === 0 && r.skipped[0].reason === 'AMBIGUOUS_COUNTERPARTY', 'Sysco / "Jetro Restaurant Depot" (two target entities named together): reported ambiguous, not admitted by guess');
  const e = extractAcquisitions({ bodies: {}, registrant: 'X', accession: 'a' }); ok(e.candidates.length === 0 && e.skipped.length === 0, 'a filing with no Item 1.01 or 2.01 text yields nothing');
}

console.log('Determinism');
{
  const a = JSON.stringify(run('8k-acq-verizon-2024-09-05-1.01_7.01_9.01.htm', 'Verizon Communications Inc.')), b = JSON.stringify(run('8k-acq-verizon-2024-09-05-1.01_7.01_9.01.htm', 'Verizon Communications Inc.'));
  ok(a === b, 'the same filing gives the same candidates');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
