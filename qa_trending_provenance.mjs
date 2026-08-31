// qa_trending_provenance.mjs — DEF: TRENDING chip provenance.
//
// TRENDING chips must originate from real dispatched connector signals (the same
// substrate the Structural Field reads), never from query fragments / static
// precursor lists / concept rewrites. Acceptance (Founder): hold the observation set
// constant and change the query wording -> TRENDING is unchanged; change the
// observations -> TRENDING changes.
//
// Run: node qa_trending_provenance.mjs

import { deriveTrendingTerms } from './src/engine/trendingterms.js';
import { readFileSync } from 'node:fs';

let pass = 0, fail = 0;
const ok = (l, c) => { if (c) { pass++; console.log(`  ✓ ${l}`); } else { fail++; console.log(`  ✗ ${l}`); } };

const SIGNALS = [
  { source: 'EDGAR_8K', domain: 'CAPITAL',    signal: 'FINANCING_ROUND:CAPITAL', confidence: 0.8, ts: 300 },
  { source: 'BLS',      domain: 'LABOR',      signal: 62,                        confidence: 0.6, ts: 200 },
  { source: 'GDELT',    domain: 'MEDIA',      signal: 'NARRATIVE_SHIFT:MEDIA',   confidence: 0.5, ts: 100 },
  { source: 'CENSUS',   domain: 'CAPITAL',    signal: 0,                         confidence: 0,   ts: 400 }, // §22 absence marker
];

// ── 1. Chips trace to a real signal's own type-tag or source name ────────────
const cap = deriveTrendingTerms(SIGNALS, 'CAPITAL', 8);
ok('CAPITAL chip traces to the dispatched signal type-tag', cap.includes('FINANCING ROUND'));
ok('§22 zero-confidence signal is NOT surfaced as a trend', !cap.some(c => /CENSUS|GOV/i.test(c)));
ok('LABOR chip falls back to the connector SOURCE label (real source name)', deriveTrendingTerms(SIGNALS, 'LABOR', 8).includes('LABOR DATA'));
ok('a domain with no dispatched signal -> no chips (never padded)', deriveTrendingTerms(SIGNALS, 'OWNERSHIP', 8).length === 0);

// ── 2. Query-independence — deriveTrendingTerms takes (signals, domain) only ──
ok('deriveTrendingTerms has no query/text parameter', /function deriveTrendingTerms\(rawSignals, domain, limit/.test(readFileSync(new URL('./src/engine/trendingterms.js', import.meta.url), 'utf8')));
// hold observations constant -> output is a pure function of (signals, domain)
ok('same signals + domain -> identical chip set (deterministic, query-free)',
   JSON.stringify(deriveTrendingTerms(SIGNALS, 'CAPITAL', 8)) === JSON.stringify(deriveTrendingTerms(SIGNALS, 'CAPITAL', 8)));
// change the observations -> output changes
ok('adding a new CAPITAL signal changes the chip set',
   JSON.stringify(deriveTrendingTerms([...SIGNALS, { source: 'MAERSK', domain: 'CAPITAL', signal: 55, confidence: 0.9, ts: 500 }], 'CAPITAL', 8))
   !== JSON.stringify(cap));

// ── 3. The analysisidlefield trendingResult memo is query-fragment-free ──────
const src = readFileSync(new URL('./src/components/analysis/analysisidlefield.jsx', import.meta.url), 'utf8');
const memo = src.slice(src.indexOf('const trendingResult = useMemo'), src.indexOf('const trendingResult = useMemo') + 900);
ok('trendingResult memo does NOT call parseIntent (no query entities)', !/parseIntent/.test(memo));
ok('trendingResult memo does NOT use DOMAIN_PRECURSORS (no static list)', !/DOMAIN_PRECURSORS/.test(memo));
ok('trendingResult memo does NOT use matchConceptRewrites (no rewrites)', !/matchConceptRewrites/.test(memo));
ok('trendingResult memo does NOT score against query tokens', !/scoreTermRelevance|tokenizeForRelevance/.test(memo));
ok('trendingResult memo derives only from deriveTrendingTerms + rawSignals', /deriveTrendingTerms\(rawSignals/.test(memo));
ok('trendingResult memo deps: seedQuery is only a boolean gate, no query text in the pool', /\}, \[seedQuery, selectedDomains, rawSignals\]\)/.test(memo));
ok('static DOMAIN_PRECURSORS list is deleted from the module', !/const DOMAIN_PRECURSORS = \{/.test(src));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
