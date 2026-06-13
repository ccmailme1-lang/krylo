// qa_roleplay_nonprofit.mjs — Role-play harness: Down Syndrome Foundation
// Persona: Nonprofit director, $1M annual donation target, young active adults with Down syndrome
// Pipeline: normalizer → detectDomain → synthesizeQuery → processAcquisition
// No mocks — runs live engine code end-to-end

import { buildNormalizedPayload }           from './src/engine/normalizer.js';
import { detectDomain, synthesizeQuery }    from './src/engine/querysynthesis.js';
import { processAcquisition }               from './src/engine/acquisitionbroker.js';
import { evaluateFidelity }                 from './src/engine/fidelityscoring.js';

const PERSONA = {
  query:  'Nonprofit foundation for young adults with Down syndrome, $1M annual donation goal, 501c3 status',
  lens:   'GENERAL',
  situation: 'RAISING CAPITAL',
};

const PASS_CRITERIA = {
  domain_not_null:        true,
  fs_above_gate:          0.50,
  acquisition_not_blocked: true,
};

function check(label, result, expected) {
  const pass = expected === true ? !!result : result >= expected;
  console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${label}: ${JSON.stringify(result)}`);
  return pass;
}

async function run() {
  console.log('\n════════════════════════════════════════════════════════');
  console.log('  ROLE-PLAY HARNESS — DOWN SYNDROME FOUNDATION');
  console.log('  Persona: Nonprofit director · $1M donation target');
  console.log('════════════════════════════════════════════════════════\n');

  let passed = 0;
  let total  = 0;

  try {
    // ── Stage 1: Ingress normalization ────────────────────────────────────────
    console.log('── STAGE 1: INGRESS ─────────────────────────────────────');
    const normalized = buildNormalizedPayload(PERSONA.query);
    console.log(`  domain:     ${normalized.domain}`);
    console.log(`  confidence: ${normalized.confidence}`);
    console.log(`  valid:      ${normalized.valid}`);
    total++; passed += check('domain = health', normalized.domain === 'health', true);
    total++; passed += check('confidence ≥ 0.50', normalized.confidence, 0.50);

    // ── Stage 2: Domain classification ───────────────────────────────────────
    console.log('\n── STAGE 2: DOMAIN CLASSIFICATION ──────────────────────');
    const domain = detectDomain(PERSONA.query, PERSONA.lens);
    console.log(`  detected domain: ${domain}`);
    total++; passed += check('domain not null', domain, true);

    // ── Stage 3: Verdict synthesis ────────────────────────────────────────────
    console.log('\n── STAGE 3: VERDICT SYNTHESIS ───────────────────────────');
    const session = {
      query:        PERSONA.query,
      lens:         PERSONA.lens,
      activeSituation: PERSONA.situation,
      selectedFloor: 1000000,
      signals:      [],
    };
    const synthesis = synthesizeQuery(session);
    console.log(`  synthesis domain: ${synthesis?.domain ?? 'none'}`);
    console.log(`  verdict keys:     ${synthesis ? Object.keys(synthesis).join(', ') : 'none'}`);
    total++; passed += check('synthesis returned', !!synthesis, true);

    // ── Stage 4: Fidelity scoring ─────────────────────────────────────────────
    console.log('\n── STAGE 4: FIDELITY SCORE ──────────────────────────────');
    const fsInputs = {
      domain,
      query:          PERSONA.query,
      signalStrength: 65,
      contextLength:  PERSONA.query.length,
      docCount:       3,       // 501c3 filing + annual report + mission statement
      inflow:         750000,  // current annual donations received
      outflow:        700000,  // program + operating expenses
      net:            50000,   // surplus
      fields: {
        org_status:          '501c3',
        cause_category:      'disability',
        fundraising_target:  1000000,
        nonprofit_capacity:  'active',
      },
    };
    const fidelity = evaluateFidelity(fsInputs);
    console.log(`  Fs score: ${(fidelity.fs * 100).toFixed(1)}%  tier: ${fidelity.tier}`);
    total++; passed += check('Fs above gate (50%)', fidelity.fs, PASS_CRITERIA.fs_above_gate);

    // ── Stage 5: Acquisition broker ───────────────────────────────────────────
    console.log('\n── STAGE 5: ACQUISITION BROKER ──────────────────────────');
    const acquisitionPayload = {
      intent:     PERSONA.situation,
      lens:       PERSONA.lens,
      domain,
      signals:    [],
      telemetry:  { signalStrength: 65, fidelityScore: fidelity.fs, capitalFloor: 1000000 },
      criteria:   { organization_type: 'NONPROFIT', annual_goal: 1000000 },
    };
    const acquisition = processAcquisition(acquisitionPayload, ['RAISING CAPITAL'], null);
    console.log(`  state:     ${acquisition?.state ?? 'none'}`);
    console.log(`  consensus: ${acquisition?.consensus?.toFixed(3) ?? 'none'}`);
    console.log(`  action:    ${acquisition?.candidate?.action ?? 'none'}`);
    total++; passed += check('not BLOCKED', acquisition?.state !== 'BLOCKED', true);

  } catch (err) {
    console.log('\n[FATAL ERROR]', err.message);
    console.log(err.stack);
  }

  console.log('\n════════════════════════════════════════════════════════');
  console.log(`  RESULT: ${passed}/${total} PASS`);
  console.log('════════════════════════════════════════════════════════\n');
}

run();
