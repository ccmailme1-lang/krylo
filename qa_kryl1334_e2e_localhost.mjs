// qa_kryl1334_e2e_localhost.mjs — end-to-end validation of KRYL-1334 Part 1+2 against the REAL
// Postgres instance, run directly (NOT through the live krylo-api HTTP server / PM2 process --
// that stays untouched, per "localhost only"). Real evidence in (KRYL-1335/1336's actual Sysco
// fact), real DB round-trip, real diff.
//   node qa_kryl1334_e2e_localhost.mjs   (run from /opt/krylo-api on the VPS)
import { migrate } from './as-diff/db.js';
import { writeFormationState, lastFormationState, formationStateHistory } from './as-diff/formationstatestore.js';
import { buildCandidateRows, decideWrite } from './src/engine/formationsnapshot.js';
import { diffFormationHistory } from './src/engine/relationalchange.js';
import { interpretStructuralQuery } from './src/engine/structuralqueryinterpreter.js';
import { synthStructuralEntity } from './src/engine/structuralentitysynthesis.js';

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log(`  PASS  ${name}`); }
  catch (e) { fail++; console.log(`  FAIL  ${name}\n        ${e.stack ?? e.message}`); }
}
async function testAsync(name, fn) {
  try { await fn(); pass++; console.log(`  PASS  ${name}`); }
  catch (e) { fail++; console.log(`  FAIL  ${name}\n        ${e.stack ?? e.message}`); }
}

await migrate(); // idempotent -- creates formation_state if it doesn't exist yet

const scope = { subject: null, fieldScope: null, formationScope: null };
const query = 'What relationships between suppliers and distributors appear to be changing?';
const interp = interpretStructuralQuery(query);
const evidenced = synthStructuralEntity(interp);
const structuralQuery = { ...interp, evidence: evidenced };

await testAsync('real structuralQuery for the RSI question produces at least one SUPPORTED pair', async () => {
  const supported = structuralQuery.evidence.relationships.filter(r => r.state === 'SUPPORTED');
  if (supported.length === 0) throw new Error('expected >=1 SUPPORTED pair from the real Sysco/Restaurant Depot evidence');
});

const candidates = buildCandidateRows(structuralQuery, scope);
await testAsync('first-ever write for this formation_id is classified NEW', async () => {
  const cand = candidates[0];
  const last = await lastFormationState(cand.formation_id);
  const decision = decideWrite(cand, last, 'material_change');
  if (last === null && decision?.state !== 'NEW') throw new Error(`expected NEW on first write, got ${JSON.stringify(decision)}`);
  if (decision) await writeFormationState(decision);
});

await testAsync('writing the identical candidate again produces no redundant row (decideWrite returns null)', async () => {
  const cand = candidates[0];
  const last = await lastFormationState(cand.formation_id);
  const decision = decideWrite(cand, last, 'material_change');
  if (decision !== null) throw new Error(`expected null (no material change), got ${JSON.stringify(decision)}`);
});

await testAsync('full history round-trip through the real diff function classifies correctly', async () => {
  const cand = candidates[0];
  const history = await formationStateHistory(cand.formation_id);
  if (history.length < 1) throw new Error('expected at least 1 persisted row');
  const transitions = diffFormationHistory(history);
  if (transitions[0].state !== 'NEW') throw new Error(`expected first transition NEW, got ${transitions[0].state}`);
  console.log(`        formation_id=${cand.formation_id}`);
  console.log(`        history rows=${history.length}, transitions=${JSON.stringify(transitions.map(t => t.state))}`);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
