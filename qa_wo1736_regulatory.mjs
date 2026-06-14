// qa_wo1736_regulatory.mjs — v2 — dual-lens temporal kernel
// Run: node qa_wo1736_regulatory.mjs
import {
  evaluateTemporalKernel,
  detectRegulatoryWindow,
  clearRegulatoryLog,
  REGULATORY_STATE,
  FS_GATE,
} from './src/engine/regulatoryconvergence.js';

let pass = 0; let fail = 0;

function assert(label, condition) {
  if (condition) { console.log(`  PASS  ${label}`); pass++; }
  else           { console.error(`  FAIL  ${label}`); fail++; }
}

function sig(domain, signal, confidence = 80) {
  return { domain, signal, confidence, ts: Date.now() };
}

// Build a temporal log entry at a specific offset from now
function entry(kScore, mScore, tScore, cScore, daysAgo = 0) {
  return { ts: Date.now() - daysAgo * 24 * 60 * 60 * 1000, kScore, mScore, tScore, cScore };
}

// ── 01: Empty log → DORMANT ───────────────────────────────────────────────────
console.log('\n01 — Empty log → DORMANT');
{
  const r = evaluateTemporalKernel([]);
  assert('state DORMANT', r.state === REGULATORY_STATE.DORMANT);
  assert('micro not active', r.microWindow.active === false);
  assert('macro not active', r.macroWindow.active === false);
  assert('micro count 0', r.microWindow.count === 0);
  assert('macro distinctDays 0', r.macroWindow.distinctDays === 0);
}

// ── 02: Single K entry in micro window → MICRO_IGNITION ──────────────────────
console.log('\n02 — Single K > 50 in micro window → MICRO_IGNITION');
{
  const log = [entry(55, 30, 40, 30, 5)]; // 5 days ago
  const r = evaluateTemporalKernel(log);
  assert('MICRO_IGNITION', r.state === REGULATORY_STATE.MICRO_IGNITION);
  assert('micro active', r.microWindow.active === true);
  assert('micro count 1', r.microWindow.count === 1);
  assert('micro domainCount 1', r.microWindow.domainCount === 1);
  assert('KNOWLEDGE in domains', r.microWindow.domains.includes('KNOWLEDGE'));
}

// ── 03: Entry at boundary (K = 50) → DORMANT ─────────────────────────────────
console.log('\n03 — K = 50 exactly → DORMANT (> not >=)');
{
  const log = [entry(50, 30, 40, 30, 5)];
  const r = evaluateTemporalKernel(log);
  assert('DORMANT on K=50', r.state === REGULATORY_STATE.DORMANT);
}

// ── 04: T > 55 in micro window → MICRO_IGNITION ──────────────────────────────
console.log('\n04 — T > 55 in micro → MICRO_IGNITION');
{
  const log = [entry(30, 30, 60, 30, 3)];
  const r = evaluateTemporalKernel(log);
  assert('MICRO_IGNITION via T', r.state === REGULATORY_STATE.MICRO_IGNITION);
  assert('TECHNOLOGY in domains', r.microWindow.domains.includes('TECHNOLOGY'));
}

// ── 05: Two entries same domain → MICRO_IGNITION (not CLUSTER) ───────────────
console.log('\n05 — Two K entries in micro → MICRO_IGNITION, not CLUSTER');
{
  const log = [entry(55, 30, 30, 30, 10), entry(58, 30, 30, 30, 5)];
  const r = evaluateTemporalKernel(log);
  assert('MICRO_IGNITION (same domain)', r.state === REGULATORY_STATE.MICRO_IGNITION);
  assert('domainCount 1', r.microWindow.domainCount === 1);
}

// ── 06: K + M in micro window → CROSS_JURISDICTIONAL_CLUSTER ─────────────────
console.log('\n06 — K + M in micro → CROSS_JURISDICTIONAL_CLUSTER');
{
  const log = [entry(55, 55, 30, 30, 5)];
  const r = evaluateTemporalKernel(log);
  assert('CROSS_JURISDICTIONAL_CLUSTER', r.state === REGULATORY_STATE.CROSS_JURISDICTIONAL_CLUSTER);
  assert('domainCount 2', r.microWindow.domainCount === 2);
  assert('KNOWLEDGE in domains', r.microWindow.domains.includes('KNOWLEDGE'));
  assert('MEDIA in domains',     r.microWindow.domains.includes('MEDIA'));
}

// ── 07: K + T in micro window → CROSS_JURISDICTIONAL_CLUSTER ─────────────────
console.log('\n07 — K + T in micro → CROSS_JURISDICTIONAL_CLUSTER');
{
  const log = [entry(55, 30, 60, 30, 5)];
  const r = evaluateTemporalKernel(log);
  assert('CLUSTER via K+T', r.state === REGULATORY_STATE.CROSS_JURISDICTIONAL_CLUSTER);
  assert('domainCount 2', r.microWindow.domainCount === 2);
}

// ── 08: Entry older than micro window → DORMANT ───────────────────────────────
console.log('\n08 — Entry older than micro window (25 days ago) → DORMANT');
{
  const log = [entry(60, 60, 60, 30, 25)]; // 25 days > 21-day micro window
  const r = evaluateTemporalKernel(log);
  assert('DORMANT (entry outside micro)', r.state === REGULATORY_STATE.DORMANT);
  assert('micro count 0', r.microWindow.count === 0);
}

// ── 09: Entry older than macro window → not counted ──────────────────────────
console.log('\n09 — Entry older than macro window (130 days ago) → DORMANT');
{
  const log = [entry(60, 60, 60, 30, 130)]; // 130 days > 120-day macro window
  const r = evaluateTemporalKernel(log);
  assert('DORMANT (outside macro)', r.state === REGULATORY_STATE.DORMANT);
  assert('macro count 0', r.macroWindow.count === 0);
}

// ── 10: MACRO_CONSOLIDATION — cluster + 3 distinct days ──────────────────────
console.log('\n10 — MACRO_CONSOLIDATION: cluster in micro + 3 distinct days in macro');
{
  const log = [
    entry(55, 55, 30, 30, 0),    // today — cluster in micro
    entry(55, 55, 30, 30, 10),   // 10 days ago — distinct day 2 (also in micro)
    entry(55, 55, 30, 30, 30),   // 30 days ago — distinct day 3 (outside micro, in macro)
    entry(55, 55, 30, 30, 60),   // 60 days ago — distinct day 4 (macro only)
  ];
  const r = evaluateTemporalKernel(log);
  assert('MACRO_CONSOLIDATION', r.state === REGULATORY_STATE.MACRO_CONSOLIDATION);
  assert('macro active', r.macroWindow.active === true);
  assert('macro distinctDays ≥ 3', r.macroWindow.distinctDays >= 3);
  assert('micro active (day 0 + day 10)', r.microWindow.active === true);
}

// ── 11: ENFORCEMENT_PRECEDENCE_CONFIRMED — MACRO + phaseC ────────────────────
console.log('\n11 — ENFORCEMENT_PRECEDENCE_CONFIRMED: MACRO_CONSOLIDATION + phaseC');
{
  const log = [
    entry(55, 55, 30, 30, 0),
    entry(55, 55, 30, 30, 10),
    entry(55, 55, 30, 30, 30),
    entry(55, 55, 30, 30, 60),
  ];
  const r = evaluateTemporalKernel(log, true); // phaseC = true
  assert('ENFORCEMENT_PRECEDENCE_CONFIRMED', r.state === REGULATORY_STATE.ENFORCEMENT_PRECEDENCE_CONFIRMED);
}

// ── 12: phaseC alone does NOT reach ENFORCEMENT_PRECEDENCE_CONFIRMED ──────────
console.log('\n12 — phaseC alone without MACRO → no ENFORCEMENT_PRECEDENCE_CONFIRMED');
{
  // Only micro cluster, no macro persistence
  const log = [entry(55, 55, 30, 30, 5), entry(55, 30, 60, 30, 8)];
  const r = evaluateTemporalKernel(log, true); // phaseC = true, but only 2 days
  assert('max CROSS_JURISDICTIONAL_CLUSTER without macro', r.state === REGULATORY_STATE.CROSS_JURISDICTIONAL_CLUSTER);
}

// ── 13: Micro entries on same day → 1 distinct day ───────────────────────────
console.log('\n13 — Same-day entries count as 1 distinct day');
{
  // Two entries today + one 90 days ago + one 60 days ago = 3 distinct days
  const log = [
    entry(55, 55, 30, 30, 0),
    { ts: Date.now() - 1000 * 60 * 60, kScore: 55, mScore: 55, tScore: 30, cScore: 30 }, // 1hr ago = same day
    entry(55, 55, 30, 30, 60),
    entry(55, 55, 30, 30, 90),
  ];
  const r = evaluateTemporalKernel(log);
  assert('3 distinct days (not 4)', r.macroWindow.distinctDays === 3);
  assert('MACRO_CONSOLIDATION', r.state === REGULATORY_STATE.MACRO_CONSOLIDATION);
}

// ── 14: Micro window isolation — old entries don't bleed into micro ───────────
console.log('\n14 — Macro entries do not inflate micro count');
{
  // 3 entries in macro (30/60/90 days) + 0 in micro
  const log = [
    entry(55, 55, 30, 30, 30),
    entry(55, 55, 30, 30, 60),
    entry(55, 55, 30, 30, 90),
  ];
  const r = evaluateTemporalKernel(log);
  assert('micro count 0 (all outside 21d)', r.microWindow.count === 0);
  assert('DORMANT (no micro ignition)', r.state === REGULATORY_STATE.DORMANT);
}

// ── 15: Static phaseA — K + M > 50 ──────────────────────────────────────────
console.log('\n15 — Static phaseA via detectRegulatoryWindow');
{
  clearRegulatoryLog();
  const s = [sig('KNOWLEDGE', 55), sig('MEDIA', 60), sig('TECHNOLOGY', 40), sig('CAPITAL', 40)];
  const r = detectRegulatoryWindow(s);
  assert('phaseA:true', r.phaseA === true);
  assert('CROSS_JURISDICTIONAL_CLUSTER (K+M both > 50)', r.velocityState === REGULATORY_STATE.CROSS_JURISDICTIONAL_CLUSTER);
  assert('triggered:true', r.triggered === true);
}

// ── 16: Static phaseA boundary (K = 50) ──────────────────────────────────────
console.log('\n16 — phaseA boundary (K = 50)');
{
  clearRegulatoryLog();
  const s = [sig('KNOWLEDGE', 50), sig('MEDIA', 60), sig('TECHNOLOGY', 40), sig('CAPITAL', 40)];
  const r = detectRegulatoryWindow(s);
  assert('phaseA:false (K=50, > not >=)', r.phaseA === false);
}

// ── 17: Static phaseC — K − C > 20 ──────────────────────────────────────────
console.log('\n17 — Static phaseC: enforcementDelta > 20');
{
  clearRegulatoryLog();
  const s = [sig('KNOWLEDGE', 75), sig('MEDIA', 40), sig('TECHNOLOGY', 40), sig('CAPITAL', 50)];
  const r = detectRegulatoryWindow(s);
  assert('phaseC:true', r.phaseC === true);
  assert('enforcementDelta = 25', r.enforcementDelta === 25);
}

// ── 18: phaseC boundary (delta = 20) ─────────────────────────────────────────
console.log('\n18 — phaseC boundary (delta = 20)');
{
  clearRegulatoryLog();
  const s = [sig('KNOWLEDGE', 70), sig('MEDIA', 40), sig('TECHNOLOGY', 40), sig('CAPITAL', 50)];
  const r = detectRegulatoryWindow(s);
  assert('phaseC:false (delta=20, > not >=)', r.phaseC === false);
}

// ── 19: Fs calculation ────────────────────────────────────────────────────────
console.log('\n19 — Fs = mean(K_conf, M_conf) / 100');
{
  clearRegulatoryLog();
  const s = [
    { domain: 'KNOWLEDGE', signal: 55, confidence: 80 },
    { domain: 'MEDIA',     signal: 60, confidence: 60 },
  ];
  const r = detectRegulatoryWindow(s);
  assert('Fs = 0.70', Math.abs(r.fs - 0.70) < 0.001);
}

// ── 20: Output contract — no leadTime, no old phase labels ───────────────────
console.log('\n20 — Output contract: WO-1745 compliant');
{
  clearRegulatoryLog();
  const s = [sig('KNOWLEDGE', 55), sig('MEDIA', 60)];
  const r = detectRegulatoryWindow(s);
  assert('no leadTime field',   !('leadTime' in r));
  assert('no phase field',      !('phase' in r));
  assert('has velocityState',   typeof r.velocityState === 'string');
  assert('has microWindow',     typeof r.microWindow === 'object');
  assert('has macroWindow',     typeof r.macroWindow === 'object');
  assert('has enforcementDelta', typeof r.enforcementDelta === 'number');
}

// ── 21: null/empty input ─────────────────────────────────────────────────────
console.log('\n21 — Null / empty guard');
{
  const r1 = detectRegulatoryWindow(null);
  const r2 = detectRegulatoryWindow([]);
  assert('null → DORMANT', r1.velocityState === REGULATORY_STATE.DORMANT);
  assert('null → triggered:false', r1.triggered === false);
  assert('empty → DORMANT', r2.velocityState === REGULATORY_STATE.DORMANT);
  assert('ts populated', r1.ts > 0);
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(52)}`);
console.log(`WO-1736 v2 QA: ${pass}/${pass + fail} PASS`);
if (fail > 0) { console.error(`  ${fail} FAILURE(S) — DO NOT MARK COMPLETE`); process.exit(1); }
else          { console.log('  ALL PASS — WO-1736 TEMPORAL KERNEL VALIDATED'); }
