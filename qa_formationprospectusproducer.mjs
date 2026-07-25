// qa_formationprospectusproducer.mjs — KRYL-1117 live wrapper.
// Proves the end-to-end chain === the manual composition, and that the live pool path runs.

import { buildLiveProspectus } from './src/engine/formationprospectusproducer.js';
import { buildPerceptionField } from './src/engine/perceptionread.js';
import { inferFormation } from './src/engine/formationinference.js';
import { buildFormationProspectus } from './src/engine/formationprospectus.js';

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };
const sig = (domain, confidence, polarity = 'constructive', ts = 1) => ({ domain, confidence, polarity, ts });

console.log('Live prospectus wrapper\n');

const scenarios = {
  'asserts': [sig('TECHNOLOGY', 80), sig('CAPITAL', 80), sig('MEDIA', 80, 'fracture')],
  'null':    [sig('TECHNOLOGY', 90)],
  'empty':   [],
};

for (const [name, signals] of Object.entries(scenarios)) {
  const source = () => signals;
  const live = buildLiveProspectus({ source, now: 1000 });

  // manual composition for comparison
  const field  = buildPerceptionField({ source, now: 1000 });
  const formed = inferFormation(field.particles, { now: 1000 });
  const manual = buildFormationProspectus(formed, { now: 1000, windowMs: field.windowMs });

  ok(`${name}: 12 sections`, live.sections.length === 12);
  ok(`${name}: live === manual composition (header state)`, live.header.state === manual.header.state);
  ok(`${name}: live === manual composition (existence)`, live.header.existence === manual.header.existence);
  ok(`${name}: live frozen`, Object.isFrozen(live) && Object.isFrozen(live.sections));
}

// default live-pool path runs without a fixture (empty pool → withheld prospectus)
const p = buildLiveProspectus({ now: 1 });
ok('default live-pool runs → INSUFFICIENT (empty pool)', p.header.state === 'INSUFFICIENT SIGNAL' && p.live === false);

console.log(`\nRESULT: ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
