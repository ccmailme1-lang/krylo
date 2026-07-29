// KRYL-1126 — Analytical Plane orchestrator. Consumes ONLY a sealed ScenarioEnvelope
// (scenarioenvelope.js) — never the raw scenario object, never a live Integrity Plane reference.
// One-way: Integrity -> Analytical, no return path (AC-002). Terminology firewall (AC-004): this
// output must never contain the word "confidence" — evidence confidence (how strongly reality
// supports a claim) and analytical assessment quality (how internally consistent a model is) must
// never look interchangeable. Every output carries an ANALYTICAL_MODE marker (non-evidentiary).

import { isSealed } from './scenarioenvelope.js';
import { computeSC } from './archetypeengine.js';
import { computeTau } from './tensionanalysis.js';
import { computeLambda } from './leverageanalysis.js';

const FORBIDDEN_TERM = /confidence/i;

// envelope: sealed ScenarioEnvelope. scComponents: see archetypeengine.computeSC.
// constraints: see tensionanalysis.computeTau. leverage: { actorId, actorPosition, counterpartyId, counterpartyPosition }.
export function analyzeScenario(envelope, { archetype, scComponents, constraints, leverage }) {
  if (!isSealed(envelope)) {
    throw new Error('analyzeScenario: envelope is not sealed — Analytical Plane refuses to reason over unsealed input');
  }

  const sc = computeSC(archetype, scComponents);
  const tau = computeTau(constraints);
  const lambda = leverage
    ? computeLambda(leverage.actorId, leverage.actorPosition, leverage.counterpartyId, leverage.counterpartyPosition)
    : { leverage_lambda: null, lambda_advantage: null, analysis_state: 'NOT_REQUESTED' };

  const output = {
    analytical_mode: 'NON_EVIDENTIARY_OUTPUT — NO EXTERNAL CLAIMS GENERATED',
    scenario_id: envelope.scenario_id,
    archetype_engine: sc.archetype,
    structural_assessment: {
      SC_score: sc.SC_score,
      SC_components: sc.SC_components,
      assessment_quality: sc.SC_score >= 0.75 ? 'HIGH' : sc.SC_score >= 0.45 ? 'MODERATE' : 'LOW',
      registry_version: sc.registry_version,
    },
    tension_analysis: tau,
    leverage_analysis: lambda,
  };

  assertNoConfidenceLeak(output);
  return Object.freeze(output);
}

// Structural check, not a lint suggestion — walks the actual output object at runtime and throws
// if "confidence" appears anywhere as a key or string value. This is what makes AC-004 enforced,
// not just documented.
function assertNoConfidenceLeak(obj, path = 'output') {
  for (const [key, val] of Object.entries(obj)) {
    if (FORBIDDEN_TERM.test(key)) {
      throw new Error(`assertNoConfidenceLeak: forbidden key '${key}' at ${path} — Analytical Plane output must never use the word "confidence"`);
    }
    if (typeof val === 'string' && FORBIDDEN_TERM.test(val)) {
      throw new Error(`assertNoConfidenceLeak: forbidden value at ${path}.${key} ('${val}') — Analytical Plane output must never use the word "confidence"`);
    }
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      assertNoConfidenceLeak(val, `${path}.${key}`);
    }
  }
}
