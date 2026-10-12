// formdpeopleadmission.js -- KRYL-1413. Executive officers and directors a private filer's own Form D states -> admitted HAS_FORM_D_OFFICER_OR_DIRECTOR_DISCLOSURE relationships
// through the single write path. The person node is the name as the filing states it, scoped to the issuer (no matching step, no merging); the ratified rule decides.
import { admitAndProject } from './canonicalrelationshipprojection.js';
import { nodeId, NODE_LABELS } from './entitytopologyregistry.js';
import { personNodeId } from './connectors/formdpeople.js';
import './ratifiedrelationshiptypes.js';

export function buildFormDRoleAssertion({ issuer, role }) {
  const person = personNodeId(issuer.cik, role.personName);
  return {
    person,
    assertion: {
      part: [nodeId(issuer.cik, issuer.name), person],
      type: 'HAS_FORM_D_OFFICER_OR_DIRECTOR_DISCLOSURE',
      nuId: { role: role.role },
      nuState: { clarification: role.clarification ?? null },
      evidence: {
        ts: Date.parse(role.filingDate) || Date.now(),
        provenance: {
          source: 'SEC_FORM_D', form: role.form, accession: role.accession, filingDate: role.filingDate, role: role.role, clarification: role.clarification ?? null, roleStated: true,
          personName: role.personName, personIdentity: 'NAME_SCOPED_TO_ISSUER_FILING', issuerCik: role.issuerCik ?? issuer.cik,
        },
      },
    },
    meta: { personName: role.personName, issuerName: issuer.name, issuerCik: issuer.cik, source: 'SEC_FORM_D' },
  };
}

/** @returns {{ admitted: object[], rejected: object[] }} */
export function admitFormDRoles({ issuer, roles }) {
  const admitted = [], rejected = [];
  for (const role of roles ?? []) {
    const b = buildFormDRoleAssertion({ issuer, role });
    NODE_LABELS[b.person] = role.personName;                                   // the display name of the scoped person node (carried to the store with the relationship)
    const res = admitAndProject(b.assertion, b.meta);
    if (res.admitted) admitted.push({ person: b.person, role: role.role, predicate: res.predicate, relationship: res.relationship });
    else rejected.push({ person: b.person, role: role.role, reason: res.reason });
  }
  return { admitted, rejected };
}
