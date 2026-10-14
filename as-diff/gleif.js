// gleif.js -- KRYL-1417 (GLEIF identity class, Founder ratified 2026-10-13: identity resolution supporting the patent producer ONLY). Server side of GET /api/gleif-entity.
// Asks the GLEIF Global LEI Index (api.gleif.org, public, no key) for the records whose legal name matches a typed name and returns them as the index states them. The
// verification (exact legal name, one ACTIVE and ISSUED record) is made by src/engine/gleifidentity.js; nothing here decides identity.
import https from 'https';

const TTL = 24 * 60 * 60 * 1000;
const _cache = new Map();
const SOURCE = 'GLEIF Global LEI Index (api.gleif.org)';

function getJson(p) {
  return new Promise((resolve, reject) => {
    const req = https.get({ hostname: 'api.gleif.org', path: p, headers: { 'User-Agent': 'Krylo Signal Engine admin@krylo.org', Accept: 'application/vnd.api+json' } }, (up) => {
      let body = ''; up.on('data', (c) => { body += c; });
      up.on('end', () => { if (up.statusCode !== 200) return reject(new Error('GLEIF HTTP ' + up.statusCode)); try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    });
    req.on('error', reject); req.setTimeout(20000, () => req.destroy(new Error('GLEIF timeout')));
  });
}

export const shapeRecord = (d) => {
  const a = d?.attributes ?? {}, e = a.entity ?? {}, r = a.registration ?? {};
  return { lei: d?.id ?? null, legalName: e.legalName?.name ?? null, entityStatus: e.status ?? null, jurisdiction: e.jurisdiction ?? null, country: e.legalAddress?.country ?? null,
    registrationStatus: r.status ?? null, registeredAs: e.registeredAs ?? null, registeredAt: e.registeredAt?.id ?? null, lastUpdate: r.lastUpdateDate ?? null };
};

/** @returns {Promise<{ records: object[], source: string, asOf: string } | { error: string }>} */
export async function gleifByLegalName(name, { now = Date.now(), getFn = getJson } = {}) {
  const text = String(name ?? '').trim();
  if (text.length < 3 || text.length > 120) return { error: 'name required (3 to 120 characters)' };
  const key = text.toLowerCase(); const hit = _cache.get(key);
  if (hit && now - hit.at < TTL) return hit.value;
  try {
    const j = await getFn('/api/v1/lei-records?' + new URLSearchParams({ 'filter[entity.legalName]': text, 'page[size]': '15' }));
    const value = { records: (j.data ?? []).map(shapeRecord), source: SOURCE, asOf: new Date(now).toISOString() };
    _cache.set(key, { at: now, value }); return value;
  } catch (e) { return { error: String(e?.message ?? e).slice(0, 100) }; }
}

/** The authoritative record for an LEI the entity already carries: GET /lei-records/{lei}. @returns {Promise<{ records: object[], source: string, asOf: string } | { error: string }>} */
export async function gleifByLei(lei, { now = Date.now(), getFn = getJson } = {}) {
  const id = String(lei ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9]{20}$/.test(id)) return { error: 'lei required (20 characters)' };
  const hit = _cache.get('lei:' + id);
  if (hit && now - hit.at < TTL) return hit.value;
  try {
    const j = await getFn('/api/v1/lei-records/' + id);
    const value = { records: j?.data ? [shapeRecord(j.data)] : [], source: SOURCE, asOf: new Date(now).toISOString() };
    _cache.set('lei:' + id, { at: now, value }); return value;
  } catch (e) { return { error: String(e?.message ?? e).slice(0, 100) }; }
}
