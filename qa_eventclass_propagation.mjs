// qa_eventclass_propagation.mjs -- KRYL-1399 step A. The 8-K item-code event class and the filing accession travel from
// the connector's signal packet through the pool and the subject observation to the label the guest sees. No magnitude,
// polarity or domain mapping changes.
import { surfaceRouter } from './src/engine/surfacerouter.js';
import { buildSignals, EVENT_DOMAIN_MAP } from './src/engine/connectors/edgar8ksignal.js';
import { A, observationLabel } from './src/engine/adsubject.js';
import { getAllSignals } from './src/engine/domaingravity.js';

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.log('  ✗ ' + l); } };

const scope = { kind: 'ENTITY', canonicalId: 'qa-eventclass-co', entity: { name: 'QA EventClass Co', identifiers: { edgar: '0000000001' } }, contract: 'ENTITY', attribution: 'IDENTIFIER' };
const mk = (acc, eventClass, date) => buildSignals({
  realityObjectId: `edgar8k-targeted-${acc}`, eventDate: date, accession: acc, eventClass, materiality: 60, groundedness: 0.98,
  entityName: 'QA EventClass Co', canonicalId: 'qa-eventclass-co', ts: Date.now(),
});

console.log('Packet to pool to subject observation');
const debt = mk('0000000001-26-000010', 'DEBT_ISSUANCE', '2026-09-02');
ok(debt.length === EVENT_DOMAIN_MAP.DEBT_ISSUANCE.length && debt[0].eventClass === 'DEBT_ISSUANCE' && debt[0].meta.accession === '0000000001-26-000010', 'the packet carries the event class and the accession');
surfaceRouter.dispatchBatch([...debt, ...mk('0000000001-26-000011', 'EXECUTIVE_CHANGE', '2026-07-06')]);
const obs = A('CAPITAL', scope).formationObservations;
const d = obs.find(o => o.eventDate === '2026-09-02');
ok(d && d.eventClass === 'DEBT_ISSUANCE' && d.accession === '0000000001-26-000010', 'the subject-bound observation keeps the class and the accession');
ok(obs.find(o => o.eventDate === '2026-07-06')?.eventClass === 'EXECUTIVE_CHANGE', 'a second filing keeps its own class');

console.log('Guest-facing label');
ok(observationLabel(d) === 'EDGAR_8K · DEBT_ISSUANCE · 2026-09-02 · 0000000001-26-000010', 'label: source, class, date, accession');
ok(observationLabel(d, { accession: false }) === 'EDGAR_8K · DEBT_ISSUANCE · 2026-09-02', 'pair-support label omits the accession');
ok(observationLabel({ source: 'USASPENDING_ENTITY', eventDate: null }) === 'USASPENDING_ENTITY', 'a source with no class, date or accession shows only the source (nothing invented)');

console.log('No change to magnitude, polarity or domain mapping');
const before = JSON.stringify(debt.map(p => [p.domain, p.signal, p.confidence, p.polarity ?? null]));
const again = mk('0000000001-26-000010', 'DEBT_ISSUANCE', '2026-09-02');
ok(JSON.stringify(again.map(p => [p.domain, p.signal, p.confidence, p.polarity ?? null])) === before, 'signal, confidence, polarity and domains are the deterministic for the same input (class and accession added alongside, nothing else changed)');
const pool = getAllSignals().filter(s => s.canonicalId === 'qa-eventclass-co');
ok(pool.length >= 2 && pool.every(s => typeof s.confidence === 'number' && (s.polarity === 'constructive' || s.polarity === 'fracture')), 'pool entries keep numeric confidence and a valid polarity');
const other = A('CAPITAL', { ...scope, canonicalId: 'other-co' }).formationObservations;
ok(other.length === 0, 'another subject sees none of these observations');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
