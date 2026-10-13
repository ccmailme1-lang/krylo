// qa_formd_offering.mjs -- KRYL-1415 (D6, ratified 2026-10-12): a Form D offering as a dated, issuer-bound CAPITAL observation. Real Form D documents (saved).
// Amounts are quoted as stated; no magnitude is derived from them; no counterparty is inferred; one CAPITAL packet only; the observation is not a relationship.
import fs from 'fs';
import { parseFormD } from './src/engine/connectors/formdpeople.js';
import { buildFormDOfferingSignal, offeringFacts } from './src/engine/connectors/formdoffering.js';
import { observationDetailLines, observationLabel } from './src/engine/adsubject.js';
import { surfaceRouter } from './src/engine/surfacerouter.js';
import { getAllSignals } from './src/engine/domaingravity.js';
import { findAdmittedRelationshipsFor, _clearAdmittedForTests } from './src/engine/canonicalrelationshipprojection.js';

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.log('  ✗ ' + l); } };
const dir = fs.readdirSync('tests/fixtures/sec'); const doc = (p) => parseFormD(fs.readFileSync('tests/fixtures/sec/' + dir.find(f => f.startsWith(p)), 'utf8'));
const db = doc('formd-databento'), ib = doc('formd-integratedbiosciences');
const filing = (o) => ({ form: 'Form D', accession: o, filingDate: '2026-07-09' });

console.log('The offering as the Form D states it');
{
  ok(db.offering.totalOfferingAmount === '97025539' && db.offering.totalAmountSold === '97025539' && db.offering.totalRemaining === '0' && db.offering.investorsAlreadyInvested === '19' && db.offering.dateOfFirstSale === '2026-04-29', 'Databento: date of first sale, total offering amount, amount sold, remaining and investors are read exactly as written');
  ok(db.offering.securityTypes.join() === 'equity,option to acquire' && db.offering.exemptions.join() === '06b', 'security types and the exemption item are read');
  ok(ib.offering.totalOfferingAmount === '100000000' && ib.offering.totalAmountSold === '68374977' && ib.offering.totalRemaining === '31625023' && ib.offering.investorsAlreadyInvested === '39', 'Integrated Biosciences: a partly sold offering is read as written (sold 68,374,977 of 100,000,000)');
  const facts = offeringFacts(ib.offering).join(' | ');
  ok(/total offering amount: 100,000,000 · amount sold: 68,374,977 · remaining: 31,625,023 \(US dollars as the Form D states them; nothing is computed from them\)/.test(facts) && /investors already invested: 39 \(the Form D names none of them\)/.test(facts) && /exemption claimed: Rule 506\(b\)/.test(facts), 'the lines quote each stated field, say nothing is computed, and say the Form D names no investors');
  ok(parseFormD('<edgarSubmission></edgarSubmission>').offering === null && buildFormDOfferingSignal({ canonicalId: 'x', filing: filing('a'), offering: null }) === null, 'a filing that states no offering data yields no observation');
}

console.log('One dated, issuer-bound CAPITAL packet');
{
  const s1 = buildFormDOfferingSignal({ canonicalId: 'databento-inc', issuerName: 'Databento Inc.', filing: filing('0001784241-26-000003'), offering: db.offering, now: 1 });
  ok(s1.domain === 'capital' && s1.fanout === 1 && s1.source === 'SEC_FORM_D' && s1.eventClass === 'PRIVATE_OFFERING', 'a single CAPITAL packet (no ownership fan-out), source SEC_FORM_D');
  ok(s1.meta.canonicalId === 'databento-inc' && s1.meta.eventDate === '2026-07-09' && s1.meta.accession === '0001784241-26-000003', 'bound to the subject by canonical id, dated by the filing, carrying the accession');
  const s2 = buildFormDOfferingSignal({ canonicalId: 'databento-inc', issuerName: 'Databento Inc.', filing: filing('0001784241-26-000003'), offering: { ...db.offering, totalOfferingAmount: '1', totalAmountSold: '1' }, now: 1 });
  ok(s1.signal === s2.signal && s1.confidence === s2.confidence, 'the signal value does not depend on the amount: no magnitude is derived from it (it follows the Item 3.02 / equity-offering precedent)');
  const o = { ...s1, ...s1.meta, canonicalId: 'databento-inc' };
  const lines = observationDetailLines(o);
  ok(lines.length >= 5 && /^date of first sale: 2026-04-29/.test(lines[0]) && /total offering amount: 97,025,539/.test(lines[1]) && /the offering alone is not a financing relationship/.test(lines[lines.length - 1]), 'the page lines: the stated facts, then "the offering alone is not a financing relationship"');
  ok(!lines.some(l => /counterparty: [A-Z]/.test(l) && !/not stated/.test(l)) && s1.meta.capitalEvent.counterparties.length === 0, 'no counterparty is named or inferred');
  ok(observationLabel({ source: s1.source, eventClass: s1.eventClass, eventDate: s1.meta.eventDate, accession: s1.meta.accession }) === 'SEC_FORM_D · PRIVATE_OFFERING · 2026-07-09 · 0001784241-26-000003', 'the evidence list shows source, class, date and accession');
}

console.log('Through the pool the page reads');
{
  _clearAdmittedForTests();
  const sig = buildFormDOfferingSignal({ canonicalId: 'databento-inc', issuerName: 'Databento Inc.', filing: filing('0001784241-26-000003'), offering: db.offering });
  surfaceRouter.dispatchBatch([sig]);
  const seen = getAllSignals(60_000).filter(s => s.canonicalId === 'databento-inc' && s.domain === 'CAPITAL');
  ok(seen.length === 1 && seen[0].accession === '0001784241-26-000003' && seen[0].eventDate === '2026-07-09' && seen[0].capitalEvent?.facts?.length >= 4, 'the observation reaches the signal pool bound to the subject with its date, accession and the stated facts');
  ok(findAdmittedRelationshipsFor('CIK:0001784241').length === 0, 'it created no relationship');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
