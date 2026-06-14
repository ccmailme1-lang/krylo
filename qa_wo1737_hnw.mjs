// qa_wo1737_hnw.mjs — BAU harness for WO-1737 HNW Client Convergence Overlay
// Run: node qa_wo1737_hnw.mjs
import { detectHNWConvergence, HNW_PHASE, FS_GATE } from './src/engine/hnwconvergence.js';

let pass = 0; let fail = 0;

function assert(label, condition) {
  if (condition) { console.log(`  PASS  ${label}`); pass++; }
  else           { console.error(`  FAIL  ${label}`); fail++; }
}

function sig(domain, signal, confidence = 80) {
  return { domain, signal, confidence, ts: Date.now() };
}

// ── 01: Null / empty guard ────────────────────────────────────────────────────
console.log('\n01 — Null / empty guard');
{
  const r1 = detectHNWConvergence(null);
  const r2 = detectHNWConvergence([]);
  assert('null → triggered:false', r1.triggered === false);
  assert('null → NONE', r1.phase === HNW_PHASE.NONE);
  assert('empty → triggered:false', r2.triggered === false);
  assert('ts populated', r1.ts > 0);
}

// ── 02: All below threshold → NONE ───────────────────────────────────────────
console.log('\n02 — All below threshold');
{
  const s = [sig('TECHNOLOGY', 40), sig('CAPITAL', 40), sig('OWNERSHIP', 40)];
  const r = detectHNWConvergence(s);
  assert('below threshold → NONE', r.phase === HNW_PHASE.NONE);
  assert('triggered:false', r.triggered === false);
}

// ── 03: Phase A — PORTFOLIO_TIMING ───────────────────────────────────────────
console.log('\n03 — Phase A: T+C+O all > 55');
{
  const s = [sig('TECHNOLOGY', 60), sig('CAPITAL', 58), sig('OWNERSHIP', 56)];
  const r = detectHNWConvergence(s);
  assert('Phase A fires', r.phase === HNW_PHASE.PORTFOLIO_TIMING);
  assert('triggered:true', r.triggered === true);
  assert('phaseA:true', r.phaseA === true);
  assert('phaseB:false', r.phaseB === false);
  assert('phaseC:false (delta=2)', r.phaseC === false);
}

// ── 04: Phase A boundary (exactly 55) ────────────────────────────────────────
console.log('\n04 — Phase A boundary (exactly 55)');
{
  const s = [sig('TECHNOLOGY', 55), sig('CAPITAL', 55), sig('OWNERSHIP', 55)];
  const r = detectHNWConvergence(s);
  assert('T=C=O=55 → NONE (> not >=)', r.phase === HNW_PHASE.NONE);
}

// ── 05: Phase A requires ALL THREE ───────────────────────────────────────────
console.log('\n05 — Phase A requires T AND C AND O');
{
  const rNoT = detectHNWConvergence([sig('TECHNOLOGY', 40), sig('CAPITAL', 60), sig('OWNERSHIP', 60)]);
  const rNoC = detectHNWConvergence([sig('TECHNOLOGY', 60), sig('CAPITAL', 40), sig('OWNERSHIP', 60)]);
  const rNoO = detectHNWConvergence([sig('TECHNOLOGY', 60), sig('CAPITAL', 60), sig('OWNERSHIP', 40)]);
  assert('T below → NONE', rNoT.phase === HNW_PHASE.NONE || rNoT.phaseA === false);
  assert('C below → NONE', rNoC.phase === HNW_PHASE.NONE || rNoC.phaseA === false);
  assert('O below → NONE', rNoO.phase === HNW_PHASE.NONE || rNoO.phaseA === false);
}

// ── 06: Phase B — LIQUIDITY_EVENT ────────────────────────────────────────────
console.log('\n06 — Phase B: O > 60 AND C < 45');
{
  const s = [sig('TECHNOLOGY', 50), sig('CAPITAL', 40), sig('OWNERSHIP', 65)];
  const r = detectHNWConvergence(s);
  assert('Phase B fires', r.phase === HNW_PHASE.LIQUIDITY_EVENT);
  assert('phaseB:true', r.phaseB === true);
  assert('ownershipScore = 65', r.ownershipScore === 65);
  assert('capitalScore = 40', r.capitalScore === 40);
}

// ── 07: Phase B OWNERSHIP boundary (exactly 60) ──────────────────────────────
console.log('\n07 — Phase B OWNERSHIP boundary (= 60)');
{
  const s = [sig('TECHNOLOGY', 50), sig('CAPITAL', 40), sig('OWNERSHIP', 60)];
  const r = detectHNWConvergence(s);
  assert('O=60 → no liquidity trigger (> not >=)', r.phaseB === false);
}

// ── 08: Phase B CAPITAL boundary (exactly 45) ────────────────────────────────
console.log('\n08 — Phase B CAPITAL boundary (= 45)');
{
  const s = [sig('TECHNOLOGY', 50), sig('CAPITAL', 45), sig('OWNERSHIP', 65)];
  const r = detectHNWConvergence(s);
  assert('C=45 → no compression (< not <=)', r.phaseB === false);
}

// ── 09: Phase C — SECTOR_ROTATION ────────────────────────────────────────────
console.log('\n09 — Phase C: T − C > 15');
{
  // T=70, C=50 → delta=20 > 15
  const s = [sig('TECHNOLOGY', 70), sig('CAPITAL', 50), sig('OWNERSHIP', 40)];
  const r = detectHNWConvergence(s);
  assert('Phase C fires', r.phase === HNW_PHASE.SECTOR_ROTATION);
  assert('phaseC:true', r.phaseC === true);
  assert('techCapitalDelta = 20', r.techCapitalDelta === 20);
}

// ── 10: Phase C boundary (delta = 15) ────────────────────────────────────────
console.log('\n10 — Phase C boundary (delta = 15)');
{
  const s = [sig('TECHNOLOGY', 65), sig('CAPITAL', 50), sig('OWNERSHIP', 40)];
  const r = detectHNWConvergence(s);
  assert('T-C=15 → NONE (> not >=)', r.phaseC === false);
}

// ── 11: Phase B priority over Phase C ────────────────────────────────────────
console.log('\n11 — Phase priority: B > C');
{
  // Phase B: O=65, C=40. Phase C: T=70, C=40 → delta=30
  const s = [sig('TECHNOLOGY', 70), sig('CAPITAL', 40), sig('OWNERSHIP', 65)];
  const r = detectHNWConvergence(s);
  assert('B beats C', r.phase === HNW_PHASE.LIQUIDITY_EVENT);
  assert('phaseC also true', r.phaseC === true);
  assert('phaseB takes priority', r.phaseB === true);
}

// ── 12: Phase B priority over Phase A ────────────────────────────────────────
console.log('\n12 — Phase priority: B > A');
{
  // Phase A: T=60 C=40? No — C < 55. Phase B: O=65 C=40.
  // Need Phase A: T>55, C>55... but C>55 means C >= 56, which is >= 45, so not < 45 for phase B.
  // Phase A and Phase B can't co-exist: Phase A needs C>55, Phase B needs C<45.
  // So this test should show: if B fires, A cannot fire simultaneously.
  const s = [sig('TECHNOLOGY', 65), sig('CAPITAL', 40), sig('OWNERSHIP', 65)];
  const r = detectHNWConvergence(s);
  assert('B fires when A cannot (C too low for A)', r.phase === HNW_PHASE.LIQUIDITY_EVENT);
  assert('phaseA false when C < 55', r.phaseA === false);
}

// ── 13: Phase C priority over Phase A ────────────────────────────────────────
console.log('\n13 — Phase priority: C > A');
{
  // Phase A: T=60, C=58, O=57. Phase C: T-C=2 < 15. Need C lower for Phase C.
  // Phase A AND C simultaneously: T>55, C>55, O>55 AND T-C>15 → T>C+15, C>55 → T>70
  // T=72, C=56, O=57 → Phase A (all>55) AND Phase C (delta=16>15)
  const s = [sig('TECHNOLOGY', 72), sig('CAPITAL', 56), sig('OWNERSHIP', 57)];
  const r = detectHNWConvergence(s);
  assert('C beats A when both active', r.phase === HNW_PHASE.SECTOR_ROTATION);
  assert('phaseA also true', r.phaseA === true);
  assert('phaseC takes priority', r.phaseC === true);
}

// ── 14: Fs calculation ────────────────────────────────────────────────────────
console.log('\n14 — Fs = mean(T_conf, C_conf, O_conf) / 100');
{
  const s = [
    { domain: 'TECHNOLOGY', signal: 60, confidence: 90 },
    { domain: 'CAPITAL',    signal: 58, confidence: 75 },
    { domain: 'OWNERSHIP',  signal: 56, confidence: 60 },
  ];
  const r = detectHNWConvergence(s);
  const expected = (0.90 + 0.75 + 0.60) / 3; // 0.75
  assert('Fs = 0.75 (mean 90+75+60)', Math.abs(r.fs - expected) < 0.001);
}

// ── 15: Fs qualified gate ─────────────────────────────────────────────────────
console.log('\n15 — Fs gate: ≥ 0.70 qualifies');
{
  const sHigh = [
    { domain: 'TECHNOLOGY', signal: 60, confidence: 80 },
    { domain: 'CAPITAL',    signal: 58, confidence: 72 },
    { domain: 'OWNERSHIP',  signal: 56, confidence: 78 },
  ];
  const sLow = [
    { domain: 'TECHNOLOGY', signal: 60, confidence: 50 },
    { domain: 'CAPITAL',    signal: 58, confidence: 55 },
    { domain: 'OWNERSHIP',  signal: 56, confidence: 60 },
  ];
  const rHigh = detectHNWConvergence(sHigh);
  const rLow  = detectHNWConvergence(sLow);
  assert('Fs ≥ 0.70 → fsQualified:true', rHigh.fsQualified === true);
  assert('Fs < 0.70 → fsQualified:false', rLow.fsQualified === false);
}

// ── 16: Missing domain → confidence = 0 ──────────────────────────────────────
console.log('\n16 — Missing domain contributes 0 to Fs');
{
  // Only TECHNOLOGY present with conf=90; C and O missing → fs = 0.90/3 = 0.30
  const s = [{ domain: 'TECHNOLOGY', signal: 60, confidence: 90 }];
  const r = detectHNWConvergence(s);
  assert('Fs = 0.30 when only T present', Math.abs(r.fs - 0.30) < 0.001);
  assert('fsQualified false (0.30 < 0.70)', r.fsQualified === false);
}

// ── 17: All domain scores surfaced ───────────────────────────────────────────
console.log('\n17 — Domain scores on result');
{
  const s = [sig('TECHNOLOGY', 62), sig('CAPITAL', 44), sig('OWNERSHIP', 68)];
  const r = detectHNWConvergence(s);
  assert('technologyScore = 62', r.technologyScore === 62);
  assert('capitalScore = 44', r.capitalScore === 44);
  assert('ownershipScore = 68', r.ownershipScore === 68);
  assert('techCapitalDelta = 18', r.techCapitalDelta === 18);
}

// ── 18: Negative techCapitalDelta ────────────────────────────────────────────
console.log('\n18 — Negative delta (CAPITAL > TECHNOLOGY)');
{
  const s = [sig('TECHNOLOGY', 40), sig('CAPITAL', 70), sig('OWNERSHIP', 50)];
  const r = detectHNWConvergence(s);
  assert('negative delta computed', r.techCapitalDelta === -30);
  assert('phaseC false on negative delta', r.phaseC === false);
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(52)}`);
console.log(`WO-1737 QA: ${pass}/${pass + fail} PASS`);
if (fail > 0) { console.error(`  ${fail} FAILURE(S) — DO NOT MARK COMPLETE`); process.exit(1); }
else          { console.log('  ALL PASS — WO-1737 VALIDATED'); }
