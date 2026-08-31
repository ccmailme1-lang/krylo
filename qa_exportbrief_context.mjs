// qa_exportbrief_context.mjs — KRYL-1239.
// The Export Brief / P4 Action Matrix must render the SAME canonical subject the
// Target Packet resolves (subjectScope over the query context), never a fresh parse
// of the raw query string. This checks the shared seam (briefcontext.js) and its
// consistency with the packet's resolver, over the three recorded regression
// fixtures: Lockheed pitch -> LOCKHEED MARTIN, Microsoft pitch -> MICROSOFT, Oriole
// deal blob -> (unresolved; KRYL-1237 territory — must stay consistent, not wrong).
//
// Run: node qa_exportbrief_context.mjs

import { canonicalBriefSubject, cleanLens, synthesisIsDomainAnchored } from './src/engine/briefcontext.js';
import { subjectScope } from './src/engine/subjectscope.js';
import { buildQueryContext } from './src/engine/querycontext.js';
import { synthesizeQuery } from './src/engine/querysynthesis.js';
import { readFileSync } from 'node:fs';

let pass = 0, fail = 0;
const ok = (l, c) => { if (c) { pass++; console.log(`  ✓ ${l}`); } else { fail++; console.log(`  ✗ ${l}`); } };

const mkSession = (query, lens = 'GENERAL') => ({
  query, lens, tensor: {}, queryContext: buildQueryContext(query),
});

// ── Fixtures ────────────────────────────────────────────────────────────────
const LOCKHEED = mkSession(
  'Is it worth adding to my Lockheed Martin position now? The defense prime has run ' +
  '3x the sector on revenue growth and the FY budget outlook looks strong, but the ' +
  'valuation is stretched at 18x forward earnings.');
const MICROSOFT = mkSession(
  'Elevator Pitch: AI chips have grown far more powerful. Our platform runs on top ' +
  'of Microsoft Azure and delivers low-latency inference at the edge for enterprise ' +
  'customers. Raising a seed round now.');
const ORIOLE = mkSession(
  'Oriole Networks is raising a $120M Series B at $305M pre-money led by Engine ' +
  'Ventures and Carbon Direct Capital, with AMD participation. PRISM photonic AI ' +
  'networking, commercialization stage.');
const ANDURIL = mkSession('Is Anduril a good acquisition target?');

// ── 1. Canonical subject matches the packet's resolver exactly ───────────────
for (const [name, s, expect] of [
  ['Lockheed pitch',  LOCKHEED,  'LOCKHEED MARTIN'],
  ['Microsoft pitch', MICROSOFT, 'MICROSOFT'],
]) {
  const brief  = canonicalBriefSubject(s);
  const packet = subjectScope(s.queryContext);
  ok(`${name}: brief subject = "${expect}"`, brief.label === expect && brief.resolved === true);
  ok(`${name}: brief subject === packet subject (no divergence)`,
     packet.kind === 'ENTITY' && brief.label === packet.entity.name);
  ok(`${name}: brief subject is NOT the raw query string`,
     brief.label !== s.query && !brief.label.startsWith('VECTOR') && !brief.label.startsWith('Elevator'));
}

// ── 2. Oriole — now resolved as NAMED_UNVERIFIED (KRYL-1237); brief must agree ─
{
  const brief  = canonicalBriefSubject(ORIOLE);
  const packet = subjectScope(ORIOLE.queryContext);
  ok('Oriole: packet resolves it NAMED_UNVERIFIED (KRYL-1237)',
     packet.kind === 'ENTITY' && packet.verification === 'NAMED_UNVERIFIED');
  ok('Oriole: brief subject === packet subject (no divergence)',
     brief.label === packet.entity.name && brief.label === 'Oriole Networks');
  ok('Oriole: brief subject is NOT the raw submission text',
     !brief.label.startsWith('Deal Submission') && brief.label.length < 40);
}

// ── 3. cleanLens rejects raw-query pseudo-lenses, keeps real tokens ──────────
ok('cleanLens rejects multi-word pseudo-lens', cleanLens('REVENUE GROWTH SERIAL FOUNDER INVESTING AGAIN') === null);
ok('cleanLens rejects GENERAL / OPEN', cleanLens('GENERAL') === null && cleanLens('OPEN') === null);
ok('cleanLens keeps a real single-token lens', cleanLens('EA') === 'EA' && cleanLens('INVESTOR') === 'INVESTOR');

// ── 4. synthesisIsDomainAnchored: open-lens fallback vs real domain ─────────
const genSynth = synthesizeQuery(mkSession('3X revenue growth, serial founder investing again, building a supply chain platform, raising a Series A'));
ok('an open-lens query → synthGeneral emits openLensFallback:true (disclosure label)', genSynth?.openLensFallback === true);
const lkSynth = synthesizeQuery(LOCKHEED);
ok('synthesisIsDomainAnchored(Lockheed pitch) === false → brief guard fires', synthesisIsDomainAnchored(lkSynth) === false);

const anSynth = synthesizeQuery(ANDURIL);
ok('Anduril synthesis resolves a real domain', typeof anSynth?.queryDomain === 'string' && !['GENERAL', 'AMBIGUOUS'].includes(anSynth.queryDomain));
ok('synthesisIsDomainAnchored(Anduril) === true → normal brief path', synthesisIsDomainAnchored(anSynth) === true);
ok('Anduril: brief subject === packet canonical name on the normal path too',
   canonicalBriefSubject(ANDURIL).label === subjectScope(ANDURIL.queryContext).entity.name);

// ── 5. Both consumer surfaces actually read the seam ────────────────────────
const ib = readFileSync(new URL('./src/components/analysis/intelligencebrief.jsx', import.meta.url), 'utf8');
const am = readFileSync(new URL('./src/components/analysis/actionmatrix.jsx', import.meta.url), 'utf8');
ok('intelligencebrief.jsx imports the seam', /from '\.\.\/\.\.\/engine\/briefcontext\.js'/.test(ib));
ok('intelligencebrief.jsx buildBrief no longer takes subject from getDisplayEntity(session.query)',
   !/const entity\s*=\s*getDisplayEntity\(session\?\.query/.test(ib.slice(ib.indexOf('function buildBrief'), ib.indexOf('function buildBrief') + 900)));
ok('actionmatrix.jsx imports the seam', /from '\.\.\/\.\.\/engine\/briefcontext\.js'/.test(am));
ok('actionmatrix.jsx targetLabel no longer parses the raw query', !/getDisplayEntity\(session\?\.query/.test(am));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
