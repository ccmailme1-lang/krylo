// qa_relationshipchange.mjs -- KRYL-1386 acceptance suite (spec v1.1: F1-F6 and B1-B20 plus parser tests on saved SEC filings).
// Deterministic: no network, T fixed. Run: node qa_relationshipchange.mjs
import fs from 'fs';
import { parseSchedule13GXml, parseLegacy13GText, selectPerson } from './src/engine/ownershipposition.js';
import { classifyOwnershipChange, classifyCapitalEvents, periods, addMonths, participantsDocumented } from './src/engine/relationshipchange.js';

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.log('  ✗ ' + l); } };
const fx = (n) => fs.readFileSync('tests/fixtures/sec/' + n, 'utf8');
const T = '2026-10-09';
const ISS = '0001652044';
const O = (o) => ({ issuerCik: ISS, family: 'new', dateBasis: 'event', form: 'SCHEDULE 13G/A', soleVote: 1, sharedVote: 0, soleDisp: 1, sharedDisp: 0, below5Flag: false, comments: null, releaseNumber: null, source: 'SEC', ...o });
const run = (observations, coverage = { complete: true }) => classifyOwnershipChange({ observations, T, coverage }).relationships;
const one = (rs, holder, cusip) => rs.find(r => r.holderCik === holder && (cusip === undefined || r.cusip === cusip));

console.log('Dates and periods (spec section 3)');
{
  const p = periods(T);
  ok(p.E1 === '2026-10-09' && p.E0 === '2025-10-09' && p.P0.from === '2024-10-09', 'E1, E0 and P0 start are 12 and 24 months before T');
  ok(addMonths('2026-02-28', -12) === '2025-02-28' && addMonths('2024-02-29', 12) === '2025-02-28', 'month arithmetic clamps to the last day of the month');
}

console.log('Parsers on saved SEC filings (tests/fixtures/sec)');
{
  const ex = parseSchedule13GXml(fx('new-vanguard-group-exit-2026-03-26.xml'));
  ok(ex.person.percent === 0 && ex.person.shares === 0 && ex.eventDate === '2026-03-13' && ex.cusip === '02079K305' && ex.issuerCik === ISS, 'Vanguard Group exit filing: 0 percent, 0 shares, event 2026-03-13, CUSIP 02079K305, issuer Alphabet');
  ok(ex.below5Flag === true && ex.person.percent === 0, 'the 5-percent-or-less flag and zero percent are read separately');
  const sc = parseSchedule13GXml(fx('new-schmidt-2025-08-14.xml'));
  ok(sc.below5Flag === true && selectPerson(sc, 'SCHMIDT ERIC E').person.percent === 0.83 && sc.persons.length === 9, 'Schmidt 2025-08-14: flag Y with 0.83 percent (below 5, not zero); nine reporting persons, the right one selected by name');
  const vcm = parseSchedule13GXml(fx('new-vanguard-capital-mgmt-2026-04-29.xml'));
  ok(vcm.person.percent === 7.48 && vcm.person.shares === 436027408 && vcm.person.soleVote === 57765829 && vcm.person.sharedVote === 0 && vcm.eventDate === '2026-03-31', 'Vanguard Capital Management: 7.48 percent, 436,027,408 shares, sole vote 57,765,829, event 2026-03-31');
  const brin = parseSchedule13GXml(fx('new-brin-2026-02-17.xml'));
  ok(brin.person.percent === 5.81 && brin.cusip === '02079K305' && brin.eventDate === '2025-12-31', 'Brin: 5.81 percent, CUSIP via the issuerCusip schema variant');
  const lv = parseLegacy13GText(fx('legacy-vanguard-classc-2024-02-13.htm'));
  ok(lv.person.percent === 7.18 && lv.person.shares === 410957639 && lv.cusip === '02079K107', 'legacy Vanguard class C 2024-02-13: 7.18 percent, 410,957,639 shares, CUSIP 02079K107');
  const lb = parseLegacy13GText(fx('legacy-blackrock-2024-02-12.txt'));
  ok(lb.person.percent === 6.2 && lb.cusip === '02079K107', 'legacy BlackRock .txt: 6.2 percent, CUSIP 02079K107');
  ok(parseSchedule13GXml('<html>not a filing</html>') === null, 'a non-filing document parses to null, not to zeros');
  ok(parseLegacy13GText('<p>quarterly report</p>') === null, 'a non-13G document parses to null');
}

// Observations for the Alphabet cases (real values from the saved filings; event dates as reported)
const VG = '0000102909', VCM = '0002100119', BRIN = '0001295032', SCH = '0001242463', BLK = '0001364742';
const vgExit = parseSchedule13GXml(fx('new-vanguard-group-exit-2026-03-26.xml'));
const vcmNew = parseSchedule13GXml(fx('new-vanguard-capital-mgmt-2026-04-29.xml'));
const vgExitObs = O({ accession: '0000102909-26-000584', filingDate: '2026-03-26', eventDate: '2026-03-13', holderCik: VG, holderName: 'VANGUARD GROUP INC', cusip: '02079K305', percent: 0, shares: 0, soleVote: 0, sharedVote: 0, soleDisp: 0, sharedDisp: 0, below5Flag: true, comments: vgExit.person.comments, releaseNumber: vgExit.person.releaseNumber });
const vgPriorA = O({ accession: '0001104659-24-020000', family: 'legacy', form: 'SC 13G/A', filingDate: '2024-02-13', eventDate: '2023-12-29', holderCik: VG, holderName: 'VANGUARD GROUP INC', cusip: '02079K305', percent: 8.34, shares: 493782758 });
const vcmObs = O({ accession: '0002100119-26-000161', form: 'SCHEDULE 13G', filingDate: '2026-04-29', eventDate: '2026-03-31', holderCik: VCM, holderName: 'VANGUARD CAPITAL MANAGEMENT LLC', cusip: '02079K305', percent: 7.48, shares: 436027408, soleVote: 57765829, comments: vcmNew.person.comments, releaseNumber: vcmNew.person.releaseNumber });
const brinNew = O({ accession: '0001193125-26-055590', filingDate: '2026-02-17', eventDate: '2025-12-31', holderCik: BRIN, holderName: 'Sergey Brin', cusip: '02079K305', percent: 5.81, shares: 359414947, soleVote: 359414947 });
const brinOld = O({ accession: '0001193125-24-032286', family: 'legacy', form: 'SC 13G/A', filingDate: '2024-02-12', eventDate: '2023-12-31', holderCik: BRIN, holderName: 'Sergey Brin', cusip: null, percent: 6.16, shares: null, soleVote: null, sharedVote: null, soleDisp: null, sharedDisp: null });
const schmidt0 = O({ accession: '0000950170-25-022699', filingDate: '2025-02-18', eventDate: '2024-12-31', holderCik: SCH, holderName: 'SCHMIDT ERIC E', cusip: '02079K305', percent: 0.97 });
const schmidt1 = O({ accession: '0000950170-25-109161', filingDate: '2025-08-14', eventDate: '2025-06-30', holderCik: SCH, holderName: 'SCHMIDT ERIC E', cusip: '02079K305', percent: 0.83, below5Flag: true });
const blk = O({ accession: '0001086364-24-006965', family: 'legacy', form: 'SC 13G/A', filingDate: '2024-02-12', eventDate: '2023-12-31', holderCik: BLK, holderName: 'BlackRock Inc.', cusip: '02079K107', percent: 6.2, shares: 356934964 });

console.log('Alphabet fixtures F1 to F6 (spec section 14)');
{
  const rs = run([vgPriorA, vgExitObs, vcmObs, brinNew, brinOld, schmidt0, schmidt1, blk]);
  const vg = one(rs, VG), vcm = one(rs, VCM), brin = one(rs, BRIN), sch = one(rs, SCH), bl = one(rs, BLK);
  ok(vg.existence.state === 'DISSOLVED' && vg.evidence.termination.accession === '0000102909-26-000584' && vg.magnitude.state === 'NOT_ASSESSED', 'F1 Vanguard Group: DISSOLVED by the filing reporting zero percent; magnitude not assessed');
  ok(vcm.existence.state === 'NEW' && vcm.magnitude.state === 'NOT_ASSESSED', 'F2 Vanguard Capital Management: NEW (coverage complete); magnitude not assessed');
  ok(vg.configuration.state === 'RECONFIGURED' && vg.configuration.subtypes.includes('participants') && vcm.configuration.subtypes.includes('participants'), 'F3 Vanguard Group to Vanguard Capital Management: RECONFIGURED (participants), documented by the filing\'s own realignment statement and the shared SEC release');
  ok(/34-39538/.test(vg.configuration.participants.basis), 'F3 the basis cites the release number and the terminated filing');
  ok(brin.existence.state === 'PERSISTING' && brin.magnitude.state === 'INDETERMINATE' && brin.magnitude.reason === 'SOURCE_LIMIT', 'F4 Brin: PERSISTING; magnitude INDETERMINATE (SOURCE_LIMIT): the 2024 filing has no CUSIP, so the class cannot be matched');
  ok(sch.existence.state === 'INDETERMINATE' && sch.existence.reason === 'NO_CURRENT_OBSERVATION', 'F5 Schmidt: both filings are in P0; no P1 filing: INDETERMINATE (NO_CURRENT_OBSERVATION)');
  ok(sch.evidence.asOfE0.percent === 0.83 && sch.evidence.asOfE0.below5Flag === true && sch.existence.state !== 'DISSOLVED', 'F5 the 5-percent-or-less flag with 0.83 percent is a held position, not termination');
  ok(bl.existence.state === 'INDETERMINATE' && bl.existence.reason === 'NO_CURRENT_OBSERVATION', 'F6 BlackRock: held as of E0, nothing since: INDETERMINATE, never DISSOLVED');
  ok(rs.every(r => r.basis === 'source-dated-12m' && r.rules.length > 0), 'every record carries its basis and the rule ids that triggered it');
}
{
  const rs = run([vcmObs], { complete: false, reasons: ['window failed'] });
  const vcm = one(rs, VCM);
  ok(vcm.existence.state === 'INDETERMINATE' && vcm.existence.reason === 'COVERAGE_INCOMPLETE', 'F2 with incomplete retrieval: INDETERMINATE (COVERAGE_INCOMPLETE), never NEW');
}
{
  const bare = { ...vgExitObs, comments: null, releaseNumber: null };
  const bareVcm = { ...vcmObs, comments: null, releaseNumber: null };
  const rs = run([vgPriorA, bare, bareVcm]);
  ok(one(rs, VG).configuration.reason === 'PARTICIPANT_CHANGE_UNVERIFIED' && one(rs, VCM).configuration.candidate.from === 'VANGUARD GROUP INC', 'F3 without documented affiliation: INDETERMINATE (PARTICIPANT_CHANGE_UNVERIFIED) with the candidate named');
  ok(participantsDocumented(vgExitObs, vcmObs) === true && participantsDocumented(bare, bareVcm) === false, 'the documentation rule needs the realignment statement and a shared release');
}

console.log('Magnitude boundaries (settled: 1.0 point, inclusive, same share class)');
const pair = (p0, p1, extra0 = {}, extra1 = {}) => run([
  O({ accession: 'A0', filingDate: '2025-02-01', eventDate: '2024-12-31', holderCik: 'H1', holderName: 'H', cusip: 'C1', percent: p0, ...extra0 }),
  O({ accession: 'A1', filingDate: '2026-02-01', eventDate: '2025-12-31', holderCik: 'H1', holderName: 'H', cusip: 'C1', percent: p1, ...extra1 }),
])[0];
ok(pair(4.0, 5.0).magnitude.state === 'STRENGTHENING' && pair(4.0, 5.0).magnitude.deltaPoints === 1 && pair(4.0, 5.0).existence.state === 'PERSISTING', 'B1 4.00 to 5.00: delta +1.00 exactly: STRENGTHENING (inclusive)');
ok(pair(5.0, 4.01).magnitude.state === 'NO MATERIAL CHANGE' && pair(5.0, 4.01).magnitude.deltaPoints === -0.99, 'B2 5.00 to 4.01: delta -0.99: NO MATERIAL CHANGE');
ok(pair(6.1, 5.0).magnitude.state === 'WEAKENING', 'B3 6.10 to 5.00: WEAKENING');
ok(pair(5.0, 6.0).magnitude.state === 'STRENGTHENING' && pair(6.0, 5.0).magnitude.state === 'WEAKENING', 'B3b exactly -1.0 is WEAKENING');
{
  const r = run([O({ accession: 'S1', filingDate: '2026-02-01', eventDate: '2025-12-31', holderCik: 'H1', holderName: 'H', cusip: 'C1', percent: 5.0 })])[0];
  ok(r.existence.state === 'NEW' || r.existence.state === 'INDETERMINATE', 'B4 a single filing: no distinct pair, so no magnitude is assessed');
}
{
  const r = run([
    O({ accession: 'X1', filingDate: '2025-02-01', eventDate: '2024-12-31', holderCik: 'H1', holderName: 'H', cusip: 'C1', percent: 5.0 }),
    O({ accession: 'X1', filingDate: '2025-02-01', eventDate: '2025-12-31', holderCik: 'H1', holderName: 'H', cusip: 'C1', percent: 5.0 }),
  ])[0];
  ok(r.magnitude.state === 'INDETERMINATE' && r.magnitude.reason === 'NO_PRIOR_OBSERVATION', 'B4 E0 and P1 resolve to the same filing: INDETERMINATE (NO_PRIOR_OBSERVATION)');
}
{
  const rs = run([
    O({ accession: 'A0', filingDate: '2025-02-01', eventDate: '2024-12-31', holderCik: 'H1', holderName: 'H', cusip: 'C1', percent: 8.0 }),
    O({ accession: 'A1', filingDate: '2026-02-01', eventDate: '2025-12-31', holderCik: 'H1', holderName: 'H', cusip: 'C2', percent: 3.0 }),
  ]);
  ok(rs.length === 2 && rs.every(r => r.magnitude.state !== 'STRENGTHENING' && r.magnitude.state !== 'WEAKENING'), 'B5 different CUSIPs are independent units; no cross-class delta');
}
ok(pair(5.0, 5.4, {}, {}).magnitude.state === 'NO MATERIAL CHANGE' && classifyOwnershipChange({ observations: [O({ accession: 'A0', filingDate: '2025-02-01', eventDate: '2024-12-31', holderCik: 'H1', holderName: 'H', cusip: 'C1', percent: 5.0 }), O({ accession: 'A1', filingDate: '2026-02-01', eventDate: '2025-12-31', holderCik: 'H1', holderName: 'H', cusip: 'C1', percent: 5.4 })], T, coverage: { complete: false } }).relationships[0].magnitude.reason === 'COVERAGE_INCOMPLETE', 'B6 below the threshold but retrieval incomplete: INDETERMINATE (COVERAGE_INCOMPLETE), never NO MATERIAL CHANGE');
ok(pair(5.0, null).existence.reason === 'SOURCE_LIMIT', 'B18 a P1 filing whose percent was not recovered: existence INDETERMINATE (SOURCE_LIMIT)');
ok(pair(null, 5.0).existence.reason === 'SOURCE_LIMIT' && pair(null, 5.0).existence.state === 'INDETERMINATE', 'B18 an E0 filing whose percent was not recovered: existence INDETERMINATE (SOURCE_LIMIT), never NEW');

console.log('Existence boundaries');
{
  const mk = (extra) => run([extra].flat())[0];
  const heldOld = O({ accession: 'H', filingDate: '2023-02-01', eventDate: '2022-12-31', holderCik: 'H2', holderName: 'H2', cusip: 'C1', percent: 6 });
  const p1 = O({ accession: 'P', filingDate: '2026-02-01', eventDate: '2025-12-31', holderCik: 'H2', holderName: 'H2', cusip: 'C1', percent: 6 });
  ok(mk([heldOld, p1]).existence.state === 'NEW', 'B16 a filing older than L before E0 is not held: with a P1 filing and complete coverage: NEW');
  ok(run([heldOld]).length === 0, 'B17 nothing held and nothing in P1: not a relationship in scope');
  ok(run([]).length === 0, 'B17 no filings: nothing classified');
  const unclassedOnly = O({ accession: 'U', family: 'legacy', filingDate: '2026-02-01', eventDate: '2025-12-31', holderCik: 'H3', holderName: 'H3', cusip: null, percent: 5 });
  ok(run([unclassedOnly])[0].magnitude.state === 'NOT_ASSESSED' || run([unclassedOnly])[0].magnitude.state === 'INDETERMINATE', 'B20 a filing with no CUSIP: no class match for magnitude');
  const dis = O({ accession: 'D', filingDate: '2026-03-01', eventDate: '2026-02-28', holderCik: 'H2', holderName: 'H2', cusip: 'C1', percent: 0, below5Flag: true });
  const heldE0 = O({ accession: 'H0', filingDate: '2025-02-01', eventDate: '2024-12-31', holderCik: 'H2', holderName: 'H2', cusip: 'C1', percent: 7 });
  ok(mk([heldE0, dis]).existence.state === 'DISSOLVED', 'zero percent in P1 after a held position: DISSOLVED');
  const below5 = { ...dis, percent: 4.2, accession: 'B5' };
  ok(mk([heldE0, below5]).existence.state === 'PERSISTING' && mk([heldE0, below5]).magnitude.state === 'WEAKENING', 'the 5-percent-or-less flag alone: PERSISTING (4.2 percent is still held), magnitude measured');
}

console.log('Revised, amended and conflicting filings');
{
  const base = { holderCik: 'H4', holderName: 'H4', cusip: 'C1', issuerCik: ISS };
  const e0 = O({ ...base, accession: 'E0', filingDate: '2025-02-01', eventDate: '2024-12-31', percent: 5 });
  const a = O({ ...base, accession: 'A', filingDate: '2026-02-01', eventDate: '2025-12-31', percent: 6.5 });
  const amend = O({ ...base, accession: 'B', filingDate: '2026-02-20', eventDate: '2025-12-31', percent: 6.5 });
  const r = run([e0, a, amend])[0];
  ok(r.evidence.inP1.length === 1 && r.evidence.inP1[0].accession === 'B', 'B10 an amendment with the same event date supersedes the earlier filing; the result uses the later accession');
  const conflict = O({ ...base, accession: 'C', filingDate: '2026-02-21', eventDate: '2025-12-31', percent: 7.9 });
  const rc = run([e0, a, conflict])[0];
  ok(rc.existence.state === 'INDETERMINATE' && rc.existence.reason === 'INCOMPATIBLE_OBSERVATIONS' && rc.evidence.conflicts[0].accessions.length === 2, 'B11 same unit, same event date, different values: INDETERMINATE (INCOMPATIBLE_OBSERVATIONS), both accessions shown');
  const filingBasis = O({ ...base, accession: 'F', filingDate: '2026-02-01', eventDate: '2026-02-01', dateBasis: 'filing', percent: 6 });
  ok(run([e0, filingBasis])[0].evidence.inP1[0].dateBasis === 'filing', 'B12 a missing event date falls back to the filing date and says so (dateBasis: filing)');
}

console.log('Configuration (rights) and name change');
{
  const base = { holderCik: 'H5', holderName: 'H5', cusip: 'C1' };
  const e0 = O({ ...base, accession: 'R0', filingDate: '2025-02-01', eventDate: '2024-12-31', percent: 5.0, soleVote: 1000, sharedVote: 0, soleDisp: 1000, sharedDisp: 0 });
  const e1 = O({ ...base, accession: 'R1', filingDate: '2026-02-01', eventDate: '2025-12-31', percent: 5.3, soleVote: 400, sharedVote: 700, soleDisp: 1000, sharedDisp: 0 });
  const r = run([e0, e1])[0];
  ok(r.configuration.state === 'RECONFIGURED' && r.configuration.subtypes.join() === 'rights' && r.configuration.rights[0].field === 'sharedVote' && r.magnitude.state === 'NO MATERIAL CHANGE', 'B8 shared voting power appears while percent moves 0.3: RECONFIGURED (rights), magnitude NO MATERIAL CHANGE');
  const same = run([e0, { ...e1, soleVote: 1200, sharedVote: 0 }])[0];
  ok(same.configuration.state === 'NO MATERIAL CHANGE', 'a share-count change inside one category is not a configuration change');
  const renamed = run([e0, { ...e1, holderName: 'H5 Holdings Renamed', soleVote: 1000, sharedVote: 0 }])[0];
  ok(renamed.configuration.state === 'NO MATERIAL CHANGE' && !renamed.configuration.subtypes.length, 'B9 a name change on the same CIK is not a reconfiguration');
}

console.log('Capital events (settled: magnitude INDETERMINATE)');
{
  const ev = (type, cp, d, acc) => ({ type, counterpartyId: cp, eventDate: d, accession: acc });
  const same = classifyCapitalEvents({ events: [ev('FINANCING', 'CP1', '2025-03-01', 'a'), ev('FINANCING', 'CP1', '2026-03-01', 'b')], T }).events[0];
  ok(same.existence.state === 'PERSISTING' && same.magnitude.reason === 'NO_COMPARABLE_MEASURE', 'B13 same type and counterparty in both periods: PERSISTING; magnitude INDETERMINATE (NO_COMPARABLE_MEASURE)');
  const diff = classifyCapitalEvents({ events: [ev('FINANCING', 'CP1', '2025-03-01', 'a'), ev('FINANCING', 'CP2', '2026-03-01', 'b')], T }).events;
  ok(diff.find(e => e.counterpartyId === 'CP2').existence.state === 'NEW' && diff.find(e => e.counterpartyId === 'CP1').existence.reason === 'NO_CURRENT_OBSERVATION', 'B14 a different counterparty is NEW for that counterparty; the earlier event is not "dissolved"');
  const inc = classifyCapitalEvents({ events: [ev('FINANCING', 'CP3', '2026-03-01', 'c')], T, coverage: { complete: false } }).events[0];
  ok(inc.existence.reason === 'COVERAGE_INCOMPLETE', 'a capital event with incomplete retrieval is not NEW');
}

console.log('Determinism and audit fields');
{
  const a = JSON.stringify(run([vgPriorA, vgExitObs, vcmObs, brinNew, brinOld, schmidt0, schmidt1, blk]));
  const b = JSON.stringify(run([blk, schmidt1, schmidt0, brinOld, brinNew, vcmObs, vgExitObs, vgPriorA]));
  ok(a === b, 'the same observations in any order produce identical results');
  const r = run([vgPriorA, vgExitObs])[0];
  ok(r.evidence.asOfE0.accession && r.evidence.termination.accession && r.evidence.asOfE0.percent === 8.34 && r.periods.E0 === '2025-10-09' && r.rules.length, 'a classified change exposes both periods\' evidence, the dates, the reported values and the rule');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
