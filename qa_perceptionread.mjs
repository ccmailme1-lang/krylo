// qa_perceptionread.mjs — KRYL-1117 Perception Producer ↔ Inference Core contract.
// Proves: (1) the producer surfaces the uncollapsed field (§21, no aggregation across the boundary),
// (2) perception OUTPUT is a valid inference INPUT, (3) routing through perception === feeding raw
// particles directly (the producer changes routing, not results).

import { buildPerceptionField } from './src/engine/perceptionread.js';
import { inferFormation } from './src/engine/formationinference.js';

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };

// pool-shaped signals (what getAllSignals emits): { domain, confidence, polarity, ts }
const sig = (domain, confidence, polarity = 'constructive', ts = 1) => ({ domain, confidence, polarity, ts });

const scenarios = {
  'asserts (TECH+CAP aligned)': [sig('TECHNOLOGY', 80), sig('CAPITAL', 80)],
  'null (opposed)':            [sig('TECHNOLOGY', 80), sig('CAPITAL', 80, 'fracture')],
  'null (single domain)':      [sig('TECHNOLOGY', 90)],
  'three strong, one opposed': [sig('TECHNOLOGY', 80), sig('CAPITAL', 80), sig('MEDIA', 80, 'fracture')],
  'empty pool':                [],
};

console.log('Perception Producer ↔ Inference Core contract\n');

for (const [name, signals] of Object.entries(scenarios)) {
  // inject the fixture as the perception source
  const field = buildPerceptionField({ source: () => signals, now: 1000 });

  // (1) uncollapsed pass-through — count preserved, no aggregation
  ok(`${name}: field surfaces all ${signals.length} particles (no aggregation)`, field.count === signals.length);
  ok(`${name}: field frozen`, Object.isFrozen(field) && Object.isFrozen(field.particles));

  // (2) perception output is a valid inference input (runs, returns Formation|null)
  const viaPerception = inferFormation(field.particles, { now: 1000 });
  ok(`${name}: perception output is a valid inference input`, viaPerception === null || typeof viaPerception === 'object');

  // (3) routing through perception === feeding raw particles directly
  const direct = inferFormation(signals, { now: 1000 });
  const same =
    (viaPerception === null && direct === null) ||
    (viaPerception && direct &&
      viaPerception.id === direct.id &&
      viaPerception.existence === direct.existence &&
      viaPerception.participatingDomains.join(',') === direct.participatingDomains.join(','));
  ok(`${name}: perception-routed === direct (producer changes routing, not results)`, same);
}

// (4) each surfaced particle carries the fields the inference core consumes
const f = buildPerceptionField({ source: () => scenarios['asserts (TECH+CAP aligned)'] });
ok('particle shape carries {domain, confidence, polarity}',
   f.particles.every(p => typeof p.domain === 'string' && typeof p.confidence === 'number'
                        && (p.polarity === 'constructive' || p.polarity === 'fracture')));

// (5) default source path (live pool) runs without a fixture — empty pool → empty field → null
const live = buildPerceptionField({ now: 1 });
ok('default live-pool source runs (no throw)', typeof live.count === 'number');
ok('empty live field → inference null', inferFormation(live.particles) === null);

console.log(`\nRESULT: ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
