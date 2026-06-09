// BAU — WO-1336 Causal Inference OS
// Validates: envelope, substrate, vector engine, TAS, provenance DAG, epistemic aging, lock manager, orchestrator.

import { createEnvelope, validateEnvelope } from './src/engine/causalos/envelope.js';
import { CausalSubstrate }                  from './src/engine/causalos/substrate.js';
import { VectorEngine, VectorEngineState }  from './src/engine/causalos/vectorengine.js';
import { TAS, ClockType }                   from './src/engine/causalos/tas.js';
import { ProvenanceDAG }                    from './src/engine/causalos/provenance.js';
import { EpistemicAging, computeLambda, ageConfidence } from './src/engine/causalos/epistemic.js';
import { SystemicLockManager, LockCondition } from './src/engine/causalos/lockmanager.js';
import { CausalInferenceOS, ProjectionTier }  from './src/engine/causalos/index.js';

let pass = 0, fail = 0;
function assert(label, condition) {
  if (condition) { console.log(`  ✓ ${label}`); pass++; }
  else           { console.error(`  ✗ FAIL: ${label}`); fail++; }
}
function section(name) { console.log(`\n[${name}]`); }

// ── Envelope ─────────────────────────────────────────────────────────────────
section('ENVELOPE');
const env = createEnvelope({ event_type: 'TEST', subsystem: 'qa', node_id: 'n1', version: '1.0', payload: { x: 1 }, substrate_time: 1000n, causality_epoch: 1 });
assert('creates with provenance_hash',  !!env.provenance_hash);
assert('substrate_time is BigInt',      typeof env.substrate_time === 'bigint');
assert('replay_context defaults LIVE',  env.replay_context === 'LIVE');
assert('payload is frozen',             Object.isFrozen(env.payload));
assert('validateEnvelope passes',       validateEnvelope(env).valid);
assert('rejects wall-clock number',     (() => { try { createEnvelope({ event_type:'T', subsystem:'s', node_id:'n', version:'v', payload:{}, substrate_time: 1000, causality_epoch:1 }); return false; } catch { return true; } })());

// ── Substrate ─────────────────────────────────────────────────────────────────
section('SUBSTRATE (L1)');
const sub = new CausalSubstrate();
assert('always active on init',    sub.active === true);
const f = sub.ingest({ substrate_time: 1000n, signalDensity: 0.8, lagMs: 50, volatility: 0.2, frameConfidence: 0.9, vectors: { D:0.7, V:0.2, A:0.6, T:0.5 } });
assert('densityField in [0,1]',    f.densityField >= 0 && f.densityField <= 1);
assert('temporalPressure in [0,1]',f.temporalPressure >= 0 && f.temporalPressure <= 1);
assert('substrate_time preserved', f.substrate_time === 1000n);
assert('rejects regressed time',   (() => { try { sub.ingest({ substrate_time: 500n }); return false; } catch { return true; } })());

// ── Vector Engine ─────────────────────────────────────────────────────────────
section('VECTOR ENGINE (L2)');
const ve = new VectorEngine();
const r1 = ve.compute({ D:0.1, V:0.1, A:0.1, T:0.1 });
assert('convergenceScore in [0,1]', r1.convergenceScore >= 0 && r1.convergenceScore <= 1);
assert('no emergence at low score', !r1.emergence);
// Drive to emergence: stateId=4, score>0.70, noveltyDelta>0.05
let emerged = false;
for (let i = 0; i < 200; i++) {
  const r = ve.compute({ D: 0.95, V: 0.05, A: 0.95, T: 0.95 });
  if (r.emergence) { emerged = true; break; }
}
assert('emergence fires at HIGH_CONVERGENCE', emerged);
assert('lock halts engine',  (() => { const v2 = new VectorEngine(); v2.lock(); return v2.locked; })());

// ── TAS ───────────────────────────────────────────────────────────────────────
section('TAS (L3)');
const tas = new TAS();
tas.advance(ClockType.SUBSTRATE, 1000n);
assert('substrate advances',           tas.substrateTime() === 1000n);
assert('equal timestamp accepted',     (() => { try { tas.advance(ClockType.SUBSTRATE, 1000n); return true; } catch { return false; } })());
assert('regression throws DESYNC',     (() => { try { tas.advance(ClockType.SUBSTRATE, 999n); return false; } catch(e) { return e.message.includes('CLOCK_DESYNC'); } })());
assert('assertInferenceClock passes',  (() => { try { tas.assertInferenceClock(ClockType.SUBSTRATE); return true; } catch { return false; } })());
assert('render_time not for inference',(() => { try { tas.assertInferenceClock(ClockType.RENDER); return false; } catch { return true; } })());

// ── Provenance DAG ────────────────────────────────────────────────────────────
section('PROVENANCE DAG (L3)');
const dag = new ProvenanceDAG();
const e1 = createEnvelope({ event_type:'SIG',   subsystem:'qa', node_id:'n', version:'v', payload:{}, substrate_time: 1n, causality_epoch: 1 });
const e2 = createEnvelope({ event_type:'VEC',   subsystem:'qa', node_id:'n', version:'v', payload:{}, substrate_time: 2n, causality_epoch: 2 });
const e3 = createEnvelope({ event_type:'EMERG', subsystem:'qa', node_id:'n', version:'v', payload:{}, substrate_time: 3n, causality_epoch: 3 });
dag.add(e1);
dag.add(e2, [e1.event_id]);
dag.add(e3, [e2.event_id]);
assert('DAG has 3 nodes',              dag.size() === 3);
const chain = dag.trace(e3.event_id);
assert('trace returns full chain',     chain.length === 3);
assert('chain order: root first',      chain[0].event_id === e1.event_id);
assert('duplicate throws',             (() => { try { dag.add(e1); return false; } catch(e) { return e.message.includes('PROVENANCE_BREAK'); } })());

// ── Epistemic Aging ───────────────────────────────────────────────────────────
section('EPISTEMIC AGING (L3)');
const aging = new EpistemicAging();
assert('ageConfidence at t=0 equals C0', Math.abs(ageConfidence(0.9, 0.001, 0) - 0.9) < 1e-9);
assert('confidence decays over time',    ageConfidence(0.9, 0.001, 5000) < 0.9);
aging.register('test-event', 0.85, { domainVolatility: 0.2 }, 1000);
assert('query returns aged confidence',  aging.query('test-event', 1000) > 0);
assert('unknown event returns 0',        aging.query('unknown', 1000) === 0);
const evicted = aging.evict(1000 + 1e9); // far future — should evict
assert('eviction removes decayed',       evicted.length > 0 || aging.size === 0);

// ── Lock Manager ──────────────────────────────────────────────────────────────
section('LOCK MANAGER (L3)');
const lm = new SystemicLockManager();
assert('not locked on init',      !lm.locked);
lm.lock(LockCondition.PROVENANCE_BREAK, 'test');
assert('locked after lock()',     lm.locked);
assert('condition recorded',      lm.condition === LockCondition.PROVENANCE_BREAK);
assert('projection throws when locked', (() => { try { lm.assertProjectionAllowed(); return false; } catch { return true; } })());
const lm2 = new SystemicLockManager();
lm2.check(new Error('CLOCK_DESYNC: substrate_time regressed'));
assert('check auto-locks on DESYNC', lm2.locked && lm2.condition === LockCondition.CLOCK_DESYNC);

// ── CausalInferenceOS (full pipeline) ────────────────────────────────────────
section('CAUSAL INFERENCE OS (E2E)');
const os = new CausalInferenceOS();
assert('not locked on init',      !os.locked);
// Normal tick — no emergence
const r = os.ingest({ substrate_time_ms: 1000, vectors: { D:0.3, V:0.3, A:0.3, T:0.3 } });
assert('normal tick returns null', r === null);
assert('provenance DAG populated', os.provenanceDAG.size() >= 1);
// Drive emergence
let emergenceEnv = null;
for (let i = 0; i < 300; i++) {
  const e = os.ingest({ substrate_time_ms: 1000 + i * 10, vectors: { D:0.95, V:0.05, A:0.95, T:0.95 } });
  if (e) { emergenceEnv = e; break; }
}
assert('emergence produced envelope',       !!emergenceEnv);
assert('emergence event_type is EMERGENCE', emergenceEnv?.event_type === 'EMERGENCE');
assert('emergence has provenance_hash',     !!emergenceEnv?.provenance_hash);
assert('emergence recorded in DAG',         os.provenanceDAG.has(emergenceEnv?.event_id));
// Out-of-order timestamp should lock
const result = os.ingest({ substrate_time_ms: 0, vectors: {} });
assert('CLOCK_DESYNC locks OS',             os.locked);
// Locked OS returns null
assert('locked OS returns null on ingest',  os.ingest({ substrate_time_ms: 9999 }) === null);

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(52)}`);
console.log(`WO-1336 BAU: ${pass} pass / ${fail} fail`);
if (fail > 0) process.exit(1);
