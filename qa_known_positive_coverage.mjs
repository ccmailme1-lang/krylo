// qa_known_positive_coverage.mjs — Known-Positive Regression Suite.
//
// Purpose: catch the KRYL-1347 bug class before a guest does. A "coverage"/"state" function
// that can NEVER return a present/supported state for ANY real input is almost certainly a
// stub (reconnpayload.js's relationshipCoverage() was exactly this -- unconditionally BLOCKED,
// for every input, forever -- even though real admitted data existed the whole time).
//
// This file maintains a short list of facts KNOWN to be real and admitted in this system right
// now, and runs every surface that claims to be able to show a relationship against them.
// Adding a new real fact here (as more get admitted) extends the suite's coverage -- the list
// itself is the source of truth for "what should never come back empty."
//
// Run: node qa_known_positive_coverage.mjs

import { resolveAny } from './src/engine/entityresolution.js';
import { relationshipCoverage, assembleReconnPayload } from './src/engine/reconnpayload.js';
import { assembleNarrative } from './src/engine/narrativeassembly.js';
import { synthStructuralEntity } from './src/engine/structuralentitysynthesis.js';
import './src/engine/producers/rsievidencemigration.js'; // populates the real ACQUIRED edge

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };

function subjScopeFor(name) {
  const e = resolveAny(name);
  if (!e) return null;
  return { kind: 'ENTITY', canonicalId: e.canonicalId, entity: { canonicalId: e.canonicalId, name: e.canonicalName, identifiers: e.identifiers ?? {}, domainTags: e.domainTags ?? [] } };
}

// ── The known-positive list. Extend this as more real facts get admitted. ──────────────────
const KNOWN_FACTS = [
  { a: 'Sysco', b: 'Restaurant Depot', type: 'ACQUIRED', source: 'rsievidencemigration.js (SEC Form 425)' },
];

console.log(`Known-Positive Regression Suite — ${KNOWN_FACTS.length} real fact(s) on record.\n`);

for (const fact of KNOWN_FACTS) {
  console.log(`${fact.a} <-> ${fact.b} (${fact.type}, source: ${fact.source}):`);

  // Surface 1 — reconnpayload.js's relationshipCoverage() / assembleReconnPayload()
  {
    const subjScope = subjScopeFor(fact.a);
    const rc = relationshipCoverage(subjScope);
    ok(`reconnpayload.relationshipCoverage() is NOT a permanent stub for this subject`, rc.state !== 'BLOCKED');
    ok(`reconnpayload.relationshipCoverage() surfaces the real relationship`, rc.state === 'PRESENT' && rc.relationships.some(r => r.type === fact.type));

    const payload = assembleReconnPayload({ analysisIntent: null, fieldFormation: null, subjScope });
    ok(`assembleReconnPayload() carries the same real coverage through`, payload.relationshipCoverage.state === 'PRESENT');

    const narrative = assembleNarrative({ analysisIntent: null, fieldFormation: { participatingDomains: [], boundary: { excluded: [] } }, subjScope, reconnPayload: payload });
    const relStage = narrative.stages.find(s => s.stage === 'RELATIONSHIPS');
    ok(`narrativeassembly.js's RELATIONSHIPS stage is PRESENT, not WITHHELD`, relStage.state === 'PRESENT');
  }

  // Surface 2 — structuralentitysynthesis.js (feeds structuralbrief.jsx + Target Packet)
  {
    const r = synthStructuralEntity({ entities: [fact.a, fact.b], relationshipIntent: [fact.type], context: 'known-positive-suite' });
    const pair = r.relationships[0];
    ok(`structuralentitysynthesis.js finds it SUPPORTED, not NO_EVIDENCE/UNRESOLVED`, pair?.state === 'SUPPORTED');
  }

  console.log('');
}

console.log(`RESULT: ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log('\nA FAIL here means a real, admitted fact is not reaching a surface that claims to show it.');
  console.log('That is the exact bug class KRYL-1347 was -- investigate before dismissing as "just no data."');
}
process.exit(fail === 0 ? 0 : 1);
