// qa_wo1330_ingress.mjs — WO-1330 Ingress Baseline Telemetry
// Live router: buildNormalizedPayload (normalizer.js) — no mocks
import { buildNormalizedPayload } from './src/engine/normalizer.js';

async function runQaHarness() {
  const syntheticQuery = "Senior engineer, Raleigh NC, $130K startup";
  console.log(`[QA HARNESS] Initiating WO-1330 Ingress Validation...`);
  console.log(`[QA HARNESS] Injecting synthetic payload: "${syntheticQuery}"\n`);

  try {
    const startTime = performance.now();
    const routeState = buildNormalizedPayload(syntheticQuery);
    const executionTime = performance.now() - startTime;

    const telemetry = {
      execution_ms: executionTime.toFixed(2),
      status: "SUCCESS",
      payload: routeState
    };

    console.log("================ [QA RAW TELEMETRY OUTPUT] ================");
    console.log(JSON.stringify(telemetry, null, 2));
    console.log("===========================================================");
  } catch (error) {
    console.log("================ [QA FATAL ERROR TRACE] ================");
    console.error(JSON.stringify({
      status: "FAIL",
      error_name: error.name,
      error_message: error.message,
      stack: error.stack
    }, null, 2));
    console.log("========================================================");
  }
}

runQaHarness();
