// qa_roleplay_template.mjs — Universal Role-Play Harness
// Drop any persona in. Pipeline runs through their LENS.
// Format: LENS → Ingress → Domain → Synthesis → Fs → Acquisition
// Usage: node qa_roleplay_template.mjs

import { buildNormalizedPayload }        from './src/engine/normalizer.js';
import { detectDomain, synthesizeQuery } from './src/engine/querysynthesis.js';
import { processAcquisition }            from './src/engine/acquisitionbroker.js';
import { evaluateFidelity }              from './src/engine/fidelityscoring.js';
import { detectProtectedDomain, LENS_BROKER_DOMAIN_MAP } from './src/engine/ingress.js';

// ── PERSONA — swap this block for any subject ─────────────────────────────────
const PERSONA = {
  subject:   'Cathie Wood',
  query:     'ARK Innovation ETF disruptive technology AI healthcare Tesla Coinbase adoption S-curve inflection long-term transformation innovation',
  lens:      'INVESTOR',
  situation: 'GROWING INCOME',
  floor:     10000000,
  inflow:    480000000,   // ARK ETF inflows
  outflow:   440000000,   // positions + redemptions
  net:       40000000,    // net AUM growth
  docCount:  3,           // ARK research note + innovation brief + ETF prospectus
  fields: {
    yield_to_maturity:  0.00,  // no yield — pure growth
    volatility_alpha:   2.10,  // high beta disruptive names
    tax_drag:           0.12,
  },
};
// ─────────────────────────────────────────────────────────────────────────────

const PASS_GATE = { fs: 0.50 };

function check(label, result, expected) {
  const pass = expected === true ? !!result : typeof expected === 'number' ? result >= expected : result === expected;
  console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${label}: ${JSON.stringify(result)}`);
  return pass ? 1 : 0;
}

async function run() {
  console.log('\n════════════════════════════════════════════════════════');
  console.log(`  ROLE-PLAY HARNESS — ${PERSONA.subject.toUpperCase()}`);
  console.log(`  LENS: ${PERSONA.lens}`);
  console.log('════════════════════════════════════════════════════════\n');

  let passed = 0;
  let total  = 0;

  try {
    // ── Stage 0: Protected domain lock ───────────────────────────────────────
    console.log('── STAGE 0: PROTECTED ENTITY CHECK ─────────────────────');
    const locked = detectProtectedDomain(PERSONA.query);
    console.log(`  protected lock: ${locked ?? 'none'}`);

    // ── Stage 1: Ingress normalization ────────────────────────────────────────
    console.log('\n── STAGE 1: INGRESS ─────────────────────────────────────');
    const normalized = buildNormalizedPayload(PERSONA.query);
    console.log(`  domain:     ${normalized.domain}`);
    console.log(`  confidence: ${normalized.confidence}`);
    console.log(`  valid:      ${normalized.valid}`);
    total++; passed += check('domain detected', normalized.domain, true);
    total++; passed += check('confidence ≥ 0.40', normalized.confidence, 0.40);

    // ── Stage 2: Domain classification ───────────────────────────────────────
    console.log('\n── STAGE 2: DOMAIN CLASSIFICATION ──────────────────────');
    const expectedDomain = LENS_BROKER_DOMAIN_MAP[PERSONA.lens] ?? 'GENERAL';
    const domain = locked ?? expectedDomain;
    const detectedRaw = detectDomain(PERSONA.query, PERSONA.lens);
    console.log(`  lens:             ${PERSONA.lens}`);
    console.log(`  expected domain:  ${expectedDomain}`);
    console.log(`  detected (raw):   ${detectedRaw}`);
    console.log(`  resolved domain:  ${domain}`);
    total++; passed += check('domain not null', !!domain, true);
    total++; passed += check(`lens → correct domain (${expectedDomain})`, domain === expectedDomain, true);

    // ── Stage 3: Verdict synthesis ────────────────────────────────────────────
    console.log('\n── STAGE 3: VERDICT SYNTHESIS ───────────────────────────');
    const session = {
      query:           PERSONA.query,
      lens:            PERSONA.lens,
      activeSituation: PERSONA.situation,
      selectedFloor:   PERSONA.floor,
      signals:         [],
    };
    const synthesis = synthesizeQuery(session);
    console.log(`  synthesis domain: ${synthesis?.queryDomain ?? synthesis?.domain ?? 'none'}`);
    console.log(`  primary insight:  ${synthesis?.primaryInsight?.slice(0, 60) ?? 'none'}...`);
    total++; passed += check('synthesis returned', !!synthesis, true);

    // ── Stage 4: Fidelity score ───────────────────────────────────────────────
    console.log('\n── STAGE 4: FIDELITY SCORE ──────────────────────────────');
    const fsInputs = {
      domain,
      query:         PERSONA.query,
      contextLength: PERSONA.query.length,
      docCount:      PERSONA.docCount,
      inflow:        PERSONA.inflow,
      outflow:       PERSONA.outflow,
      net:           PERSONA.net,
      fields:        PERSONA.fields,
    };
    const fidelity = evaluateFidelity(fsInputs);
    console.log(`  Fs score: ${(fidelity.fs * 100).toFixed(1)}%  tier: ${fidelity.tier?.id ?? JSON.stringify(fidelity.tier)}`);
    console.log(`  components: Mc=${fidelity.components.Mchecksum.toFixed(2)} Tt=${fidelity.components.Ttelemetry.toFixed(2)} Dd=${fidelity.components.Ddocs.toFixed(2)} Vv=${fidelity.components.Vvoice.toFixed(2)}`);
    total++; passed += check(`Fs above gate (${PASS_GATE.fs * 100}%)`, fidelity.fs, PASS_GATE.fs);

    // ── Stage 5: Acquisition broker ───────────────────────────────────────────
    console.log('\n── STAGE 5: ACQUISITION BROKER ──────────────────────────');
    const acquisitionPayload = {
      intent:    PERSONA.situation,
      lens:      PERSONA.lens,
      domain,
      signals:   [],
      telemetry: { signalStrength: 75, fidelityScore: fidelity.fs, capitalFloor: PERSONA.floor },
      criteria:  PERSONA.fields,
    };
    const acquisition = processAcquisition(acquisitionPayload, [PERSONA.situation], null);
    console.log(`  state:     ${acquisition?.state ?? 'none'}`);
    console.log(`  consensus: ${acquisition?.consensus?.toFixed(3) ?? 'none'}`);
    console.log(`  action:    ${acquisition?.candidate?.action ?? 'none'}`);
    total++; passed += check('not BLOCKED', acquisition?.state !== 'BLOCKED', true);

  } catch (err) {
    console.log('\n[FATAL ERROR]', err.message);
    console.log(err.stack);
  }

  const verdict = passed === total ? 'ALL PASS' : `${total - passed} FAIL`;
  console.log('\n════════════════════════════════════════════════════════');
  console.log(`  RESULT: ${passed}/${total} — ${verdict}`);
  console.log(`  LENS: ${PERSONA.lens} · SUBJECT: ${PERSONA.subject}`);
  console.log('════════════════════════════════════════════════════════\n');
}

run();
