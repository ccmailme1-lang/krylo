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
    e.observedBoth === true && e.observationA && e.observationB &&
    admitCrossDomainRelationship(e.a, e.b).type === e.type);   // ratified 15 only
  const quarantined = mod.__quarantined === true;

  // is the module WIRED into the packet, or just drafted on disk?
  const readsIt = ['src/components/analysis/domainsubstratetabs.jsx', 'src/components/analysis/targetpacket.jsx']
    .some(f => { try { return /subjectrelationships/i.test(readFileSync(new URL(`./${f}`, import.meta.url), 'utf8')); } catch { return false; } });

  notes.push(`module contract (15-type / both-observed / observations attached / quarantined): ${contractOK && quarantined ? 'holds' : 'BROKEN'}`);
  notes.push(`edges for the entity fixture: ${edges.length} (0 is correct — no 5B-2 subject observations yet)`);
  notes.push(readsIt ? 'wired into the packet' : 'NOT wired into the packet — no perceived relationship object renders (live layer confirms)');

  if (!contractOK || !quarantined) return { verdict: 'FAIL — module contract broken', notes };
  return { verdict: readsIt ? true : 'FAIL / MODULE BUILT, NOT WIRED', notes };
}

// ── FORMATION PERCEPTION ───────────────────────────────────────────────────
async function formationPerception() {
  const notes = [];
  let mod = null;
  try { mod = await import('./src/engine/subjectformation.js'); } catch { /* not built */ }
  if (!mod) {
    notes.push('src/engine/subjectformation.js not built');
    notes.push('02 FORMATION renders NO_FORMATION_ESTABLISHED honestly (KRYL-1235); the earned-formation capability is not built');
    return { verdict: 'FAIL / NOT EARNED', notes };
  }
  const f = mod.formationCandidate(subjectScope(FIXTURES.entity));
  const grounded = f.status === 'NO_FORMATION_ESTABLISHED' ||
    (f.edges?.length >= 1 && (f.contributions ?? []).every(c => c.facet_id));
  notes.push(`quarantined: ${mod.__quarantined === true}; grounded-or-honest-absence: ${grounded}`);
  return { verdict: (grounded && mod.__quarantined === true) ? true : 'FAIL — not grounded / not quarantined', notes };
}

// ── LEGACY NARRATIVE ISOLATION ─────────────────────────────────────────────
// KRYL-1235 is a PACKET-AUTHORITY ruling, not a synthesis change (forensic
// recovery: the DIC / Thiel synthesizer are legitimate to their own contracts;
// the defect was the packet giving synthesis.mode / recommendedAction authority
// over the perceptual surface). So this checks the packet SOURCE — the guest
// packet must not render the legacy shell — and leaves the rendered-packet check
// to the LIVE layer.
async function legacyIsolation() {
  const notes = [];
  let fail = false;

  // strip comments so a KRYL-1235 comment that NAMES a removed pattern isn't a hit
  const rawPkt = readFileSync(new URL('./src/components/analysis/targetpacket.jsx', import.meta.url), 'utf8');
  const pkt = rawPkt.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const banned = [
    ['recommendedAction rendered',  /synthesis\??\.?\s*recommendedAction/],
    ['ASSEMBLANCE proxy paths',     /PROXY_UNTIL_WO1848/],
    ['OLP rationale rendered',      /\{[\s\S]{0,40}olp[\s\S]{0,20}rationale[\s\S]{0,20}\}/],
    ['synthesis.mode as headline',  /synthesis\??\.?\s*mode\s*===\s*['"]INSUFFICIENT_INPUT['"]/],
    ['assemblanceBlock',            /\bassemblanceBlock\b/],
  ];
  for (const [label, re] of banned) {
    if (re.test(pkt)) { fail = true; notes.push(`targetpacket.jsx still renders: ${label}`); }
  }
  // WhyTracePanel must be guarded by wtResolved
  const wt = pkt.indexOf('<WhyTracePanel');
  if (wt >= 0 && !/wtResolved\s*\?[\s\S]{0,300}<WhyTracePanel/.test(pkt)) {
    fail = true; notes.push('targetpacket.jsx renders <WhyTracePanel> unguarded (not behind wtResolved)');
  }
  if (!fail) notes.push('targetpacket.jsx renders no legacy authority (recommendedAction / proxy paths / OLP / unguarded WhyTracePanel / INSUFFICIENT_INPUT headline)');

  // <IntelligenceBrief> is the ORACLE KERNEL brief container (BLUF / 00–04 / ACTION
  // MATRIX) — it must not be mounted in the guest surface. RECON / IMPACT (Recon
  // Dashboard, Causal Impact) and Happy Path / EQ Canvas ARE legitimate — the
  // right STRUCTURE panel re-mounts them (KRYL-1235 collateral fix, Founder 2026-08-30).
  for (const f of ['analysisidlefield.jsx', 'structurepanel.jsx']) {
    let src = '';
    try { src = readFileSync(new URL(`./src/components/analysis/${f}`, import.meta.url), 'utf8'); } catch { continue; }
    if (/<IntelligenceBrief\b/.test(src)) {
      fail = true; notes.push(`${f} mounts <IntelligenceBrief> (the ORACLE KERNEL brief) in the guest surface`);
    }
  }

  // quarantine: adsubject / subject* / the 5B-3/5B-4 modules must not import the legacy synthesis layer
  for (const f of ['adsubject.js', 'subjectscope.js', 'subjectbinding.js', 'domainsignalresolution.js']) {
    const src = readFileSync(new URL(`./src/engine/${f}`, import.meta.url), 'utf8');
    if (/from '\.\/querysynthesis|synthGeneral|\.recommendedAction/.test(src)) {
      fail = true; notes.push(`${f} imports the legacy synthesis layer (quarantine breach)`);
    }
  }

  notes.push('rendered-packet scan (both fixtures) is the LIVE layer — qa_guest_acceptance_live.mjs');
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
