// secnames.js -- KRYL-1407. Server side of GET /api/sec-names: the SEC listed-company file fetched once a day by the engine (the browser never receives the
// 10k-row file), cached in memory and on disk with its fetch time, and matched with src/engine/secnamematch.js. Public SEC data only; read-only.
//   secNames(name) -> { tier, candidates, source, asOf, stale } | { error }
import https from 'https';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { buildNameIndex, matchListedName } from '../src/engine/secnamematch.js';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');
const fileOf = () => process.env.KRYLO_SEC_NAMES_FILE || path.join(DIR, 'sec_company_tickers.json');   // the override is for tests
export const SEC_NAMES_TTL_MS = 24 * 60 * 60 * 1000;
const SOURCE = 'SEC company_tickers.json';
let _mem = null;                                                       // { index, fetchedAt }
let _inflight = null;

function download() {
  return new Promise((resolve, reject) => {
    const req = https.get({ hostname: 'www.sec.gov', path: '/files/company_tickers.json', headers: { 'User-Agent': 'Krylo Signal Engine admin@krylo.org', Accept: 'application/json' } }, (up) => {
      let body = ''; up.on('data', (c) => { body += c; });
      up.on('end', () => { if (up.statusCode !== 200) return reject(new Error('SEC HTTP ' + up.statusCode)); try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    });
    req.on('error', reject); req.setTimeout(20000, () => req.destroy(new Error('SEC timeout')));
  });
}

function fromDisk() {
  try { if (!existsSync(fileOf())) return null; const j = JSON.parse(readFileSync(fileOf(), 'utf8')); return j?.rows?.length ? { index: buildNameIndex(j.rows), fetchedAt: j.fetchedAt } : null; } catch { return null; }
}

async function load(now = Date.now(), fetchFn = download) {
  if (!_mem) _mem = fromDisk();
  if (_mem && now - Date.parse(_mem.fetchedAt) < SEC_NAMES_TTL_MS) return { ..._mem, stale: false };
  if (!_inflight) _inflight = (async () => {
    try {
      const j = await fetchFn(); const rows = Object.values(j);
      if (!rows.length) throw new Error('empty SEC file');
      const fetchedAt = new Date(now).toISOString();
      try { mkdirSync(path.dirname(fileOf()), { recursive: true }); writeFileSync(fileOf(), JSON.stringify({ fetchedAt, rows })); } catch { /* disk cache is best effort */ }
      _mem = { index: buildNameIndex(rows), fetchedAt }; return { ..._mem, stale: false };
    } catch (e) {
      if (_mem) return { ..._mem, stale: true };                    // serve the last good copy, flagged
      return { error: String(e?.message ?? e) };
    } finally { _inflight = null; }
  })();
  return _inflight;
}

export async function secNames(name, opts = {}) {
  const text = String(name ?? '').trim();
  if (text.length < 2 || text.length > 120) return { error: 'name required (2 to 120 characters)' };
  const src = await load(opts.now, opts.fetchFn);
  if (src.error) return { error: src.error };
  return { ...matchListedName(src.index, text), source: SOURCE, asOf: src.fetchedAt, stale: src.stale };
}
export const _resetSecNamesForTests = () => { _mem = null; _inflight = null; };
