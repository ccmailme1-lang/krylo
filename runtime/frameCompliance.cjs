const ComplianceState = {
  VALID: "VALID",
  DRIFT_WARN: "DRIFT_WARN",
  DEGRADED: "DEGRADED",
  INVALID: "INVALID",
  QUARANTINED: "QUARANTINED",
  TERMINAL: "TERMINAL"
};

const ComplianceTrigger = {
  FRAME_DELTA_BREACH: "FRAME_DELTA_BREACH",
  SEQUENCE_DISCONTINUITY: "SEQUENCE_DISCONTINUITY"
};

function evaluateCompliance(event, ctx) {
  if (
    event.trigger === ComplianceTrigger.FRAME_DELTA_BREACH &&
    ctx.driftRatio > 0.1
  ) return ComplianceState.DRIFT_WARN;

  if (
    event.trigger === ComplianceTrigger.SEQUENCE_DISCONTINUITY
  ) return ComplianceState.INVALID;

  return ctx.currentState;
}

function getConsequences(state) {
  const map = {
    VALID: ["continue_execution"],
    DRIFT_WARN: ["emit_telemetry"],
    DEGRADED: ["isolate_telemetry_channel"],
    INVALID: ["suspend_replay_eligibility"],
    QUARANTINED: ["isolate_execution_domain"],
    TERMINAL: ["halt_authority"]
  };

  return map[state] || [];
}

module.exports = {
  ComplianceState,
  ComplianceTrigger,
  evaluateCompliance,
  getConsequences
};
