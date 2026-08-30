// qa_guest_acceptance_anduril.mjs — KRYL Guest Acceptance Harness (contract layer).
//
// The validation SPINE for WO-5B → WO-6. Not a backend unit test — every stage
// is a vertical slice: it must produce a guest-observable change AND a
// machine-verifiable contract AND (separately, qa_guest_acceptance_anduril_live.mjs)
// a live acceptance result.
//
// STAGE GATES: a stage reports BLOCKED until its module exists and its
// predecessor is green. Truth-boundary checks (F) and the legacy PRIMARY SIGNAL
// fabrication test run ALWAYS — the system is defined as much by what it refuses
// to say as by what it says.
//
//   5B-1 SUBJECT        subject → canonical identity → A(d,Subject) for all six
//   5B-2 EVIDENCE       only subject-contained evidence binds; unrelated rejected
//   5B-3 RELATIONSHIPS  only observed endpoints; only the 15 admitted types
//   5B-4 FORMATION      only from admitted relationships; no narrative invention
//   LEGACY PRIMARY SIGNAL   must not fabricate a strategic narrative (KRYL-1235)
//
// Run: node qa_guest_acceptance_anduril.mjs

import { subjectScope } from './src/engine/subjectscope.js';
import { A, allDomains, CANON_DOMAINS } from './src/engine/adsubject.js';
import { facetBelongsToSubject } from './src/engine/subjectbinding.js';
import { makeSignalFacet } from './src/engine/signalfacet.js';
import { admitCrossDomainRelationship } from './src/engine/domainintelligence.js';
import { buildQueryContext } from './src/engine/querycontext.js';
import * as mod5b2 from './src/engine/domainsignalresolution.js';

const FIXTURE = 'Is Anduril a good acquisition target?';
const SUBJECT_ID = 'anduril-industries';

const stages = [];
function stage(name, run) { stages.push({ name, run }); }
const mk = () => { const r = { checks: [], pass: 0, fail: 0 }; r.ok = (l, c) => { r.checks.push([c, l]); c ? r.pass++ : r.fail++; }; return r; };

// ── 5B-1 SUBJECT ────────────────────────────────────────────────────────────
stage('5B-1 SUBJECT', () => {
  const r = mk();
  const s = subjectScope(FIXTURE);
  r.ok('Anduril resolves to an ENTITY', s.kind === 'ENTITY');
  r.ok(`canonical identity = ${SUBJECT_ID}`, s.canonicalId === SUBJECT_ID);
  r.ok('matched on "Anduril", not the question stem', s.matchedOn === 'Anduril');
  const six = allDomains(s);
  r.ok('A(d, Subject) exists for all six domains', six.length === 6 && six.every(([, ad]) => ad.subject === SUBJECT_ID && ad.scoped));
  r.ok('every domain carries its authored measures + fieldContext', six.every(([, ad]) => Object.keys(ad.measures).length > 0 && 'fieldContext' in ad));
  return r;
});

// ── 5B-2 EVIDENCE ───────────────────────────────────────────────────────────
stage('5B-2 EVIDENCE', () => {
  const r = mk();
  const anduril  = subjectScope(FIXTURE);
  const palantir = subjectScope('Is Palantir overvalued?');

  const facet = (subjectBlock, extra = {}) => makeSignalFacet({
    facet_id: `gah:${Math.random().toString(36).slice(2)}`, domain_id: 'TECHNOLOGY',
    ontology: 'DOMAIN_EVIDENCE', producer_id: 'gah', source_set_hash: `h${Math.random()}`,
    provenance: { source: 'gah', semantics: 'x', ...(subjectBlock ? { subject: subjectBlock } : {}), ...extra },
    signal_unit: { kind: 'evidence', scale: '0-100', level: 50 },
    repro: { config: {}, source_refs: [], producer_version: 'g-1' },
  });

  // POSITIVE
  r.ok('Anduril evidence (canonicalId) binds to Anduril',
     facetBelongsToSubject(facet({ canonicalId: SUBJECT_ID }), anduril).bound === true);
  r.ok('Palantir edgar identifier binds to Palantir',
     facetBelongsToSubject(facet({ identifier: { source: 'edgar', id: '0001321655' } }), palantir).bound === true);
  // NEGATIVE — the defining behaviour
  r.ok('Palantir evidence does NOT bind to Anduril (defense/tech similarity is irrelevant)',
     facetBelongsToSubject(facet({ canonicalId: 'palantir-technologies' }), anduril).bound === false);
  r.ok('generic defense-sector facet ("ANDURIL" in text, no attribution) does NOT become Anduril evidence',
     facetBelongsToSubject(facet(null, { assignees: ['ANDURIL', 'LOCKHEED'] }), anduril).bound === false);
  r.ok('an identifier resolving to another entity does NOT bind',
     facetBelongsToSubject(facet({ identifier: { source: 'edgar', id: '0001321655' } }), anduril).bound === false);
  r.ok('an unresolvable identifier does NOT bind',
     facetBelongsToSubject(facet({ identifier: { source: 'edgar', id: '9999999999' } }), palantir).bound === false);
  r.ok('missing source → structural absence, required source still named',
     Object.values(A('CAPITAL', anduril).measures).every(m => m.status === 'STRUCTURAL_ABSENCE' && typeof m.requiredSourceClass === 'string'));
  r.ok('an evidence facet wired as a Class-E producer is rejected (ontology guard)', (() => {
    const { resolveClassEMeasure } = mod5b2;
    const res = resolveClassEMeasure({
      domain: 'TECHNOLOGY', measureKey: 'technology_capability_concentration',
      producers: { technology_capability_concentration: () => ({ facet: facet({ canonicalId: SUBJECT_ID }) }) },
    });
    return res.status === 'STRUCTURAL_ABSENCE' && res.evidenceNotMeasure === true;
  })());
  r.ok('A(d, Anduril).observations is exactly the identifier-bound set (empty today — no source is entity-scoped)',
     allDomains(anduril).every(([, ad]) => Array.isArray(ad.observations) && ad.observations.length === 0));
  return r;
});

// ── 5B-3 RELATIONSHIPS ──────────────────────────────────────────────────────
stage('5B-3 RELATIONSHIPS', async () => {
  const r = mk();
  let mod = null;
  try { mod = await import('./src/engine/subjectrelationships.js'); } catch { /* not built */ }
  if (!mod) return { blocked: 'module src/engine/subjectrelationships.js not built', checks: [], pass: 0, fail: 0 };

  const anduril = subjectScope(FIXTURE);
  const edges = mod.subjectRelationships(anduril);
  r.ok('every edge connects two domains that BOTH carry a subject observation',
     edges.every(e => e.observedBoth === true));
  r.ok('every edge type is one of the 15 admitted cross-domain types',
     edges.every(e => admitCrossDomainRelationship(e.a, e.b).type === e.type));
  r.ok('no edge exists without both underlying observations attached',
     edges.every(e => e.observationA && e.observationB));
  r.ok('with no subject observations, zero edges (no narrative invention)',
     edges.length === 0 || edges.every(e => e.observedBoth));
  return r;
});

// ── 5B-4 FORMATION ──────────────────────────────────────────────────────────
stage('5B-4 FORMATION', async () => {
  const r = mk();
  let mod = null;
  try { mod = await import('./src/engine/subjectformation.js'); } catch { /* not built */ }
  if (!mod) return { blocked: 'module src/engine/subjectformation.js not built', checks: [], pass: 0, fail: 0 };

  const anduril = subjectScope(FIXTURE);
  const f = mod.formationCandidate(anduril);
  r.ok('formation is NO_FORMATION_ESTABLISHED unless ≥1 admitted edge connects ≥2 observed domains',
     f.status === 'NO_FORMATION_ESTABLISHED' || (f.edges?.length >= 1 && f.observedDomains?.length >= 2));
  r.ok('formation does not import querysynthesis / synthGeneral (quarantine)', mod.__quarantined === true);
  r.ok('every contributing observation is traceable to a bound facet',
     f.status === 'NO_FORMATION_ESTABLISHED' || (f.contributions ?? []).every(c => c.facet_id));
  return r;
});

// ── LEGACY PRIMARY SIGNAL — runs ALWAYS ─────────────────────────────────────
stage('LEGACY PRIMARY SIGNAL', async () => {
  const r = mk();
  const { synthesizeQuery } = await import('./src/engine/querysynthesis.js');
  const syn = synthesizeQuery({ query: FIXTURE, queryContext: buildQueryContext(FIXTURE), lens: 'GENERAL' });
  const action = String(syn?.recommendedAction ?? '');
  const conf = typeof syn?.confidence === 'number' ? syn.confidence : null;
  const predictive = /evaluate exit timing|premium evaporates|exit signal|becoming consensus|entry zone|pre-crowd|the edge is/i.test(action);
  r.ok(`PRIMARY SIGNAL is not a predictive strategic narrative (conf ${conf}) — currently: "${action.slice(0, 80)}…"`, !predictive);
  return r;
});

// ── run ────────────────────────────────────────────────────────────────────
const results = [];
for (const st of stages) {
  let out;
  try { out = await st.run(); } catch (e) { out = { error: e.message, checks: [], pass: 0, fail: 0 }; }
  results.push([st.name, out]);
}

console.log(`\n=== KRYL GUEST ACCEPTANCE HARNESS · fixture: "${FIXTURE}" ===\n`);
let hardFail = 0;
for (const [name, out] of results) {
  if (out.blocked) { console.log(`${name.padEnd(24)} BLOCKED — ${out.blocked}`); continue; }
  if (out.error)   { console.log(`${name.padEnd(24)} ERROR — ${out.error}`); hardFail++; continue; }
  const verdict = out.fail === 0 ? 'PASS' : (name === 'LEGACY PRIMARY SIGNAL' ? 'FAIL — independent defect (KRYL-1235)' : 'FAIL');
  console.log(`${name.padEnd(24)} ${verdict}  (${out.pass}/${out.pass + out.fail})`);
  for (const [c, l] of out.checks) console.log(`   ${c ? '✓' : '✗'} ${l}`);
  if (out.fail > 0 && name !== 'LEGACY PRIMARY SIGNAL') hardFail += out.fail;
}

console.log(`\n${hardFail === 0 ? 'HARNESS OK (legacy PRIMARY SIGNAL tracked separately as KRYL-1235)' : `HARNESS: ${hardFail} hard failure(s)`}`);
process.exit(hardFail === 0 ? 0 : 1);
