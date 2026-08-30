// QA — KRYL-1203 Evidence Admission Gate (EAG)
// Exercises EAC1-EAC5 against real code, not mocked assertions.
import { admitAndDispatch, listRejections } from './src/engine/evidenceadmissiongate.js';
import { ProvenanceDAG } from './src/engine/causalos/provenance.js';
import { createObject, flagContradiction, OBJECT_TYPE } from './src/engine/rkmstore.js';

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}`); }
}

function realDag() {
  const dag = new ProvenanceDAG();
  dag.add({ event_id: 'ev_1', kind: 'test' });
  return dag;
}

// EAC1 — missing required field
{
  const r = admitAndDispatch({ domain: 'OWNERSHIP', signal: 50, confidence: 0.8, ts: Date.now() });
  check('EAC1 rejects missing source', r.admitted === false && r.rejection.failing_check === 'EAC1');
}

// EAC1 — empty source string
{
  const r = admitAndDispatch({ source: '  ', domain: 'OWNERSHIP', signal: 50, confidence: 0.8, ts: Date.now() });
  check('EAC1 rejects blank source', r.admitted === false && r.rejection.failing_check === 'EAC1');
}

// EAC2 — missing provenance
{
  const r = admitAndDispatch({ source: 'SEC_13D_13G', domain: 'OWNERSHIP', signal: 50, confidence: 0.8, ts: Date.now() });
  check('EAC2 rejects missing provenance', r.admitted === false && r.rejection.failing_check === 'EAC2');
}

// EAC2 — empty provenance DAG
{
  const r = admitAndDispatch({ source: 'SEC_13D_13G', domain: 'OWNERSHIP', signal: 50, confidence: 0.8, ts: Date.now(), provenance: new ProvenanceDAG() });
  check('EAC2 rejects empty DAG', r.admitted === false && r.rejection.failing_check === 'EAC2');
}

// EAC3 — no identityId, vacuous pass -> full admission
{
  const r = admitAndDispatch({ source: 'SEC_13D_13G', domain: 'OWNERSHIP', signal: 50, confidence: 0.8, ts: Date.now(), provenance: realDag() });
  check('EAC3 vacuous pass admits with valid EAC1/EAC2', r.admitted === true);
  check('EAC5 — no elevated confidence field added', r.admitted && r.artifact.confidence === 0.8 && !('strength' in r.artifact) && !('score' in r.artifact));
}

// EAC3 — real disputed identity, no new evidence -> rejected (not a fabricated pass)
{
  const objA = createObject({ identityId: 'CIK_TEST_1', objectType: OBJECT_TYPE.ENTITY_STATE, title: 'A', evidence: ['e1'] });
  const objB = createObject({ identityId: 'CIK_TEST_1', objectType: OBJECT_TYPE.ENTITY_STATE, title: 'B', evidence: ['e2'] });
  flagContradiction(objA.id, objB.id, 'qa_test', 'CONFLICT');
  const r = admitAndDispatch({
    source: 'SEC_13D_13G', domain: 'OWNERSHIP', signal: 50, confidence: 0.8, ts: Date.now(),
    provenance: realDag(), identityId: 'CIK_TEST_1',
    // no `evidence` field -> should be rejected
  });
  check('EAC3 rejects candidate against disputed identity with no new evidence', r.admitted === false && r.rejection.failing_check === 'EAC3');

  const r2 = admitAndDispatch({
    source: 'SEC_13D_13G', domain: 'OWNERSHIP', signal: 50, confidence: 0.8, ts: Date.now(),
    provenance: realDag(), identityId: 'CIK_TEST_1', evidence: ['new_filing_e3'],
  });
  check('EAC3 admits disputed identity when candidate brings new evidence', r2.admitted === true);
}

// EAC4 — rejection is a first-class record, never a silent drop
{
  const before = listRejections().length;
  admitAndDispatch({ source: 'X', domain: 'OWNERSHIP', signal: 50, confidence: 0.8, ts: Date.now() }); // no provenance
  const after = listRejections().length;
  check('EAC4 rejection recorded, not silently dropped', after === before + 1);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
