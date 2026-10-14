// mediaobservation.js -- KRYL-1418 (GDELT MEDIA observation, Founder ratified 2026-10-13). Server side of GET /api/media-observation.
// For a company resolved by its SEC CIK: the dated articles the GDELT DOC 2.0 index returns for the EXACT phrase of the company's SEC registered name (legal form set aside, for example
// "Verizon Communications"), newest first. Each article is returned as GDELT states it (title, domain, URL, first-seen date). Nothing is inferred from an article: not that it concerns a
// relationship or an event, not its tone, not its importance. A GDELT failure (including its rate limit) is reported as a failure, never as "no articles".
import https from 'https';
import { legalNameKey } from '../src/engine/legalnamekey.js';
import { secTitleForCik } from './secnames.js';

const TTL = 30 * 60 * 1000;
const _cache = new Map();
const FORMS = new Set(['incorporated', 'corporation', 'company', 'limited', 'llc', 'lp', 'plc']);
export const SOURCE = 'GDELT DOC 2.0 API (api.gdeltproject.org)';

/** The phrase queried: the SEC registered name with the trailing legal form set aside, in the form the SEC states it ("VERIZON COMMUNICATIONS INC" -> "VERIZON COMMUNICATIONS"). */
export function phraseOf(title) {
  const words = String(title ?? '').replace(/[,.]/g, ' ').split(/\s+/).filter(Boolean);
  while (words.length > 1 && FORMS.has(legalNameKey(words[words.length - 1]))) words.pop();
  return words.join(' ');
}

function getText(p) {
  return new Promise((resolve, reject) => {
    const req = https.get({ hostname: 'api.gdeltproject.org', path: p, headers: { 'User-Agent': 'krylo/1.0', Accept: 'application/json' } }, (up) => {
      let body = ''; up.on('data', (c) => { body += c; });
      up.on('end', () => (up.statusCode === 200 ? resolve(body) : reject(new Error('GDELT HTTP ' + up.statusCode))));
    });
    req.on('error', reject); req.setTimeout(25000, () => req.destroy(new Error('GDELT timeout')));
  });
}

/** @returns {Promise<{ phrase, legalName, articles: object[], source, retrievedAt, timespan, capped } | { error: string }>} */
export async function mediaFor(cik, { now = Date.now(), getFn = getText, titleFn = secTitleForCik, noCache = false } = {}) {
  const t = await titleFn(cik);
  if (t.error) return { error: t.error };
  if (t.notListed) return { error: 'LEGAL_NAME_NOT_FOUND' };
  const phrase = phraseOf(t.name); if (phrase.length < 3) return { error: 'LEGAL_NAME_NOT_FOUND' };
  const hit = noCache ? null : _cache.get(phrase); if (hit && now - hit.at < TTL) return hit.value;
  let body;
  try {
    body = await getFn('/api/v2/doc/doc?' + new URLSearchParams({ query: `"${phrase}" sourcelang:english`, mode: 'artlist', maxrecords: '25', sort: 'datedesc', timespan: '7d', format: 'json' }));
  } catch (e) { return { error: 'GDELT_LOOKUP_FAILED: ' + String(e?.message ?? e).slice(0, 80) }; }
  let j; try { j = JSON.parse(body); } catch { return { error: 'GDELT_NOT_JSON: ' + String(body).replace(/\s+/g, ' ').slice(0, 80) }; }   // GDELT answers a rate limit with text
  const articles = (j.articles ?? []).filter(a => a?.url && a?.title && a?.seendate).map(a => ({ url: a.url, title: String(a.title).replace(/\s+/g, ' ').trim(), domain: a.domain ?? null, seenDate: a.seendate, language: a.language ?? null, sourceCountry: a.sourcecountry ?? null }));
  const value = { phrase, legalName: t.name, articles, source: SOURCE, retrievedAt: new Date(now).toISOString(), timespan: '7d', capped: (j.articles ?? []).length >= 25 };
  if (!noCache) _cache.set(phrase, { at: now, value });
  return value;
}
