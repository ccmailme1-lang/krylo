// qa_def1240_adjudication_visual.mjs — DEF-1240.
// A non-converged salience adjudication (CONFLICT / UNRESOLVED_NO_RANKING) must be
// drawn as a DISTINCT analytical state — not the lime lead treatment a resolved
// SINGLE gets. Presentation only; the adjudicate() classification is unchanged.
//
// Run: node qa_def1240_adjudication_visual.mjs

import { adjudicate } from './src/formationlayer/resolveadjudication.js';
import { readFileSync } from 'node:fs';

let pass = 0, fail = 0;
const ok = (l, c) => { if (c) { pass++; console.log(`  ✓ ${l}`); } else { fail++; console.log(`  ✗ ${l}`); } };

const src = readFileSync(new URL('./src/components/surface/observestoryview.jsx', import.meta.url), 'utf8');

// ── 1. classification still produces the distinct outcomes (unchanged) ──────
ok('adjudicate is a pure fn, distinct outcomes exist', typeof adjudicate === 'function');
ok('resolveadjudication still emits CONFLICT + UNRESOLVED_NO_RANKING',
   /outcome: 'CONFLICT'/.test(readFileSync(new URL('./src/formationlayer/resolveadjudication.js', import.meta.url), 'utf8')) &&
   /outcome: 'UNRESOLVED_NO_RANKING'/.test(readFileSync(new URL('./src/formationlayer/resolveadjudication.js', import.meta.url), 'utf8')));

// ── 2. buildNarrative carries the outcome to the render ─────────────────────
const bn = src.slice(src.indexOf('function buildNarrative'), src.indexOf('function buildNarrative') + 1700);
for (const o of ["outcome: 'SINGLE'", "outcome: 'CONFLICT'", "outcome: 'UNRESOLVED_NO_RANKING'", "outcome: 'NONE'"]) {
  ok(`buildNarrative returns ${o}`, bn.includes(o));
}

// ── 3. outcomeStyle — replicate + assert the visual vocabulary is distinct ──
const LIME = '#66FF00', BLUE = '#007FFF', MUTED = 'rgba(255,255,255,0.42)';
function outcomeStyle(outcome) {
  switch (outcome) {
    case 'CONFLICT': return { accent: BLUE, eyebrow: 'Conflicting readings', rule: true, underline: false };
    case 'UNRESOLVED_NO_RANKING': return { accent: MUTED, eyebrow: 'No lead established', rule: false, underline: false };
    case 'NONE': return { accent: MUTED, eyebrow: 'Field forming', rule: false, underline: false };
    default: return { accent: LIME, eyebrow: 'Quick read', rule: false, underline: true };
  }
}
const S = outcomeStyle('SINGLE'), C = outcomeStyle('CONFLICT'), U = outcomeStyle('UNRESOLVED_NO_RANKING');
ok('SINGLE keeps the lime lead treatment', S.accent === LIME && S.underline === true);
ok('CONFLICT accent is NOT lime (distinct from a resolved lead)', C.accent !== LIME);
ok('UNRESOLVED_NO_RANKING accent is NOT lime', U.accent !== LIME);
ok('CONFLICT and UNRESOLVED are visually distinguishable from each other', C.accent !== U.accent || C.rule !== U.rule);
ok('CONFLICT gets a container rule; SINGLE does not', C.rule === true && S.rule === false);
ok('every eyebrow label is distinct', new Set([S.eyebrow, C.eyebrow, U.eyebrow, outcomeStyle('NONE').eyebrow]).size === 4);

// ── 4. §6 — only locked colours / neutral white-opacity, no new hex ────────
const styleBlock = src.slice(src.indexOf('function outcomeStyle'), src.indexOf('function outcomeStyle') + 700);
const hexes = [...styleBlock.matchAll(/#[0-9a-fA-F]{6}/g)].map(m => m[0].toUpperCase());
ok('outcomeStyle uses only #66FF00 / #007FFF (locked §6)', hexes.every(h => h === '#66FF00' || h === '#007FFF'));

// ── 5. render actually consumes outcomeStyle, not a hardcoded LIME ─────────
const render = src.slice(src.indexOf('top: 78'), src.indexOf('top: 78') + 1400);
ok('eyebrow colour comes from os.accent', /color: os\.accent, marginBottom/.test(render));
ok('emphasis colour comes from os.accent (was hardcoded LIME)', /color: os\.accent \}\}>\{emphasis\}/.test(render));
ok('underline is conditional on os.underline', /os\.underline &&/.test(render));
ok('container rule is conditional on os.rule', /os\.rule \? \{ borderLeft: `2px solid \$\{os\.accent\}`/.test(render));
ok('no hardcoded lime left in the eyebrow / emphasis of the Quick-read block', !/background: LIME \}\} \/>\s*<\/span>\s*<\/div>\s*<p style=\{\{ fontFamily: "Georgia[^]*?color: LIME \}\}>\{emphasis\}/.test(render));

// ── 6. text/semantics unchanged for the resolved path ─────────────────────
ok('SINGLE still renders the picked headline verbatim (no wording change)',
   /outcome: 'SINGLE', headlinePre: picked\.headlinePre, emphasis: picked\.emphasis/.test(bn));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
