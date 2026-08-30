// QA — KRYL-1204 targeted observation: ObservationRequest -> ObservationPlan ->
// secownershipconnector.js targeted invocation -> EAG admitAndDispatch() -> dispatchBatch()
// -> domaingravity pool -> getAllSignals()/inferFormation() reachable.
//
// Mocks global.fetch only (the external /api/edgar backend is outside this repo's visibility,
// per KRYL-1204's own grounding) — every other call in the chain is real code, real execution.

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}`); }
}

const CIK_A = '0001234567';
const CIK_B = '0007654321';
const CIK_C = '0009999999';

function edgarHit(id, subjectCik, subjectName, filerCik, filerName, fileDate, adsh) {
  return { _id: id, _source: { ciks: [subjectCik, filerCik], display_names: [subjectName, filerName], file_date: fileDate, adsh } };
}

// Fixed EDGAR-shaped fixture: entity A appears twice (2 filers), entity B once, entity C never.
const FIXTURE_HITS = [
  edgarHit('h1', CIK_A, 'Company A', '0001111111', 'Filer One', '2026-08-10', 'acc-h1'),
  edgarHit('h2', CIK_A, 'Company A', '0002222222', 'Filer Two', '2026-08-12', 'acc-h2'),
  edgarHit('h3', CIK_B, 'Company B', '0003333333', 'Filer Three', '2026-08-15', 'acc-h3'),
];

globalThis.fetch = async (url) => {
  const u = new URL(url, 'http://x');
  const startdt = u.searchParams.get('startdt');
  const enddt = u.searchParams.get('enddt');
  // Date-bounds check: reject dates outside a fixed valid fixture window.
  if (startdt < '2026-07-01' || enddt > '2026-09-01') {
    return { ok: true, json: async () => ({ hits: { hits: [] } }) };
  }
  return { ok: true, json: async () => ({ hits: { hits: FIXTURE_HITS } }) };
};

const { runTargetedOwnershipObservation, runSecOwnershipSync } = await import('./src/engine/connectors/secownershipconnector.js');
const { executeObservationRequest, isAvailable, deriveTerminalState } = await import('./src/engine/observationorchestrator.js');
const { getAllSignals } = await import('./src/engine/domaingravity.js');
const { admitAndDispatch } = await import('./src/engine/evidenceadmissiongate.js');
const { ProvenanceDAG } = await import('./src/engine/causalos/provenance.js');

// 1/2 — entity A vs entity B scoping
{
  const rA = await runTargetedOwnershipObservation({ entityCik: CIK_A, from: '2026-08-01', to: '2026-08-20' });
  const rB = await runTargetedOwnershipObservation({ entityCik: CIK_B, from: '2026-08-01', to: '2026-08-20' });
  check('1. Entity A returns only A-scoped evidence (2 filings, genuinely admitted)', rA.matched === 2 && rA.admitted.length === 2 && rA.admitted.every(a => a.subjectCik === CIK_A));
  check('2. Entity B does not receive A\'s evidence', rB.matched === 1 && rB.admitted.length === 1 && rB.admitted.every(a => a.subjectCik === CIK_B) && !rB.admitted.some(a => a.accession === 'acc-h1'));
}

// 3 — date bounds respected
{
  const rOut = await runTargetedOwnershipObservation({ entityCik: CIK_A, from: '2026-01-01', to: '2026-01-31' });
  check('3. Date bounds respected (out-of-window returns no match)', rOut.matched === 0 && rOut.total === 0);
}

// 4 — no-match represented explicitly, not fabricated
{
  const rNone = await runTargetedOwnershipObservation({ entityCik: CIK_C, from: '2026-08-01', to: '2026-08-20' });
  check('4. No-match is explicit (matched:0), not fabricated', rNone.matched === 0 && rNone.admitted.length === 0 && Array.isArray(rNone.admitted));
}

// 5 — multiple qualifying filings survive as distinct evidence
{
  const rA = await runTargetedOwnershipObservation({ entityCik: CIK_A, from: '2026-08-01', to: '2026-08-20' });
  const accessions = rA.admitted.map(a => a.accession);
  check('5. Multiple filings survive as distinct evidence records', rA.admitted.length === 2 && new Set(accessions).size === 2);
}

// 6 — entity identity and filing provenance survive the connector boundary
{
  const rA = await runTargetedOwnershipObservation({ entityCik: CIK_A, from: '2026-08-01', to: '2026-08-20' });
  const a0 = rA.admitted[0];
  check('6. Entity/filing identity survives to the admitted artifact',
    a0.subjectCik === CIK_A && a0.subjectName === 'Company A' && !!a0.accession && !!a0.filingDate && !!a0.searchWindow);
}

// 7 — existing EDGAR fallback still works (untargeted sync unaffected)
{
  const r = await runSecOwnershipSync({ from: '2026-08-01', to: '2026-08-20' });
  check('7. Existing untargeted runSecOwnershipSync still works', typeof r.total === 'number' && r.total === FIXTURE_HITS.length);
}

// 8 — EAG rejection still blocks dispatch (force via malformed provenance path indirectly:
// simulate by checking isAvailable() gate rejects an out-of-capability target field)
{
  const available = isAvailable('OWNERSHIP_FILING', { target_relationships: [[CIK_A, CIK_B]] });
  check('8. Capability gate rejects a target field the tap cannot serve (target_relationships)', available === false);
}

// 8b — full orchestrator UNAVAILABLE path for an unsupported capability (renamed from
// UNSUPPORTED, second Bottle Test remediation 2026-08-26 — spec §8 names this state UNAVAILABLE)
{
  const req = {
    id: 'req_1', affordance_id: 'aff_1',
    target: { target_relationships: [[CIK_A, CIK_B]] },
    observation_type: 'OWNERSHIP_FILING', requested_at: new Date().toISOString(), provenance: null,
  };
  const out = await executeObservationRequest(req);
  check('8b. Orchestrator reports UNAVAILABLE, never fabricates a plan for an unsupported capability',
    out.lifecycle.some(t => t.to === 'UNAVAILABLE') && out.plan === null);
}

// 8c — SECOND BOTTLE TEST REMEDIATION (2026-08-26): the exact adversarial regression from the
// independent re-run. A naive future bridge from resolveadjudication.js's real adjudicate()
// output would build target_entities from narrative candidate-TYPE strings, not real entity
// identifiers. Before this fix, isAvailable() checked only that the `target_entities` key was
// populated, never that its values were real CIKs — this scenario came back `available: true`,
// target_entities: ["RELATIONSHIP_STATE","OPPOSITE_DIRECTION"]. Permanent regression guard.
{
  const naiveTarget = { target_entities: ['RELATIONSHIP_STATE', 'OPPOSITE_DIRECTION'] };
  check('8c. Narrative candidate-type strings are REJECTED as entity identifiers (regression guard)',
    isAvailable('OWNERSHIP_FILING', naiveTarget) === false);

  const realTarget = { target_entities: [CIK_A] };
  check('   Real CIK-shaped entity identifiers still pass', isAvailable('OWNERSHIP_FILING', realTarget) === true);

  const req = {
    id: 'req_naive', affordance_id: 'aff_naive', target: naiveTarget,
    observation_type: 'OWNERSHIP_FILING', requested_at: new Date().toISOString(), provenance: null,
  };
  const out = await executeObservationRequest(req);
  check('   Full orchestrator path: naive bridge condition reaches UNAVAILABLE, never a plan',
    out.lifecycle.some(t => t.to === 'UNAVAILABLE') && out.plan === null);
}

// 8e — THIRD BOTTLE TEST REMEDIATION (2026-08-26): the independent re-run found isAvailable()'s
// entity validator coerced its input via String(id) before pattern-testing it, so a JS number
// (e.g. target_entities: [1234567]) was admitted as "available" even though nothing downstream
// could ever match it against EDGAR's string-typed CIKs — a silent false-negative (always
// INSUFFICIENT), not a rejection at the real defect. Fixed: isValidCik() requires typeof
// id === 'string' with no coercion. Permanent regression guard for every case the independent
// review flagged, plus a mixed valid/invalid batch (whole batch rejected — conservative, matches
// the field-level all-or-nothing contract).
{
  const cases = [
    ['numeric CIK (not a string)', [1234567], false],
    ['leading-whitespace CIK', [' 0001234567'], false],
    ['trailing-whitespace CIK', ['0001234567 '], false],
    ['empty string', [''], false],
    ['float string', ['12.3'], false],
    ['negative string', ['-123'], false],
    ['11-digit string (too long)', ['12345678901'], false],
    ['mixed valid + invalid batch', [CIK_A, 'RELATIONSHIP_STATE'], false],
    ['mixed valid + numeric batch', [CIK_A, 1234567], false],
    ['all valid batch', [CIK_A, CIK_B], true],
  ];
  for (const [label, entities, expected] of cases) {
    const result = isAvailable('OWNERSHIP_FILING', { target_entities: entities });
    check(`8e. Strict CIK typing — ${label} -> available:${expected}`, result === expected);
  }
}

// 8e2 — FOURTH BOTTLE TEST REMEDIATION (2026-08-26): target_time_window previously had no
// value_validator at all — malformed windows were only ever caught (or not) by fetch()/connector
// error handling several layers downstream, not by the capability contract itself. Permanent
// regression coverage at the actual contract boundary (isAvailable()), matching the entity
// validator's own pattern.
{
  const windowCases = [
    ['missing to', { from: '2026-08-01' }, false],
    ['missing from', { to: '2026-08-20' }, false],
    ['from after to (reversed range)', { from: '2026-08-20', to: '2026-08-01' }, false],
    ['non-ISO slash format', { from: '08/01/2026', to: '08/20/2026' }, false],
    ['invalid calendar date (out-of-range component)', { from: '2026-13-40', to: '2026-08-20' }, false],
    // null is treated identically to "field omitted" (pre-existing isAvailable() convention,
    // confirmed correct 2026-08-26): the field is genuinely optional — planFor() already defaults
    // a missing window to the connector's own sensible 30-day default — so null legitimately
    // means "no window specified," not "a malformed window was supplied." A non-null malformed
    // value (reversed range, bad format, out-of-calendar date) is what the contract must reject.
    ['null window (treated as omitted, not malformed)', null, true],
    ['array instead of object', ['2026-08-01', '2026-08-20'], false],
    ['empty object', {}, false],
    ['same-day window (from === to)', { from: '2026-08-01', to: '2026-08-01' }, true],
    ['valid window', { from: '2026-08-01', to: '2026-08-20' }, true],
    // Fifth Bottle Test remediation (2026-08-27): calendar-rollover dates, distinct from
    // out-of-range-component dates above — Date.parse() previously accepted these silently.
    ['rollover: Feb 29 in a non-leap year (2026)', { from: '2026-02-29', to: '2026-08-20' }, false],
    ['rollover: Feb 30 (never a real date)', { from: '2026-02-30', to: '2026-08-20' }, false],
    ['rollover: Apr 31 (April has 30 days)', { from: '2026-04-31', to: '2026-08-20' }, false],
    ['rollover: Jun 31 (June has 30 days)', { from: '2026-06-31', to: '2026-08-20' }, false],
    ['leap year Feb 29 (2024 IS a leap year) — legitimately valid', { from: '2024-02-29', to: '2024-08-20' }, true],
    ['century non-leap year (1900, div by 100 not 400)', { from: '1900-02-29', to: '1900-08-20' }, false],
    ['400-year leap exception (2000, div by 400) — legitimately valid', { from: '2000-02-29', to: '2000-08-20' }, true],
  ];
  for (const [label, window, expected] of windowCases) {
    const result = isAvailable('OWNERSHIP_FILING', { target_entities: [CIK_A], target_time_window: window });
    check(`8e2. Temporal validation — ${label} -> available:${expected}`, result === expected);
  }

  // Full orchestrator path: a malformed window is rejected at the contract boundary (UNAVAILABLE,
  // no plan, no network call attempted) — not silently degraded by fetch()/connector try-catch
  // several layers downstream.
  const badReq = {
    id: 'req_bad_window', affordance_id: 'aff_bad_window',
    target: { target_entities: [CIK_A], target_time_window: { from: '2026-08-20', to: '2026-08-01' } },
    observation_type: 'OWNERSHIP_FILING', requested_at: new Date().toISOString(), provenance: null,
  };
  const badOut = await executeObservationRequest(badReq);
  check('8e2. Full orchestrator path: reversed date range reaches UNAVAILABLE at the contract boundary, never a plan',
    badOut.lifecycle.some(t => t.to === 'UNAVAILABLE') && badOut.plan === null);
}

// 8d — INSUFFICIENT and WITHHELD, exercised via the real lifecycle-decision function
// (deriveTerminalState), not a fake final-state object. secownershipconnector.js's own
// evidence-construction pattern (always attaches a non-empty per-filing `evidence` array) means
// EAC3 passes vacuously for every real candidate it builds — so `rejected.length > 0` can never
// occur through that connector's live path (traced directly, 2026-08-26: EAC1/EAC2 are also
// unconditionally satisfied by the connector's own field construction). This is a property of
// the currently-selected connector, not a defect in the orchestrator's lifecycle contract — the
// contract itself is proven reachable here by feeding deriveTerminalState() a real EAG rejection
// record (produced by an actual admitAndDispatch() call, not hand-constructed).
{
  const insufficientResult = { admitted: [], matched: 0, rejected: [] };
  check('8d. INSUFFICIENT reachable when nothing matched', deriveTerminalState(insufficientResult) === 'INSUFFICIENT');

  const realRejection = admitAndDispatch({ source: 'X', domain: 'OWNERSHIP', signal: 50, confidence: 0.8, ts: Date.now() }); // no provenance -> real EAC2 rejection
  const withheldResult = { admitted: [], matched: 1, rejected: [realRejection.rejection] };
  check('   WITHHELD reachable in the orchestrator contract given a real EAG rejection record',
    deriveTerminalState(withheldResult) === 'WITHHELD' && withheldResult.rejected[0].failing_check === 'EAC2');

  const admittedResult = { admitted: [{ ok: true }], matched: 1, rejected: [] };
  check('   ADMITTED takes precedence when any candidate was admitted', deriveTerminalState(admittedResult) === 'ADMITTED');

  // Documents the honest absence: today's ONLY real capability (secownershipconnector.js) never
  // produces this shape itself — WITHHELD is architecturally supported but not naturally
  // exercised by the currently-selected connector, a fact about that connector's evidence
  // construction, not a defect in this lifecycle contract.
  const liveResult = await runTargetedOwnershipObservation({ entityCik: CIK_A, from: '2026-08-01', to: '2026-08-20' });
  check('   Honest absence confirmed: the live connector path never itself produces a rejection',
    liveResult.rejected.length === 0);
}

// 8f — FOURTH BOTTLE TEST REMEDIATION (2026-08-26): the genuine mixed case — admitted.length > 0
// AND rejected.length > 0 in the same result — was previously untested (only admitted-with-empty-
// rejected and rejected-only were covered). Real admitted artifact + real EAG rejection record,
// combined in one result object. Locks the documented precedence: ADMITTED wins, and the
// rejection is never silently dropped — it remains inspectable on `result.rejected` regardless.
{
  const dag = new ProvenanceDAG();
  dag.add({ event_id: 'ev_8f_admission', kind: 'test' });
  const realAdmission = admitAndDispatch({
    source: 'SEC_13D_13G_TARGETED', domain: 'OWNERSHIP', signal: 100, confidence: 0.9, ts: Date.now(),
    provenance: dag,
  });
  const realRejection2 = admitAndDispatch({ source: 'Y', domain: 'OWNERSHIP', signal: 50, confidence: 0.8, ts: Date.now() }); // no provenance -> EAC2 rejection
  const mixedResult = { admitted: realAdmission.admitted ? [realAdmission.artifact] : [], matched: 2, rejected: [realRejection2.rejection] };
  check('8f. Mixed admitted+rejected in one result: ADMITTED wins (locked precedence)',
    mixedResult.admitted.length > 0 && mixedResult.rejected.length > 0 && deriveTerminalState(mixedResult) === 'ADMITTED');
  check('   The rejection is never silently dropped even when ADMITTED wins (still inspectable on the result)',
    mixedResult.rejected[0].failing_check === 'EAC2');
}

// 9 — newly admitted evidence reaches the real formation-inference substrate (the causal
// capability a reopened observation condition depends on — KRYL-1202's Affordance Engine
// itself isn't built yet, so this proves the pipe exists, not the reproposal logic).
{
  const before = getAllSignals().filter(s => s.domain === 'OWNERSHIP').length;
  await runTargetedOwnershipObservation({ entityCik: CIK_A, from: '2026-08-01', to: '2026-08-20' });
  const after = getAllSignals().filter(s => s.domain === 'OWNERSHIP').length;
  check('9. Admitted evidence reaches the real domaingravity pool (formation-pipeline reachable)', after > before);
}

// Full end-to-end via the orchestrator (ObservationRequest -> ObservationPlan -> connector -> EAG)
{
  const req = {
    id: 'req_2', affordance_id: 'aff_2',
    target: { target_entities: [CIK_B], target_time_window: { from: '2026-08-01', to: '2026-08-20' } },
    observation_type: 'OWNERSHIP_FILING', requested_at: new Date().toISOString(), provenance: null,
  };
  const out = await executeObservationRequest(req);
  check('End-to-end: ObservationRequest -> Plan -> targeted invocation -> ADMITTED lifecycle',
    out.plan?.data_tap_id === 'secownershipconnector' &&
    out.lifecycle.map(t => t.to).join('>') === 'REQUESTED>PLANNED>DISPATCHED>OBSERVING>RECEIVED>NORMALIZED>ADMITTED' &&
    out.result.admitted.length === 1);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
