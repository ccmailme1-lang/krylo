const {
  ComplianceState,
  ComplianceTrigger,
  evaluateCompliance,
  getConsequences
} = require("../runtime/frameCompliance.cjs");

console.log("=== VALID_TO_DRIFT_WARN ===");
console.log(
  evaluateCompliance(
    { trigger: ComplianceTrigger.FRAME_DELTA_BREACH },
    { currentState: ComplianceState.VALID, driftRatio: 0.2 }
  )
);

console.log("=== CONSEQUENCE_MAP ===");
console.log(getConsequences("QUARANTINED"));
