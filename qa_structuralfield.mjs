// qa_structuralfield.mjs — KRYL-1243.
// The Structural Field geometry must be a deterministic function of the six field
// values only: same v -> same polygon; changes ONLY when the input vector changes;
// absence keeps its angle and never renders at r = 0.
//
// Run: node qa_structuralfield.mjs

import { readFileSync } from 'node:fs';

let pass = 0, fail = 0;
const ok = (l, c) => { if (c) { pass++; console.log(`  ✓ ${l}`); } else { fail++; console.log(`  ✗ ${l}`); } };

// Re-derive the geometry with the SAME constants/formula the component uses, then
// assert the invariants. (The component is JSX; this checks the math contract + a
// source scan that the component wires nothing else in.)
const ROT = -Math.PI / 2;
const DOMAINS = [
  ['capital', 0], ['technology', Math.PI / 3], ['knowledge', (2 * Math.PI) / 3],
  ['ownership', Math.PI], ['media', (4 * Math.PI) / 3], ['labor', (5 * Math.PI) / 3],
];
const C = 100, R_MIN = 14, R_MAX = 82, R_ABSENT = 46;
const clamp01 = v => Math.max(0, Math.min(1, v));
const radius = v => R_MIN + (R_MAX - R_MIN) * clamp01(v);

function geometry(cones) {
  return DOMAINS.map(([key, theta]) => {
    const raw = cones[key] ? cones[key].value : null;
    const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
    const a = theta + ROT;
    const absent = value === null;
    const r = absent ? R_ABSENT : radius(value);
    return { key, absent, x: +(C + r * Math.cos(a)).toFixed(3), y: +(C + r * Math.sin(a)).toFixed(3), r: +r.toFixed(3) };
  });
}
const C2 = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { value: v }]));

const V = { capital: 0.6, technology: 0.4, knowledge: 0.8, ownership: null, media: 0.3, labor: 0.7 };

// ── 1. deterministic — same vector, same geometry ───────────────────────────
ok('same six-value vector -> identical geometry', JSON.stringify(geometry(C2(V))) === JSON.stringify(geometry(C2(V))));

// ── 2. geometry changes ONLY when the input vector changes ──────────────────
const g0 = JSON.stringify(geometry(C2(V)));
ok('an unrelated / extra key does not move any vertex', JSON.stringify(geometry(C2({ ...V, __intent: 0.99 }))) === g0);
ok('changing one domain value moves exactly that vertex',
   (() => { const g1 = geometry(C2({ ...V, media: 0.9 })); const g = geometry(C2(V));
     return g1.filter((n, i) => JSON.stringify(n) !== JSON.stringify(g[i])).map(n => n.key).join() === 'media'; })());

// ── 3. angular position is a constant function of domain identity (AC-13) ───
const hi = geometry(C2({ capital: 1, technology: 1, knowledge: 1, ownership: 1, media: 1, labor: 1 }));
const lo = geometry(C2({ capital: 0, technology: 0, knowledge: 0, ownership: 0, media: 0, labor: 0 }));
ok('domain angle is identical at v=1 and v=0 (only radius differs)',
   hi.every((n, i) => Math.atan2(n.y - C, n.x - C).toFixed(4) === Math.atan2(lo[i].y - C, lo[i].x - C).toFixed(4)));

// ── 4. radial map is affine for valid values (AC-14) ───────────────────────
ok('r is affine in v: r(0)=R_MIN, r(1)=R_MAX, r(0.5) = midpoint', radius(0) === R_MIN && radius(1) === R_MAX && radius(0.5) === (R_MIN + R_MAX) / 2);

// ── 5. absence is NOT zero (SPEC §7) ───────────────────────────────────────
const gAbsent = geometry(C2(V)).find(n => n.key === 'ownership');
const gZero   = geometry(C2({ ...V, ownership: 0 })).find(n => n.key === 'ownership');
ok('absent domain: r = R_ABSENT, not R_MIN and not 0', gAbsent.absent && gAbsent.r === R_ABSENT && gAbsent.r !== R_MIN && gAbsent.r !== 0);
ok('absent vertex is NOT the same point as a value-0 vertex', gAbsent.x !== gZero.x || gAbsent.y !== gZero.y);
ok('absent domain keeps its angular position', Math.atan2(gAbsent.y - C, gAbsent.x - C).toFixed(4) === Math.atan2(gZero.y - C, gZero.x - C).toFixed(4));
const allAbsent = geometry(C2({}));
ok('all six absent -> six vertices still placed (scaffold, not empty)', allAbsent.length === 6 && allAbsent.every(n => n.absent && n.r === R_ABSENT));

// ── 6. canonical cyclic order is the only one wired (AC-15) ─────────────────
const src = readFileSync(new URL('./src/components/analysis/structuralfield.jsx', import.meta.url), 'utf8');
ok('component defines exactly one DOMAINS order: capital,technology,knowledge,ownership,media,labor',
   /key: 'capital'[\s\S]*?key: 'technology'[\s\S]*?key: 'knowledge'[\s\S]*?key: 'ownership'[\s\S]*?key: 'media'[\s\S]*?key: 'labor'/.test(src));

// ── 7. no frame-parameter distortion wired in (AC-16) ──────────────────────
ok('component does not read intentMagnitude / volatilityShock / seedQuery / horizon',
   !/intentMagnitude|volatilityShock|seedQuery|horizon|intentShift|shockShift/.test(src));
const field = readFileSync(new URL('./src/components/analysis/analysisidlefield.jsx', import.meta.url), 'utf8');
ok('the render site removed the old intent/shock displacement', !/intentShift|shockShift/.test(field));
ok('the old FORENSIC MATRIX / SLAB INTERSECT block is gone', !/FORENSIC MATRIX FIELDS|SLAB INTERSECT|SLAB \/\/ 6-DOMAIN/.test(field));
ok('StructuralField is mounted with cones only', /<StructuralField cones=\{activeCones/.test(field));

// ── 8. semantic language (SPEC §6) ────────────────────────────────────────
ok('no forbidden decision language in the component', !/\b(risk|opportunity|probability|confidence|recommend|attractive|predicted|higher is better)\b/i.test(src.replace(/context only/gi, '')));

// ── 9. container-fit correction (KRYL-1243 live acceptance) ────────────────
ok('short domain labels wired: CAP / TECH / KNOW / OWN / MEDIA / LAB',
   /short: 'CAP'[\s\S]*'TECH'[\s\S]*'KNOW'[\s\S]*'OWN'[\s\S]*'MEDIA'[\s\S]*'LAB'/.test(src));
ok('value is stacked beneath the label (tspan dy)', /<tspan x=\{n\.lx[^}]*\} dy="8"/.test(src));
ok('side labels are edge-pinned to the container (x = 3 / 197)', /cos > 0 \? 197 : 3/.test(src));
ok('redundant bottom caption removed', !/SIX-DOMAIN OBSERVABLE FIELD · CONTEXT ONLY/.test(src));
ok('geometry constants unchanged (R_MIN 14 / R_MAX 82 / R_ABSENT 46)',
   /R_MIN = 14/.test(src) && /R_MAX = 82/.test(src) && /R_ABSENT = 46/.test(src));
ok('label placement uses no geometry constant beyond R_MAX for the y-offset only',
   !/const R_MIN = 1[0-3]|const R_MAX = (7[0-9]|8[0-1]|83)/.test(src));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
