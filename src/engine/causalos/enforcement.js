// WO-1381 — Runtime Enforcement Gate
// Converts architectural contracts into runtime-verifiable invariants.
// Violations are classified, contained, and telemetered — not silently swallowed.

const VALID_INTENTS = new Set(['UPDATE_CONE', 'QUERY_STATE', 'ROTATE_VIEW']);
const VALID_MODES   = new Set(['DEFAULT', 'METRICS', 'ALERTS']);

// ── Violation taxonomy ────────────────────────────────────────────────────────

export const Severity = Object.freeze({
  WARNING:     1,
  CONTAINMENT: 2,
  HARD_BLOCK:  3,
  SYSTEM_HALT: 4,
});

export const ViolationType = Object.freeze({
  INGRESS_SCHEMA_FAILURE:         'INGRESS_SCHEMA_FAILURE',
  KERNEL_DETERMINISM_BREACH:      'KERNEL_DETERMINISM_BREACH',
  INFERENCE_FEEDBACK_LOOP_ATTEMPT:'INFERENCE_FEEDBACK_LOOP_ATTEMPT',
  SCHEMA_DRIFT:                   'SCHEMA_DRIFT',
  CROSS_BAY_REFERENCE:            'CROSS_BAY_REFERENCE',
});

// ── Telemetry emitter ─────────────────────────────────────────────────────────

function emitViolation({ violationType, severityLevel, containmentStatus, kernelImpact, inferenceImpact, detail = '' }) {
  return Object.freeze({
    violationType,
    severityLevel,
    containmentStatus,
    kernelImpact,
    inferenceImpact,
    timestamp:     Date.now(),
    correlationId: `crr:${Date.now().toString(36)}-${(Math.random() * 0xFFFF | 0).toString(16)}`,
    detail,
  });
}

// ── Gate A — Bay ↔ Backend ingress validation ─────────────────────────────────

export function validateCommand(cmd) {
  // Missing required fields
  if (!cmd || !cmd.bayId) {
    return {
      pass: false,
      telemetry: emitViolation({
        violationType:     ViolationType.INGRESS_SCHEMA_FAILURE,
        severityLevel:     Severity.CONTAINMENT,
        containmentStatus: true,
        kernelImpact:      false,
        inferenceImpact:   false,
        detail:            'missing_bayId',
      }),
    };
  }

  // coneId required
  if (!cmd.coneId) {
    return {
      pass: false,
      telemetry: emitViolation({
        violationType:     ViolationType.INGRESS_SCHEMA_FAILURE,
        severityLevel:     Severity.CONTAINMENT,
        containmentStatus: true,
        kernelImpact:      false,
        inferenceImpact:   false,
        detail:            'missing_coneId',
      }),
    };
  }

  // Null payload
  if (cmd.payload === null || cmd.payload === undefined) {
    return {
      pass: false,
      telemetry: emitViolation({
        violationType:     ViolationType.INGRESS_SCHEMA_FAILURE,
        severityLevel:     Severity.CONTAINMENT,
        containmentStatus: true,
        kernelImpact:      false,
        inferenceImpact:   false,
        detail:            'null_payload',
      }),
    };
  }

  // Cross-bay reference — explicit or via payload
  if (
    cmd.intent === 'CROSS_BAY_QUERY' ||
    cmd.payload?.targetBay ||
    cmd.payload?.illegalAccess === true
  ) {
    return {
      pass: false,
      telemetry: emitViolation({
        violationType:     ViolationType.CROSS_BAY_REFERENCE,
        severityLevel:     Severity.CONTAINMENT,
        containmentStatus: true,
        kernelImpact:      false,
        inferenceImpact:   false,
        detail:            'cross_bay_reference_detected',
      }),
    };
  }

  // Intent not in valid enum
  if (cmd.intent && !VALID_INTENTS.has(cmd.intent)) {
    return {
      pass: false,
      telemetry: emitViolation({
        violationType:     ViolationType.INGRESS_SCHEMA_FAILURE,
        severityLevel:     Severity.CONTAINMENT,
        containmentStatus: true,
        kernelImpact:      false,
        inferenceImpact:   false,
        detail:            `invalid_intent:${cmd.intent}`,
      }),
    };
  }

  // Mode legality
  if (cmd.mode && !VALID_MODES.has(cmd.mode)) {
    return {
      pass: false,
      telemetry: emitViolation({
        violationType:     ViolationType.INGRESS_SCHEMA_FAILURE,
        severityLevel:     Severity.WARNING,
        containmentStatus: true,
        kernelImpact:      false,
        inferenceImpact:   false,
        detail:            `invalid_mode:${cmd.mode}`,
      }),
    };
  }

  return { pass: true, telemetry: null };
}

// ── Gate B — Backend → WO-1327 kernel input validation ───────────────────────

export function validateKernelInput(input) {
  if (!input || !input.coneId) {
    return {
      pass:       false,
      kernelHalt: true,
      telemetry:  emitViolation({
        violationType:     ViolationType.KERNEL_DETERMINISM_BREACH,
        severityLevel:     Severity.HARD_BLOCK,
        containmentStatus: true,
        kernelImpact:      true,
        inferenceImpact:   false,
        detail:            'missing_cone_scope',
      }),
    };
  }

  const snap = input.stateSnapshot ?? {};

  // Historical overflow: negative or string timestamp window
  if (
    snap.timestamp === 'HISTORICAL_OVERFLOW' ||
    (typeof snap.mutationWindow === 'number' && snap.mutationWindow < 0)
  ) {
    return {
      pass:       false,
      kernelHalt: true,
      telemetry:  emitViolation({
        violationType:     ViolationType.KERNEL_DETERMINISM_BREACH,
        severityLevel:     Severity.HARD_BLOCK,
        containmentStatus: true,
        kernelImpact:      true,
        inferenceImpact:   false,
        detail:            'historical_overflow_or_negative_window',
      }),
    };
  }

  // Determinism override attempt
  if (snap.determinismOverride === true || snap.hashCorruptionAttempt) {
    return {
      pass:       false,
      kernelHalt: true,
      telemetry:  emitViolation({
        violationType:     ViolationType.KERNEL_DETERMINISM_BREACH,
        severityLevel:     Severity.HARD_BLOCK,
        containmentStatus: true,
        kernelImpact:      true,
        inferenceImpact:   false,
        detail:            'determinism_override_attempt',
      }),
    };
  }

  // Multi-cone batch: input cannot reference more than one cone
  if (Array.isArray(input.coneId)) {
    return {
      pass:       false,
      kernelHalt: true,
      telemetry:  emitViolation({
        violationType:     ViolationType.KERNEL_DETERMINISM_BREACH,
        severityLevel:     Severity.HARD_BLOCK,
        containmentStatus: true,
        kernelImpact:      true,
        inferenceImpact:   false,
        detail:            'multi_cone_batch_forbidden',
      }),
    };
  }

  return { pass: true, kernelHalt: false, telemetry: null };
}

// ── Gate C — WO-1336 inference output non-mutation check ─────────────────────

export function validateInferenceOutput(output) {
  if (!output) return { pass: true, quarantine: false, telemetry: null };

  // Self-referential causal graph
  const graph = output.inferenceOutput ?? output;
  if (
    graph.causalGraph === 'SELF_REFERENTIAL_LOOP' ||
    (typeof graph.targetMutation === 'string' && graph.targetMutation.includes('STATE_PATCH'))
  ) {
    return {
      pass:       false,
      quarantine: true,
      telemetry:  emitViolation({
        violationType:     ViolationType.INFERENCE_FEEDBACK_LOOP_ATTEMPT,
        severityLevel:     Severity.SYSTEM_HALT,
        containmentStatus: true,
        kernelImpact:      false,
        inferenceImpact:   true,
        detail:            'self_referential_causal_graph',
      }),
    };
  }

  // Feedback intent or kernel write attempt
  const proj = output.projection ?? output;
  if (proj.feedbackIntent === true || proj.kernelWriteAttempt === true) {
    return {
      pass:       false,
      quarantine: true,
      telemetry:  emitViolation({
        violationType:     ViolationType.INFERENCE_FEEDBACK_LOOP_ATTEMPT,
        severityLevel:     Severity.SYSTEM_HALT,
        containmentStatus: true,
        kernelImpact:      false,
        inferenceImpact:   true,
        detail:            'feedback_intent_or_kernel_write_attempt',
      }),
    };
  }

  return { pass: true, quarantine: false, telemetry: null };
}
