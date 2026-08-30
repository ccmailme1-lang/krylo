// qa_adsubject.mjs — WO-5B stage 5B-1 (KRYL-1234).
// A(d, Subject): binds only subject-attributable observations; measures resolve
// subject-scoped (STRUCTURAL_ABSENCE today); field pressure is context, never a
// subject value; non-ENTITY scope → classified absence for every domain.
// Run: node qa_adsubject.mjs

import { A, allDomains, CANON_DOMAINS } from './src/engine/adsubject.js';
import { subjectScope } from './src/engine/subjectscope.js';
import { buildQueryContext } from './src/engine/querycontext.js';

let pass = 0, fail = 0;
const ok = (l, c) => { if (c) { pass++; console.log(`  ✓ ${l}`); } else { fail++; console.log(`  ✗ ${l}`); } };

const anduril = subjectScope('Is Anduril a good acquisition target?');

// 1. ENTITY scope — every domain.
const six = allDomains(anduril);
ok('all six canonical domains', six.length === 6 && six.map(([d]) => d).join() === CANON_DOMAINS.join());
for (const [d, ad] of six) {
  ok(`${d}: scoped to the subject`, ad.scoped === true && ad.subject === 'anduril-industries');
  ok(`${d}: measures resolve (subject scope), none is a FACET yet`,
     Object.keys(ad.measures).length > 0 && Object.values(ad.measures).every(m => m.status === 'STRUCTURAL_ABSENCE'));
  ok(`${d}: every measure absence names a required source class + subject scope`,
     Object.values(ad.measures).every(m => typeof m.requiredSourceClass === 'string' && m.requiredScope === 'subject'));
  ok(`${d}: observations empty at 5B-1 (no fabricated attribution)`, ad.observations.length === 0);
  ok(`${d}: fieldContext present but is NOT surfaced as a measure`,
     ('fieldContext' in ad) && !Object.values(ad.measures).some(m => m.status === 'FACET'));
}

// 2. A field-pressure number never appears as a subject measure value.
const capMeasures = Object.values(A('CAPITAL', anduril).measures);
ok('no CAPITAL subject measure carries a numeric value', capMeasures.every(m => m.value === undefined));

// 3. DECISION_FRAME → classified absence for all six, no measures bound to a subject.
const df = subjectScope(buildQueryContext('should we open a second facility or expand'));
for (const [d, ad] of allDomains(df)) {
  ok(`${d}: DECISION_FRAME → not scoped`, ad.scoped === false && ad.subject === null);
  ok(`${d}: DECISION_FRAME → structural absence w/ unit-of-analysis reason`,
     ad.absence?.absenceClass === 'structural' && /decision frame|unit-of-analysis/.test(ad.absence.reason));
  ok(`${d}: DECISION_FRAME → measures still resolve at FIELD scope (honest per-measure absence kept)`,
     Object.values(ad.measures).every(m => m.status === 'STRUCTURAL_ABSENCE' && m.requiredScope === 'subject'));
}

// 4. UNRESOLVED → same shape.
const un = subjectScope('the cheapest way to do this');
ok('UNRESOLVED → CAPITAL not scoped, structural absence', (() => { const ad = A('CAPITAL', un); return ad.scoped === false && ad.absence?.absenceClass === 'structural'; })());

// 5. Determinism.
ok('A() deterministic', JSON.stringify(A('MEDIA', anduril)) === JSON.stringify(A('MEDIA', anduril)));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
