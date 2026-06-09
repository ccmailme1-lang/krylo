// qa_wo1332_fsm.mjs — WO-1332 FSM Payload Validation
// TARGET: Execution Plan / FSM Generator (Mocking strictly prohibited)
import { generateExecutionPlan } from './src/engine/executionfsm.js';

async function runQaHarness() {
  // Verified ingress payload from Phase 1
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

  console.log(`[QA HARNESS] Initiating WO-1332 FSM Payload Validation...`);

  try {
    const startTime = performance.now();

    // Execute FSM generation based on ingress constraints
    const fsmPayload = await generateExecutionPlan(ingressPayload.entities);

    const executionTime = performance.now() - startTime;

    const telemetry = {
      execution_ms: executionTime.toFixed(2),
      status: "SUCCESS",
      fsm_structure: {
        has_initial_ask:      !!fsmPayload?.initial_ask,
        calculated_ask:       fsmPayload?.initial_ask?.value || null,
        has_stall_branch:     !!fsmPayload?.branches?.stall,
        has_lowball_branch:   !!fsmPayload?.branches?.lowball,
        lowball_pivot_target: fsmPayload?.branches?.lowball?.pivot_vector || null
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
