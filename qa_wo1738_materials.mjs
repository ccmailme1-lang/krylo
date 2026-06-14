// qa_wo1738_materials.mjs — BAU harness for WO-1738 Critical Materials Demand Signal
// Run: node qa_wo1738_materials.mjs
import { detectCriticalMaterials, MATERIALS_PHASE, MATERIALS_LEAD_TIME, FS_GATE } from './src/engine/criticalmaterials.js';

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
  const r1 = detectCriticalMaterials(null);
  const r2 = detectCriticalMaterials([]);
  assert('null → triggered:false', r1.triggered === false);
  assert('null → NONE', r1.phase === MATERIALS_PHASE.NONE);
  assert('empty → triggered:false', r2.triggered === false);
  assert('ts populated', r1.ts > 0);
  assert('leadTime null on NONE', r1.leadTime === null);
}

// ── 02: All below threshold → NONE ───────────────────────────────────────────
console.log('\n02 — All scores below threshold');
{
  const s = [sig('TECHNOLOGY', 40), sig('CAPITAL', 40), sig('OWNERSHIP', 40), sig('MEDIA', 40)];
  const r = detectCriticalMaterials(s);
  assert('below threshold → NONE', r.phase === MATERIALS_PHASE.NONE);
  assert('triggered:false', r.triggered === false);
}

// ── 03: Phase A — SUPPLY_CHAIN_REPOSITIONING ─────────────────────────────────
console.log('\n03 — Phase A: T+C+O all > 55');
{
  const s = [sig('TECHNOLOGY', 60), sig('CAPITAL', 58), sig('OWNERSHIP', 57), sig('MEDIA', 40)];
  const r = detectCriticalMaterials(s);
  assert('Phase A fires', r.phase === MATERIALS_PHASE.SUPPLY_CHAIN_REPOSITIONING);
  assert('triggered:true', r.triggered === true);
  assert('phaseA:true', r.phaseA === true);
  assert('phaseB:false (M < 60)', r.phaseB === false);
  assert('phaseC:false (O < 65)', r.phaseC === false);
  assert('lead time 12–24 MO', r.leadTime?.label === '12–24 MO');
}

// ── 04: Phase A boundary (exactly 55) ────────────────────────────────────────
console.log('\n04 — Phase A boundary (= 55)');
{
  const s = [sig('TECHNOLOGY', 55), sig('CAPITAL', 55), sig('OWNERSHIP', 55), sig('MEDIA', 40)];
  const r = detectCriticalMaterials(s);
  assert('T=C=O=55 → NONE (> not >=)', r.phaseA === false);
}

// ── 05: Phase A requires ALL THREE ───────────────────────────────────────────
console.log('\n05 — Phase A requires T AND C AND O');
{
  const rNoT = detectCriticalMaterials([sig('TECHNOLOGY', 40), sig('CAPITAL', 60), sig('OWNERSHIP', 60), sig('MEDIA', 40)]);
  const rNoC = detectCriticalMaterials([sig('TECHNOLOGY', 60), sig('CAPITAL', 40), sig('OWNERSHIP', 60), sig('MEDIA', 40)]);
  const rNoO = detectCriticalMaterials([sig('TECHNOLOGY', 60), sig('CAPITAL', 60), sig('OWNERSHIP', 40), sig('MEDIA', 40)]);
  assert('T below → phaseA false', rNoT.phaseA === false);
  assert('C below → phaseA false', rNoC.phaseA === false);
  assert('O below → phaseA false', rNoO.phaseA === false);
}

// ── 06: Phase B — GEOPOLITICAL_SUPPLY_RISK ───────────────────────────────────
console.log('\n06 — Phase B: M > 60 AND O > 60');
{
  const s = [sig('TECHNOLOGY', 40), sig('CAPITAL', 40), sig('OWNERSHIP', 65), sig('MEDIA', 65)];
  const r = detectCriticalMaterials(s);
  assert('Phase B fires', r.phase === MATERIALS_PHASE.GEOPOLITICAL_SUPPLY_RISK);
  assert('phaseB:true', r.phaseB === true);
  assert('lead time 3–12 MO', r.leadTime?.label === '3–12 MO');
  assert('mediaScore = 65', r.mediaScore === 65);
  assert('ownershipScore = 65', r.ownershipScore === 65);
}

// ── 07: Phase B MEDIA boundary (= 60) ────────────────────────────────────────
console.log('\n07 — Phase B MEDIA boundary (= 60)');
{
  const s = [sig('TECHNOLOGY', 40), sig('CAPITAL', 40), sig('OWNERSHIP', 65), sig('MEDIA', 60)];
  const r = detectCriticalMaterials(s);
  assert('M=60 → phaseB false (> not >=)', r.phaseB === false);
}

// ── 08: Phase B OWNERSHIP boundary (= 60) ────────────────────────────────────
console.log('\n08 — Phase B OWNERSHIP boundary (= 60)');
{
  const s = [sig('TECHNOLOGY', 40), sig('CAPITAL', 40), sig('OWNERSHIP', 60), sig('MEDIA', 65)];
  const r = detectCriticalMaterials(s);
  assert('O=60 → phaseB false (> not >=)', r.phaseB === false);
}

// ── 09: Phase C — DEMAND_PIPELINE ────────────────────────────────────────────
console.log('\n09 — Phase C: O > 65');
{
  // O=70, M=40 → Phase B won't fire (M < 60). Phase A: T=40 < 55.
  const s = [sig('TECHNOLOGY', 40), sig('CAPITAL', 40), sig('OWNERSHIP', 70), sig('MEDIA', 40)];
  const r = detectCriticalMaterials(s);
  assert('Phase C fires', r.phase === MATERIALS_PHASE.DEMAND_PIPELINE);
  assert('phaseC:true', r.phaseC === true);
  assert('lead time 12–24 MO', r.leadTime?.label === '12–24 MO');
}

// ── 10: Phase C boundary (= 65) ──────────────────────────────────────────────
console.log('\n10 — Phase C boundary (O = 65)');
{
  const s = [sig('TECHNOLOGY', 40), sig('CAPITAL', 40), sig('OWNERSHIP', 65), sig('MEDIA', 40)];
  const r = detectCriticalMaterials(s);
  assert('O=65 → phaseC false (> not >=)', r.phaseC === false);
}

// ── 11: Phase B priority over Phase C ────────────────────────────────────────
console.log('\n11 — Phase priority: B > C');
{
  // Phase B: M=65 O=70. Phase C: O=70>65. Both fire — B wins.
  const s = [sig('TECHNOLOGY', 40), sig('CAPITAL', 40), sig('OWNERSHIP', 70), sig('MEDIA', 65)];
  const r = detectCriticalMaterials(s);
  assert('B beats C', r.phase === MATERIALS_PHASE.GEOPOLITICAL_SUPPLY_RISK);
  assert('phaseC also true', r.phaseC === true);
  assert('phaseB takes priority', r.phaseB === true);
}

// ── 12: Phase B priority over Phase A ────────────────────────────────────────
console.log('\n12 — Phase priority: B > A');
{
  // Phase A: T=60 C=60 O=65. Phase B: M=65 O=65.
  const s = [sig('TECHNOLOGY', 60), sig('CAPITAL', 60), sig('OWNERSHIP', 65), sig('MEDIA', 65)];
  const r = detectCriticalMaterials(s);
  assert('B beats A', r.phase === MATERIALS_PHASE.GEOPOLITICAL_SUPPLY_RISK);
  assert('phaseA also true', r.phaseA === true);
}

// ── 13: Phase C priority over Phase A ────────────────────────────────────────
console.log('\n13 — Phase priority: C > A');
{
  // Phase A: T=60 C=60 O=70 → all>55. Phase C: O=70>65. Phase B: M=40 → no.
  const s = [sig('TECHNOLOGY', 60), sig('CAPITAL', 60), sig('OWNERSHIP', 70), sig('MEDIA', 40)];
  const r = detectCriticalMaterials(s);
  assert('C beats A', r.phase === MATERIALS_PHASE.DEMAND_PIPELINE);
  assert('phaseA also true', r.phaseA === true);
  assert('phaseC takes priority', r.phaseC === true);
}

// ── 14: Fs calculation ────────────────────────────────────────────────────────
console.log('\n14 — Fs = mean(T_conf, C_conf, O_conf) / 100');
{
  const s = [
    { domain: 'TECHNOLOGY', signal: 60, confidence: 90 },
    { domain: 'CAPITAL',    signal: 58, confidence: 75 },
    { domain: 'OWNERSHIP',  signal: 57, confidence: 60 },
    { domain: 'MEDIA',      signal: 40, confidence: 80 }, // MEDIA conf NOT in Fs
  ];
  const r = detectCriticalMaterials(s);
  const expected = (0.90 + 0.75 + 0.60) / 3; // 0.75
  assert('Fs = 0.75 (T+C+O only)', Math.abs(r.fs - expected) < 0.001);
}

// ── 15: Fs qualified gate ─────────────────────────────────────────────────────
console.log('\n15 — Fs gate ≥ 0.70');
{
  const sHigh = [
    { domain: 'TECHNOLOGY', signal: 60, confidence: 80 },
    { domain: 'CAPITAL',    signal: 58, confidence: 72 },
    { domain: 'OWNERSHIP',  signal: 57, confidence: 78 },
  ];
  const sLow = [
    { domain: 'TECHNOLOGY', signal: 60, confidence: 50 },
    { domain: 'CAPITAL',    signal: 58, confidence: 55 },
    { domain: 'OWNERSHIP',  signal: 57, confidence: 60 },
  ];
  assert('Fs ≥ 0.70 → qualified', detectCriticalMaterials(sHigh).fsQualified === true);
  assert('Fs < 0.70 → unqualified', detectCriticalMaterials(sLow).fsQualified === false);
}

// ── 16: Missing domain → 0 in Fs ─────────────────────────────────────────────
console.log('\n16 — Missing domain contributes 0 to Fs');
{
  const s = [{ domain: 'TECHNOLOGY', signal: 60, confidence: 90 }];
  const r = detectCriticalMaterials(s);
  assert('Fs = 0.30 when only T present', Math.abs(r.fs - 0.30) < 0.001);
  assert('fsQualified false', r.fsQualified === false);
}

// ── 17: All domain scores surfaced ───────────────────────────────────────────
console.log('\n17 — Domain scores on result');
{
  const s = [sig('TECHNOLOGY', 61), sig('CAPITAL', 52), sig('OWNERSHIP', 68), sig('MEDIA', 63)];
  const r = detectCriticalMaterials(s);
  assert('technologyScore = 61', r.technologyScore === 61);
  assert('capitalScore = 52', r.capitalScore === 52);
  assert('ownershipScore = 68', r.ownershipScore === 68);
  assert('mediaScore = 63', r.mediaScore === 63);
}

// ── 18: Phase B requires BOTH M AND O ────────────────────────────────────────
console.log('\n18 — Phase B requires M AND O both > 60');
{
  const rMonly = detectCriticalMaterials([sig('TECHNOLOGY', 40), sig('CAPITAL', 40), sig('OWNERSHIP', 40), sig('MEDIA', 65)]);
  const rOonly = detectCriticalMaterials([sig('TECHNOLOGY', 40), sig('CAPITAL', 40), sig('OWNERSHIP', 65), sig('MEDIA', 40)]);
  assert('M>60 alone → phaseB false', rMonly.phaseB === false);
  assert('O>60 alone → phaseB false (M not present)', rOonly.phaseB === false);
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(52)}`);
console.log(`WO-1738 QA: ${pass}/${pass + fail} PASS`);
if (fail > 0) { console.error(`  ${fail} FAILURE(S) — DO NOT MARK COMPLETE`); process.exit(1); }
else          { console.log('  ALL PASS — WO-1738 VALIDATED'); }
