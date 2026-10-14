// patentassigneeadmission.js -- KRYL-1416. Granted patents (connectors/patentassignee.js) -> admitted ASSIGNEE_OF_GRANTED_PATENT relationships through the single write path.
// The company is the entity already resolved by its SEC CIK; the patent node is the granted patent number. The ratified rule decides; a refusal is reported with its reason.
import { admitAndProject } from './canonicalrelationshipprojection.js';
import { nodeId, NODE_LABELS } from './entitytopologyregistry.js';
import { patentNodeId } from './connectors/patentassignee.js';
import './ratifiedrelationshiptypes.js';

// The company node: by SEC CIK, or (KRYL-1417, GLEIF identity class) by the GLEIF LEI of an entity that has no SEC CIK.
export const companyNode = (entity) => (entity.cik ? nodeId(entity.cik, entity.name) : `LEI:${String(entity.lei ?? '').toUpperCase()}`);

export function buildPatentAssertion({ entity, patent }) {
  const node = patentNodeId(patent.id);
  return {
    node, label: `US ${patent.id}`,
    assertion: {
      part: [companyNode(entity), node], type: 'ASSIGNEE_OF_GRANTED_PATENT', nuId: patent.subsidiary ? { heldBy: patent.subsidiary.name } : {}, nuState: {},
      evidence: {
        ts: Date.parse(patent.fileAsOf) || Date.now(),
        provenance: {
          source: 'USPTO_PATENTSVIEW_BULK', product: patent.product ?? 'pvgpatdis', table: patent.table ?? 'g_assignee_disambiguated', patentId: patent.id, assigneeName: patent.assigneeName,
          ...(!entity.cik && entity.lei ? { identity: { source: 'GLEIF', class: 'GLEIF_LEI', lei: String(entity.lei).toUpperCase(), legalName: entity.name, entityStatus: entity.gleif?.entityStatus ?? null, registrationStatus: entity.gleif?.registrationStatus ?? null, retrievedAt: entity.gleif?.retrievedAt ?? null } } : {}),
          assigneeMatch: patent.subsidiary ? 'EXACT_LEGAL_NAME_OF_EXHIBIT_21_SUBSIDIARY' : 'EXACT_LEGAL_NAME_OF_RESOLVED_ENTITY',
          ...(patent.subsidiary ? { subsidiary: { name: patent.subsidiary.name, exhibit21: { accession: patent.subsidiary.exhibit21.accession, file: patent.subsidiary.exhibit21.file, form: patent.subsidiary.exhibit21.form, filedAt: patent.subsidiary.exhibit21.filedAt, filerCik: entity.cik } } } : {}),
          fileAsOf: patent.fileAsOf, accession: `US${patent.id}`, filingDate: patent.fileAsOf, form: 'USPTO granted-patent record',
        },
      },
    },
  };
}

/** @returns {{ admitted: object[], rejected: object[] }} */
export function admitPatentAssignments({ entity, patents }) {
  const admitted = [], rejected = [];
  if (!entity.cik && entity.lei && !NODE_LABELS[companyNode(entity)]) NODE_LABELS[companyNode(entity)] = entity.displayName ?? entity.name;
  for (const patent of patents ?? []) {
    const b = buildPatentAssertion({ entity, patent });
    NODE_LABELS[b.node] = b.label;
    const res = admitAndProject(b.assertion, { companyName: entity.name, companyCik: entity.cik ?? null, patentLabel: b.label, source: 'USPTO_PATENTSVIEW_BULK' });
    if (res.admitted) admitted.push({ id: patent.id, predicate: res.predicate, relationship: res.relationship }); else rejected.push({ id: patent.id, reason: res.reason });
  }
  return { admitted, rejected };
}
