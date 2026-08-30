// qa_guest_acceptance.mjs — KRYL Guest Acceptance Harness (contract layer).
//
// The validation SPINE for WO-5B → WO-6. It does NOT grade backend seams. It
// grades the GUEST EXPERIENCE, in the Founder's terms:
//
//   5B-1 Subject Binding
//   Evidence Binding
//   Relationship Perception
//   Formation Perception
//   Legacy narrative isolation
//   Overall guest experience        ← FAIL if any of the above is FAIL
//
// A stage that makes the guest ASSEMBLE the meaning themselves is a FAIL even if
// every seam is wired. "The packet honestly knows what it does not know. Good.
// But it does not yet make visible what it *does* know." (Founder, 2026-08-30)
//
// Fixtures: one resolvable entity, one decision frame. Run: node qa_guest_acceptance.mjs

import { subjectScope } from './src/engine/subjectscope.js';
import { A, allDomains } from './src/engine/adsubject.js';
import { facetBelongsToSubject } from './src/engine/subjectbinding.js';
import { makeSignalFacet } from './src/engine/signalfacet.js';
import { buildQueryContext } from './src/engine/querycontext.js';
import { readFileSync } from 'node:fs';

const FIXTURES = {
  entity:        'Is Anduril a good acquisition target?',
  decisionFrame: 'Should I purchase an investment property in Las Vegas, and what is the market doing',
};

const mark = (v) => v === true ? 'PASS' : v === 'NA' ? 'NOT YET TESTABLE' : v;
let overall = true;
const line = (label, verdict, notes = []) => {
  const bad = verdict !== true && verdict !== 'NA';
  if (bad) overall = false;
  console.log(`${label.padEnd(28)} ${mark(verdict)}`);
  for (const n of notes) console.log(`   • ${n}`);
};

// ── 5B-1 SUBJECT BINDING ────────────────────────────────────────────────────
function subjectBinding() {
  const notes = [];
  const e = subjectScope(FIXTURES.entity);
  const okEntity = e.kind === 'ENTITY' && e.canonicalId === 'anduril-industries' && e.matchedOn === 'Anduril';
  const df = subjectScope(buildQueryContext(FIXTURES.decisionFrame));
  const okDF = df.kind === 'DECISION_FRAME';                    // classified, not invented
  const six = allDomains(e);
  const okSix = six.length === 6 && six.every(([, ad]) => ad.subject === 'anduril-industries' && ad.scoped);
  const okDFsix = allDomains(df).every(([, ad]) => ad.scoped === false && ad.absence?.absenceClass === 'structural');
  notes.push(`entity → ${e.kind}/${e.canonicalId || '—'}; decision frame → ${df.kind} (not invented)`);
  notes.push(`A(d, subject) for all six: entity ${okSix ? 'yes' : 'NO'}, decision-frame → honest absence ${okDFsix ? 'yes' : 'NO'}`);
  return { verdict: (okEntity && okDF && okSix && okDFsix), notes };
}

// ── EVIDENCE BINDING ───────────────────────────────────────────────────────
function evidenceBinding() {
  const notes = [];
  const anduril = subjectScope(FIXTURES.entity);
  const facet = (sub, extra = {}) => makeSignalFacet({
    facet_id: `gah:${Math.random().toString(36).slice(2)}`, domain_id: 'TECHNOLOGY',
    ontology: 'DOMAIN_EVIDENCE', producer_id: 'gah', source_set_hash: `h${Math.random()}`,
    provenance: { source: 'gah', ...(sub ? { subject: sub } : {}), ...extra },
    signal_unit: { kind: 'evidence', scale: '0-100', level: 50 },
    repro: { config: {}, source_refs: [], producer_version: 'g-1' },
  });
  const mechanism =
    facetBelongsToSubject(facet({ canonicalId: 'anduril-industries' }), anduril).bound === true &&
    facetBelongsToSubject(facet({ canonicalId: 'palantir-technologies' }), anduril).bound === false &&
    facetBelongsToSubject(facet(null, { assignees: ['ANDURIL'] }), anduril).bound === false &&
    facetBelongsToSubject(facet({ identifier: { source: 'edgar', id: '9999999999' } }), anduril).bound === false;

  const anyEntityScopedSource = allDomains(anduril).some(([, ad]) => ad.observations.length > 0);
  notes.push(`containment mechanism (positive + 3 negative cases): ${mechanism ? 'PASS' : 'FAIL'}`);
  notes.push(anyEntityScopedSource
    ? 'at least one connector produces entity-scoped evidence — testable end-to-end'
    : 'NO connector produces entity-scoped evidence yet → cannot test binding against real evidence (WO-1B/C/D follow-on)');

  if (!mechanism) return { verdict: 'containment mechanism BROKEN', notes };
  return { verdict: anyEntityScopedSource ? true : 'NA', notes };
}

// ── RELATIONSHIP PERCEPTION ────────────────────────────────────────────────
async function relationshipPerception() {
  const notes = [];
  let mod = null;
  try { mod = await import('./src/engine/subjectrelationships.js'); } catch { /* not built */ }
  if (!mod) {
    notes.push('src/engine/subjectrelationships.js not built');
    notes.push('RELATIONSHIP panel today is relationshipsFor(d) — an ADMISSION LIST, not a perceived relationship');
    notes.push('guest must still carry an observation from one tab to another to see a connection (§20 fail)');
    return { verdict: 'FAIL / NOT IMPLEMENTED', notes };
  }
  const anduril = subjectScope(FIXTURES.entity);
  const edges = mod.subjectRelationships(anduril);
  const contractOK = edges.every(e =>
    e.observedBoth === true && e.observationA && e.observationB);
  const quarantined = mod.__quarantined === true;
  notes.push(`edges: ${edges.length}; both-observed + both observations attached: ${contractOK ? 'yes' : 'NO'}`);
  notes.push(`quarantined from synthGeneral: ${quarantined ? 'yes' : 'NO'}`);
  return { verdict: (contractOK && quarantined) ? true : 'FAIL — contract not met', notes };
}

// ── FORMATION PERCEPTION ───────────────────────────────────────────────────
async function formationPerception() {
  const notes = [];
  let mod = null;
  try { mod = await import('./src/engine/subjectformation.js'); } catch { /* not built */ }
  if (!mod) {
    notes.push('src/engine/subjectformation.js not built');
    notes.push('02 FORMATION today renders legacy proxy paths ("select your situation type", "add a capital floor", G:5 PROXY_UNTIL_WO1848)');
    return { verdict: 'FAIL / NOT EARNED', notes };
  }
  const f = mod.formationCandidate(subjectScope(FIXTURES.entity));
  const grounded = f.status === 'NO_FORMATION_ESTABLISHED' ||
    (f.edges?.length >= 1 && (f.contributions ?? []).every(c => c.facet_id));
  notes.push(`quarantined: ${mod.__quarantined === true}; grounded-or-honest-absence: ${grounded}`);
  return { verdict: (grounded && mod.__quarantined === true) ? true : 'FAIL — not grounded / not quarantined', notes };
}

// ── LEGACY NARRATIVE ISOLATION ─────────────────────────────────────────────
async function legacyIsolation() {
  const notes = [];
  const { synthesizeQuery } = await import('./src/engine/querysynthesis.js');
  let fail = false;
  for (const [k, q] of Object.entries(FIXTURES)) {
    const syn = synthesizeQuery({ query: q, queryContext: buildQueryContext(q), lens: 'GENERAL' });
    const action = String(syn?.recommendedAction ?? '');
    const predictive = /evaluate exit timing|premium evaporates|exit signal|becoming consensus|pre-crowd|the edge is|directional signals generated/i.test(action);
    if (predictive) { fail = true; notes.push(`${k}: PRIMARY SIGNAL is a legacy narrative — "${action.slice(0, 70)}…"`); }
  }
  // static: does adsubject / subject* import querysynthesis?
  for (const f of ['adsubject.js', 'subjectscope.js', 'subjectbinding.js']) {
    const src = readFileSync(new URL(`./src/engine/${f}`, import.meta.url), 'utf8');
    if (/querysynthesis|synthGeneral|recommendedAction/.test(src)) { fail = true; notes.push(`${f} imports the legacy synthesis layer`); }
  }
  notes.push('FULL-PACKET check (FORMATION proxy paths, BRIEF/RECON/IMPACT column, ACTION MATRIX, PROVENANCE "refine your query", fabricated Signal/Convergence/Action) is the LIVE layer\'s job — see qa_guest_acceptance_live.mjs');
  notes.push('KRYL-1235 tracks the ruling — currently the honest 01 ANALYSIS coexists with the full legacy advisory shell');
  return { verdict: fail ? 'FAIL' : true, notes };
}

// ── run ────────────────────────────────────────────────────────────────────
console.log(`\n=== KRYL GUEST ACCEPTANCE · CONTRACT ===`);
console.log(`fixtures: entity="${FIXTURES.entity}"  ·  decisionFrame="${FIXTURES.decisionFrame.slice(0, 48)}…"\n`);

const sb  = subjectBinding();          line('5B-1 Subject Binding', sb.verdict, sb.notes);
const eb  = evidenceBinding();         line('Evidence Binding', eb.verdict, eb.notes);
const rp  = await relationshipPerception(); line('Relationship Perception', rp.verdict, rp.notes);
const fp  = await formationPerception();    line('Formation Perception', fp.verdict, fp.notes);
const li  = await legacyIsolation();        line('Legacy narrative isolation', li.verdict, li.notes);

console.log('');
console.log(`${'Overall guest experience'.padEnd(28)} ${overall ? 'PASS' : 'FAIL'}`);
console.log(`\n${overall ? 'GUEST EXPERIENCE: PASS' : 'GUEST EXPERIENCE: FAIL — the packet knows what it does not know, but does not yet make visible what it does'}`);
process.exit(overall ? 0 : 1);
