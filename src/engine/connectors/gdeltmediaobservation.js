// gdeltmediaobservation.js -- KRYL-1418 (GDELT MEDIA observation, Founder ratified 2026-10-13). A dated article that GDELT returns for the exact phrase of a resolved company's SEC registered
// name, as a dated, subject-bound MEDIA OBSERVATION (never a relationship). It records the article title, domain and date exactly as GDELT states them. Nothing else is read or inferred:
// no relationship or event connection is drawn from an article alone, no tone or importance is assigned, and the article's text is not read here.
// The signal value follows the existing precedent for GDELT volume (connectors/gdeltconnector.js, WO-2019): min(100, article count / 200 x 100) and confidence 0.3 + min(1, count / 100) x 0.6;
// polarity is ABSENT (no direction is inferred). One packet per article, the newest MAX_ARTICLES.
import { POLARITY, DECAY } from '../signalconstants.js';

export const MAX_ARTICLES = 5;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); };
/** GDELT "20260930T193000Z" -> "2026-09-30" */
export const seenDay = (d) => (/^\d{8}T/.test(String(d)) ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : null);

export async function fetchMediaObservations({ entity, fetchImpl = (typeof fetch !== 'undefined' ? fetch : null) }) {
  if (!fetchImpl || !entity?.cik) return { articles: [], failed: 'no lookup available' };
  try {
    const r = await fetchImpl('/api/media-observation?' + new URLSearchParams({ cik: String(entity.cik) }));
    if (!r.ok) return { articles: [], failed: `HTTP ${r.status}` };
    const j = await r.json();
    if (j.error) return { articles: [], failed: j.error };
    return { articles: j.articles ?? [], phrase: j.phrase, legalName: j.legalName, source: j.source, retrievedAt: j.retrievedAt, timespan: j.timespan };
  } catch (e) { return { articles: [], failed: String(e?.message ?? e).slice(0, 80) }; }
}

/** @returns {object[]} surfacerouter packets, newest article first */
export function buildMediaSignals({ canonicalId, entityName, result, now = Date.now() }) {
  if (!canonicalId || !result?.articles?.length) return [];
  const all = result.articles.filter(a => a.url && a.title && seenDay(a.seenDate));
  const count = all.length, conf = clamp(0.3 + Math.min(1, count / 100) * 0.6, 0, 1), signal = clamp(Math.round(Math.min(100, (count / 200) * 100)), 0, 100);
  return all.slice(0, MAX_ARTICLES).map((a, i) => ({
    id: `gdelt-${hash(a.url)}-media`, source: 'GDELT', domain: 'media', signal, confidence: conf * 100, originId: `gdelt-${hash(a.url)}`, fanout: 1, fanoutIndex: 0,
    fs: parseFloat((signal / 100).toFixed(3)), polarity: POLARITY.ABSENT, decay: DECAY.DAILY, ts: now, eventClass: 'MEDIA_ARTICLE', entityName: entityName ?? null,
    meta: {
      canonicalId, eventDate: seenDay(a.seenDate), accession: a.url,
      mediaArticle: { title: a.title, domain: a.domain, url: a.url, seenDate: seenDay(a.seenDate), phrase: result.phrase, source: result.source, retrievedAt: result.retrievedAt, timespan: result.timespan, language: a.language ?? null, sourceCountry: a.sourceCountry ?? null },
    },
  }));
}
