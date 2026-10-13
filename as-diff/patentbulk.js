// patentbulk.js -- KRYL-1416 (Founder ratified 2026-10-13, narrowly): the granted-patent assignee table of the USPTO PatentsView bulk data (Open Data Portal product pvgpatdis,
// table g_assignee_disambiguated), read from a LOCAL file the Founder downloads while signed in to data.uspto.gov and places in as-diff/data/patentsview/ (the portal requires a
// USPTO.gov account; no key is stored by the engine). Server side of GET /api/patent-assignee.
//   - The file is streamed once per set of names; a row matches only when its assignee ORGANIZATION name, with case, punctuation and the spelling of the same legal form ignored (no suffix dropped), equals the resolved company's name exactly
//     (a subsidiary or a similarly named company is a different legal entity and never matches).
//   - One pass builds an in-memory index of every assignee organization (started at engine start); a lookup is then instant.
//   - A missing file is reported as missing (with where to put it), never as "no patents".
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { legalNameKey } from '../src/engine/legalnamekey.js';

const DIR = process.env.KRYLO_PATENT_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), 'data', 'patentsview');
const NAMES = ['g_assignee_disambiguated.tsv', 'g_assignee_disambiguated.tsv.zip'];
export const PATENT_SOURCE = { product: 'pvgpatdis', table: 'g_assignee_disambiguated', name: 'USPTO PatentsView granted-patent data (Open Data Portal bulk dataset pvgpatdis)' };
const KEEP = 40;

export function patentFile() {
  for (const n of NAMES) { const p = path.join(DIR, n); try { const st = fs.statSync(p); return { path: p, zip: n.endsWith('.zip'), size: st.size, mtime: st.mtime.toISOString(), key: `${st.size}:${st.mtimeMs}` }; } catch { /* next */ } }
  return null;
}

function openRows(f) {
  if (!f.zip) return readline.createInterface({ input: fs.createReadStream(f.path), crlfDelay: Infinity });
  const child = spawn('unzip', ['-p', f.path], { stdio: ['ignore', 'pipe', 'ignore'] });
  const rl = readline.createInterface({ input: child.stdout, crlfDelay: Infinity }); rl._child = child; return rl;
}
const cellsOf = (line) => line.split('\t').map(c => c.replace(/^"|"$/g, ''));
const idNum = (id) => (/^\d+$/.test(id) ? Number(id) : -1);

let _idx = null;   // { key, promise }
/** One pass over the file builds a map of exact-legal-name key -> { total, assigneeNames, newest ids } for every assignee organization; a lookup is then instant. */
function buildIndex(f) {
  return (async () => {
    const map = new Map(); const rl = openRows(f); let header = null, iOrg = -1, iPat = -1, rows = 0;
    for await (const line of rl) {
      if (!header) {
        header = cellsOf(line); iOrg = header.indexOf('disambig_assignee_organization'); iPat = header.indexOf('patent_id');
        if (iOrg < 0 || iPat < 0) { rl.close(); rl._child?.kill(); return { error: `COLUMNS_NOT_FOUND: expected patent_id and disambig_assignee_organization, found ${header.slice(0, 8).join(', ')}` }; }
        continue;
      }
      rows++;
      const c = line.split('\t'); const org = (c[iOrg] ?? '').replace(/^"|"$/g, ''); if (!org) continue;
      const id = (c[iPat] ?? '').replace(/^"|"$/g, ''); if (!id) continue;
      const k = legalNameKey(org); if (!k) continue;
      let a = map.get(k); if (!a) map.set(k, a = { assigneeNames: new Map(), ids: [], total: 0 });
      a.total++; a.assigneeNames.set(org, (a.assigneeNames.get(org) ?? 0) + 1); a.ids.push(id);
      if (a.ids.length > KEEP * 4) a.ids = a.ids.sort((x, y) => idNum(y) - idNum(x)).slice(0, KEEP);
    }
    return { map, rows };
  })();
}
const getIndex = (f) => { if (!_idx || _idx.key !== f.key) { _idx = { key: f.key, promise: buildIndex(f) }; _idx.promise.then(r => { if (r.error && _idx?.key === f.key) _idx = null; }); } return _idx.promise; };
/** Engine start: build the index in the background so no user query pays for the scan. */
export function warmPatentIndex(log = () => {}) { const f = patentFile(); if (!f) return; const t0 = Date.now(); getIndex(f).then(r => log(r.error ? `patent index failed: ${r.error}` : `patent index ready: ${r.map.size} assignee names, ${r.rows} rows, ${Math.round((Date.now() - t0) / 1000)}s`)); }
const entryOf = (a) => ({ total: a.total, assigneeNames: [...a.assigneeNames.keys()], newest: [...a.ids].sort((x, y) => idNum(y) - idNum(x)).slice(0, KEEP) });

/** @returns {Promise<{ results: Record<string, object>, rows: number } | { error: string }>} */
export async function scanForNames(names, f = patentFile()) {
  if (!f) return { error: 'FILE_MISSING' };
  const ix = await getIndex(f); if (ix.error) return { error: ix.error };
  const results = {}; for (const n of names) { const a = ix.map.get(legalNameKey(n)); results[n] = a ? entryOf(a) : { total: 0, assigneeNames: [], newest: [] }; }
  return { results, rows: ix.rows };
}

/** @returns {Promise<{ source, fileAsOf, name, total, assigneeNames, newest } | { error: string, where?: string }>} */
export async function patentsFor(name, { f = patentFile() } = {}) {
  const text = String(name ?? '').trim();
  if (text.length < 2 || text.length > 120) return { error: 'name required (2 to 120 characters)' };
  if (!f) return { error: 'FILE_MISSING', where: path.relative(process.cwd(), DIR) || DIR, need: 'g_assignee_disambiguated.tsv.zip from the Open Data Portal dataset pvgpatdis (sign in at data.uspto.gov)' };
  const r = await scanForNames([text], f);
  if (r.error) return { error: r.error };
  return { source: PATENT_SOURCE, fileAsOf: f.mtime, name: text, ...r.results[text], rowsScanned: r.rows };
}
