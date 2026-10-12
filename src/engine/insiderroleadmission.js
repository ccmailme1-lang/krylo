// insiderroleadmission.js -- KRYL-1411. Officer and director roles (insiderroles.js) -> admitted HAS_OFFICER_OR_DIRECTOR_DISCLOSURE relationships through the single write path.
// No matching step: both parties arrive identified by SEC CIK in the filing itself. The ratified rule decides; a refusal is reported with its reason.
import { admitAndProject } from './canonicalrelationshipprojection.js';
import { nodeId } from './entitytopologyregistry.js';
import './ratifiedrelationshiptypes.js';

export function buildInsiderRoleAssertion({ issuer, role }) {
  return {
    assertion: {
      part: [nodeId(issuer.cik, issuer.name), nodeId(role.personCik, role.personName)],
      type: 'HAS_OFFICER_OR_DIRECTOR_DISCLOSURE',
      nuId: { role: role.role },
      nuState: { title: role.officerTitle ?? null },
      evidence: {
        ts: Date.parse(role.filingDate) || Date.now(),
        provenance: {
          source: 'SEC_FORM_3_4_5', form: role.form, accession: role.accession, filingDate: role.filingDate, periodOfReport: role.periodOfReport,
          role: role.role, officerTitle: role.officerTitle ?? null, roleStated: true, personCik: role.personCik, personName: role.personName,
          issuerCik: role.issuerCik ?? issuer.cik, jointFiling: !!role.jointFiling,
        },
      },
    },
    meta: { personName: role.personName, personCik: role.personCik, issuerName: issuer.name, issuerCik: issuer.cik, source: 'SEC_FORM_3_4_5' },
  };
}

/** @returns {{ admitted: object[], rejected: object[] }} */
export function admitInsiderRoles({ issuer, roles }) {
  const admitted = [], rejected = [];
  for (const role of [...(roles ?? [])].sort((a, b) => String(a.filingDate).localeCompare(String(b.filingDate)))) {
    const built = buildInsiderRoleAssertion({ issuer, role });
    const res = admitAndProject(built.assertion, built.meta);
    if (res.admitted) admitted.push({ personCik: role.personCik, role: role.role, predicate: res.predicate, relationship: res.relationship });
    else rejected.push({ personCik: role.personCik, role: role.role, reason: res.reason });
  }
  return { admitted, rejected };
}
