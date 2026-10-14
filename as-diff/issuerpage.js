// issuerpage.js -- KRYL-1419 (Founder ratified 2026-10-14: the issuer's OWN published page as a source for officers and financing). Server side of GET /api/issuer-page.
// For a company already identified (GLEIF LEI) that carries a curated official domain and curated official pages (src/data/entityregistry.json), the engine reads those pages and returns ONLY
// what the page states, as it states it: the people listed with their roles, and the funding round the company announces (round, amount, valuation, lead investors, date). It reads nothing
// else, follows no link, and never leaves the company's own domain. What a page states is the company's own statement: it is not independently confirmed, it is not a filing, and a listing on a
// web page is not a formal officer disclosure; the report says so.
import https from 'https';
import REGISTRY from '../src/data/entityregistry.json' with { type: 'json' };

const TTL = 7 * 86_400_000;       // 7 days: "cache once a week" (Founder, 2026-10-14)
const _cache = new Map();
const decodeJson = (s) => { try { return JSON.parse(`"${s}"`); } catch { return s; } };

/** People the leadership page lists: { name, role } from the page's own person records (fullName, then its role field). */
export function extractLeadership(html) {
  const t = String(html ?? ''); const people = []; const seen = new Set();
  const marks = [...t.matchAll(/"fullName":"([^"]+)"/g)];
  marks.forEach((m, i) => {
    const seg = t.slice(m.index, marks[i + 1]?.index ?? m.index + 4000).slice(0, 4000);
    const role = (seg.match(/"role":"([^"]+)"/) ?? [])[1];
    const name = decodeJson(m[1]).replace(/\s+/g, ' ').trim();
    if (name && role && !seen.has(name)) { seen.add(name); people.push({ name, role: decodeJson(role).replace(/\s+/g, ' ').trim() }); }
  });
  return people;
}

const text = (s) => String(s).replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ');
/** The round the announcement states: { label, amount, valuation, leads[], sentence, date }, or null when the page states no round in the standard announcement sentence. */
export function extractFinancing(html) {
  const raw = String(html ?? '');
  const body = [...raw.matchAll(/"text":"((?:[^"\\]|\\.)*)"/g)].map(m => decodeJson(m[1])).join('\n');
  const hay = body.length > 200 ? body : text(raw);
  const m = hay.match(/(?:is|are) announcing our (Series [A-Z0-9]+|Seed|Pre-Seed)[^:]*:\s*an?\s+(\$[\d.,]+\s*(?:million|billion|M|B))\s+raise(?:[^,.]*?valuation to (\$[\d.,]+\s*(?:million|billion|M|B)))?[^.]*?,?\s*led by ([^.\n]+?)\./i);
  if (!m) return null;
  const leads = m[4].split(/\s*,\s*(?:and\s+)?|\s+and\s+/).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const date = (raw.match(/"(?:publishedAt|date)":"(\d{4}-\d{2}-\d{2})/) ?? [])[1] ?? (raw.match(/"_updatedAt":"(\d{4}-\d{2}-\d{2})/) ?? [])[1] ?? null;
  const start = Math.max(hay.lastIndexOf('\n', m.index), hay.lastIndexOf('. ', m.index)) + 1;   // the whole sentence as the page writes it
  return { label: m[1], amount: m[2].replace(/\s+/g, ' '), valuation: m[3] ? m[3].replace(/\s+/g, ' ') : null, leads, sentence: hay.slice(start, m.index + m[0].length).replace(/\s+/g, ' ').trim(), date };
}

function getPage(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.get({ hostname: u.hostname, path: u.pathname + u.search, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KryloResearch/1.0)', Accept: 'text/html' } }, (up) => {
      let body = ''; up.setEncoding('utf8'); up.on('data', (c) => { body += c; });
      up.on('end', () => (up.statusCode === 200 ? resolve(body) : reject(new Error('HTTP ' + up.statusCode))));
    });
    req.on('error', reject); req.setTimeout(20000, () => req.destroy(new Error('timeout')));
  });
}
const onDomain = (url, domain) => { try { const h = new URL(url).hostname.toLowerCase(); return url.startsWith('https://') && (h === domain || h.endsWith('.' + domain)); } catch { return false; } };

/** @returns {Promise<{ canonicalId, officialDomain, retrievedAt, leadership?, financing?, pages: object[] } | { error: string }>} */
export async function issuerPagesFor(canonicalId, { now = Date.now(), getFn = getPage, registry = REGISTRY, noCache = false } = {}) {
  const ent = (registry ?? []).find(e => e.canonicalId === canonicalId);
  if (!ent?.officialDomain || !Array.isArray(ent.officialPages) || !ent.officialPages.length) return { error: 'NO_OFFICIAL_PAGES_CURATED' };
  const hit = noCache ? null : _cache.get(canonicalId); if (hit && now - hit.at < TTL) return hit.value;
  const out = { canonicalId, officialDomain: ent.officialDomain, retrievedAt: new Date(now).toISOString(), pages: [] };
  for (const p of ent.officialPages) {
    if (!onDomain(p.url, ent.officialDomain)) { out.pages.push({ kind: p.kind, url: p.url, error: 'NOT_ON_OFFICIAL_DOMAIN' }); continue; }   // never read a page outside the company's own domain
    try {
      const html = await getFn(p.url); const rec = { kind: p.kind, url: p.url, bytes: html.length };
      if (p.kind === 'LEADERSHIP') { out.leadership = { people: extractLeadership(html), url: p.url }; rec.found = out.leadership.people.length; }
      else if (p.kind === 'FINANCING_ANNOUNCEMENT') { const f = extractFinancing(html); if (f) out.financing = { ...f, url: p.url }; rec.found = f ? 1 : 0; }
      out.pages.push(rec);
    } catch (e) { out.pages.push({ kind: p.kind, url: p.url, error: 'FETCH_FAILED: ' + String(e?.message ?? e).slice(0, 60) }); }
  }
  if (out.pages.every(p => p.error)) return { error: 'ISSUER_PAGES_NOT_READ: ' + out.pages.map(p => p.error).join('; ') };
  if (!noCache) _cache.set(canonicalId, { at: now, value: out });
  return out;
}
