// qa_wo1736_regulatory.mjs — BAU harness for WO-1736 Regulatory Convergence Window
// Run: node qa_wo1736_regulatory.mjs
import { detectRegulatoryWindow, REGULATORY_PHASE, REGULATORY_LEAD_TIME } from './src/engine/regulatoryconvergence.js';

let pass = 0; let fail = 0;

function assert(label, condition) {
  if (condition) { console.log(`  PASS  ${label}`); pass++; }
  else           { console.error(`  FAIL  ${label}`); fail++; }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function sig(domain, signal, confidence = 80) {
  return { domain, signal, confidence, ts: Date.now() };
}

// ── 01: Null / empty input ────────────────────────────────────────────────────
console.log('\n01 — Null / empty guard');
{
  const r1 = detectRegulatoryWindow(null);
  const r2 = detectRegulatoryWindow([]);
  assert('null input → triggered:false', r1.triggered === false);
  assert('null input → NONE', r1.phase === REGULATORY_PHASE.NONE);
  assert('empty array → triggered:false', r2.triggered === false);
  assert('ts is populated on null input', r1.ts > 0);
}

// ── 02: All below threshold ───────────────────────────────────────────────────
console.log('\n02 — All scores below threshold');
{
  const signals = [sig('KNOWLEDGE', 40), sig('MEDIA', 30), sig('TECHNOLOGY', 45), sig('CAPITAL', 35)];
  const r = detectRegulatoryWindow(signals);
  assert('below threshold → NONE', r.phase === REGULATORY_PHASE.NONE);
  assert('below threshold → triggered:false', r.triggered === false);
  assert('leadTime null when not triggered', r.leadTime === null);
}

// ── 03: Phase A — WINDOW_FORMING ─────────────────────────────────────────────
console.log('\n03 — Phase A: KNOWLEDGE + MEDIA both > 50');
{
  const signals = [sig('KNOWLEDGE', 55), sig('MEDIA', 60), sig('TECHNOLOGY', 40), sig('CAPITAL', 40)];
  const r = detectRegulatoryWindow(signals);
  assert('Phase A fires', r.phase === REGULATORY_PHASE.WINDOW_FORMING);
  assert('triggered:true', r.triggered === true);
  assert('phaseA:true', r.phaseA === true);
  assert('phaseB:false (MEDIA < 65)', r.phaseB === false);
  assert('phaseC:false (delta < 20)', r.phaseC === false);
  assert('lead time is 6–18 MO', r.leadTime?.label === '6–18 MO');
}

// ── 04: Phase A boundary — exactly at threshold, should NOT fire ──────────────
console.log('\n04 — Phase A boundary (exactly 50)');
{
  const signals = [sig('KNOWLEDGE', 50), sig('MEDIA', 50), sig('TECHNOLOGY', 40), sig('CAPITAL', 30)];
  const r = detectRegulatoryWindow(signals);
  assert('K=50 M=50 → NONE (> not >=)', r.phase === REGULATORY_PHASE.NONE);
}

// ── 05: Phase A requires BOTH signals ────────────────────────────────────────
console.log('\n05 — Phase A requires K AND M');
{
  // CAPITAL=55 keeps K-C delta=5, below Phase C threshold of 20
  const rKonly = detectRegulatoryWindow([sig('KNOWLEDGE', 60), sig('MEDIA', 30), sig('CAPITAL', 55)]);
  const rMonly = detectRegulatoryWindow([sig('KNOWLEDGE', 30), sig('MEDIA', 60), sig('CAPITAL', 55)]);
  assert('K>50 alone → NONE', rKonly.phase === REGULATORY_PHASE.NONE);
  assert('M>50 alone → NONE', rMonly.phase === REGULATORY_PHASE.NONE);
}

// ── 06: Phase B — MULTI_JURISDICTION ─────────────────────────────────────────
console.log('\n06 — Phase B: MEDIA > 65 + TECHNOLOGY > 55');
{
  // Phase B can fire without Phase A (K may be < 50)
  const signals = [sig('KNOWLEDGE', 40), sig('MEDIA', 70), sig('TECHNOLOGY', 60), sig('CAPITAL', 30)];
  const r = detectRegulatoryWindow(signals);
  assert('Phase B fires without Phase A', r.phase === REGULATORY_PHASE.MULTI_JURISDICTION);
  assert('phaseB:true', r.phaseB === true);
  assert('phaseA:false (K < 50)', r.phaseA === false);
  assert('lead time is 3–12 MO', r.leadTime?.label === '3–12 MO');
}

// ── 07: Phase B boundary ─────────────────────────────────────────────────────
console.log('\n07 — Phase B boundary (exactly 65 / 55)');
{
  const signals = [sig('KNOWLEDGE', 40), sig('MEDIA', 65), sig('TECHNOLOGY', 55), sig('CAPITAL', 30)];
  const r = detectRegulatoryWindow(signals);
  assert('M=65 T=55 → NONE (> not >=)', r.phase === REGULATORY_PHASE.NONE);
}

// ── 08: Phase C — ENFORCEMENT_AHEAD ──────────────────────────────────────────
console.log('\n08 — Phase C: KNOWLEDGE > CAPITAL + 20');
{
  // K=75, C=50 → delta=25 > 20
  const signals = [sig('KNOWLEDGE', 75), sig('MEDIA', 40), sig('TECHNOLOGY', 40), sig('CAPITAL', 50)];
  const r = detectRegulatoryWindow(signals);
  assert('Phase C fires', r.phase === REGULATORY_PHASE.ENFORCEMENT_AHEAD);
  assert('phaseC:true', r.phaseC === true);
  assert('enforcementDelta = 25', r.enforcementDelta === 25);
  assert('lead time is 1–6 MO', r.leadTime?.label === '1–6 MO');
}

// ── 09: Phase C boundary — exactly 20, should NOT fire ───────────────────────
console.log('\n09 — Phase C boundary (spread = 20)');
{
  const signals = [sig('KNOWLEDGE', 70), sig('MEDIA', 40), sig('TECHNOLOGY', 40), sig('CAPITAL', 50)];
  const r = detectRegulatoryWindow(signals);
  assert('K-C=20 → NONE (> not >=)', r.phaseC === false);
}

// ── 10: Phase C takes priority over Phase B ───────────────────────────────────
console.log('\n10 — Phase priority: C > B');
{
  // Phase B: M=70, T=60. Phase C: K=80, C=55 → delta=25
  const signals = [sig('KNOWLEDGE', 80), sig('MEDIA', 70), sig('TECHNOLOGY', 60), sig('CAPITAL', 55)];
  const r = detectRegulatoryWindow(signals);
  assert('C beats B', r.phase === REGULATORY_PHASE.ENFORCEMENT_AHEAD);
  assert('phaseB also true', r.phaseB === true);
  assert('phaseC takes priority', r.phaseC === true);
}

// ── 11: Phase B takes priority over Phase A ───────────────────────────────────
console.log('\n11 — Phase priority: B > A');
{
  // Phase A: K=55 M=70. Phase B: M=70 T=60.
  const signals = [sig('KNOWLEDGE', 55), sig('MEDIA', 70), sig('TECHNOLOGY', 60), sig('CAPITAL', 40)];
  const r = detectRegulatoryWindow(signals);
  assert('B beats A', r.phase === REGULATORY_PHASE.MULTI_JURISDICTION);
  assert('phaseA also true', r.phaseA === true);
}

// ── 12: Fs calculation ────────────────────────────────────────────────────────
console.log('\n12 — Fs = mean(K_conf, M_conf) / 100');
{
  const signals = [
    { domain: 'KNOWLEDGE', signal: 55, confidence: 80 },
    { domain: 'MEDIA',     signal: 60, confidence: 60 },
    { domain: 'CAPITAL',   signal: 30, confidence: 90 },
  ];
  const r = detectRegulatoryWindow(signals);
  assert('Fs = 0.70 (mean 80+60)', Math.abs(r.fs - 0.70) < 0.001);
}

// ── 13: Fs fallback — K only ──────────────────────────────────────────────────
console.log('\n13 — Fs fallback when only K present');
{
  const signals = [{ domain: 'KNOWLEDGE', signal: 55, confidence: 90 }];
  const r = detectRegulatoryWindow(signals);
  assert('Fs = K_conf when M absent', Math.abs(r.fs - 0.90) < 0.001);
}

// ── 14: Fs fallback — neither K nor M ────────────────────────────────────────
console.log('\n14 — Fs = 0 when neither K nor M present');
{
  const signals = [sig('TECHNOLOGY', 70), sig('CAPITAL', 30)];
  const r = detectRegulatoryWindow(signals);
  assert('Fs = 0', r.fs === 0);
}

// ── 15: enforcementDelta with C > K (negative) ───────────────────────────────
console.log('\n15 — Negative enforcement delta (C > K)');
{
  const signals = [sig('KNOWLEDGE', 40), sig('MEDIA', 30), sig('TECHNOLOGY', 30), sig('CAPITAL', 70)];
  const r = detectRegulatoryWindow(signals);
  assert('enforcementDelta negative', r.enforcementDelta === -30);
  assert('phaseC false on negative delta', r.phaseC === false);
}

// ── 16: Full-field scores populated ──────────────────────────────────────────
console.log('\n16 — All domain scores surfaced on result');
{
  const signals = [sig('KNOWLEDGE', 55), sig('MEDIA', 60), sig('TECHNOLOGY', 45), sig('CAPITAL', 38)];
  const r = detectRegulatoryWindow(signals);
  assert('knowledgeScore = 55', r.knowledgeScore === 55);
  assert('mediaScore = 60', r.mediaScore === 60);
  assert('technologyScore = 45', r.technologyScore === 45);
  assert('capitalScore = 38', r.capitalScore === 38);
}

// ── 17: duplicate domains — first match wins ──────────────────────────────────
console.log('\n17 — Duplicate domain: first-match wins');
{
  const signals = [
    { domain: 'KNOWLEDGE', signal: 70, confidence: 90 },
    { domain: 'KNOWLEDGE', signal: 20, confidence: 40 }, // should be ignored
    { domain: 'MEDIA',     signal: 60, confidence: 70 },
  ];
  const r = detectRegulatoryWindow(signals);
  assert('first KNOWLEDGE used (70)', r.knowledgeScore === 70);
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(52)}`);
console.log(`WO-1736 QA: ${pass}/${pass + fail} PASS`);
if (fail > 0) { console.error(`  ${fail} FAILURE(S) — DO NOT MARK COMPLETE`); process.exit(1); }
else          { console.log('  ALL PASS — WO-1736 VALIDATED'); }
