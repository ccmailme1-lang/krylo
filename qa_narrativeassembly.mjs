// qa_narrativeassembly.mjs — Narrative Assembly v0.2 verification, post-RECONN-canonical-payload
// wiring. Matches this repo's plain assert/pass-fail convention. Real substrate throughout, no
// mocks — proves the rewired stages actually consume assembleReconnPayload(), not raw substrate.
//   node qa_narrativeassembly.mjs
import assert from 'node:assert/strict';

import { buildAnalysisIntent } from './src/engine/analysisintent.js';
import { inferFormation } from './src/engine/formationinference.js';
import { surfaceRouter } from './src/engine/surfacerouter.js';
import { assembleReconnPayload } from './src/engine/reconnpayload.js';
import { assembleNarrative } from './src/engine/narrativeassembly.js';

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log(`  PASS  ${name}`); }
  catch (e) { fail++; console.log(`  FAIL  ${name}\n        ${e.stack ?? e.message}`); }
}

console.log('Narrative Assembly v0.2 — canonical payload wiring verification\n');

const P = (domain, confidence, polarity = 'constructive', ts = 1) => ({ domain, confidence, polarity, ts });

test('Relationships stage is WITHHELD even when fieldFormation has real admitted edges — proves it no longer reads fieldFormation.graph.edges directly', () => {
  const particles = [P('TECHNOLOGY', 80), P('CAPITAL', 80)];
  const formation = inferFormation(particles, { now: 1000 });
  assert.ok(formation?.graph?.edges?.length, 'precondition: formation must have real edges');
  const payload = assembleReconnPayload({ analysisIntent: null, fieldFormation: formation, subjScope: {} });
  assert.equal(payload.relationshipCoverage.state, 'BLOCKED'); // sanity on the payload itself
  const n = assembleNarrative({ analysisIntent: null, fieldFormation: formation, subjScope: {}, reconnPayload: payload });
  const relStage = n.stages.find(s => s.stage === 'RELATIONSHIPS');
  assert.equal(relStage.state, 'WITHHELD');
  assert.ok(/Relationship Coverage is withheld/.test(n.paragraph), 'paragraph must state the honest withhold, not fabricate a relationship from Formation edges');
  assert.ok(!/admitted relationship/.test(n.paragraph), 'must not use the old fabricated-from-Formation phrasing');
});

test('null analysisIntent → explicit withheld opening sentence, not silent omission (fixes the recorded §12 defect)', () => {
  const n = assembleNarrative({ analysisIntent: null, fieldFormation: null, subjScope: {}, reconnPayload: assembleReconnPayload({}) });
  assert.ok(/No question or context could be resolved/.test(n.paragraph));
});

test('resolved question + real formation → paragraph opens with the fused Question/Context sentence', () => {
  const ai = buildAnalysisIntent('Is Nanopath a good investment compared to its Series A peers?');
  const particles = [P('TECHNOLOGY', 80), P('CAPITAL', 80)];
  const formation = inferFormation(particles, { now: 1000 });
  const subjScope = { kind: 'ENTITY', canonicalId: 'QA_NARR_ENTITY' };
  const payload = assembleReconnPayload({ analysisIntent: ai, fieldFormation: formation, subjScope });
  const n = assembleNarrative({ analysisIntent: ai, fieldFormation: formation, subjScope, reconnPayload: payload });
  assert.ok(n.paragraph.startsWith('KRYLO examined'));
});

test('Developments stage WITHHELD when no temporal substrate exists for the participating domains', () => {
  const particles = [P('KNOWLEDGE', 80), P('LABOR', 80)]; // domains with no seeded temporal data below
  const formation = inferFormation(particles, { now: 1000 });
  const payload = assembleReconnPayload({ analysisIntent: null, fieldFormation: formation, subjScope: {} });
  const n = assembleNarrative({ analysisIntent: null, fieldFormation: formation, subjScope: {}, reconnPayload: payload });
  const devStage = n.stages.find(s => s.stage === 'DEVELOPMENTS');
  assert.equal(devStage.state, 'WITHHELD');
});

test('Developments stage PRESENT (timing only, no value) once real dated observations exist for a participating domain', () => {
  const t0 = Date.parse('2026-01-01T00:00:00Z');
  const t1 = Date.parse('2026-04-01T00:00:00Z');
  surfaceRouter.dispatchBatch([
    { domain: 'TECHNOLOGY', source: 'QA_NARR_TEST', polarity: 'constructive', confidence: 50, ts: Date.now(),
      meta: { eventDate: t0, canonicalId: 'QA_NARR_ENTITY_2' } },
    { domain: 'TECHNOLOGY', source: 'QA_NARR_TEST', polarity: 'constructive', confidence: 70, ts: Date.now(),
      meta: { eventDate: t1, canonicalId: 'QA_NARR_ENTITY_2' } },
  ]);
  const particles = [P('TECHNOLOGY', 80), P('CAPITAL', 80)];
  const formation = inferFormation(particles, { now: 1000 });
  const subjScope = { kind: 'ENTITY', canonicalId: 'QA_NARR_ENTITY_2' };
  const payload = assembleReconnPayload({ analysisIntent: null, fieldFormation: formation, subjScope });
  const n = assembleNarrative({ analysisIntent: null, fieldFormation: formation, subjScope, reconnPayload: payload });
  const devStage = n.stages.find(s => s.stage === 'DEVELOPMENTS');
  assert.equal(devStage.state, 'PRESENT');
  assert.ok(/90 day/.test(devStage.text), `expected a 90-day interval, got: ${devStage.text}`);
  assert.ok(!/\d+%|\bvalue\b.*\d/.test(devStage.text) || /value scalar/.test(devStage.text), 'must not state a magnitude of change');
});

test('Unresolved stage sources from reconnPayload.structuralCoverage.excluded, matches formation boundary exactly', () => {
  const particles = [P('TECHNOLOGY', 80), P('CAPITAL', 80), P('KNOWLEDGE', 30)];
  const formation = inferFormation(particles, { now: 1000 });
  const payload = assembleReconnPayload({ analysisIntent: null, fieldFormation: formation, subjScope: {} });
  const n = assembleNarrative({ analysisIntent: null, fieldFormation: formation, subjScope: {}, reconnPayload: payload });
  const unresolvedStage = n.stages.find(s => s.stage === 'UNRESOLVED');
  assert.equal(unresolvedStage.state, 'PRESENT');
  assert.ok(/KNOWLEDGE/.test(unresolvedStage.text));
});

test('Tension stage stays WITHHELD unconditionally — untouched by Category (A)', () => {
  const particles = [P('TECHNOLOGY', 80), P('CAPITAL', 80)];
  const formation = inferFormation(particles, { now: 1000 });
  const payload = assembleReconnPayload({ analysisIntent: null, fieldFormation: formation, subjScope: {} });
  const n = assembleNarrative({ analysisIntent: null, fieldFormation: formation, subjScope: {}, reconnPayload: payload });
  assert.equal(n.stages.find(s => s.stage === 'TENSION').state, 'WITHHELD');
});

test('no formation at all → Formation/Evidence stay WITHHELD (still raw-sourced, disclosed gap), paragraph does not crash', () => {
  const n = assembleNarrative({ analysisIntent: null, fieldFormation: null, subjScope: {}, reconnPayload: assembleReconnPayload({}) });
  assert.equal(n.stages.find(s => s.stage === 'FORMATION').state, 'WITHHELD');
  assert.equal(n.stages.find(s => s.stage === 'EVIDENCE').state, 'WITHHELD');
  assert.ok(typeof n.paragraph === 'string' && n.paragraph.length > 0);
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
