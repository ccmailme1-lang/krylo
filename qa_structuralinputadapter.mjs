// qa_structuralinputadapter.mjs — KRYL-1195 Structural Input Adapter
// Positive + refusal path coverage per specs/SPEC-KRYL-1195-structural-input-adapter-contract.md.
// Run: node qa_structuralinputadapter.mjs

import { toRelationshipSet } from './src/engine/structuralinputadapter.js';
import { recognizeStructure, DETERMINATION } from './src/engine/structuralrecognition.js';

let pass = 0, fail = 0;
function check(label, cond) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else      { fail++; console.log(`  ✗ ${label}`); }
}

// Real registry entities (src/data/entityregistry.json) so identity checks exercise
// the actual entityresolution.js path, not a fixture-only shortcut.
const LOCKHEED = 'CIK:0000936395';
const BOEING   = 'CIK:0000012927';
const UNKNOWN  = 'CIK:9999999999'; // not in the registry — must resolve to null
const NAME_ONLY = 'SOME_UNREGISTERED_COMPANY'; // no CIK prefix — name-keyed fallback

const edge = (from, to, type, overrides = {}) => ({
  id: `${from}|${type}|${to}`, from, to, type, source: 'TEST', validFrom: 1000, validTo: null,
  ...overrides,
});

const sigma = (edges, traceable = true, overrides = {}) =>
  ({ sigmaId: 'test-sigma', vertices: [], edges, props: {}, traceable, provenanceDAG: null, ...overrides });

console.log('\n=== POSITIVE PATH ===');
{
  const s = sigma([edge(LOCKHEED, BOEING, 'BENEFICIAL_OWNER_OF')]);
  const out = toRelationshipSet(s);
  check('produces exactly one relationship', out.length === 1);
  check('subjectId/objectId map from from/to', out[0]?.subjectId === LOCKHEED && out[0]?.objectId === BOEING);
  check('type carried through', out[0]?.type === 'BENEFICIAL_OWNER_OF');
  check('evidenceRefs carries the real edge id, not a placeholder', out[0]?.evidenceRefs?.[0] === edge(LOCKHEED, BOEING, 'BENEFICIAL_OWNER_OF').id);
  check('ts maps from validFrom', out[0]?.ts === 1000);
}

console.log('\n=== REFUSAL: missing/invalid input ===');
check('null input -> []', Array.isArray(toRelationshipSet(null)) && toRelationshipSet(null).length === 0);
check('undefined input -> []', toRelationshipSet(undefined).length === 0);
check('no edges array -> []', toRelationshipSet({ traceable: true }).length === 0);

console.log('\n=== REFUSAL: whole-Σ provenance gate (traceable !== true) ===');
{
  const s = sigma([edge(LOCKHEED, BOEING, 'BENEFICIAL_OWNER_OF')], false);
  const out = toRelationshipSet(s);
  check('traceable:false refuses the ENTIRE structure, not just the untraceable part', out.length === 0);
}
{
  const s = sigma([edge(LOCKHEED, BOEING, 'BENEFICIAL_OWNER_OF')], 'yes'); // truthy but not === true
  check('traceable must be strictly === true, not merely truthy', toRelationshipSet(s).length === 0);
}

console.log('\n=== REFUSAL: synthetic / unknown relationship type ===');
{
  const s = sigma([edge(LOCKHEED, BOEING, 'BRIDGES_TO')]);
  check('BRIDGES_TO (documented synthetic type) is refused', toRelationshipSet(s).length === 0);
}
{
  const s = sigma([edge(LOCKHEED, BOEING, 'MADE_UP_TYPE')]);
  check('unrecognized type is refused, not passed through', toRelationshipSet(s).length === 0);
}

console.log('\n=== REFUSAL: unresolved identity ===');
{
  const s = sigma([edge(UNKNOWN, BOEING, 'BENEFICIAL_OWNER_OF')]);
  check('unresolved subject CIK (not in registry) is refused', toRelationshipSet(s).length === 0);
}
{
  const s = sigma([edge(LOCKHEED, UNKNOWN, 'BENEFICIAL_OWNER_OF')]);
  check('unresolved object CIK (not in registry) is refused', toRelationshipSet(s).length === 0);
}
{
  const s = sigma([edge(NAME_ONLY, BOEING, 'BENEFICIAL_OWNER_OF')]);
  check('name-keyed (non-CIK) endpoint is refused, not fuzzy-matched', toRelationshipSet(s).length === 0);
}

console.log('\n=== MIXED: partial admission within one otherwise-traceable structure ===');
{
  const s = sigma([
    edge(LOCKHEED, BOEING, 'BENEFICIAL_OWNER_OF'),   // admissible
    edge(LOCKHEED, BOEING, 'BRIDGES_TO'),             // refused: synthetic type
    edge(UNKNOWN, BOEING, 'OPERATES'),                // refused: unresolved subject
  ]);
  const out = toRelationshipSet(s);
  check('exactly the one admissible edge survives, others silently dropped not errored', out.length === 1 && out[0].type === 'BENEFICIAL_OWNER_OF');
}

console.log('\n=== INTEGRATION: adapter output actually consumed by structuralrecognition.js ===');
{
  // Not asserting a specific DETERMINATION (2 nodes is below structuralrecognition's
  // own MIN_NODES=3 for organization/dependence) -- the point is that the real
  // consumer accepts the adapter's real output without shape errors, proving
  // CONTRACT-CONFORMANT empirically rather than by inspection alone.
  const s = sigma([edge(LOCKHEED, BOEING, 'BENEFICIAL_OWNER_OF')]);
  const relationshipSet = toRelationshipSet(s);
  let result, threw = false;
  try { result = recognizeStructure(relationshipSet); }
  catch (err) { threw = true; console.log(`    (threw: ${err.message})`); }
  check('structuralrecognition.js accepts the adapter output without throwing', !threw);
  check('produces one of the real DETERMINATION states', !threw && Object.values(DETERMINATION).includes(result?.determination));
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
