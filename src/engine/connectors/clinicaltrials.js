// clinicaltrials.js -- KRYL-1414 (Founder ratified 2026-10-12). Clinical-trial sponsorship from ClinicalTrials.gov, for companies already resolved by their SEC CIK.
// The registry never creates identity: a study is read as this entity's only when it names the entity as LEAD sponsor, the sponsor class is INDUSTRY, and the sponsor's name with legal
// suffixes removed equals the resolved entity's name exactly. Collaborator roles, other sponsors and near names are not admitted. The newest studies are read (cap stated, total reported).
import { normalizeEntityName } from '../secfileradmission.js';

export const TRIAL_CAP = 20;
export const trialNodeId = (nct) => `NCT:${String(nct).toUpperCase()}`;

/** @returns {{ trials: object[], total: number|null, leadByThisEntity: number, capped: boolean, failed?: string }} */
export async function fetchClinicalTrials({ entity, fetchImpl = (typeof fetch !== 'undefined' ? fetch : null), cap = TRIAL_CAP }) {
  const empty = { trials: [], total: null, leadByThisEntity: 0, capped: false };
  if (!fetchImpl || !entity?.name) return { ...empty, failed: 'no lookup available' };
  let j;
  try {
    const r = await fetchImpl('/api/clinical-trials?' + new URLSearchParams({ lead: entity.name.replace(/\b(corp|corporation|inc|incorporated|co|company|ltd|plc)\b\.?/gi, ' ').replace(/\s+/g, ' ').trim() }));
    if (!r.ok) return { ...empty, failed: `HTTP ${r.status}` };
    j = await r.json();
  } catch (e) { return { ...empty, failed: String(e?.message ?? e).slice(0, 80) }; }
  const want = normalizeEntityName(entity.name);
  const mine = (j.studies ?? []).map(s => ({ s, ps: s.protocolSection ?? {} })).filter(({ ps }) => ps.sponsorCollaboratorsModule?.leadSponsor?.class === 'INDUSTRY' && normalizeEntityName(ps.sponsorCollaboratorsModule.leadSponsor.name) === want && ps.identificationModule?.nctId);
  const trials = mine.slice(0, cap).map(({ ps }) => ({
    nct: ps.identificationModule.nctId, title: ps.identificationModule.briefTitle ?? null, status: ps.statusModule?.overallStatus ?? null, startDate: ps.statusModule?.startDateStruct?.date ?? null,
    firstSubmitted: ps.statusModule?.studyFirstSubmitDate ?? null, lastUpdated: ps.statusModule?.lastUpdatePostDateStruct?.date ?? null, phase: (ps.designModule?.phases ?? []).join('/') || null,
    leadSponsorName: ps.sponsorCollaboratorsModule.leadSponsor.name, retrievedAt: j.retrievedAt ?? null,
  }));
  return { trials, total: j.total ?? null, leadByThisEntity: mine.length, capped: mine.length > cap || (j.total ?? 0) > (j.studies ?? []).length };
}
