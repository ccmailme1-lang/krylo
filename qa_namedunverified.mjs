// qa_namedunverified.mjs — KRYL-1237.
// A submission that EXPLICITLY names its subject company resolves to that company
// (kind ENTITY, verification NAMED_UNVERIFIED) with NO identifiers — so A(d, Subject)
// runs and every domain is stated absence, and no pitch claim can become evidence.
// An investor/context name never promotes; two named subjects → stays DECISION_FRAME;
// a clue-only decision frame (KRYL-1238) is untouched.
//
// Run: node qa_namedunverified.mjs

import { subjectScope, isScopable, extractDealFrame } from './src/engine/subjectscope.js';
import { A, allDomains } from './src/engine/adsubject.js';
import { buildQueryContext } from './src/engine/querycontext.js';

let pass = 0, fail = 0;
const ok = (l, c) => { if (c) { pass++; console.log(`  ✓ ${l}`); } else { fail++; console.log(`  ✗ ${l}`); } };
const scope = q => subjectScope(buildQueryContext(q));

// ── Canonical fixture — Oriole Networks deal submission ──────────────────────
const ORIOLE = `Deal Submission — Oriole Networks

Oriole Networks is raising a $120M Series B at a $305M pre-money valuation, led by
Engine Ventures and Carbon Direct Capital, with participation from AMD. The company
is building PRISM, a photonic AI networking fabric that removes the interconnect
bottleneck in large training clusters. A $4-5M deployment is funded by ARIA. The
company is at commercialization stage with a customer pipeline of three hyperscalers.
Key risks: photonics supply chain, foundry capacity.

Why Invest: AI training clusters are interconnect-bound and Oriole's approach is 5x
more power efficient.`;

const s = scope(ORIOLE);
ok('Oriole → kind ENTITY', s.kind === 'ENTITY');
ok('Oriole → verification NAMED_UNVERIFIED', s.verification === 'NAMED_UNVERIFIED');
ok('Oriole → canonicalId oriole-networks', s.canonicalId === 'oriole-networks');
ok('Oriole → entity.name "Oriole Networks"', s.entity?.name === 'Oriole Networks');
ok('Oriole → NO identifiers (evidence boundary)', JSON.stringify(s.entity?.identifiers) === '{}');
ok('Oriole → NO domain tags', Array.isArray(s.entity?.domainTags) && s.entity.domainTags.length === 0);
ok('Oriole → isScopable (A runs)', isScopable(s) === true);

// deal frame — context only
ok('Oriole → dealFrame.stage "Series B"', s.dealFrame?.stage === 'Series B');
ok('Oriole → dealFrame.round 120M', s.dealFrame?.round === 120_000_000);
ok('Oriole → dealFrame.preMoney 305M', s.dealFrame?.preMoney === 305_000_000);

// ── A(d, Subject): scoped, but every domain is stated absence ────────────────
const cap = A('CAPITAL', s);
ok('A(CAPITAL) scoped === true', cap.scoped === true);
ok('A(CAPITAL) observations === [] (nothing binds without an identifier)', Array.isArray(cap.observations) && cap.observations.length === 0);
ok('A(CAPITAL) every measure is classified absence (no FACET)', Object.values(cap.measures).every(m => m.status !== 'FACET'));
ok('A(CAPITAL) absence is set', cap.absence != null && cap.absence.absenceClass === 'structural');
ok('allDomains → all six scoped, none with observations', allDomains(s).every(([, a]) => a.scoped === true && a.observations.length === 0));

// ── Investor / context names never promote ──────────────────────────────────
ok('"led by Engine Ventures" alone does not resolve a subject',
   scope('We are considering an investment. The round is led by Engine Ventures and Sequoia Capital.').kind !== 'ENTITY');
ok('"ex-Neuralink" is context, not a subject (stays DECISION_FRAME)',
   scope('Should I invest in a healthtech company, Series D, founded by an ex-Neuralink engineer').kind === 'DECISION_FRAME');

// ── Two explicitly named subjects → no silent pick ──────────────────────────
{
  const two = scope('Deal memo: Northwind Systems is raising a seed round. Separately, Cobalt Labs is a robotics startup also raising.');
  ok('two named subjects → stays DECISION_FRAME', two.kind === 'DECISION_FRAME');
  ok('two named subjects → reason names the ambiguity', /multiple named subjects/i.test(two.reason || ''));
}

// ── Registry regression — verified entities unchanged ───────────────────────
for (const [q, expect] of [
  ['Is Anduril a good acquisition target?', 'anduril-industries'],
  ['Should I add to my Lockheed Martin position given the FY defense budget and 3x sector revenue growth?', 'lockheed-martin'],
]) {
  const r = scope(q);
  ok(`registry hit "${expect}" → verification REGISTRY`, r.kind === 'ENTITY' && r.verification === 'REGISTRY' && r.canonicalId === expect);
}

// ── extractDealFrame is pure / honest-null ──────────────────────────────────
ok('extractDealFrame("no money here") → null', extractDealFrame('just a sentence with no figures') === null);

// ── DECISION_FRAME still carries a dealFrame when numbers are present ────────
{
  const df = scope('Should we invest $2M in a seed round this quarter?');
  ok('plain decision frame with a figure → dealFrame present', df.kind === 'DECISION_FRAME' && df.dealFrame?.round === 2_000_000);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
