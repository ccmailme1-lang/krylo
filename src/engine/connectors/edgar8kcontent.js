// edgar8kcontent.js -- KRYL-1399 step B. What a Form 8-K says about a capital event, quoted from the filing text.
// For the filings whose items carry a capital event (1.01 agreements, 2.01 completions, 2.03 obligations, 3.02 equity sales)
// the Item text is read and three things are extracted WHERE THE FILING STATES THEM: the amount, the instrument and the named
// counterparties. Every extracted value carries the passage it came from (a literal slice of the filing), the item and the
// accession. A field the filing does not state, or a document that could not be obtained, is shown ABSENT with its absence class
// (rubric: b = exists but not obtained by KRYL, c = obtained but the text does not state it). Nothing is estimated or inferred:
//   - an amount is a currency-symbol amount of at least 1,000,000 as written; per-share prices and par values are not amounts;
//   - an amount's nature is only the literal wording in front of it ("aggregate principal amount of", "up to", ...), never a
//     classification into announced / committed / closed / disbursed, and no magnitude is computed (v1: INDETERMINATE);
//   - a counterparty is a name ending in a legal or financial suffix, and its role is the literal phrase that follows it
//     ("as administrative agent", "as trustee", ...) or null when the filing names it without one.
// Limits (stated, not hidden): amounts written without a currency symbol (for example "1.0 billion aggregate principal amount of
// Euro ...") are not extracted; a counterparty without a legal suffix (a government department) is not extracted; the Item text is
// read as plain text, so tables are flattened.

export const CAPITAL_EVENT_ITEMS = ['1.01', '2.01', '2.03', '3.02'];
const BODY_ITEMS = ['1.01', '2.01', '2.03', '3.02', '8.01'];
const TITLES = {
  '1.01': /^Entry\s+into/i, '1.02': /^Termination/i, '2.01': /^Completion/i, '2.02': /^Results/i, '2.03': /^Creation/i, '2.04': /^Triggering/i,
  '2.05': /^Costs/i, '2.06': /^Material/i, '3.01': /^Notice/i, '3.02': /^Unregistered/i, '3.03': /^Material/i, '5.02': /^Departure/i,
  '5.03': /^Amendments/i, '5.07': /^Submission/i, '7.01': /^Regulation/i, '8.01': /^Other/i, '9.01': /^Financial/i,
};

export function htmlToText(html) {
  return String(html ?? '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|tr|li|h\d)>/gi, ' ').replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ').replace(/&amp;/g, '&').replace(/&#8217;|&rsquo;/g, "'").replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"')
    .replace(/&#8212;|&#8211;|&mdash;|&ndash;/g, '-').replace(/&#\d+;/g, ' ').replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ').trim();
}

/** Item bodies: { '1.01': 'text…', … } for the items we read. A heading is "Item N.NN" followed by that item's standard title. */
export function itemBodies(text) {
  const marks = [];
  const re = /\bItem\s+(\d\.\d{2})\b\.?\s*(?=([A-Za-z]+))/gi;   // headings are sometimes upper case ("ITEM 1.01 ENTRY INTO ...")
  let m;
  while ((m = re.exec(text))) {
    const t = TITLES[m[1]];
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 40);
    if (t && t.test(after)) marks.push({ item: m[1], start: m.index, bodyStart: m.index + m[0].length });
  }
  const out = {};
  for (let i = 0; i < marks.length; i++) {
    const end = i + 1 < marks.length ? marks[i + 1].start : text.length;
    const sigAt = text.slice(marks[i].bodyStart, end).search(/\bSIGNATURES?\b/);
    const body = text.slice(marks[i].bodyStart, sigAt >= 0 ? marks[i].bodyStart + sigAt : end).trim();
    if (BODY_ITEMS.includes(marks[i].item) && body.length > (out[marks[i].item]?.length ?? 0)) out[marks[i].item] = body;
  }
  return out;
}

const SCALE = { billion: 1e9, million: 1e6, thousand: 1e3 };
const CCY = { '$': 'USD', 'US$': 'USD', 'U.S.$': 'USD', 'C$': 'CAD', 'CA$': 'CAD', 'CAD$': 'CAD', 'A$': 'AUD', 'AU$': 'AUD', 'HK$': 'HKD', 'NZ$': 'NZD', 'S$': 'SGD', '€': 'EUR', '£': 'GBP' };
const passageAround = (text, start, end, pad = 110) => {
  let a = Math.max(0, start - pad), b = Math.min(text.length, end + pad);
  if (a > 0) { const sp = text.indexOf(' ', a); if (sp >= 0 && sp < start) a = sp + 1; }
  if (b < text.length) { const sp = text.lastIndexOf(' ', b); if (sp > end) b = sp; }
  return text.slice(a, b).trim();
};
const LEAD = /(aggregate principal amount of|aggregate purchase price(?: in cash)? of|aggregate sales proceeds of|up to|in an aggregate amount of|principal amount of|aggregate amount of|commitments? (?:of|in the amount of))\s*(?:approximately\s*)?$/i;

export function extractAmounts(body, item, max = 6) {
  const out = []; const seen = new Set();
  const re = /(U\.S\.\$|US\$|CAD\$|CA\$|AU\$|NZ\$|HK\$|[CAS]\$|\$|€|£)\s?(\d[\d,]*(?:\.\d+)?)(?:\s*(billion|million|thousand))?/gi;
  let m;
  while ((m = re.exec(body))) {
    const num = parseFloat(m[2].replace(/,/g, ''));
    if (!Number.isFinite(num)) continue;
    const value = num * (m[3] ? SCALE[m[3].toLowerCase()] : 1);
    if (value < 1_000_000) continue;                                        // per-share prices, par values, small fees
    const tail = body.slice(m.index + m[0].length, m.index + m[0].length + 14);
    if (/^\s*per\s+(share|annum|unit)/i.test(tail)) continue;
    const key = `${m[1]}${value}`;
    if (seen.has(key)) continue; seen.add(key);
    const lead = (body.slice(Math.max(0, m.index - 48), m.index).match(LEAD) ?? [])[1] ?? (body.slice(m.index + m[0].length, m.index + m[0].length + 40).match(/^\s*(aggregate principal amount|aggregate amount|principal amount)/i) ?? [])[1] ?? null;
    out.push({ raw: m[0].trim(), currency: CCY[m[1]] ?? 'UNSTATED', value, wording: lead ? lead.replace(/\s+/g, ' ') : null, item, passage: passageAround(body, m.index, m.index + m[0].length) });
    if (out.length >= max) break;
  }
  return out;
}

const INSTRUMENT_PATTERNS = [
  ['NOTES', /\b(?:\d+(?:\.\d+)?%\s+)?(?:(?:Senior|Junior Subordinated|Subordinated|Convertible|Secured|Unsecured|Floating Rate|Fixed Rate)\s+)*(?:Notes|Debentures|Bonds)\s+due\s+\d{4}\b/gi],
  ['CREDIT_FACILITY', /\b(?:(?:364-day|five-year|\d+-year|senior unsecured|delayed draw|revolving)\s+){0,3}(?:revolving\s+)?(?:credit (?:agreement|facility)|term loan(?: facility)?|loan agreement)\b/gi],
  ['EQUITY_PROGRAM', /\b(?:equity distribution agreement|at-the-market offering(?: program)?|securities purchase agreement|stock purchase agreement|underwriting agreement|purchase agreement)\b/gi],
  ['EQUITY_SECURITY', /\b(?:shares of (?:the (?:Company|Registrant)'s )?(?:Class [A-C] )?(?:Common Stock|common stock|Capital Stock|Preferred Stock|preferred stock)|(?:Class [A-C] )?(?:Common|Preferred) Stock)\b/g],
];
export function extractInstruments(body, item, max = 6) {
  const out = []; const seen = new Set();
  for (const [kind, rx] of INSTRUMENT_PATTERNS) {
    rx.lastIndex = 0; let m;
    while ((m = rx.exec(body))) {
      const text = m[0].replace(/\s+/g, ' ').trim(); const key = text.toLowerCase();
      if (seen.has(key)) continue; seen.add(key);
      out.push({ text, kind, item, passage: passageAround(body, m.index, m.index + m[0].length) });
      if (out.length >= max) return out;
    }
  }
  return out;
}

const ROLE_RX = /^[\s,)"]*(?:\([^)]{0,60}\)\s*)?(?:(?:,\s*)?(?:and\s+)?(?:each|collectively)?[^.;]{0,40}?)?\bas\s+(?:the\s+|a\s+|an\s+)?((?:joint\s+)?(?:lead arrangers?|book managers?|administrative agent|syndication agent|trustee|sales agents?|managers?|underwriters?|lenders?|representatives?|purchasers?|collateral agent)(?:\s+and\s+(?:joint\s+)?(?:lead arrangers?|book managers?))?)/i;
const firstToken = (s) => String(s ?? '').replace(/^the\s+/i, '').trim().split(/[\s,.]+/)[0].toLowerCase();

// Counterparty names: a run of name-like tokens (Capitalized words, "&", and "of" between them) that ENDS in a legal or financial
// suffix token. Runs break at lowercase words and at sentence ends. Leading sentence-start words are stripped.
const SUFFIX = /^(?:LLC|L\.L\.C\.|Inc\.?|Corp\.|Corporation|Co\.|Ltd\.|Limited|PLC|plc|N\.A\.|ACB|L\.P\.|LP|S\.A\.|AG|N\.V\.|B\.V\.|Association)$/;
const ABBREV = /^(?:Inc|Corp|Co|Ltd|N\.A|U\.S|J\.P|S\.A|L\.P|L\.L\.C|Jr|Sr|St|Mr|Ms|Dr|No|B\.V|N\.V)\.?$/;
const NAME_TOKEN = /^(?:[A-Z][A-Za-z0-9&.'\-]*|&|of)$/;
const LEAD_STOP = new Set(['On', 'Under', 'In', 'Pursuant', 'Each', 'Item', 'Section', 'Exhibit', 'Following', 'Upon', 'After', 'Prior', 'As', 'By', 'And', 'With', 'To', 'Between', 'Among', 'The', 'Such', 'These', 'This', 'Our', 'Its', 'Their', 'Certain']);
export function extractCounterparties(body, item, registrant, max = 8) {
  const out = []; const seen = new Set(); const reg = firstToken(registrant);
  const words = []; const rx = /\S+/g; let w;
  while ((w = rx.exec(body))) words.push({ raw: w[0], start: w.index, end: w.index + w[0].length });
  let run = [];
  const flush = () => {
    // trim to the last suffix token, then drop leading sentence-start words
    let endIdx = -1;
    for (let k = run.length - 1; k >= 0; k--) if (SUFFIX.test(run[k].tok)) { endIdx = k; break; }
    if (endIdx >= 1 || (endIdx === 0 && false)) {
      let toks = run.slice(0, endIdx + 1);
      while (toks.length > 1 && (toks[0].tok === 'of' || toks[0].tok === '&' || LEAD_STOP.has(toks[0].tok) && !(toks[0].tok === 'The' && /^Bank$/.test(toks[1]?.tok ?? '')))) toks = toks.slice(1);
      if (toks[0]?.tok === 'The' && !/^Bank$/.test(toks[1]?.tok ?? '')) toks = toks.slice(1);
      if (toks.length >= 2 && SUFFIX.test(toks[toks.length - 1].tok)) {
        const endPos0 = toks[toks.length - 1].end;
        const name = body.slice(toks[0].start, endPos0).replace(/\s+/g, ' ').replace(/[\s,;]+$/, '').trim();   // the filing's own punctuation
        const ft = firstToken(name); const key = name.toLowerCase();
        const followedBy = body.slice(endPos0, endPos0 + 12);
        const generic = /^(?:Company|Notes|Shares|Securities|Exchange|Commission)\b/i.test(name) || /^\s*(?:Law|Act|Code|Statutes?)\b/.test(followedBy) || /\bCertificate\b|\bGeneral Corporation$/.test(name);
        const hasRegistrant = reg && toks.some(t => t.tok.toLowerCase().replace(/[^a-z0-9]/g, '') === reg);
        if (!hasRegistrant && !generic && !seen.has(key) && name.length >= 5) {
          seen.add(key);
          const endPos = toks[toks.length - 1].end;
          const after = body.slice(endPos, endPos + 150);
          const role = (after.match(ROLE_RX) ?? [])[1] ?? null;
          out.push({ name, role: role ? `as ${role.replace(/\s+/g, ' ')}` : null, item, passage: passageAround(body, toks[0].start, endPos) });
        }
      }
    }
    run = [];
  };
  for (let wi = 0; wi < words.length; wi++) {
    const wd = words[wi];
    const tok = wd.raw.replace(/[,;:)"]+$/, '').replace(/^["(]+/, '');
    const endsSentence = /[.]$/.test(tok) && !ABBREV.test(tok) && !SUFFIX.test(tok);
    const trailingBreak = /[;:)"]+,?$/.test(wd.raw);
    const nextTok = (words[wi + 1]?.raw ?? '').replace(/[,;:)"]+$/, '').replace(/^["(]+/, '');
    const commaAfter = /,$/.test(wd.raw);
    const prevTok = run[run.length - 1]?.tok;
    // "of" belongs to a name only after "Bank" ("Bank of America", "Bank of New York Mellon")
    if (tok === 'of' && prevTok !== 'Bank') { flush(); continue; }
    if (NAME_TOKEN.test(tok)) {
      run.push({ tok: tok.replace(/\.$/, (m0) => (SUFFIX.test(tok) || ABBREV.test(tok) ? m0 : '')), start: wd.start + Math.max(0, wd.raw.indexOf(tok)), end: wd.start + Math.max(0, wd.raw.indexOf(tok)) + tok.length });
      // a name ends at its suffix ("Co." may be followed by LLC / Ltd.); a comma continues the run only before a suffix ("Bank of America, N.A.")
      if (endsSentence || trailingBreak || (SUFFIX.test(tok) && tok !== 'Co.') || (commaAfter && !SUFFIX.test(nextTok) && nextTok !== 'National')) flush();
    } else flush();
  }
  flush();
  return out.slice(0, max);
}

const absent = (field, absenceClass, reason) => ({ field, state: 'ABSENT', absenceClass, reason });

/**
 * @param {{ html?:string, items:string[], registrant?:string, accession:string, obtained:boolean, status?:number }} p
 * @returns {{ attempted:boolean, status:string, items:string[], amounts:object[], instruments:object[], counterparties:object[], absent:object[], accession:string }}
 */
export function extractCapitalEvent({ html, items, registrant, accession, obtained = true, status = 200 }) {
  const itemList = (items ?? []).map(String);
  const relevant = itemList.filter(i => CAPITAL_EVENT_ITEMS.includes(i));
  if (!relevant.length) return { attempted: false, status: 'NOT_ATTEMPTED', accession, items: itemList, amounts: [], instruments: [], counterparties: [], absent: [], note: 'the filing carries no capital-event item (1.01, 2.01, 2.03, 3.02)' };
  if (!obtained) {
    const why = `the filing document was not obtained (HTTP ${status})`;
    return { attempted: true, status: 'NOT_OBTAINED', accession, items: itemList, amounts: [], instruments: [], counterparties: [], absent: ['amount', 'instrument', 'counterparty'].map(f => absent(f, 'b', why)) };
  }
  const text = htmlToText(html);
  const bodies = itemBodies(text);
  const read = [...relevant, '8.01'].filter(i => bodies[i]);
  const isReferenceOnly = (b) => /incorporated\s+(?:herein\s+)?by\s+reference/i.test(b) && b.length < 420 && !/[$€£]\s?\d/.test(b);   // e.g. Item 2.03 pointing at Item 1.01
  const joined = read.map(i => ({ item: i, body: bodies[i] })).filter(x => !isReferenceOnly(x.body));
  const amounts = [], instruments = [], counterparties = [];
  for (const { item, body } of joined) {
    amounts.push(...extractAmounts(body, item)); instruments.push(...extractInstruments(body, item)); counterparties.push(...extractCounterparties(body, item, registrant));
  }
  const dedupe = (arr, key) => { const s = new Set(); return arr.filter(x => { const k = key(x); if (s.has(k)) return false; s.add(k); return true; }); };
  const A = dedupe(amounts, x => x.currency + x.value).slice(0, 6), I = dedupe(instruments, x => x.text.toLowerCase()).filter((x, _, all) => !all.some(y => y !== x && y.text.length > x.text.length && y.text.toLowerCase().includes(x.text.toLowerCase()))).slice(0, 6), C = dedupe(counterparties, x => x.name.toLowerCase()).slice(0, 8);
  const abs = [];
  const none = joined.length ? 'the Item text does not state it' : 'the Item text is not stated in the document (it only refers to another item or exhibit)';
  if (!A.length) abs.push(absent('amount', 'c', joined.length ? 'the Item text states no currency amount of at least 1,000,000' : none));
  if (!I.length) abs.push(absent('instrument', 'c', none));
  if (!C.length) abs.push(absent('counterparty', 'c', joined.length ? 'the Item text names no counterparty with a legal or financial suffix' : none));
  return { attempted: true, status: abs.length === 3 ? 'NOTHING_STATED' : (abs.length ? 'PARTIAL' : 'EXTRACTED'), accession, items: itemList, amounts: A, instruments: I, counterparties: C, absent: abs };
}

// Documents are immutable, so a successful extraction is kept for the page session (a refresh or a new query does not refetch).
const _cache = new Map();
export const _clearCapitalEventCache = () => _cache.clear();

/** Fetch one filing's primary document through the engine proxy and extract. A failed fetch is NOT_OBTAINED and is not cached. */
export async function fetchCapitalEvent({ cik, accession, file, items, registrant, fetchImpl = (typeof fetch !== 'undefined' ? fetch : null), baseUrl = '' }) {
  const key = `${accession}`;
  if (_cache.has(key)) return _cache.get(key);
  if (!fetchImpl || !file) return extractCapitalEvent({ items, registrant, accession, obtained: false, status: 0 });
  let res;
  try { res = await fetchImpl(`${baseUrl}/api/edgar-document?` + new URLSearchParams({ cik: String(parseInt(cik, 10)), accession: String(accession).replace(/-/g, ''), file })); }
  catch { return extractCapitalEvent({ items, registrant, accession, obtained: false, status: 0 }); }
  if (!res.ok) return extractCapitalEvent({ items, registrant, accession, obtained: false, status: res.status });
  const html = await res.text();
  const ev = extractCapitalEvent({ html, items, registrant, accession, obtained: true });
  _cache.set(key, ev);
  return ev;
}
