// qa_clinical_trials.mjs -- KRYL-1414 (clinical-trial sponsorship, ratified 2026-10-12). Real ClinicalTrials.gov responses (recorded). The registry never creates identity: a study is this
// entity's only when it names the entity as LEAD sponsor, class INDUSTRY, with the exact legal name; collaborator roles, other sponsors and near names are not admitted.
import fs from 'fs';
import { fetchClinicalTrials, trialNodeId, TRIAL_CAP } from './src/engine/connectors/clinicaltrials.js';
import { admitClinicalTrials, buildTrialAssertion } from './src/engine/clinicaltrialadmission.js';
import { admitAndProject, findAdmittedRelationshipsFor, latestEvidenceFor, _clearAdmittedForTests } from './src/engine/canonicalrelationshipprojection.js';
import { buildAdmittedFormation } from './src/engine/admittedformation.js';
import { canonicalRelationshipSentence, canonicalDetailLines } from './src/engine/canonicalrelationshiptext.js';
import { buildSynthesis } from './src/engine/analyticalsynthesis.js';
import { validateSynthesis } from './src/engine/benchmarkprobe.js';
import { clinicalTrialsFor, _clearClinicalCacheForTests } from './as-diff/clinicaltrials.js';
import { NODE_LABELS } from './src/engine/entitytopologyregistry.js';

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.log('  ✗ ' + l); } };
const rec = JSON.parse(fs.readFileSync('tests/fixtures/sec/clinicaltrials-responses.json', 'utf8')).responses;
const BSX = { cik: '0000885725', name: 'BOSTON SCIENTIFIC CORP' };
const fetchFor = (map) => async (u) => { const lead = new URLSearchParams(u.split('?')[1]).get('lead'); const hit = Object.keys(map).find(k => k.toLowerCase() === lead.toLowerCase()); return hit ? { ok: true, status: 200, json: async () => map[hit] } : { ok: true, status: 200, json: async () => ({ total: 0, studies: [] }) }; };
const labelOf = (id) => String(NODE_LABELS[id] ?? id);

console.log('Reading the registry: lead sponsor, industry, exact legal name');
{
  const r = await fetchClinicalTrials({ entity: BSX, fetchImpl: fetchFor(rec) });
  ok(r.total === 538 && r.trials.length === TRIAL_CAP && r.capped === true && r.leadByThisEntity >= TRIAL_CAP, `Boston Scientific: ${r.total} lead-sponsored studies in the registry, the newest ${TRIAL_CAP} read, the cap stated`);
  ok(r.trials.every(t => /^NCT\d{8}$/.test(t.nct) && t.leadSponsorName === 'Boston Scientific Corporation' && t.status && t.lastUpdated), 'every study names the sponsor exactly, with its NCT id, status and record date');
  const odd = { total: 3, studies: [
    { protocolSection: { identificationModule: { nctId: 'NCT00000001', briefTitle: 'X' }, sponsorCollaboratorsModule: { leadSponsor: { name: 'Boston Scientific Corporation', class: 'INDUSTRY' } }, statusModule: { overallStatus: 'COMPLETED' } } },
    { protocolSection: { identificationModule: { nctId: 'NCT00000002' }, sponsorCollaboratorsModule: { leadSponsor: { name: 'Taipei Veterans General Hospital, Taiwan', class: 'OTHER_GOV' } } } },
    { protocolSection: { identificationModule: { nctId: 'NCT00000003' }, sponsorCollaboratorsModule: { leadSponsor: { name: 'Boston Scientific Benelux', class: 'INDUSTRY' } } } },
  ] };
  const o = await fetchClinicalTrials({ entity: BSX, fetchImpl: fetchFor({ 'Boston Scientific': odd }) });
  ok(o.trials.length === 1 && o.trials[0].nct === 'NCT00000001', 'a hospital as lead sponsor (the company only a collaborator) and a different legal entity with a similar name (Boston Scientific Benelux) are not read as the company\'s');
  const none = await fetchClinicalTrials({ entity: { cik: '0001341439', name: 'ORACLE CORP' }, fetchImpl: fetchFor(rec) });
  ok(none.trials.length === 0 && !none.failed, 'a company with no studies (Oracle) yields none, not an error');
  const bad = await fetchClinicalTrials({ entity: BSX, fetchImpl: async () => ({ ok: false, status: 502 }) });
  ok(bad.failed === 'HTTP 502' && bad.trials.length === 0, 'a failed lookup is a stated failure');
}

console.log('Server route: the registry\'s answer, cached');
{
  _clearClinicalCacheForTests(); let calls = 0;
  const fetchFn = async () => { calls++; return { totalCount: 538, studies: [{ x: 1 }] }; };
  const a = await clinicalTrialsFor('Boston Scientific', { now: 1000, fetchFn }); const b = await clinicalTrialsFor('boston scientific', { now: 2000, fetchFn });
  ok(a.total === 538 && a.source === 'ClinicalTrials.gov API v2' && b.cached === true && calls === 1, 'the registry is called once; a repeat within six hours is served from the cache');
  ok((await clinicalTrialsFor('x')).error.startsWith('lead sponsor required') && (await clinicalTrialsFor('Boston', { now: 1000 + 7 * 3600e3, fetchFn })).cached !== true && calls === 2, 'a sponsor name under two characters is rejected; the cache expires after six hours');
  ok((await clinicalTrialsFor('Nobody', { fetchFn: async () => { throw new Error('ClinicalTrials.gov HTTP 503'); } })).error.includes('503'), 'an upstream failure is reported, not guessed');
}

console.log('Admission through the ratified rule');
{
  _clearAdmittedForTests();
  const r = await fetchClinicalTrials({ entity: BSX, fetchImpl: fetchFor(rec) });
  const res = admitClinicalTrials({ entity: BSX, trials: r.trials });
  ok(res.admitted.length === TRIAL_CAP && res.rejected.length === 0 && res.admitted.every(a => a.predicate === 'NEW'), `${TRIAL_CAP} sponsorships admitted`);
  const rels = findAdmittedRelationshipsFor('CIK:0000885725').filter(x => x.type === 'LEAD_SPONSOR_OF_CLINICAL_TRIAL');
  ok(rels.length === TRIAL_CAP && rels.every(x => x.part[0] === 'CIK:0000885725' && /^NCT:NCT\d{8}$/.test(x.part[1])), 'ordered (sponsor by SEC CIK, trial by its registry id)');
  ok(labelOf(rels[0].part[1]).startsWith('NCT') && labelOf(rels[0].part[1]).includes(':'), 'the trial node displays its id and title');
  ok(admitClinicalTrials({ entity: BSX, trials: r.trials }).admitted.every(a => a.predicate === 'PERSISTENT'), 'a repeat is PERSISTENT');
  const changed = admitClinicalTrials({ entity: BSX, trials: [{ ...r.trials[0], status: r.trials[0].status === 'COMPLETED' ? 'TERMINATED' : 'COMPLETED' }] });
  ok(changed.admitted[0].predicate === 'RECONFIGURED', 'a changed registry status is RECONFIGURED');
  const mk = (mut) => { const b = buildTrialAssertion({ entity: BSX, trial: r.trials[1] }); mut(b.assertion); return admitAndProject(b.assertion, { sponsorName: BSX.name, sponsorCik: BSX.cik, trialLabel: 'x' }); };
  ok(mk(a => { a.evidence.provenance.leadSponsorClass = 'OTHER'; }).admitted === false, 'a non-industry lead sponsor is refused');
  ok(mk(a => { a.evidence.provenance.sponsorMatch = 'SIMILAR_NAME'; }).admitted === false, 'a sponsor that is not the resolved entity by exact legal name is refused');
  ok(mk(a => { a.part = ['REGISTRY_SPONSOR_NAME', 'NCT:' + a.evidence.provenance.nctId]; }).admitted === false, 'a sponsor that is not an entity identified by its SEC CIK is refused (the registry never creates identity)');
  ok(mk(a => { a.evidence.provenance.nctId = 'trial-1'; }).admitted === false, 'a trial without a registry id is refused');
  ok(mk(a => { a.evidence.provenance.source = 'MEDIA'; }).admitted === false, 'another source is refused');

  console.log('Formation, words, synthesis');
  const all = findAdmittedRelationshipsFor('CIK:0000885725');
  const f = buildAdmittedFormation({ relationships: all, evidenceFor: latestEvidenceFor, labelOf });
  ok(f.structure.byDomain.KNOWLEDGE === TRIAL_CAP && f.structure.domains.includes('KNOWLEDGE'), 'KNOWLEDGE appears among the admitted domains');
  ok(canonicalRelationshipSentence('LEAD_SPONSOR_OF_CLINICAL_TRIAL', 'BOSTON SCIENTIFIC CORP', 'NCT06827262: Intracept', {}) === 'BOSTON SCIENTIFIC CORP is the lead sponsor of clinical trial NCT06827262: Intracept', 'wording: "is the lead sponsor of clinical trial ..."');
  const lines = canonicalDetailLines(latestEvidenceFor(rels[0].id));
  ok(/lead sponsor \(industry\) as ClinicalTrials\.gov states it/.test(lines[0]) && /the status is as of that update/.test(lines[0]) && /equals the resolved entity's legal name; the registry did not create the identity/.test(lines[1]), 'detail lines: the registry\'s statement, status as of the update, identity not created by the registry');
  const S = buildSynthesis({ subject: 'BOSTON SCIENTIFIC CORP', relationships: all, evidenceFor: latestEvidenceFor, labelOf, formation: f });
  const st = S.statements.find(s => /lead \(industry\) sponsor of 20 registered clinical studies/.test(s.text));
  ok(st && st.status === 'SUPPORTED' && /the registry states the sponsorship, not the studies' results/.test(st.text) && st.evidence.length === 20, 'a SUPPORTED statement counts the studies, says the status is as of the record update and that results are not stated');
  ok(validateSynthesis(S, all, latestEvidenceFor, null).problems.length === 0, 'every label is supported by its evidence (validator: no problems)');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
