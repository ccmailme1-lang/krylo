// exhibit21.js -- KRYL-1416 addendum (Founder ratified 2026-10-13: the Exhibit 21 subsidiary rule). The subsidiaries a company's OWN latest Form 10-K names in its Exhibit 21.
// Used for one thing only: a granted patent whose assignee equals, by exact legal name, a subsidiary listed there is read as held by a subsidiary the company's 10-K lists. Nothing else is
// inferred from the list: not that the subsidiary held the patent when it was granted, not the ownership percentage, not any subsidiary the exhibit does not name.
import https from 'https';

const UA = 'Krylo Signal Engine admin@krylo.org';
const TTL = 24 * 60 * 60 * 1000;
const _cache = new Map();

function get(host, pathAndQuery, accept) {
  return new Promise((resolve, reject) => {
    const req = https.get({ hostname: host, path: pathAndQuery, headers: { 'User-Agent': UA, Accept: accept } }, (up) => {
      let body = ''; up.on('data', (c) => { body += c; });
      up.on('end', () => (up.statusCode === 200 ? resolve(body) : reject(new Error(`${host} HTTP ${up.statusCode}`))));
    });
    req.on('error', reject); req.setTimeout(25000, () => req.destroy(new Error(`${host} timeout`)));
  });
}

const decode = (s) => s.replace(/&nbsp;|&#160;|&#xa0;/gi, ' ').replace(/&amp;/g, '&').replace(/&#8217;|&rsquo;|&#39;/g, "'").replace(/&quot;|&#8220;|&#8221;/g, '"').replace(/&#\d+;|&[a-z]+;/gi, ' ');
const text = (html) => decode(String(html).replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const HEADER = /^(name|names|subsidiar|jurisdiction|state or|country|entity|legal name|percent|ownership|exhibit|list of|organized|incorporat|domestic|foreign)/i;
const LEGAL = /\b(inc|incorporated|corp|corporation|co|company|llc|l\.l\.c|ltd|limited|lp|l\.p|llp|plc|pte|gmbh|ag|s\.a|sa|s\.a\.s|sas|b\.v|bv|n\.v|nv|ab|oy|a\/s|s\.r\.l|srl|s\.p\.a|kk|k\.k|pty|pvt|sdn bhd|unlimited company)\b\.?\)?$/i;

/** The subsidiary names in an Exhibit 21 document: the first cell of each table row, or, with no table, each text line that ends in a legal form. */
export function parseExhibit21(html) {
  const names = [];
  const rows = String(html).match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
  for (const r of rows) {
    const cells = (r.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) ?? []).map(text).filter(Boolean);
    const first = cells[0]; if (!first) continue;
    const n = first.replace(/[*†‡]+$/, '').replace(/\(\d+\)$/, '').trim();
    if (n.length < 3 || HEADER.test(n)) continue;
    names.push(n);
  }
  if (!names.length) {
    const lines = decode(String(html).replace(/<\/(p|div|li|tr|h\d)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ')).split('\n').map(l => l.replace(/\s+/g, ' ').trim());
    for (const raw of lines) {
      const l = raw.replace(/\s*\([^()]*\)\s*$/, '').trim();   // a trailing "(Country)" is the jurisdiction, not part of the name
      if (l.length >= 3 && l.length <= 120 && !HEADER.test(l) && LEGAL.test(l)) names.push(l);
    }
  }
  return [...new Set(names)];
}

/** @returns {Promise<{ cik, accession, file, form, filedAt, names: string[] } | { error: string }>} The company's latest Form 10-K Exhibit 21, as filed with the SEC. */
export async function exhibit21For(cik, { now = Date.now(), getFn = get } = {}) {
  const c10 = String(cik ?? '').replace(/\D/g, '').padStart(10, '0'); if (!/^\d{10}$/.test(c10) || c10 === '0000000000') return { error: 'cik required' };
  const hit = _cache.get(c10); if (hit && now - hit.at < TTL) return hit.value;
  let value;
  try {
    const from = new Date(now - 4 * 365 * 86_400_000).toISOString().slice(0, 10), to = new Date(now).toISOString().slice(0, 10);
    let best = null;
    for (const q of ['subsidiaries', 'list of subsidiaries']) {
      const qs = new URLSearchParams({ forms: '10-K', ciks: c10, q, dateRange: 'custom', startdt: from, enddt: to, hits: '100' });
      const j = JSON.parse(await getFn('efts.sec.gov', '/LATEST/search-index?' + qs, 'application/json'));
      for (const h of j?.hits?.hits ?? []) {
        const s = h._source ?? {}; if (!/^EX-21/i.test(String(s.file_type ?? ''))) continue;
        if (!best || String(s.file_date) > String(best.s.file_date)) best = { id: h._id, s };
      }
      if (best) break;
    }
    if (!best) value = { error: 'EXHIBIT21_NOT_FOUND' };
    else {
      const [accession, file] = best.id.split(':');
      const html = await getFn('www.sec.gov', `/Archives/edgar/data/${Number(c10)}/${accession.replace(/-/g, '')}/${file}`, 'text/html');
      const names = parseExhibit21(html);
      value = names.length ? { cik: c10, accession, file, form: best.s.file_type, filedAt: best.s.file_date, names } : { error: 'EXHIBIT21_NOT_READABLE', accession, file };
    }
  } catch (e) { return { error: 'EXHIBIT21_LOOKUP_FAILED: ' + String(e?.message ?? e).slice(0, 80) }; }
  _cache.set(c10, { at: now, value });
  return value;
}
