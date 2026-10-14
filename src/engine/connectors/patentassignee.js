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
    const r = await fetchImpl('/api/patent-assignee?' + new URLSearchParams({ name: entity.name, ...(entity.cik ? { cik: String(entity.cik) } : {}) }));
    if (!r.ok) return { ...empty, failed: `HTTP ${r.status}` };
    j = await r.json();
  } catch (e) { return { ...empty, failed: String(e?.message ?? e).slice(0, 80) }; }
  if (j.error === 'FILE_MISSING') return { ...empty, fileMissing: { where: j.where, need: j.need } };
  if (j.error) return { ...empty, failed: j.error };
  const want = legalNameKey(j.legalName ?? entity.name);   // with a CIK the server names the SEC's registered name; that is the legal name matched
  const names = (j.assigneeNames ?? []).filter(n => legalNameKey(n) === want);
  const direct = names.length ? (j.newest ?? []).map(id => ({ id, assigneeName: names[0] })) : [];
  // Ratified 2026-10-13 (Exhibit 21 rule): a subsidiary the company's own 10-K Exhibit 21 lists, matched to the assignee by exact legal name. Each holder is checked again here.
  const ex = j.exhibit21 ?? null; const listedKeys = new Set();
  const held = [];
  for (const h of (ex ? (j.subsidiaryHolders ?? []) : [])) {
    const hk = legalNameKey(h.name); listedKeys.add(hk);
    const an = (h.assigneeNames ?? []).filter(n => legalNameKey(n) === hk); if (!an.length) continue;
    for (const id of h.newest ?? []) held.push({ id, assigneeName: an[0], subsidiary: { name: h.name, exhibit21: ex } });
  }
  const byNewest = (x, y) => (/^\d+$/.test(y.id) ? Number(y.id) : -1) - (/^\d+$/.test(x.id) ? Number(x.id) : -1);
  const all = [...direct, ...held].sort(byNewest);
  const subTotal = (j.subsidiaryHolders ?? []).reduce((n, h) => n + (h.total ?? 0), 0);
  const total = (direct.length ? (j.total ?? direct.length) : 0) + (held.length ? subTotal : 0);
  if (!all.length) return { ...empty, source: j.source, fileAsOf: j.fileAsOf, exhibit21: ex, exhibit21Error: j.exhibit21Error };
  const patents = all.slice(0, cap).map(x => ({ id: x.id, assigneeName: x.assigneeName, fileAsOf: j.fileAsOf, product: j.source?.product, table: j.source?.table, ...(x.subsidiary ? { subsidiary: x.subsidiary } : {}) }));
  return { patents, total, capped: total > patents.length, source: j.source, fileAsOf: j.fileAsOf, assigneeNames: names, legalName: j.legalName, exhibit21: ex, exhibit21Error: j.exhibit21Error, viaSubsidiaries: held.length > 0 };
}
