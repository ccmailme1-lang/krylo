// patentassignee.js -- KRYL-1416 (Founder ratified 2026-10-13, narrowly). A TECHNOLOGY relationship only when the USPTO PatentsView granted-patent table (a LOCAL bulk file, see as-diff/patentbulk.js)
// lists the resolved company, by its EXACT legal name, as the assignee organization of a granted patent. No fuzzy matching and no inference: a subsidiary or a similarly named company is a
// different legal entity. The server returns candidate rows; every row's assignee name is checked again here against the resolved entity's name before it is read as the entity's.
import { legalNameKey } from '../legalnamekey.js';

export const PATENT_CAP = 20;
export const patentNodeId = (id) => `PATENT:US${String(id).toUpperCase()}`;

/** @returns {{ patents: object[], total: number, capped: boolean, fileMissing?: object, failed?: string }} */
export async function fetchPatentAssignments({ entity, fetchImpl = (typeof fetch !== 'undefined' ? fetch : null), cap = PATENT_CAP }) {
  const empty = { patents: [], total: 0, capped: false };
  if (!fetchImpl || !entity?.name) return { ...empty, failed: 'no lookup available' };
  let j;
  try {
    const r = await fetchImpl('/api/patent-assignee?' + new URLSearchParams({ name: entity.name }));
    if (!r.ok) return { ...empty, failed: `HTTP ${r.status}` };
    j = await r.json();
  } catch (e) { return { ...empty, failed: String(e?.message ?? e).slice(0, 80) }; }
  if (j.error === 'FILE_MISSING') return { ...empty, fileMissing: { where: j.where, need: j.need } };
  if (j.error) return { ...empty, failed: j.error };
  const want = legalNameKey(entity.name);
  const names = (j.assigneeNames ?? []).filter(n => legalNameKey(n) === want);
  if (!names.length || !(j.newest ?? []).length) return { ...empty, source: j.source, fileAsOf: j.fileAsOf };
  const patents = j.newest.slice(0, cap).map(id => ({ id, assigneeName: names[0], fileAsOf: j.fileAsOf, product: j.source?.product, table: j.source?.table }));
  return { patents, total: j.total ?? patents.length, capped: (j.total ?? 0) > patents.length, source: j.source, fileAsOf: j.fileAsOf, assigneeNames: names };
}
