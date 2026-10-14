// proxycachestore.js -- the engine's upstream cache (PROXY_CACHE) kept on disk, so an engine restart does not empty it and every ambient source is not asked again. Founder, 2026-10-14:
// "I thought we implemented a caching function many months ago. why are we repeatedly hitting the API?" / "cache once a week".
// Only successful answers are stored (as before: a failure is never replayed), an answer larger than MAX_BODY is not stored, and entries older than MAX_AGE_MS are dropped at load. Each caller
// still applies its own lifetime when it reads (getCached(key, ttl)), so a source's lifetime is unchanged by being on disk.
import fs from 'fs';
import path from 'path';

export const MAX_AGE_MS = 30 * 86_400_000;      // the longest lifetime any proxy uses today (SEC filed documents, 30 days)
export const MAX_BODY = 1_500_000;              // bytes; a larger answer is cached in memory only
const SAVE_DELAY_MS = 5000;

export function loadProxyCache(map, file, now = Date.now()) {
  try {
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    let n = 0;
    for (const [k, v] of Object.entries(j.entries ?? {})) { if (v && typeof v.body === 'string' && now - v.ts <= MAX_AGE_MS) { map.set(k, v); n++; } }
    return n;
  } catch { return 0; }
}

let _timer = null;
export function scheduleProxyCacheSave(map, file, { delay = SAVE_DELAY_MS, setT = setTimeout } = {}) {
  if (_timer) return false;
  _timer = setT(() => { _timer = null; saveProxyCache(map, file); }, delay);
  if (_timer?.unref) _timer.unref();
  return true;
}
export function saveProxyCache(map, file, now = Date.now()) {
  try {
    const entries = {};
    for (const [k, v] of map) if (now - v.ts <= MAX_AGE_MS && typeof v.body === 'string' && v.body.length <= MAX_BODY) entries[k] = v;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = file + '.tmp'; fs.writeFileSync(tmp, JSON.stringify({ savedAt: new Date(now).toISOString(), entries })); fs.renameSync(tmp, file);
    return Object.keys(entries).length;
  } catch { return -1; }                         // the disk copy is best effort; the in-memory cache is unaffected
}
export const _resetSaveTimerForTests = () => { _timer = null; };
