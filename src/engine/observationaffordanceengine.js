// KRYL-1202 — Observation Affordance Engine + Observation Path Memory
// specs/SPEC-closed-loop-observation-architecture.md §2/§3/§4/§5/§9.
//
// Owns: ObservationAffordance derivation, the UnresolvedCondition hierarchy, the observational
// utility metric, RESOLVE Pattern 1 (primary producer), Path Memory, deduplication/reproposal
// suppression, deterministic ranking. Does not import surfaceRouter, dispatchBatch, or
// evidenceadmissiongate — this module only produces affordances and records outcomes; it never
// reaches admission or dispatch itself (KRYL-1204/1203's territory).
//
// RESOLVE integration note: observestoryview.jsx's adjudicate() is defined inside a React
// component (imports React/JSX) and is not currently a standalone-importable pure function.
// Pattern 1 below operates on the already-ratified UnresolvedCondition/ResolveUnresolved shape
// generically — it does not require observestoryview.jsx itself to run. Wiring RESOLVE's live
// output into this engine requires either extracting adjudicate() into a plain module or a
// render-time bridge — a real follow-up decision, not resolved by this ticket.

// ── UnresolvedCondition kinds (§3) ─────────────────────────────────────────────
export const UNRESOLVED_KIND = {
  RESOLVE_CONFLICT: 'RESOLVE_CONFLICT',
  EVIDENCE_GAP: 'EVIDENCE_GAP',
  RELATIONSHIP_AMBIGUITY: 'RELATIONSHIP_AMBIGUITY',
  TEMPORAL_INSUFFICIENCY: 'TEMPORAL_INSUFFICIENCY',
  FORMATION_BOUNDARY_UNCERTAINTY: 'FORMATION_BOUNDARY_UNCERTAINTY',
};

// ── Pattern 1 — Direct Conflict Discrimination (§4, primary producer) ─────────
// Consumes a ResolveUnresolved-shaped condition (basis/pairwise/candidateTaps/conflict),
// real fields confirmed against observestoryview.jsx's adjudicate() output this session.
// Emits one ObservationAffordance per maximal conflict, not one per pair (avoids
// combinatorial explosion, per spec §4).
export function deriveAffordancesFromResolve(condition, isAvailableFn) {
  if (condition.kind !== UNRESOLVED_KIND.RESOLVE_CONFLICT) return [];
  const conflictPairs = (condition.pairwise ?? [])
    .filter(p => p.classification === 'CONFLICT')
    .map(p => [p.a, p.b]);
  if (conflictPairs.length === 0) return [];

  const target = { target_entities: [...new Set(conflictPairs.flat())] };
  const observationType = condition.observation_type ?? 'OWNERSHIP_FILING';
  const available = isAvailableFn ? isAvailableFn(observationType, target) : false;

  return [{
    id: `aff_${condition.id}_${Date.now()}`,
    source_percept_id: condition.source_percept_id,
    reason: condition.basis ?? 'RESOLVE conflict — evidence does not discriminate between candidates',
    unresolved_condition: condition,
    target,
    observation_type: observationType,
    available,
    execution_path: available ? 'observationorchestrator.executeObservationRequest' : null,
    discrimination_capability: {
      conflict_pairs: conflictPairs,
      unresolved_types: [UNRESOLVED_KIND.RESOLVE_CONFLICT],
    },
    provenance: condition.provenance ?? null,
  }];
}

// ── Observational utility metric (§5) — capability-based, normalized, non-predictive ──
const DEFAULT_WEIGHTS = { conflict: 1, evidence: 1, boundary: 1, temporal: 1, availability: 1, cost: 1 };

export function computeUtility(affordance, weights = DEFAULT_WEIGHTS) {
  const conflictPairs = affordance.discrimination_capability?.conflict_pairs ?? [];
  // Normalized [0,1]: fraction of the condition's own conflict set this affordance's
  // declared capability addresses. Capability-based — this is what the observation CAN
  // discriminate, never a predicted result.
  const totalConflicts = affordance.unresolved_condition?.pairwise?.filter(p => p.classification === 'CONFLICT').length ?? conflictPairs.length;
  const dConflict = totalConflicts > 0 ? Math.min(1, conflictPairs.length / totalConflicts) : 0;
  const availability = affordance.available ? 1 : 0;
  const cost = affordance.available ? 0.1 : 0; // real cost model deferred — placeholder pending
                                                 // real Data Tap latency data, non-predictive

  return (
    weights.conflict * dConflict +
    weights.availability * availability -
    weights.cost * cost
  );
}

export function rankAffordances(affordances, weights) {
  return [...affordances]
    .map(a => ({ affordance: a, utility: computeUtility(a, weights) }))
    .sort((x, y) => y.utility - x.utility || x.affordance.id.localeCompare(y.affordance.id));
}

// ── Observation Path Memory (§9) — append-only, cross-cutting ─────────────────
const _paths = new Map();

export function createPathRecord({ perceptIdBefore, affordanceId, unresolvedCondition, observationRequest }) {
  const record = {
    id: `path_${crypto.randomUUID()}`,
    percept_id_before: perceptIdBefore,
    affordance_id: affordanceId,
    unresolved_condition: unresolvedCondition,
    observation_request: observationRequest,
    observation_plan: null,
    data_tap_id: null,
    observation_id: null,
    availability_snapshot: null,
    lifecycle_states: [],
    consequence: null,
    provenance: unresolvedCondition?.provenance ?? null,
    created_at: new Date().toISOString(),
    completed_at: null,
  };
  _paths.set(record.id, record);
  return record;
}

// Writes the consequence exactly once — a completed record is never mutated again (§9 invariant).
// observationProvenance: the SPECIFIC admitted observation's own ProvenanceDAG (from
// evidenceadmissiongate.js's admitted artifact — preserved there as of 2026-08-26, second Bottle
// Test remediation). This becomes the record's provenance — the originating condition's
// provenance (set at createPathRecord time) is never carried forward past completion.
//
// FAIL-CLOSED, no silent fallback (2026-08-26, fourth Bottle Test remediation): `observationProvenance`
// is now a REQUIRED key, not an optional one defaulting via `??`. The third Bottle Test found the
// prior `observationProvenance ?? record.provenance` fallback meant an omitted argument silently
// substituted the condition's provenance — indistinguishable from a caller correctly supplying it
// — and nothing in the code stopped a future caller from reproducing that exact defect. A caller
// with genuinely no admitted evidence this round must pass `observationProvenance: null`
// EXPLICITLY (an honest "nothing was observed"), which is accepted and recorded as null — the
// distinction being enforced is "caller declared an outcome" vs. "caller forgot the parameter",
// not "provenance exists" vs. "it doesn't".
export function completePathRecord(pathId, options = {}) {
  const record = _paths.get(pathId);
  if (!record) throw new Error(`PATH_MEMORY: unknown path id ${pathId}`);
  if (record.completed_at) throw new Error(`PATH_MEMORY: path ${pathId} already completed — records are immutable after completion`);
  if (!('observationProvenance' in options)) {
    throw new Error(
      'PATH_MEMORY: completePathRecord() requires an explicit `observationProvenance` — the ' +
      "specific observation's own ProvenanceDAG, or `null` if no evidence was admitted this " +
      'round. Omitting it is not a valid call: the prior silent fallback to the originating ' +
      "condition's provenance is exactly the defect closed 2026-08-26 (third Bottle Test)."
    );
  }
  const { plan, dataTapId, observationId, availabilitySnapshot, lifecycleStates, consequence, observationProvenance } = options;
  const updated = {
    ...record,
    observation_plan: plan ?? record.observation_plan,
    data_tap_id: dataTapId ?? record.data_tap_id,
    observation_id: observationId ?? record.observation_id,
    availability_snapshot: availabilitySnapshot ?? record.availability_snapshot,
    lifecycle_states: lifecycleStates ?? record.lifecycle_states,
    provenance: observationProvenance, // explicit, never falls back to record.provenance
    consequence,
    completed_at: new Date().toISOString(),
  };
  _paths.set(pathId, updated);
  return updated;
}

export function getPath(pathId) { return _paths.get(pathId) ?? null; }
export function pathsForPercept(perceptId) { return Array.from(_paths.values()).filter(p => p.percept_id_before === perceptId); }
export function pathsForAffordance(affordanceId) { return Array.from(_paths.values()).filter(p => p.affordance_id === affordanceId); }
export function residualUnresolvedAfter(pathId) { return getPath(pathId)?.consequence?.residual_unresolved ?? []; }

// sameTargetSpec (2026-08-27, fifth Bottle Test remediation): structural equality over a
// TargetSpec — entity set (order-independent) plus time window. Deliberately minimal: two
// TargetSpecs are the same scope only if they'd address the same entities over the same window;
// any other field difference (a future TargetSpec extension) is out of scope for this comparison
// until the spec defines one.
function sameTargetSpec(a, b) {
  const norm = (t) => JSON.stringify({
    target_entities: [...(t?.target_entities ?? [])].sort(),
    target_time_window: t?.target_time_window ?? null,
  });
  return norm(a) === norm(b);
}

// ── Reproposal suppression rule (§9, RATIFIED) ─────────────────────────────────
// Zero-discrimination suppresses re-derivation only until a material change is detected —
// never permanently. All 5 conditions must hold on the PRIOR completed path for suppression;
// any mismatch reopens eligibility.
//
// targetSpec (2026-08-27, fifth Bottle Test remediation): the ratified 5-condition rule (§9)
// names "same observation target and scope (TargetSpec)" as condition #3. The prior signature
// (condition, availableNow) had no parameter capable of ever evaluating that condition — a
// contract/interface defect, not a coverage gap: the same condition re-derived against a
// genuinely different target (e.g. a different CIK) with id/version/evidence/availability
// unchanged would have been incorrectly suppressed. targetSpec is now a required third argument
// and is compared structurally against the prior completed path's own
// `observation_request.target` (the TargetSpec that path actually ran against).
export function isEligibleForDerivation(condition, availableNow, targetSpec) {
  const priorPaths = Array.from(_paths.values())
    .filter(p => p.completed_at && p.unresolved_condition?.id === condition.id);
  if (priorPaths.length === 0) return true; // never attempted — always eligible

  const mostRecent = priorPaths.sort((a, b) => b.completed_at.localeCompare(a.completed_at))[0];
  // Zero-discrimination on THIS condition is determined solely by whether this condition's
  // own id still appears in residual_unresolved — not by formation_delta's null-ness, which
  // reflects an unrelated fact (whether some broader cross-domain Formation exists at all).
  // A targeted observation can genuinely address this condition while formation_delta stays
  // null for unrelated reasons (e.g. insufficient other-domain data) — conflating the two
  // produced a false zero-discrimination result during testing (2026-08-26) despite real,
  // on-target evidence having been admitted.
  const priorWasZeroDiscrimination =
    (mostRecent.consequence?.residual_unresolved ?? []).some(u => u.id === condition.id);
  if (!priorWasZeroDiscrimination) return true; // prior attempt DID discriminate — not suppressed at all

  const sameConditionVersion = mostRecent.unresolved_condition?.version === condition.version;
  const sameEvidenceSet = JSON.stringify([...(mostRecent.unresolved_condition?.evidence_ref_ids ?? [])].sort())
    === JSON.stringify([...(condition.evidence_ref_ids ?? [])].sort());
  const sameAvailability = mostRecent.availability_snapshot === availableNow;
  const sameTarget = sameTargetSpec(mostRecent.observation_request?.target, targetSpec);

  // All must remain unchanged for suppression to hold; any material change reopens eligibility.
  return !(sameConditionVersion && sameEvidenceSet && sameAvailability && sameTarget);
}
