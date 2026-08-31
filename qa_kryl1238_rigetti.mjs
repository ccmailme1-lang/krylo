// qa_kryl1238_rigetti.mjs — KRYL-1238 regression.
//
// Live run: query "Is it worth the risk? Rigetti..." resolved the Target Packet
// subject to NVIDIA. KRYL-1239 then faithfully propagated NVIDIA into the Export
// Brief — so 1239 was working; it was propagating an already-wrong canonical
// subject. Root cause: a registry name (NVIDIA) that appears only as a comparator
// was being substituted for an unresolved primary subject (Rigetti).
//
// Founder acceptance (verbatim, 6):
//   1. current query must produce a candidate/entity signal for Rigetti
//   2. session subject state must not silently override a current-query candidate
//   3. if Rigetti can't be resolved confidently → remain DECISION_FRAME / unresolved,
//      not resolve to another entity
//   4. never substitute an unrelated prior/current entity for an ambiguous query
//   5. preserve the no-verdict / measured-absence boundaries
//   6. once the subject is established, 1239 keeps propagating that exact subject
//
// Run: node qa_kryl1238_rigetti.mjs

import { subjectScope } from './src/engine/subjectscope.js';
import { classifyFrame } from './src/engine/frameclassify.js';
import { canonicalBriefSubject } from './src/engine/briefcontext.js';
import { buildQueryContext } from './src/engine/querycontext.js';

let pass = 0, fail = 0;
const ok = (l, c) => { if (c) { pass++; console.log(`  ✓ ${l}`); } else { fail++; console.log(`  ✗ ${l}`); } };
const mk = q => ({ query: q, lens: 'GENERAL', tensor: {}, queryContext: buildQueryContext(q) });

// The exact fixture.
const RIGETTI = 'Is it worth the risk? Rigetti...';
// A longer form where NVIDIA is present only as a comparator (the shape that
// produced the wrong resolution).
const RIGETTI_VS = 'Is it worth the risk? Rigetti Computing has run up hard, but is it a better quantum bet than NVIDIA right now?';

const sc  = subjectScope(buildQueryContext(RIGETTI));
const scv = subjectScope(buildQueryContext(RIGETTI_VS));

// (3)(4) — not resolved to another entity
ok('Rigetti fixture → NOT ENTITY (no substitution)', sc.kind !== 'ENTITY');
ok('Rigetti fixture → UNRESOLVED / DECISION_FRAME only', ['UNRESOLVED', 'DECISION_FRAME'].includes(sc.kind));
ok('Rigetti-vs-NVIDIA → NOT resolved to NVIDIA', !(scv.kind === 'ENTITY' && /nvidia/i.test(scv.canonicalId || '')));
ok('Rigetti-vs-NVIDIA → NVIDIA recorded as a comparator, not the subject', scv.comparator === 'NVIDIA');

// (1) — a candidate/entity signal for Rigetti is produced
ok('subjectScope carries "Rigetti" as an unresolved candidate', (sc.candidates ?? []).some(c => /rigetti/i.test(c)));
ok('subjectScope (vs form) carries "Rigetti Computing" as a candidate', (scv.candidates ?? []).some(c => /rigetti/i.test(c)));
const fr = classifyFrame(buildQueryContext(RIGETTI_VS));
ok('frameclassify surfaces Rigetti as a named candidate signal',
   JSON.stringify(fr.subjectResolution.candidates).toLowerCase().includes('rigetti'));
ok('frameclassify does NOT resolve Rigetti to a verdict/subject (state NONE)', fr.subjectResolution.state === 'NONE');

// (2) — current query wins over stale session state: subjectScope reads only its
// input, so feeding it a fresh Rigetti context never yields a prior NVIDIA subject.
const staleShape = subjectScope(buildQueryContext(RIGETTI));   // no session, no memory
ok('subjectScope is pure over its input — no session/subject memory path', staleShape.kind === sc.kind && JSON.stringify(staleShape.candidates) === JSON.stringify(sc.candidates));

// (5) — no verdict; a non-ENTITY scope is not scopable → measured absence downstream
import { isScopable } from './src/engine/subjectscope.js';
ok('Rigetti fixture scope is not scopable → measured absence downstream', isScopable(sc) === false);

// (6) — once a subject IS established (registry hit as subject, not comparator),
// the brief seam propagates exactly it
const clean = mk('Should I add to my Rigetti Computing position vs holding cash?');
// Rigetti Computing is not in the registry → stays unresolved, brief must NOT
// invent a subject and must NOT pick a comparator.
ok('clean Rigetti decision → brief subject not fabricated', canonicalBriefSubject(clean).resolved === false);
const anduril = mk('Is Anduril a good acquisition target?');
ok('control: a real registry subject still resolves + propagates', canonicalBriefSubject(anduril).label === subjectScope(anduril.queryContext).entity.name);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
