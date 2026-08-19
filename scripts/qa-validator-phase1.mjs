#!/usr/bin/env node
// QA — Phase 1 foundation: candidateview.js + context providers + buildValidationProfile
// end-to-end with zero real operators registered (honest N/A everywhere, per orchestrator.js).

import { toValidatorCandidate, isValidatorCandidate } from '../src/engine/validator/candidateview.js';
import { buildScopedContext } from '../src/engine/validator/context/index.js';
import { buildValidationProfile, registerOperator, OPERATOR_REGISTRY } from '../src/engine/validator/orchestrator.js';

let pass = 0, fail = 0;
const check = (name, cond) => { if (cond) pass++; else { fail++; console.error(`✗ ${name}`); } };

// 1. toValidatorCandidate — correct projection, frozen, rejects incomplete core.
const core = {
  id: 'rel_1', sourceId: 'TECHNOLOGY', targetId: 'CAPITAL', relationType: 'CAUSES',
  provenanceHash: 'abc123', eta: 0.9, phi0: 0.5, structuralSupport: 0.7, createdAt: Date.now(),
};
const candidate = toValidatorCandidate(core);
check('candidate has exactly 5 fields', Object.keys(candidate).length === 5);
check('candidate excludes eta/phi0/structuralSupport', !('eta' in candidate) && !('phi0' in candidate) && !('structuralSupport' in candidate));
check('candidate is frozen', Object.isFrozen(candidate));
let mutateThrew = false;
try { candidate.sourceId = 'HACKED'; } catch { mutateThrew = true; }
check('mutation attempt throws under freeze (strict mode)', mutateThrew && candidate.sourceId === 'TECHNOLOGY');
check('isValidatorCandidate recognizes it', isValidatorCandidate(candidate));
check('isValidatorCandidate rejects RelationCore itself', !isValidatorCandidate(core));

let threw = false;
try { toValidatorCandidate({ id: 'x' }); } catch { threw = true; }
check('toValidatorCandidate throws on incomplete core', threw);

// 2. buildScopedContext — key-scoped, absent not undefined.
const tCtx = buildScopedContext('TEMPORAL', candidate, {});
check('TEMPORAL context has evidence + lineage only', 'evidence' in tCtx && 'lineage' in tCtx && !('worldGraph' in tCtx));
const sCtx = buildScopedContext('STRUCTURAL', candidate, {});
check('STRUCTURAL context has worldGraph only', 'worldGraph' in sCtx && !('evidence' in sCtx));
check('scoped context is frozen', Object.isFrozen(tCtx));

// 3. Domain-scoped signalState resolves for a TECHNOLOGY->CAPITAL candidate (live-wired provider).
const iCtx = buildScopedContext('INFORMATION', candidate, {});
const signalResult = iCtx.signalState();
check('signalState resolves for domain-scoped candidate (may be null if no live signals, but must not throw)', signalResult === null || typeof signalResult === 'object');

// 4. Providers with no injected resolver correctly return null (structural absence, not a crash).
check('evidence provider returns null with no resolver injected', tCtx.evidence() === null);
check('lineage provider returns null with no dag injected', tCtx.lineage() === null);

// 5. Orchestrator with zero operators registered — everything N/A, overall UNDETERMINED.
check('OPERATOR_REGISTRY starts empty', Object.keys(OPERATOR_REGISTRY).length === 0);
const profile = buildValidationProfile(candidate, {});
check('all 8 operators reported', Object.keys(profile.operators).length === 8);
check('every operator is N/A with no registrations', Object.values(profile.operators).every(r => r.state === 'N/A'));
check('overall_status is UNDETERMINED with nothing registered', profile.overall_status === 'UNDETERMINED');
check('profile is frozen', Object.isFrozen(profile));
check('candidate_id matches', profile.candidate_id === candidate.id);

// 6. registerOperator + one fake PASS-only operator flips overall_status correctly.
registerOperator('TEMPORAL', {
  applicabilityPredicate: () => true,
  test: () => ({ operator: 'TEMPORAL', state: 'PASS', evidence_refs: [], rationale: 'test fixture' }),
});
const profile2 = buildValidationProfile(candidate, {});
check('TEMPORAL now PASS after registration', profile2.operators.TEMPORAL.state === 'PASS');
check('other 7 still N/A', Object.entries(profile2.operators).filter(([k]) => k !== 'TEMPORAL').every(([, r]) => r.state === 'N/A'));
// STRUCTURAL/INDEPENDENCE/STABILITY still N/A (unregistered) -> stage 3/4 logic: mixed PASS+N/A, no FAIL/UNDETERMINED -> PARTIALLY_SUPPORTED
check('overall_status is PARTIALLY_SUPPORTED (1 Class A PASS, 3 Class A N/A)', profile2.overall_status === 'PARTIALLY_SUPPORTED');

let regThrew = false;
try { registerOperator('NOT_A_REAL_OPERATOR', {}); } catch { regThrew = true; }
check('registerOperator rejects unknown operator name', regThrew);

console.log(`\nPhase 1 QA: ${pass}/${pass + fail} passed`);
if (fail > 0) process.exit(1);
