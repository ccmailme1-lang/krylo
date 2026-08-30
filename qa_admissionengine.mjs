// qa_admissionengine.mjs — golden set for src/engine/admissionengine.js
// Proves the full pipeline requested: fixture RelationCore -> schema validation ->
// admission evaluation -> TEL event -> admitted population -> audit/replay test.
// Not wired into any live surface. Run: node qa_admissionengine.mjs

import { makeRelationCore, RelationType } from './src/engine/relationontology.js';
import { evaluateAdmission, admitCandidate } from './src/engine/admissionengine.js';
import { Vocabulary, EventType, idempotencyKey } from './src/engine/truthevent.js';

let pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else      { fail++; console.log(`  ✗ ${label}`); }
}
function throws(fn) { try { fn(); return false; } catch { return true; } }

// ---- an append-only in-memory "admitted population" (test double for the real TEL store —
// DQ-1 resolved single-ledger topology, storage implementation itself is separately out of scope) ----
const ledger = [];
function appendEvent(event) { ledger.push(event); return { eventId: event.eventId, recordedAt: event.recordedAt }; }
function admittedPopulation() { return ledger.filter(e => e.decision === 'VALIDATED'); }

console.log('\n=== Stage 1: fixture RelationCore construction (real SRE schema, real validation) ===');
let rcDependsOn, rcCauses, rcUnsourced;
{
  rcDependsOn = makeRelationCore({
    id: 'rc_1', sourceId: 'ENTITY_A', targetId: 'ENTITY_B', relationType: RelationType.DEPENDS_ON,
    eta: 0.9, phi0: 0.7, structuralSupport: 0.8, provenanceHash: 'blake3_abc123',
  });
  check('valid DEPENDS_ON RelationCore constructs', !!rcDependsOn);
  check('RelationCore is frozen (immutable per SRE contract)', Object.isFrozen(rcDependsOn));

  rcCauses = makeRelationCore({
    id: 'rc_2', sourceId: 'ENTITY_C', targetId: 'ENTITY_D', relationType: RelationType.CAUSES,
    eta: 0.85, phi0: 0.6, structuralSupport: 0.75, provenanceHash: 'blake3_def456',
  });
  check('valid CAUSES RelationCore constructs', !!rcCauses);

  check('unsourced RelationCore rejected at schema layer (no provenanceHash)',
    throws(() => makeRelationCore({ id: 'rc_3', sourceId: 'X', targetId: 'Y', relationType: RelationType.CAUSES,
      eta: 0.5, phi0: 0.5, structuralSupport: 0.5, provenanceHash: null })));
}

console.log('\n=== Stage 2: admission evaluation (pure predicate, against real Gate-0 table) ===');
{
  const r1 = evaluateAdmission({ vocabulary: Vocabulary.SRE_RELATIONCORE, relationType: 'DEPENDS_ON', origin: 'OBSERVED' });
  check('SRE DEPENDS_ON currently REJECTED (Gate-0: all 14 SRE types Defer)', r1.decision === 'REJECTED');
  check('rationale explains Gate-0 disabled, not a fabricated reason', r1.rationale.some(x => x.ruleId === 'GATE0_ENABLED' && x.outcome === 'FAIL'));

  const r2 = evaluateAdmission({ vocabulary: Vocabulary.RKM_GENEALOGY, relationType: 'dependsOn', origin: 'OBSERVED' });
  check('RKM dependsOn (OBSERVED) ADMITTED per KRYL-1133s own existing table', r2.decision === 'VALIDATED');

  const r3 = evaluateAdmission({ vocabulary: Vocabulary.RKM_GENEALOGY, relationType: 'causes', origin: 'OBSERVED' });
  check('RKM causes REJECTED (KRYL-1133 table: enabled false)', r3.decision === 'REJECTED');

  const r4 = evaluateAdmission({ vocabulary: Vocabulary.RKM_GENEALOGY, relationType: 'dependsOn', origin: 'FABRICATED' });
  check('RKM dependsOn with disallowed origin REJECTED', r4.decision === 'REJECTED');

  const r5 = evaluateAdmission({ vocabulary: Vocabulary.RKM_GENEALOGY, relationType: 'dependsOn', origin: null });
  check('RKM dependsOn with missing origin -> PROPOSED (ESCALATE), not silently admitted', r5.decision === 'PROPOSED');
}

console.log('\n=== Stage 3: admitCandidate — full evaluation + TruthEvent emission ===');
{
  check('missing decidedBy throws (I1 — no self-validation, no default)',
    throws(() => admitCandidate({ ...rcDependsOn, vocabulary: Vocabulary.RKM_GENEALOGY, relationType: 'dependsOn', origin: 'OBSERVED' },
      { rulesetVersion: '1.0.0' })));

  const { decision, event } = admitCandidate(
    { ...rcDependsOn, vocabulary: Vocabulary.RKM_GENEALOGY, relationType: 'dependsOn', origin: 'OBSERVED' },
    { decidedBy: 'admission_authority_1', rulesetVersion: '1.0.0', now: 5000 }
  );
  check('decision is VALIDATED', decision === 'VALIDATED');
  check('emitted event type is RELATIONSHIP_ADMITTED', event.eventType === EventType.RELATIONSHIP_ADMITTED);
  check('event carries the real RelationCore id', event.relationshipId === 'rc_1');
  check('event is frozen', Object.isFrozen(event));

  const rejected = admitCandidate(
    { ...rcCauses, vocabulary: Vocabulary.SRE_RELATIONCORE, relationType: 'CAUSES', origin: 'OBSERVED' },
    { decidedBy: 'admission_authority_1', rulesetVersion: '1.0.0', now: 6000, sreRelationTypes: new Set(Object.values(RelationType)) }
  );
  check('CAUSES under SRE vocabulary REJECTED (Gate-0 Defer)', rejected.decision === 'REJECTED');
  check('rejected event type is RELATIONSHIP_REJECTED', rejected.event.eventType === EventType.RELATIONSHIP_REJECTED);
}

console.log('\n=== Stage 3b: rationale COMPLETENESS — every applicable rule recorded, no short-circuit ===');
{
  const r1 = evaluateAdmission({ vocabulary: Vocabulary.RKM_GENEALOGY, relationType: 'dependsOn', origin: 'OBSERVED' });
  check('VALIDATED case: all 3 applicable rules recorded (VOCAB, TYPE, ENABLED, ORIGIN = 4)', r1.rationale.length === 4);
  check('VALIDATED case: rule order is VOCAB, TYPE, ENABLED, ORIGIN',
    r1.rationale.map(r => r.ruleId).join(',') === 'GATE0_VOCAB,GATE0_TYPE,GATE0_ENABLED,GATE0_ORIGIN');

  // The case the fix specifically targets: a policy entry with enabled:false AND allowedOrigins
  // set — before the fix, ENABLED:FAIL would short-circuit and ORIGIN would never be evaluated
  // or recorded, even though it's independently checkable off the same `entry`.
  const customPolicy = Object.freeze({
    TEST_VOCAB: Object.freeze({
      testType: Object.freeze({ enabled: false, allowedOrigins: Object.freeze(['OBSERVED']) }),
    }),
  });
  const r2 = evaluateAdmission({ vocabulary: 'TEST_VOCAB', relationType: 'testType', origin: 'OBSERVED' }, customPolicy);
  check('disabled-but-checkable entry: GATE0_ENABLED recorded', r2.rationale.some(r => r.ruleId === 'GATE0_ENABLED' && r.outcome === 'FAIL'));
  check('disabled-but-checkable entry: GATE0_ORIGIN is ALSO recorded, not skipped (the actual fix)',
    r2.rationale.some(r => r.ruleId === 'GATE0_ORIGIN' && r.outcome === 'PASS'));
  check('decision still correctly REJECTED (FAIL anywhere wins)', r2.decision === 'REJECTED');

  // Same fixture, but with a disallowed origin too — proves BOTH failing rules are captured,
  // not just the first one encountered.
  const r3 = evaluateAdmission({ vocabulary: 'TEST_VOCAB', relationType: 'testType', origin: 'FABRICATED' }, customPolicy);
  check('two independent failures: both GATE0_ENABLED and GATE0_ORIGIN recorded as FAIL',
    r3.rationale.filter(r => r.outcome === 'FAIL').length === 2);

  // Prerequisite failures (VOCAB/TYPE) are legitimately terminal — there is no `entry` to run
  // ENABLED/ORIGIN against, so a short rationale here is completeness, not a short-circuit bug.
  const r4 = evaluateAdmission({ vocabulary: 'NOT_REAL', relationType: 'x', origin: 'OBSERVED' });
  check('unknown vocabulary: rationale correctly has exactly 1 entry (nothing else is evaluable)', r4.rationale.length === 1);
}

console.log('\n=== Stage 4: append to ledger, admitted population, replay/audit ===');
{
  const events = [
    admitCandidate({ ...rcDependsOn, vocabulary: Vocabulary.RKM_GENEALOGY, relationType: 'dependsOn', origin: 'OBSERVED' },
      { decidedBy: 'auth_1', rulesetVersion: '1.0.0', now: 1000 }).event,
    admitCandidate({ ...rcCauses, vocabulary: Vocabulary.SRE_RELATIONCORE, relationType: 'CAUSES', origin: 'OBSERVED' },
      { decidedBy: 'auth_1', rulesetVersion: '1.0.0', now: 2000, sreRelationTypes: new Set(Object.values(RelationType)) }).event,
    admitCandidate({ id: 'rc_4', sourceId: 'E', targetId: 'F', vocabulary: Vocabulary.RKM_GENEALOGY,
        relationType: 'derivedFrom', origin: 'OBSERVED', provenanceHash: 'blake3_ghi789', createdAt: 3000 },
      { decidedBy: 'auth_1', rulesetVersion: '1.0.0', now: 3000 }).event,
  ];
  events.forEach(appendEvent);

  check('ledger has 3 events (append-only, nothing dropped)', ledger.length === 3);
  check('admitted population has 2 (dependsOn + derivedFrom), CAUSES excluded', admittedPopulation().length === 2);
  check('admitted population contains only VALIDATED decisions', admittedPopulation().every(e => e.decision === 'VALIDATED'));
  check('ledger preserves insertion order (recordedAt ascending)',
    ledger.every((e, i) => i === 0 || ledger[i - 1].recordedAt <= e.recordedAt));

  const replay = ledger.filter(e => e.recordedAt <= 2000);
  check('replay-from-timestamp returns correct subset', replay.length === 2);

  check('no event object was mutated after append (still frozen)', ledger.every(e => Object.isFrozen(e)));
}

console.log('\n=== Stage 5: idempotency across the full pipeline ===');
{
  const cand = { ...rcDependsOn, vocabulary: Vocabulary.RKM_GENEALOGY, relationType: 'dependsOn', origin: 'OBSERVED' };
  const e1 = admitCandidate(cand, { decidedBy: 'auth_1', rulesetVersion: '1.0.0', now: 100 }).event;
  const e2 = admitCandidate(cand, { decidedBy: 'auth_2', rulesetVersion: '1.0.0', now: 200 }).event;
  check('same candidate admitted twice -> same idempotency key regardless of decidedBy/timestamp',
    idempotencyKey(e1) === idempotencyKey(e2));
}

console.log(`\nRESULT: ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
