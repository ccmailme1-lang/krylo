// qa_subjectscope.mjs — WO-5B stage 5B-1 (KRYL-1234).
// The canonical subject is established once, from the query, ignoring the
// question stem. Run: node qa_subjectscope.mjs

import { subjectScope, isScopable } from './src/engine/subjectscope.js';
import { buildQueryContext } from './src/engine/querycontext.js';

let pass = 0, fail = 0;
const ok = (l, c) => { if (c) { pass++; console.log(`  ✓ ${l}`); } else { fail++; console.log(`  ✗ ${l}`); } };

// 1. The Anduril acceptance case — resolves to the entity, NOT "IS ANDURIL".
const a = subjectScope('Is Anduril a good acquisition target?');
ok('ENTITY kind', a.kind === 'ENTITY');
ok('canonicalId = anduril-industries', a.canonicalId === 'anduril-industries');
ok('matchedOn is "Anduril" (stem stripped, not "Is Anduril")', a.matchedOn === 'Anduril');
ok('entity name carried', a.entity?.name === 'ANDURIL INDUSTRIES');
ok('isScopable(ENTITY) === true', isScopable(a) === true);

// 2. Same subject across phrasings.
for (const q of ['Anduril', 'anduril industries', 'How is Anduril positioned?', 'Should we acquire Anduril']) {
  ok(`"${q}" → anduril-industries`, subjectScope(q).canonicalId === 'anduril-industries');
}

// 3. A curated peer still works.
ok('"Palantir" → palantir-technologies', subjectScope('Palantir').canonicalId === 'palantir-technologies');
ok('"Is Palantir overvalued?" → palantir-technologies', subjectScope('Is Palantir overvalued?').canonicalId === 'palantir-technologies');

// 4. Decision frame — decision cues, no entity → DECISION_FRAME, not invented.
const df = subjectScope(buildQueryContext('should we open a second manufacturing facility or expand the current one'));
ok('decision frame → DECISION_FRAME', df.kind === 'DECISION_FRAME');
ok('DECISION_FRAME not scopable', isScopable(df) === false);
ok('DECISION_FRAME names the unit-of-analysis reason', /unit-of-analysis/.test(df.reason));

// 5. Unresolved — a plain place name with no geo resolution and no entity.
const sf = subjectScope('San Francisco');
ok('"San Francisco" → not ENTITY (no company match)', sf.kind !== 'ENTITY');
ok('"San Francisco" → UNRESOLVED or GEO, one scoped object (not six strings)',
   (sf.kind === 'UNRESOLVED' || sf.kind === 'GEO') && typeof sf === 'object');

// 6. GEO only from a resolved queryContext.geo.
const geoQc = { rawQuery: 'x', geo: { state: 'resolved', value: { location: 'Springfield, IL' } }, decisionCues: [] };
ok('resolved geo → GEO kind', subjectScope(geoQc).kind === 'GEO');
ok('GEO carries the location', subjectScope(geoQc).location === 'Springfield, IL');

// 7. Empty / junk.
ok('empty → UNRESOLVED', subjectScope('').kind === 'UNRESOLVED');
ok('"the best plan for my 3 kids" → not ENTITY (no false proper-noun match)',
   subjectScope('the best plan for my 3 kids').kind !== 'ENTITY');

// 8. Determinism.
ok('deterministic', JSON.stringify(subjectScope('Is Anduril a good acquisition target?')) === JSON.stringify(a));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
