// WO-2078 — Invariant Violation Explanation Engine
// Translates the opaque `throw new Error(...)` calls already thrown across the locked
// pipeline (epistemictier.js, domainpackage.js, domainregistry.js, metricadapter.js,
// conesurface.js, availabilityfilter.js, compositionvectors.js) into structured,
// actionable explanations. Does NOT change what those engines throw or when — this is a
// read-only translation layer callers wrap around them. An unrecognized error is reported
// as unrecognized, never guessed at — a fabricated boundaryCondition would be worse than
// an opaque one.

// ── Violation registry ─────────────────────────────────────────────────────────
// Ordered by specificity — first match wins. Each entry: a matcher against the raw
// error message, a stable code, a plain-English boundary explanation, and concrete
// recovery paths (what to actually do, not just "check your input").
const REGISTRY = [
  {
    code: 'EPISTEMIC_UPWARD_FLOW',
    matcher: /EpistemicInvariantViolation: upward flow forbidden/,
    boundaryCondition: 'Data attempted to flow from a lower-confidence epistemic tier back up to a higher one (NC → WEAK → META is forbidden; only META → WEAK → NC is allowed).',
    recoveryPaths: [
      'Re-derive the value from the META (authoritative) layer instead of promoting a WEAK/NC result upward.',
      'If the WEAK/NC result must be surfaced, tag it explicitly as its own tier rather than merging it into META-tier output.',
    ],
  },
  {
    code: 'EPISTEMIC_BOUNDARY_MISMATCH',
    matcher: /EpistemicInvariantViolation: expected tier/,
    boundaryCondition: 'An object crossed a layer boundary tagged with a different epistemic tier than the consumer expected.',
    recoveryPaths: [
      'Confirm the producing layer called tagWithTier() with the tier the consumer actually expects.',
      'Check for a missing tagWithTier() call upstream — untagged objects report tier "untagged".',
    ],
  },
  {
    code: 'EPISTEMIC_PROMOTABLE_VIOLATION',
    matcher: /EpistemicInvariantViolation: promotable must be false/,
    boundaryCondition: 'An object crossing an epistemic tier boundary was marked promotable, which is never allowed at a boundary gate.',
    recoveryPaths: ['Do not set promotable:true before a boundary check — tagWithTier() always sets it false; if it changed, something mutated the object after tagging.'],
  },
  {
    code: 'EPISTEMIC_UNKNOWN_TIER',
    matcher: /EpistemicInvariantViolation: unknown (from|expected)?[Tt]ier/,
    boundaryCondition: 'A tier name outside META/WEAK/NC was used.',
    recoveryPaths: ['Use one of EPISTEMIC_TIER.META, .WEAK, .NC from epistemictier.js — do not pass a raw string.'],
  },
  {
    code: 'DOMAIN_PACKAGE_ALREADY_SEALED',
    matcher: /Domain Package for .* is already sealed/,
    boundaryCondition: 'Domain Package output was re-emitted after Phase 2 already sealed it — mutation after sealing is forbidden.',
    recoveryPaths: ['Create a new Domain Package instance for the re-run instead of re-emitting the sealed one.'],
  },
  {
    code: 'DOMAIN_PACKAGE_NOT_SEALED',
    matcher: /Domain Package for .* must be sealed before downstream access/,
    boundaryCondition: 'A downstream consumer (Metric Adapter, Cone Surface) tried to read Domain Package output before Phase 2 completed.',
    recoveryPaths: ['Await full Domain Package completion (DOMAIN_STATE → COMPONENT_GRAPH → SIGNAL_EVALUATION → CAUSAL_MAP) before calling the adapter.'],
  },
  {
    code: 'DOMAIN_PACKAGE_INVALID_OUTPUT',
    matcher: /Invalid domain output for/,
    boundaryCondition: 'A Domain Package attempted to seal with output that fails its own validation schema.',
    recoveryPaths: ['Check the specific validation errors in the message — fix the domain implementation\'s output shape, not the caller.'],
  },
  {
    code: 'UNKNOWN_DOMAIN',
    matcher: /Unknown domain: |Cannot register unknown domain:|Domain not registered:/,
    boundaryCondition: 'A domain name outside the 6 locked domains (TECHNOLOGY, CAPITAL, KNOWLEDGE, LABOR, MEDIA, OWNERSHIP) was referenced.',
    recoveryPaths: ['Check for a typo in the domain string.', 'Confirm the domain is registered via domainregistry.js before use — new domains are not silently accepted (§17 locks the 6 domains).'],
  },
  {
    code: 'COMPOSITION_INCOMPLETE',
    matcher: /Composition blocked: domain .* adaptation is incomplete/,
    boundaryCondition: 'Cross-domain composition (Phase 4) was attempted while at least one domain had not finished Phase 3 adaptation.',
    recoveryPaths: ['Await adaptToInvariants() to resolve for every domain in the set before calling composeInvariantSets().'],
  },
  {
    code: 'CONE_SURFACE_PHASE_INCOMPLETE',
    matcher: /Cone Surface: renderComposedCone requires a valid composed invariant set/,
    boundaryCondition: 'Rendering was attempted before Phase 4 composition produced a valid composed invariant set.',
    recoveryPaths: ['Confirm composeInvariantSets() resolved successfully and returned composed:true before calling the Cone Surface renderer.'],
  },
  {
    code: 'UNKNOWN_INVARIANT',
    matcher: /Unknown Decision Invariant:/,
    boundaryCondition: 'A metric adapter attempted to populate an invariant name outside the 8 locked Decision Invariants.',
    recoveryPaths: ['Use one of DECISION_INVARIANTS from decisioninvariants.js — the schema is fixed at 8 (Cost, Value, Time, Risk, Leverage, Flexibility, Confidence, Momentum).'],
  },
  {
    code: 'VECTOR_SPACE_MISMATCH',
    matcher: /comparableDimensions: vectors must be from the same fixed-order space/,
    boundaryCondition: 'Two vectors from different fixed-order spaces were compared directly (e.g. an 8-length Decision Vector against a 7-length Constraint Alignment Vector).',
    recoveryPaths: ['Only compare Decision Vectors against Decision Vectors, Epistemic against Epistemic, Constraint Alignment against Constraint Alignment — never across spaces.'],
  },
  {
    code: 'AVAILABILITY_FILTER_TYPE_ERROR',
    matcher: /filterCandidateSet: (adaptedOutputs must be an array|constraintModel must be an object)/,
    boundaryCondition: 'filterCandidateSet() was called with a malformed argument shape.',
    recoveryPaths: ['Pass an array of adapted outputs and a constraintModel object built via ucsm.js buildConstraintModel() or makeConstraintModel().'],
  },
];

// ── Explanation ────────────────────────────────────────────────────────────────
// error: an Error (or Error-like { message }) thrown by any engine in the registry above.
// Returns a structured, actionable explanation. Never fabricates a boundaryCondition or
// recoveryPaths for an error it doesn't recognize — those come back null/empty, honestly.
export function explainViolation(error) {
  const message = error?.message ?? String(error ?? '');
  const entry = REGISTRY.find(r => r.matcher.test(message));

  if (!entry) {
    return {
      triggered:         true,
      code:              'UNRECOGNIZED',
      boundaryCondition: null,
      recoveryPaths:     [],
      raw:               message,
    };
  }

  return {
    triggered:         true,
    code:              entry.code,
    boundaryCondition: entry.boundaryCondition,
    recoveryPaths:     entry.recoveryPaths,
    raw:               message,
  };
}

// Convenience wrapper: run fn(), and if it throws, return an explanation instead of
// re-throwing. Callers that want the exception to propagate should use explainViolation()
// directly in their own try/catch instead.
export function tryWithExplanation(fn) {
  try {
    return { ok: true, value: fn(), explanation: null };
  } catch (error) {
    return { ok: false, value: null, explanation: explainViolation(error) };
  }
}
