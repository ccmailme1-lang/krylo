// KRYL-1204 — Observation Orchestrator (targeted invocation)
// specs/SPEC-targeted-connector-adapter.md + specs/SPEC-closed-loop-observation-architecture.md §6/§8.
//
// Smallest real capability slice: ObservationRequest -> ObservationPlan -> targeted connector
// invocation -> EAG admission (via the connector's own admitAndDispatch() calls). Owns the
// lifecycle from REQUESTED through NORMALIZED only (§8) — ADMITTED/PERCEIVED/INCORPORATED are
// KRYL-1203/1202's territory, observable downstream via the formation pipeline, not asserted here.
//
// Does not import surfaceRouter — no path to dispatchBatch() exists in this module, satisfying
// the structural no-bypass requirement at the orchestrator level as well as the connector level.
//
// Capability registry, minimal real form (§2's DataTapCapability): one entry, matching what
// secownershipconnector.js actually supports today post-KRYL-1204 extension.

import { runTargetedOwnershipObservation } from './connectors/secownershipconnector.js';

// entity_pattern (2026-08-26, second Bottle Test remediation): a CIK is a purely numeric string,
// at most 10 digits — the same convention edgar8kconnector.js/edgarnarrativeconnector.js already
// use (`String(cik).padStart(10, '0')`). Grounded in that precedent, not invented here. Closes the
// adversarial finding that isAvailable() previously validated only that the `target_entities` KEY
// was populated, never that its VALUES were real entity identifiers — a narrative candidate-type
// string like "RELATIONSHIP_STATE" passed the old check and would have been handed to planFor()
// as a literal CIK.
const CIK_PATTERN = /^\d{1,10}$/;

// isValidCik (2026-08-26, third Bottle Test remediation): the third independent re-run found the
// prior validator coerced its input via String(id) before testing the pattern, so a JS number
// (e.g. target_entities: [1234567]) was admitted as "available" — planFor() then passed the raw
// number through uncoerced, and the connector's strict-equality match against EDGAR's string CIKs
// could never succeed, producing a silent false-negative (INSUFFICIENT) instead of a rejection at
// the actual defect. The capability contract requires the target VALUE to already be of the
// declared type, not merely coercible to a matching shape — validating a coerced value tests
// whether the shape *could* work, not whether the value the caller actually supplied does. No
// coercion: only a real string in the declared CIK shape is accepted.
function isValidCik(id) {
  return typeof id === 'string' && CIK_PATTERN.test(id);
}

// isValidTimeWindow (2026-08-26, fourth Bottle Test remediation): target_time_window previously
// had no value_validator — the fourth independent review traced the downstream path and found no
// exploitable defect, but confirmed it was a genuinely absent validator, not a proven-safe one,
// relying on fetch()/connector try-catch to degrade a malformed window into an empty result
// rather than the capability contract rejecting it at the boundary. `isAvailable()` — the same
// place `target_entities` is validated — is the contract boundary; error handling three layers
// downstream inside the connector is not a substitute for it. Dates are required as ISO
// YYYY-MM-DD strings (the shape searchOwnershipFilings()/runSecOwnershipSync() already produce
// via `.toISOString().slice(0,10)` — matching existing convention, not inventing a new format),
// both must be real calendar dates, and `from` must not be after `to`.
// isValidDateString (2026-08-27, fifth Bottle Test remediation): Date.parse() is the wrong
// primitive for validating a canonical calendar date — it silently rolls invalid dates over
// instead of rejecting them (`Date.parse('2026-02-29')` succeeds as 2026-03-01 even though 2026
// is not a leap year), so `2026-02-29`, `2026-02-30`, `2026-04-31` all previously passed as
// "valid." Real Gregorian calendar validation instead: exact YYYY-MM-DD shape, month in 1-12,
// day within that month's real length for that year (leap-year computed directly, not delegated
// to Date.parse's rollover behavior).
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}
function isValidDateString(s) {
  if (typeof s !== 'string') return false;
  const m = ISO_DATE_PATTERN.exec(s);
  if (!m) return false;
  const year = Number(m[1]), month = Number(m[2]), day = Number(m[3]);
  if (month < 1 || month > 12) return false;
  const daysInMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day >= 1 && day <= daysInMonth[month - 1];
}
function isValidTimeWindow(w) {
  if (typeof w !== 'object' || w === null || Array.isArray(w)) return false;
  if (!isValidDateString(w.from) || !isValidDateString(w.to)) return false;
  return w.from <= w.to; // ISO YYYY-MM-DD strings compare correctly lexicographically
}

export const CAPABILITY_REGISTRY = [
  {
    tap_id: 'secownershipconnector',
    observation_type: 'OWNERSHIP_FILING',
    targetable_fields: ['target_entities', 'target_time_window'],
    // Per-field value validators — checked in addition to the key-membership check below.
    value_validators: {
      target_entities: (v) => Array.isArray(v) && v.every(isValidCik),
      target_time_window: isValidTimeWindow,
    },
  },
];

// available(): the real mechanism from spec §2 — a capability exists for the observation_type,
// every non-empty TargetSpec field the request uses is in that capability's targetable_fields,
// AND (2026-08-26) every field with a declared value_validator actually passes it. Structural
// presence of a field is not semantic validity of its contents — checking only the former was
// the second Bottle Test's decisive NO-GO finding.
export function isAvailable(observationType, target) {
  const cap = CAPABILITY_REGISTRY.find(c => c.observation_type === observationType);
  if (!cap) return false;
  const usedFields = Object.keys(target ?? {}).filter(
    k => target[k] !== undefined && target[k] !== null &&
      !(Array.isArray(target[k]) && target[k].length === 0)
  );
  if (!usedFields.every(f => cap.targetable_fields.includes(f))) return false;
  return usedFields.every(f => {
    const validator = cap.value_validators?.[f];
    return !validator || validator(target[f]);
  });
}

// Builds an ObservationPlan from a request — the only translation step between a generic
// TargetSpec and this specific connector's real parameters (entityCik/from/to).
function planFor(request) {
  const cap = CAPABILITY_REGISTRY.find(c => c.observation_type === request.observation_type);
  if (!cap) return null;
  const entityCik = request.target?.target_entities?.[0] ?? null;
  const window = request.target?.target_time_window ?? {};
  return {
    request_id: request.id,
    data_tap_id: cap.tap_id,
    invocation_params: { entityCik, from: window.from, to: window.to },
    estimated_cost: 1, // single HTTP call, non-predictive placeholder pending real latency data
  };
}

// Second Bottle Test remediation (2026-08-26): spec §8 names the no-capability terminal state
// UNAVAILABLE; the implementation had drifted to UNSUPPORTED. Renamed to match the spec — spec
// governs on divergence (CLAUDE.md §1), not the other way around.
//
// deriveTerminalState() — extracted as its own pure function so the ADMITTED/INSUFFICIENT/
// WITHHELD decision can be exercised directly by a test with a real EAG-shaped `result` object,
// without needing the currently-hardcoded secownershipconnector.js call to actually produce a
// rejection (it structurally never does — see connector's evidence-construction comment). This
// is the real lifecycle-transition machinery, called directly, not a QA-side reimplementation of
// the branch logic.
//
// Precedence, confirmed and locked (2026-08-26, fourth Bottle Test remediation — NOT redesigned,
// only tested and documented per Founder ruling): when a single request produces BOTH admitted
// AND rejected filings (multiple matched candidates, some admitted, some EAG-rejected),
// ADMITTED wins unconditionally — this function reports request-level "did anything real get
// incorporated," not batch-level purity. A request that produced at least one real, admitted
// observation is not usefully described as WITHHELD merely because a different candidate in the
// same batch was also rejected; the rejection itself is never silently dropped — it survives on
// `result.rejected` and in EAG's own rejection ledger (`listRejections()`) regardless of which
// terminal state this function reports. See qa_observationorchestrator.mjs "8f" for the direct,
// permanent test of this exact mixed case.
export function deriveTerminalState({ admitted, matched, rejected }) {
  if (admitted.length > 0) return 'ADMITTED';
  if (matched === 0) return 'INSUFFICIENT';
  if (rejected.length > 0) return 'WITHHELD';
  return null; // matched > 0 but neither admitted nor rejected populated — not a real outcome shape
}

// REQUESTED -> PLANNED -> DISPATCHED -> OBSERVING -> RECEIVED -> NORMALIZED.
// EAG admission (ADMITTED) happens inside the connector's own admitAndDispatch() calls, one per
// matched filing — this function reports what it can see from its own vantage point: how many
// candidates were sent to EAG and how many it observed being admitted vs. rejected.
export async function executeObservationRequest(request) {
  const lifecycle = [{ from: null, to: 'REQUESTED', timestamp: new Date().toISOString() }];

  if (!isAvailable(request.observation_type, request.target)) {
    lifecycle.push({ from: 'REQUESTED', to: 'UNAVAILABLE', timestamp: new Date().toISOString() });
    return { request, plan: null, lifecycle, result: null };
  }

  const plan = planFor(request);
  lifecycle.push({ from: 'REQUESTED', to: 'PLANNED', timestamp: new Date().toISOString() });

  if (!plan.invocation_params.entityCik) {
    lifecycle.push({ from: 'PLANNED', to: 'UNAVAILABLE', timestamp: new Date().toISOString() });
    return { request, plan, lifecycle, result: null };
  }

  lifecycle.push({ from: 'PLANNED', to: 'DISPATCHED', timestamp: new Date().toISOString() });
  lifecycle.push({ from: 'DISPATCHED', to: 'OBSERVING', timestamp: new Date().toISOString() });

  let result;
  try {
    result = await runTargetedOwnershipObservation(plan.invocation_params);
  } catch (err) {
    lifecycle.push({ from: 'OBSERVING', to: 'FAILED', timestamp: new Date().toISOString() });
    return { request, plan, lifecycle, result: null, error: err.message };
  }

  if (result.error) {
    lifecycle.push({ from: 'OBSERVING', to: 'FAILED', timestamp: new Date().toISOString() });
    return { request, plan, lifecycle, result, error: result.error };
  }

  lifecycle.push({ from: 'OBSERVING', to: 'RECEIVED', timestamp: new Date().toISOString() });
  lifecycle.push({ from: 'RECEIVED', to: 'NORMALIZED', timestamp: new Date().toISOString() });

  // Each matched filing already ran through EAG (admitAndDispatch, inside the connector) —
  // report what happened, not a promise of what will happen.
  const terminal = deriveTerminalState(result);
  if (terminal) {
    lifecycle.push({ from: 'NORMALIZED', to: terminal, timestamp: new Date().toISOString() });
  }

  return { request, plan, lifecycle, result };
}
