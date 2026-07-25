// qa_formationinference.mjs — KRYL-1117 Formation Inference Layer (engine core).
// Golden set: recompute C/Q/Ḡ/E from first principles and prove the engine matches to 1e-9.
// Plus invariants INV-7…INV-10 and the §8 impossibility proofs.

import {
  inferFormation, formationExists, cohesion, pressureCoherence, avgGroundedness,
  FORMATION_EXISTENCE_FLOOR, CO_PRESENCE_FLOOR,
} from './src/engine/formationinference.js';

let pass = 0, fail = 0;
const ok  = (n, c) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

// particle helper: confidence 0..100
const P = (domain, confidence, polarity = 'constructive', ts = 1) => ({ domain, confidence, polarity, ts });

// ── independent recompute (an "outside inspector"), NOT using the engine's derived fns ──
function expect(particles, coFloor = CO_PRESENCE_FLOOR) {
  const norm = particles
    .filter(p => p.polarity === 'constructive' || p.polarity === 'fracture')
    .map(p => ({ d: p.domain.toUpperCase(), mag: Math.max(0, Math.min(1, p.confidence / 100)),
                 sign: p.polarity === 'fracture' ? -1 : 1 }));
  const agg = new Map();
  for (const p of norm) { const a = agg.get(p.d) ?? { n: 0, sum: 0, net: 0 }; a.n++; a.sum += p.mag; a.net += p.sign * p.mag; agg.set(p.d, a); }
  const strong = [...agg.keys()].filter(d => agg.get(d).sum / agg.get(d).n >= coFloor).sort();
  const D = strong.length;
  const edges = D * (D - 1) / 2;
  const C = edges > 0 ? edges / (D * (D - 1) / 2) : 0; // = 1 when D≥2
  let net = 0, gross = 0;
  for (const d of strong) { net += agg.get(d).net; gross += Math.abs(agg.get(d).net); }
  const Q = gross > 0 ? Math.abs(net) / gross : 0;
  const G = 1; // GROUNDEDNESS_OBSERVED pass-through
  return { participating: strong, D, C, Q, G, E: (D >= 2 ? C * Q * G : 0) };
}

console.log('Formation Inference Layer — engine core\n');
console.log(`constants: FLOOR=${FORMATION_EXISTENCE_FLOOR}  CO_PRESENCE=${CO_PRESENCE_FLOOR}\n`);

// ── Golden set: engine output === independent recompute ──
console.log('golden set (engine === inspector recompute):');
const cases = {
  'A below-floor (weak, no strong domain)':      [P('TECHNOLOGY', 20), P('CAPITAL', 20)],
  'B two-domain aligned strong':                 [P('TECHNOLOGY', 80), P('CAPITAL', 80)],
  'C two-domain opposed (Q=0)':                  [P('TECHNOLOGY', 80), P('CAPITAL', 80, 'fracture')],
  'D three-domain, one weak (E_NO_EDGE)':        [P('TECHNOLOGY', 80), P('CAPITAL', 80), P('KNOWLEDGE', 30)],
  'E three strong, one opposed (E≈0.333)':       [P('TECHNOLOGY', 80), P('CAPITAL', 80), P('MEDIA', 80, 'fracture')],
  'F balanced opposition (Q=0)':                 [P('TECHNOLOGY', 80), P('CAPITAL', 80), P('MEDIA', 80, 'fracture'), P('LABOR', 80, 'fracture')],
  'G within-domain cancellation':                [P('TECHNOLOGY', 80), P('TECHNOLOGY', 80, 'fracture'), P('CAPITAL', 80)],
};
for (const [name, particles] of Object.entries(cases)) {
  const ex = expect(particles);
  const f  = inferFormation(particles, { now: 1000 });
  const asserted = ex.E >= FORMATION_EXISTENCE_FLOOR && ex.D >= 2;
  if (!asserted) {
    ok(`${name}: → null`, f === null);
  } else {
    ok(`${name}: asserted`, f !== null);
    if (f) {
      ok(`${name}: C=${f.cohesion.toFixed(4)} matches`, near(f.cohesion, ex.C));
      ok(`${name}: Q=${f.pressureCoherence.toFixed(4)} matches`, near(f.pressureCoherence, ex.Q));
      ok(`${name}: Ḡ=${f.avgGroundedness.toFixed(4)} matches`, near(f.avgGroundedness, ex.G));
      ok(`${name}: E=${f.existence.toFixed(4)} matches`, near(f.existence, ex.E));
      ok(`${name}: E === C·Q·Ḡ`, near(f.existence, f.cohesion * f.pressureCoherence * f.avgGroundedness, 1e-12));
      ok(`${name}: participating matches`, f.participatingDomains.join(',') === ex.participating.join(','));
    }
  }
}

// specific expected values (documents the math)
console.log('\nexplicit values:');
const E = inferFormation(cases['E three strong, one opposed (E≈0.333)']);
ok('E-case Q = 0.8/2.4 = 0.3333', near(E.pressureCoherence, 0.8 / 2.4));
ok('E-case E ≈ 0.3333 (asserts, just above floor)', near(E.existence, 0.8 / 2.4) && E.existence >= 0.30);
const G = inferFormation(cases['G within-domain cancellation']);
ok('G-case Q = 1 (cancelled TECH drops out of net+gross)', near(G.pressureCoherence, 1));
ok('G-case E = 1', near(G.existence, 1));

// ── formationExists matches inferFormation nullness ──
console.log('\ndecision/construction split consistent:');
for (const [name, particles] of Object.entries(cases)) {
  const decided = formationExists(particles);
  const built   = inferFormation(particles) !== null;
  ok(`${name}: predicate === constructed`, decided === built);
}

// ── Invariants (INV-7…INV-10) ──
console.log('\ninvariants:');
const b = inferFormation(cases['B two-domain aligned strong']);
ok('INV-7  0≤C,Q,Ḡ,E≤1', [b.cohesion, b.pressureCoherence, b.avgGroundedness, b.existence].every(x => x >= 0 && x <= 1));
ok('INV-8  E=0 when Q=0 (case C null → E craters)', inferFormation(cases['C two-domain opposed (Q=0)']) === null);
ok('INV-1  frozen (formation)', Object.isFrozen(b) && Object.isFrozen(b.graph) && Object.isFrozen(b.particles));
ok('INV-2  no future-tense: temporal all null', Object.values(b.temporal).every(v => v === null));

// INV-10 path-independence: shuffle order → identical id + scalars
const shuffled = [...cases['E three strong, one opposed (E≈0.333)']].reverse();
const e1 = inferFormation(cases['E three strong, one opposed (E≈0.333)']);
const e2 = inferFormation(shuffled);
ok('INV-10 shuffled order → same id',   e1.id === e2.id);
ok('INV-10 shuffled order → same E',    near(e1.existence, e2.existence));

// INV-10 id depends on TOPOLOGY only, NOT on E/Q: same domains+edges, different Q ⇒ same id
const topoA = inferFormation([P('TECHNOLOGY', 80), P('CAPITAL', 80), P('MEDIA', 80)]);              // Q=1, E=1
const topoB = inferFormation([P('TECHNOLOGY', 80), P('CAPITAL', 80), P('MEDIA', 80, 'fracture')]);  // Q=.333, E=.333
ok('INV-10 same topology, different E → same id', topoA.id === topoB.id);
ok('INV-10 …and the E values genuinely differ', !near(topoA.existence, topoB.existence));

// ── §8 impossibility proofs ──
console.log('\nimpossibility proofs (§8):');
ok('IMPOSSIBLE <2 domains (single strong domain) → null', inferFormation([P('TECHNOLOGY', 90)]) === null);
ok('IMPOSSIBLE without grounded evidence (groundedness 0) → null',
   inferFormation([{ domain: 'TECHNOLOGY', confidence: 90, polarity: 'constructive', groundedness: 0 },
                   { domain: 'CAPITAL', confidence: 90, polarity: 'constructive', groundedness: 0 }]) === null);
const unk = inferFormation([P('ENERGY', 90), P('TECHNOLOGY', 90), P('CAPITAL', 90)]);
ok('IMPOSSIBLE invented domain widens the six (ENERGY excluded, not a vertex)',
   unk && !unk.participatingDomains.includes('ENERGY') && unk.participatingDomains.length === 2);
ok('IMPOSSIBLE inferred temporal values (all null on an asserted formation)',
   Object.values(unk.temporal).every(v => v === null));
// missing polarity → excluded, not fabricated
const mp = inferFormation([{ domain: 'TECHNOLOGY', confidence: 90 }, P('CAPITAL', 90), P('MEDIA', 90)]);
ok('missing polarity particle excluded (E_MISSING_POLARITY), rest still form',
   mp && mp.participatingDomains.includes('CAPITAL') && mp.participatingDomains.includes('MEDIA')
      && mp.boundary.excluded.some(x => x.code === 'E_MISSING_POLARITY'));

console.log(`\nRESULT: ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
