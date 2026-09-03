// qa_cf_integration.mjs — CF production-readiness WS5 (integration boundary).
//
// Validates the parallel async CF producer plugs into live KRYLO without:
//   - replacing the synchronous inferFormation(field.particles) path,
//   - being a synchronous prerequisite for signal publication (INV-006),
//   - being imported by any of the 3 existing inferFormation call sites.
//
// Run: node qa_cf_integration.mjs

import { execSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { append as appendSubsignal, _resetSubsignalBuffer } from './src/engine/subsignalbuffer.js';
import { inferFormation } from './src/engine/formationinference.js';
import {
  startCFProducer, stopCFProducer, tick, getCFFormation, producerState,
} from './src/engine/cf/producer.js';

const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); else console.log('  ✓ ' + m); };

// ── zero replacement + Gate 1 wiring — structural ───────────────────────
console.log('\nWS5/Gate1 — zero replacement of the synchronous path (structural)\n');
{
  const callSites = ['src/components/analysis/targetpacket.jsx',
                     'src/components/analysis/analysisfield.jsx',
                     'src/engine/formationprospectusproducer.js'];
  // no call site imports an ANALYTICAL CF module (producer/pathwaystore/significance/
  // runner/telemetry). Importing the cffield.jsx component or cf/read.js is fine.
  for (const f of callSites) {
    const bad = execSync(`grep -n "engine/cf/\\(producer\\|pathwaystore\\|significance\\|runner\\|telemetry\\|cfpathwaystore\\|cfrunner\\)" ${f} || true`, { encoding: 'utf8' }).trim();
    ok(bad === '', `${f.split('/').pop()} imports no analytical CF module (${bad || 'clean'})`);
  }
  // the 3 synchronous call sites still call the field-particle path, unchanged
  for (const [f, pat] of [
    ['src/components/analysis/targetpacket.jsx', 'field.particles.length ? inferFormation(field.particles) : null'],
    ['src/components/analysis/analysisfield.jsx', 'inferFormation(field.particles, { now: 1 })'],
    ['src/engine/formationprospectusproducer.js', 'inferFormation(field.particles, opts)'],
  ]) {
    const n = execSync(`grep -Fc "${pat}" ${f} || true`, { encoding: 'utf8' }).trim();
    ok(n === '1', `${f.split('/').pop()} synchronous formation call byte-identical (${pat})`);
  }
  // Gate 1: cffield.jsx IS wired into targetpacket.jsx as a distinct section after 05 PROVENANCE
  const tpImport = execSync(`grep -c "import CFField from './cffield.jsx'" src/components/analysis/targetpacket.jsx || true`, { encoding: 'utf8' }).trim();
  const tpUse = execSync(`grep -c "<CFField />" src/components/analysis/targetpacket.jsx || true`, { encoding: 'utf8' }).trim();
  const afterProv = execSync(`awk '/ordinal="05" title="PROVENANCE"/{p=1} p&&/<CFField \\/>/{print "yes"; exit}' src/components/analysis/targetpacket.jsx`, { encoding: 'utf8' }).trim();
  ok(tpImport === '1' && tpUse === '1', 'cffield.jsx wired into targetpacket.jsx (import + one <CFField /> use)');
  ok(afterProv === 'yes', 'CFField renders after the 05 PROVENANCE section (distinct section)');
  // cffield.jsx imports ONLY cf/read.js
  const cffieldImports = execSync(`grep -n "^import .*engine/cf/" src/components/analysis/cffield.jsx || true`, { encoding: 'utf8' }).trim();
  ok(/engine\/cf\/read\.js/.test(cffieldImports) && !/producer|pathwaystore|significance|runner|telemetry/.test(cffieldImports),
     'cffield.jsx imports only cf/read.js (the pure read surface)');
  // daemon owns the CF cadence (Gate 2 applied at Gate 1)
  const daemonTick = execSync(`grep -c "cfProducerTick()" src/ingestion/daemon.js || true`, { encoding: 'utf8' }).trim();
  const daemonStart = execSync(`grep -c "startCFProducer({ tickMs: null })" src/ingestion/daemon.js || true`, { encoding: 'utf8' }).trim();
  ok(Number(daemonTick) >= 1 && daemonStart === '1', 'daemon.js owns the CF cadence (startCFProducer + cfProducerTick in runCycle)');
  const producerSelfTimer = execSync(`grep -rn "startCFProducer({ tickMs:" src --include=*.jsx || true`, { encoding: 'utf8' }).trim();
  ok(producerSelfTimer === '', 'no .jsx starts the CF producer with a self-timer (UI does not own cadence)');
}

// ── read-only pool tap — INV-006 ─────────────────────────────────────────
console.log('\nWS5 — read-only pool tap, INV-006\n');
{
  _resetSubsignalBuffer();
  // baseline: append latency with NO CF subscriber
  const t0 = performance.now();
  for (let i = 0; i < 5000; i++) appendSubsignal({ source: 'FRED', domain: 'CAPITAL', signal: 55, confidence: 0.8, ts: i });
  const baseAppend = performance.now() - t0;

  _resetSubsignalBuffer();
  startCFProducer({ tickMs: null });                    // manual tick — subscribe only
  const t1 = performance.now();
  for (let i = 0; i < 5000; i++) appendSubsignal({ source: 'FRED', domain: 'CAPITAL', signal: 55, confidence: 0.8, ts: i });
  const withCFAppend = performance.now() - t1;

  ok(producerState().subscribed === true, 'producer subscribed to the pool tap');
  ok(producerState().pending === 5000, 'the subscribe callback only enqueued (5000 pending, 0 processed synchronously)');
  ok(withCFAppend < Math.max(baseAppend * 2, baseAppend + 2),
     `append latency with CF subscriber is not materially higher (${baseAppend.toFixed(2)}ms → ${withCFAppend.toFixed(2)}ms) — no analytical work on the publish path`);

  // analytical work happens only on tick()
  const cand = tick();
  ok(producerState().pending === 0, 'tick() drained the queue');
  ok(cand === null || cand.kind === 'CF_FORMATION_CANDIDATE',
     'tick() returns either null (single-domain input, no formation) or a distinct CF_FORMATION_CANDIDATE — never malformed');
  stopCFProducer();
  ok(producerState().subscribed === false, 'stopCFProducer() unsubscribed cleanly');
}

// ── independent FormationCandidate — no cross-mutation ───────────────────
console.log('\nWS5 — independent candidate, distinct slot\n');
{
  _resetSubsignalBuffer();
  startCFProducer({ tickMs: null });
  // same signal reaches both paths
  const recs = [
    { source: 'SEC_EDGAR', domain: 'OWNERSHIP', signal: 55, confidence: 0.9, ts: 1, canonicalEventId: 'acq-9' },
    { source: 'GDELT',     domain: 'MEDIA',     signal: 55, confidence: 0.9, ts: 2, canonicalEventId: 'acq-9' },
    { source: 'FEC',       domain: 'CAPITAL',   signal: 50, confidence: 0.9, ts: 3, canonicalEventId: 'acq-9' },
  ];
  for (const r of recs) appendSubsignal(r);
  tick();
  const cfCand = getCFFormation();

  // the synchronous path over the same raw particles (field-scoped, no persistence)
  const syncParticles = recs.map(r => ({ domain: r.domain, confidence: Math.round(r.confidence * 100), polarity: 'constructive', ts: r.ts }));
  const syncFormation = inferFormation(syncParticles);

  ok(cfCand && cfCand.label === 'COGNITIVE FABRIC READ', 'CF candidate carries a distinct render label');
  ok(cfCand.kind === 'CF_FORMATION_CANDIDATE' && (!syncFormation || syncFormation.kind !== 'CF_FORMATION_CANDIDATE'),
     'CF candidate is a distinct object kind from the synchronous formation');
  ok(cfCand !== syncFormation, 'CF candidate and synchronous formation are different objects (no shared reference)');
  ok(Array.isArray(cfCand.participatingDomains) && cfCand.reconstructable === true,
     'CF candidate is fully formed with reconstructable provenance');

  // O(1) read — getCFFormation does no work
  const tr0 = performance.now();
  for (let i = 0; i < 200000; i++) getCFFormation();
  const readTime = performance.now() - tr0;
  ok(readTime < 50, `getCFFormation() is O(1) — 200k reads in ${readTime.toFixed(1)}ms (safe for a render path)`);
  stopCFProducer();
}

// ── verdict ─────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(80));
if (fails.length) {
  console.log(`WS5: ${fails.length} FAILED`);
  for (const f of fails) console.log('  ✗ ' + f);
  process.exit(1);
}
console.log('WS5 (integration boundary) — ALL CHECKS PASS');
console.log('CF plugs in as a parallel async producer: read-only tap, own candidate, distinct slot, zero replacement.');
process.exit(0);
