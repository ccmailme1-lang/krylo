// clinicaltrialadmission.js -- KRYL-1414. Lead-sponsor studies (connectors/clinicaltrials.js) -> admitted LEAD_SPONSOR_OF_CLINICAL_TRIAL relationships through the single write path.
// The sponsor is the entity already resolved by its SEC CIK; the trial node is the registry id. The ratified rule decides; a refusal is reported with its reason.
import { admitAndProject } from './canonicalrelationshipprojection.js';
import { nodeId, NODE_LABELS } from './entitytopologyregistry.js';
import { trialNodeId } from './connectors/clinicaltrials.js';
import './ratifiedrelationshiptypes.js';

export function buildTrialAssertion({ entity, trial }) {
  const trialNode = trialNodeId(trial.nct);
  return {
    trialNode, label: `${trial.nct}${trial.title ? `: ${String(trial.title).length > 90 ? String(trial.title).slice(0, 87) + '…' : trial.title}` : ''}`,
    assertion: {
      part: [nodeId(entity.cik, entity.name), trialNode], type: 'LEAD_SPONSOR_OF_CLINICAL_TRIAL', nuId: {}, nuState: { status: trial.status ?? null },
      evidence: {
        ts: Date.parse(trial.lastUpdated) || Date.now(),
        provenance: {
          source: 'CLINICALTRIALS_GOV', nctId: trial.nct, title: trial.title ?? null, overallStatus: trial.status ?? null, phase: trial.phase ?? null, startDate: trial.startDate ?? null,
          firstSubmitted: trial.firstSubmitted ?? null, lastUpdated: trial.lastUpdated ?? null, retrievedAt: trial.retrievedAt ?? null,
          leadSponsorName: trial.leadSponsorName, leadSponsorClass: 'INDUSTRY', sponsorMatch: 'EXACT_LEGAL_NAME_OF_RESOLVED_ENTITY', accession: trial.nct, filingDate: trial.lastUpdated ?? null, form: 'ClinicalTrials.gov record',
        },
      },
    },
  };
}

/** @returns {{ admitted: object[], rejected: object[] }} */
export function admitClinicalTrials({ entity, trials }) {
  const admitted = [], rejected = [];
  for (const trial of trials ?? []) {
    const b = buildTrialAssertion({ entity, trial });
    NODE_LABELS[b.trialNode] = b.label;
    const res = admitAndProject(b.assertion, { sponsorName: entity.name, sponsorCik: entity.cik, trialLabel: b.label, source: 'CLINICALTRIALS_GOV' });
    if (res.admitted) admitted.push({ nct: trial.nct, predicate: res.predicate, relationship: res.relationship }); else rejected.push({ nct: trial.nct, reason: res.reason });
  }
  return { admitted, rejected };
}
