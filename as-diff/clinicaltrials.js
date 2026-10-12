// clinicaltrials.js -- KRYL-1414. Server side of GET /api/clinical-trials: the ClinicalTrials.gov lead-sponsor studies for a sponsor name (public registry, API v2), cached six hours.
// The engine only fetches and returns what the registry states; whether a sponsor is the resolved entity is decided by the client by exact legal-name equality.
import https from 'https';
const TTL_MS = 6 * 60 * 60 * 1000; const _cache = new Map();
const FIELDS = 'NCTId,BriefTitle,OverallStatus,StartDate,StudyFirstSubmitDate,LastUpdatePostDate,LeadSponsorName,LeadSponsorClass,Phase';
function get(path) {
  return new Promise((resolve, reject) => {
    const req = https.get({ hostname: 'clinicaltrials.gov', path, headers: { 'User-Agent': 'Krylo Signal Engine admin@krylo.org', Accept: 'application/json' } }, (up) => {
      let b = ''; up.on('data', (c) => { b += c; });
      up.on('end', () => { if (up.statusCode !== 200) return reject(new Error('ClinicalTrials.gov HTTP ' + up.statusCode)); try { resolve(JSON.parse(b)); } catch (e) { reject(e); } });
    });
    req.on('error', reject); req.setTimeout(20000, () => req.destroy(new Error('ClinicalTrials.gov timeout')));
  });
}
export async function clinicalTrialsFor(lead, { now = Date.now(), fetchFn = get } = {}) {
  const name = String(lead ?? '').trim();
  if (name.length < 2 || name.length > 120) return { error: 'lead sponsor required (2 to 120 characters)' };
  const key = name.toLowerCase(); const hit = _cache.get(key);
  if (hit && now - hit.at < TTL_MS) return { ...hit.value, cached: true };
  try {
    const j = await fetchFn(`/api/v2/studies?query.lead=${encodeURIComponent(name)}&pageSize=40&sort=LastUpdatePostDate:desc&countTotal=true&fields=${FIELDS}`);
    const value = { source: 'ClinicalTrials.gov API v2', retrievedAt: new Date(now).toISOString(), total: j.totalCount ?? null, studies: j.studies ?? [] };
    _cache.set(key, { at: now, value }); return value;
  } catch (e) { return { error: String(e?.message ?? e) }; }
}
export const _clearClinicalCacheForTests = () => _cache.clear();
