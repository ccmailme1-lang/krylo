// secnamematch.js -- KRYL-1407 (Founder approval 2026-10-11). Pure name matching over the SEC listed-company file
// (https://www.sec.gov/files/company_tickers.json: one row {cik_str, ticker, title} per ticker / share class). Decides what a typed name may mean;
// it never decides identity on its own: an EXACT or UNIQUE_PREFIX result is a CANDIDATE that the CIK-based SEC verification (secfileradmission.js) must
// confirm before an entity is admitted, a NEAR result is a suggestion that is never bound, an AMBIGUOUS result stays unresolved.
//
//   buildNameIndex(rows)            -> [{ cik:'0000037996', name:'FORD MOTOR CO', tickers:['F',...], base:'ford motor' }]  (one entry per CIK)
//   matchListedName(index, text)    -> { tier, candidates:[{ cik, name, tickers }], note? }
//
// Tiers, in order, over DISTINCT CIKs (share classes collapse to one):
//   EXACT          the name with legal suffixes removed equals exactly one registrant's.
//   UNIQUE_PREFIX  the name (>= 4 characters) is a word-prefix of exactly one registrant's name. A candidate only.
//   AMBIGUOUS      an exact or prefix match names two or more registrants: nothing is a candidate; all are listed.
//   NEAR           no exact or prefix match; registrants within a small edit distance of the leading words (a misspelt legal suffix such as "Compnany" is
//                  tolerated HERE ONLY, so tolerance can never make a name EXACT). A suggestion; never bound.
//   NONE           otherwise.
import { normalizeEntityName } from './secfileradmission.js';

const SUFFIX_WORDS = ['company', 'corporation', 'incorporated', 'holdings', 'holding', 'limited', 'international', 'group'];
const MIN_PREFIX = 4;

export const padCik = (c) => String(c ?? '').replace(/\D/g, '').padStart(10, '0');

/** Damerau-Levenshtein distance (adjacent transposition = 1). */
export function editDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => { const r = new Array(b.length + 1).fill(0); r[0] = i; return r; });
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[a.length][b.length];
}

export function buildNameIndex(rows) {
  const byCik = new Map();
  for (const r of rows ?? []) {
    const cik = padCik(r.cik_str ?? r.cik); if (!r.title && !r.name) continue;
    const e = byCik.get(cik) ?? { cik, name: String(r.title ?? r.name), tickers: [] };
    if (r.ticker && !e.tickers.includes(r.ticker)) e.tickers.push(r.ticker);
    byCik.set(cik, e);
  }
  return [...byCik.values()].map(e => ({ ...e, base: normalizeEntityName(e.name) })).filter(e => e.base);
}

const cand = (e) => ({ cik: e.cik, name: e.name, tickers: e.tickers });

// A word within one edit of a legal-suffix word ("compnany") is dropped from the query for the NEAR comparison only.
function stripMisspeltSuffix(base) {
  const w = base.split(' ');
  while (w.length > 1) {
    const last = w[w.length - 1];
    if (last.length >= 6 && SUFFIX_WORDS.some(s => editDistance(last, s) <= 1)) w.pop(); else break;
  }
  return w.join(' ');
}

export function matchListedName(index, text) {
  const want = normalizeEntityName(text);
  if (!want || !index?.length) return { tier: 'NONE', candidates: [] };
  const exact = index.filter(e => e.base === want);
  if (exact.length === 1) return { tier: 'EXACT', candidates: [cand(exact[0])] };
  if (exact.length > 1) return { tier: 'AMBIGUOUS', candidates: exact.map(cand), note: 'exact name shared by several registrants' };
  if (want.replace(/ /g, '').length >= MIN_PREFIX) {
    const pre = index.filter(e => e.base.startsWith(want + ' '));
    if (pre.length === 1) return { tier: 'UNIQUE_PREFIX', candidates: [cand(pre[0])] };
    if (pre.length > 1) return { tier: 'AMBIGUOUS', candidates: pre.slice(0, 8).map(cand), note: `${pre.length} registrants begin with this name` };
  }
  const q = stripMisspeltSuffix(want);
  if (q.replace(/ /g, '').length < MIN_PREFIX) return { tier: 'NONE', candidates: [] };
  const k = q.split(' ').length, limit = q.length >= 8 ? 2 : 1;
  const near = index.map(e => ({ e, d: editDistance(q, e.base.split(' ').slice(0, k).join(' ')) })).filter(x => x.d <= limit && x.d >= 0);
  if (!near.length) return { tier: 'NONE', candidates: [] };
  const best = Math.min(...near.map(x => x.d));
  const top = near.filter(x => x.d === best).map(x => cand(x.e));
  return { tier: 'NEAR', candidates: top.slice(0, 5), note: 'approximate: never bound' };
}
