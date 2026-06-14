// qa_wo1739_khoo.mjs — BAU harness for WO-1739 AI Infrastructure Demand Signal
// Run: node qa_wo1739_khoo.mjs
import {
  detectAIInfrastructureDemand,
  KHOO_PROTOCOL,
  EVIDENCE_TYPES,
  FS_GATE,
} from './src/engine/aiinfrastructure.js';

let pass = 0; let fail = 0;

function assert(label, condition) {
  if (condition) { console.log(`  PASS  ${label}`); pass++; }
  else           { console.error(`  FAIL  ${label}`); fail++; }
}

function sig(domain, signal, confidence = 80, ts = Date.now()) {
  return { domain, signal, confidence, ts };
}

// ── 01: Null / empty guard ────────────────────────────────────────────────────
console.log('\n01 — Null / empty guard');
{
  const r1 = detectAIInfrastructureDemand(null);
  const r2 = detectAIInfrastructureDemand([]);
  assert('null → triggered:false',   r1.triggered === false);
  assert('null → protocol:KHOO',     r1.protocol  === KHOO_PROTOCOL);
  assert('null → evidence:[]',       Array.isArray(r1.evidence) && r1.evidence.length === 0);
  assert('null → signals:[]',        Array.isArray(r1.signals)  && r1.signals.length  === 0);
  assert('null → provenance:[]',     Array.isArray(r1.provenance) && r1.provenance.length === 0);
  assert('empty → triggered:false',  r2.triggered === false);
  assert('ts populated',             r1.ts > 0);
}

// ── 02: All below threshold → triggered:false ─────────────────────────────────
console.log('\n02 — All below threshold');
{
  const s = [sig('TECHNOLOGY', 40), sig('CAPITAL', 30), sig('OWNERSHIP', 50)];
  const r = detectAIInfrastructureDemand(s);
  assert('triggered:false', r.triggered === false);
  assert('evidence has 3 items', r.evidence.length === 3);
  assert('no active evidence', r.evidence.every(e => !e.active));
  assert('no active signals', r.signals.every(s => !s.active));
}

// ── 03: TECHNOLOGY > 65 → COMPUTE_DEMAND_PRESSURE active ─────────────────────
console.log('\n03 — TECHNOLOGY > 65 → COMPUTE_DEMAND_PRESSURE ELEVATED');
{
  const s = [sig('TECHNOLOGY', 70), sig('CAPITAL', 30), sig('OWNERSHIP', 50)];
  const r = detectAIInfrastructureDemand(s);
  const ev = r.evidence.find(e => e.type === EVIDENCE_TYPES.COMPUTE_DEMAND_PRESSURE);
  assert('triggered:true', r.triggered === true);
  assert('COMPUTE evidence active', ev?.active === true);
  assert('COMPUTE state ELEVATED', ev?.state === 'ELEVATED');
  assert('COMPUTE score = 70', ev?.score === 70);
  assert('COMPUTE threshold = 65', ev?.threshold === 65);
  assert('FINANCING inactive (30 < 50)', r.evidence.find(e => e.type === EVIDENCE_TYPES.FINANCING_REGIME)?.active === false);
}

// ── 04: TECHNOLOGY boundary (= 65) ───────────────────────────────────────────
console.log('\n04 — TECHNOLOGY boundary (= 65)');
{
  const s = [sig('TECHNOLOGY', 65), sig('CAPITAL', 30), sig('OWNERSHIP', 50)];
  const r = detectAIInfrastructureDemand(s);
  const ev = r.evidence.find(e => e.type === EVIDENCE_TYPES.COMPUTE_DEMAND_PRESSURE);
  assert('T=65 → COMPUTE not active (> not >=)', ev?.active === false);
  assert('state BELOW_THRESHOLD', ev?.state === 'BELOW_THRESHOLD');
}

// ── 05: CAPITAL > 50 → FINANCING_REGIME active ───────────────────────────────
console.log('\n05 — CAPITAL > 50 → FINANCING_REGIME ELEVATED');
{
  const s = [sig('TECHNOLOGY', 40), sig('CAPITAL', 55), sig('OWNERSHIP', 50)];
  const r = detectAIInfrastructureDemand(s);
  const ev = r.evidence.find(e => e.type === EVIDENCE_TYPES.FINANCING_REGIME);
  assert('triggered:true', r.triggered === true);
  assert('FINANCING active', ev?.active === true);
  assert('FINANCING score = 55', ev?.score === 55);
}

// ── 06: CAPITAL boundary (= 50) ──────────────────────────────────────────────
console.log('\n06 — CAPITAL boundary (= 50)');
{
  const s = [sig('TECHNOLOGY', 40), sig('CAPITAL', 50), sig('OWNERSHIP', 50)];
  const r = detectAIInfrastructureDemand(s);
  const ev = r.evidence.find(e => e.type === EVIDENCE_TYPES.FINANCING_REGIME);
  assert('C=50 → FINANCING not active (> not >=)', ev?.active === false);
}

// ── 07: OWNERSHIP > 60 → INFRASTRUCTURE_COMMITMENT_FLOW active ───────────────
console.log('\n07 — OWNERSHIP > 60 → INFRA_COMMITMENT_FLOW ELEVATED');
{
  const s = [sig('TECHNOLOGY', 40), sig('CAPITAL', 30), sig('OWNERSHIP', 65)];
  const r = detectAIInfrastructureDemand(s);
  const ev = r.evidence.find(e => e.type === EVIDENCE_TYPES.INFRASTRUCTURE_COMMITMENT_FLOW);
  assert('triggered:true', r.triggered === true);
  assert('INFRA active', ev?.active === true);
  assert('INFRA score = 65', ev?.score === 65);
  assert('INFRA threshold = 60', ev?.threshold === 60);
}

// ── 08: OWNERSHIP boundary (= 60) ────────────────────────────────────────────
console.log('\n08 — OWNERSHIP boundary (= 60)');
{
  const s = [sig('TECHNOLOGY', 40), sig('CAPITAL', 30), sig('OWNERSHIP', 60)];
  const r = detectAIInfrastructureDemand(s);
  const ev = r.evidence.find(e => e.type === EVIDENCE_TYPES.INFRASTRUCTURE_COMMITMENT_FLOW);
  assert('O=60 → INFRA not active (> not >=)', ev?.active === false);
}

// ── 09: Multiple signals active ───────────────────────────────────────────────
console.log('\n09 — Multiple signals active simultaneously');
{
  const s = [sig('TECHNOLOGY', 70), sig('CAPITAL', 55), sig('OWNERSHIP', 65)];
  const r = detectAIInfrastructureDemand(s);
  const activeCount = r.evidence.filter(e => e.active).length;
  assert('all 3 evidence active', activeCount === 3);
  assert('triggered:true', r.triggered === true);
  assert('3 signals active', r.signals.filter(s => s.active).length === 3);
}

// ── 10: Output contract — no conclusions ──────────────────────────────────────
console.log('\n10 — Output contract: no conclusions');
{
  const s = [sig('TECHNOLOGY', 70), sig('CAPITAL', 55), sig('OWNERSHIP', 65)];
  const r = detectAIInfrastructureDemand(s);
  assert('no phase field', !('phase' in r));
  assert('no leadTime field', !('leadTime' in r));
  assert('no narrative field', !('narrative' in r));
  assert('protocol = KHOO', r.protocol === KHOO_PROTOCOL);
}

// ── 11: evidence array structure ─────────────────────────────────────────────
console.log('\n11 — Evidence array structure');
{
  const s = [sig('TECHNOLOGY', 70), sig('CAPITAL', 30), sig('OWNERSHIP', 50)];
  const r = detectAIInfrastructureDemand(s);
  assert('evidence always 3 items', r.evidence.length === 3);
  const ev = r.evidence[0];
  assert('evidence has type', typeof ev.type === 'string');
  assert('evidence has domain', typeof ev.domain === 'string');
  assert('evidence has score', typeof ev.score === 'number');
  assert('evidence has threshold', typeof ev.threshold === 'number');
  assert('evidence has state', typeof ev.state === 'string');
  assert('evidence has active', typeof ev.active === 'boolean');
}

// ── 12: signals array structure ──────────────────────────────────────────────
console.log('\n12 — Signals array structure');
{
  const s = [sig('TECHNOLOGY', 70), sig('CAPITAL', 55), sig('OWNERSHIP', 65)];
  const r = detectAIInfrastructureDemand(s);
  assert('signals always 3 items', r.signals.length === 3);
  const domains = r.signals.map(s => s.domain);
  assert('TECHNOLOGY in signals', domains.includes('TECHNOLOGY'));
  assert('CAPITAL in signals',    domains.includes('CAPITAL'));
  assert('OWNERSHIP in signals',  domains.includes('OWNERSHIP'));
}

// ── 13: provenance attribution ────────────────────────────────────────────────
console.log('\n13 — Provenance source attribution');
{
  const s = [sig('TECHNOLOGY', 70), sig('CAPITAL', 55), sig('OWNERSHIP', 65)];
  const r = detectAIInfrastructureDemand(s);
  const sources = r.provenance.map(p => p.source);
  assert('WO-1719 attributed to CAPITAL',    r.provenance.some(p => p.source === 'WO-1719' && p.domain === 'CAPITAL'));
  assert('WO-1720 attributed to OWNERSHIP',  r.provenance.some(p => p.source === 'WO-1720' && p.domain === 'OWNERSHIP'));
  assert('KALSHI attributed to TECHNOLOGY',  r.provenance.some(p => p.source === 'KALSHI'  && p.domain === 'TECHNOLOGY'));
  assert('provenance ts populated', r.provenance.every(p => p.ts > 0));
}

// ── 14: Fs calculation ────────────────────────────────────────────────────────
console.log('\n14 — Fs = mean(T_conf, C_conf, O_conf) / 100');
{
  const s = [
    { domain: 'TECHNOLOGY', signal: 70, confidence: 90 },
    { domain: 'CAPITAL',    signal: 55, confidence: 75 },
    { domain: 'OWNERSHIP',  signal: 65, confidence: 60 },
  ];
  const r = detectAIInfrastructureDemand(s);
  const expected = (90 + 75 + 60) / 300; // 0.75
  assert('Fs = 0.75', Math.abs(r.fs - expected) < 0.001);
}

// ── 15: fsQualified gate ──────────────────────────────────────────────────────
console.log('\n15 — Fs gate ≥ 0.70');
{
  const sHigh = [
    { domain: 'TECHNOLOGY', signal: 70, confidence: 80 },
    { domain: 'CAPITAL',    signal: 55, confidence: 72 },
    { domain: 'OWNERSHIP',  signal: 65, confidence: 78 },
  ];
  const sLow = [
    { domain: 'TECHNOLOGY', signal: 70, confidence: 50 },
    { domain: 'CAPITAL',    signal: 55, confidence: 55 },
    { domain: 'OWNERSHIP',  signal: 65, confidence: 60 },
  ];
  assert('Fs ≥ 0.70 → qualified', detectAIInfrastructureDemand(sHigh).fsQualified === true);
  assert('Fs < 0.70 → unqualified', detectAIInfrastructureDemand(sLow).fsQualified === false);
}

// ── 16: Missing domain → 0 confidence in Fs ──────────────────────────────────
console.log('\n16 — Missing domain contributes 0 to Fs');
{
  const s = [{ domain: 'TECHNOLOGY', signal: 70, confidence: 90 }];
  const r = detectAIInfrastructureDemand(s);
  assert('Fs = 0.30 (90/300)', Math.abs(r.fs - 0.30) < 0.001);
  assert('fsQualified false', r.fsQualified === false);
}

// ── 17: Provenance absent when domain missing ─────────────────────────────────
console.log('\n17 — Provenance only for present domains');
{
  const s = [sig('TECHNOLOGY', 70)]; // CAPITAL + OWNERSHIP absent
  const r = detectAIInfrastructureDemand(s);
  assert('only KALSHI provenance', r.provenance.length === 1);
  assert('KALSHI for TECHNOLOGY', r.provenance[0].source === 'KALSHI');
}

// ── 18: Duplicate domains — first match wins ──────────────────────────────────
console.log('\n18 — Duplicate domain: first-match wins');
{
  const s = [
    { domain: 'TECHNOLOGY', signal: 80, confidence: 90 },
    { domain: 'TECHNOLOGY', signal: 20, confidence: 40 },
    sig('CAPITAL', 30), sig('OWNERSHIP', 50),
  ];
  const r = detectAIInfrastructureDemand(s);
  const ev = r.evidence.find(e => e.type === EVIDENCE_TYPES.COMPUTE_DEMAND_PRESSURE);
  assert('first TECHNOLOGY used (80)', ev?.score === 80);
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(52)}`);
console.log(`WO-1739 QA: ${pass}/${pass + fail} PASS`);
if (fail > 0) { console.error(`  ${fail} FAILURE(S) — DO NOT MARK COMPLETE`); process.exit(1); }
else          { console.log('  ALL PASS — WO-1739 VALIDATED'); }
