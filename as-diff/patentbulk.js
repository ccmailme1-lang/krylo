// patentbulk.js -- KRYL-1416 (Founder ratified 2026-10-13, narrowly): the granted-patent assignee table of the USPTO PatentsView bulk data (Open Data Portal product pvgpatdis,
// table g_assignee_disambiguated), read from a LOCAL file the Founder downloads while signed in to data.uspto.gov and places in as-diff/data/patentsview/ (the portal requires a
// USPTO.gov account; no key is stored by the engine). Server side of GET /api/patent-assignee.
//   - The file is streamed once per set of names; a row matches only when its assignee ORGANIZATION name, with legal suffixes removed, equals the resolved company's name exactly
//     (a subsidiary or a similarly named company is a different legal entity and never matches).
//   - Results are cached on disk keyed by the file's size and modification time, so a repeated lookup does not rescan.
//   - A missing file is reported as missing (with where to put it), never as "no patents".
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { normalizeEntityName } from '../src/engine/secfileradmission.js';

const DIR = process.env.KRYLO_PATENT_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), 'data', 'patentsview');
const CACHE = () => path.join(DIR, 'assignee_lookup_cache.json');
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

/** One pass over the file for a set of resolved company names. @returns {Promise<{ results: Record<string, object>, rows: number } | { error: string }>} */
export async function scanForNames(names, f = patentFile()) {
  if (!f) return { error: 'FILE_MISSING' };
  const want = new Map(); for (const n of names) { const k = normalizeEntityName(n); if (k) want.set(k, n); }
  const acc = new Map([...want.keys()].map(k => [k, { assigneeNames: new Map(), ids: [], total: 0 }]));
  const rl = openRows(f); let header = null, iOrg = -1, iPat = -1, rows = 0;
  for await (const line of rl) {
    if (!header) {
      header = cellsOf(line); iOrg = header.indexOf('disambig_assignee_organization'); iPat = header.indexOf('patent_id');
      if (iOrg < 0 || iPat < 0) { rl.close(); rl._child?.kill(); return { error: `COLUMNS_NOT_FOUND: expected patent_id and disambig_assignee_organization, found ${header.slice(0, 8).join(', ')}` }; }
      continue;
    }
    rows++;
    const c = line.split('\t'); const org = (c[iOrg] ?? '').replace(/^"|"$/g, ''); if (!org) continue;
    const a = acc.get(normalizeEntityName(org)); if (!a) continue;
    const id = (c[iPat] ?? '').replace(/^"|"$/g, ''); if (!id) continue;
    a.total++; a.assigneeNames.set(org, (a.assigneeNames.get(org) ?? 0) + 1); a.ids.push(id);
    if (a.ids.length > KEEP * 4) a.ids = a.ids.sort((x, y) => idNum(y) - idNum(x)).slice(0, KEEP);
  }
  const results = {};
  for (const [k, a] of acc) results[want.get(k)] = { total: a.total, assigneeNames: [...a.assigneeNames.keys()], newest: a.ids.sort((x, y) => idNum(y) - idNum(x)).slice(0, KEEP) };
  return { results, rows };
}

const readCache = () => { try { return JSON.parse(fs.readFileSync(CACHE(), 'utf8')); } catch { return { key: null, byName: {} }; } };
/** @returns {Promise<{ source, fileAsOf, name, total, assigneeNames, newest } | { error: string, where?: string }>} */
export async function patentsFor(name, { f = patentFile() } = {}) {
  const text = String(name ?? '').trim();
  if (text.length < 2 || text.length > 120) return { error: 'name required (2 to 120 characters)' };
  if (!f) return { error: 'FILE_MISSING', where: path.relative(process.cwd(), DIR) || DIR, need: 'g_assignee_disambiguated.tsv.zip from the Open Data Portal dataset pvgpatdis (sign in at data.uspto.gov)' };
  const cache = readCache(); const k = normalizeEntityName(text);
  if (cache.key === f.key && cache.byName[k]) return { ...cache.byName[k], cached: true };
  const r = await scanForNames([text], f);
  if (r.error) return { error: r.error };
  const value = { source: PATENT_SOURCE, fileAsOf: f.mtime, name: text, ...r.results[text], rowsScanned: r.rows };
  const fresh = cache.key === f.key ? cache : { key: f.key, byName: {} }; fresh.byName[k] = value;
  try { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(CACHE(), JSON.stringify(fresh)); } catch { /* cache is best effort */ }
  return value;
}
