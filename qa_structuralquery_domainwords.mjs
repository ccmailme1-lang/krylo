// qa_structuralquery_domainwords.mjs -- DEF-1393: the six domain words are domains, never structural participants.
import { interpretStructuralQuery } from './src/engine/structuralqueryinterpreter.js';
let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.log('  ✗ ' + l); } };
const DOMAINS = ['TECHNOLOGY', 'CAPITAL', 'KNOWLEDGE', 'LABOR', 'MEDIA', 'OWNERSHIP'];
const broadcom = interpretStructuralQuery('What structural relationships are forming around Broadcom across ownership, technology, and capital?');
ok(!broadcom.entities.includes('TECHNOLOGY') && !broadcom.entities.includes('OWNERSHIP') && broadcom.entities.length === 0, 'the Broadcom question yields no participant built from domain words');
ok(broadcom.relationshipIntent.includes('STRUCTURAL') && broadcom.relationshipIntent.includes('RELATIONSHIP'), 'the relationship intent is still read');
for (const w of ['technology', 'capital', 'knowledge', 'labor', 'media', 'ownership']) {
  ok(interpretStructuralQuery(`How are relationships changing across ${w}?`).entities.every(e => !DOMAINS.includes(e)), `"${w}" alone is not a participant`);
}
const real = interpretStructuralQuery('What structural relationships connect suppliers and distributors to this facility?');
ok(real.state === 'INTERPRETABLE' && real.entities.includes('SUPPLIER') && real.entities.includes('DISTRIBUTOR') && real.entities.includes('FACILITY'), 'real structural-role participants (supplier, distributor, facility) still make a question INTERPRETABLE');
ok(interpretStructuralQuery('Is the technology partner dependent on the investor?').entities.join() === 'PARTNER,INVESTMENT', 'a domain word next to real participants is dropped, the participants stay');
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
