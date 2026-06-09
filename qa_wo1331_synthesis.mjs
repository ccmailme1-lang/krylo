// qa_wo1331_synthesis.mjs — WO-1331 Synthesis & Viewport Validation
// TARGET: Viewport State Mutator & Verdict Synthesis Engine (Mocking strictly prohibited)
import { calculateViewportState } from './src/engine/viewportmutator.js';
import { synthesizeVerdict }      from './src/engine/verdictsynthesis.js';

async function runQaHarness() {
  // The verified output payload from WO-1330
  const ingressPayload = {
    entities: {
      role: "Senior engineer",
      geo: "Raleigh NC",
      target_salary: 130000,
      org_type: "STARTUP"
    },
    domain: "negotiation",
    valid: true
  };

  console.log(`[QA HARNESS] Initiating WO-1331 Synthesis & Viewport Validation...`);
  console.log(`[QA HARNESS] Injecting WO-1330 payload...\n`);

  try {
    const startTime = performance.now();

    // 1. Calculate UI Mutation State
    const viewportState = await calculateViewportState(ingressPayload);

    // 2. Execute Welford Query & Synthesize 5-Point Verdict
    const verdictPayload = await synthesizeVerdict(ingressPayload);

    const executionTime = performance.now() - startTime;

    const telemetry = {
      execution_ms: executionTime.toFixed(2),
      status: "SUCCESS",
      viewport_mutation: {
        labo_opacity:       viewportState?.panels?.LABO?.opacity ?? null,
        tech_opacity:       viewportState?.panels?.TECH?.opacity ?? null,
        active_component:   viewportState?.active_component ?? "UNKNOWN"
      },
      synthesis_output: {
        welford_geo_anchor: verdictPayload?.welford_stats?.geo ?? null,
        welford_mu:         verdictPayload?.welford_stats?.mu ?? null,
        verdict_structure:  verdictPayload?.nodes ? Object.keys(verdictPayload.nodes) : [],
        is_rendered_to_map: verdictPayload?.active_component === "SignalMap"
      }
    };

    console.log("================ [QA RAW TELEMETRY OUTPUT] ================");
    console.log(JSON.stringify(telemetry, null, 2));
    console.log("===========================================================");

  } catch (error) {
    console.log("================ [QA FATAL ERROR TRACE] ================");
    console.error(JSON.stringify({
      status:        "FAIL",
      error_name:    error.name,
      error_message: error.message,
      stack:         error.stack
    }, null, 2));
    console.log("========================================================");
  }
}

runQaHarness();
