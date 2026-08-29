// qa_querycontext.mjs — KRYL-1221 Phase 1 proof.
// The QueryContext is an INTAKE ARTIFACT: it normalizes the submitted query and
// nothing more. It must be deterministic, deep-frozen, honest about absence, and
// must never carry a Truth-Engine field.
// Run: node qa_querycontext.mjs

import { buildQueryContext, QUERY_CONTEXT_VERSION } from './src/engine/querycontext.js';

let pass = 0, fail = 0;
const ok  = (label, cond) => { if (cond) { pass++; console.log(`  ✓ ${label}`); } else { fail++; console.log(`  ✗ ${label}`); } };
const eq  = (label, got, want) => ok(`${label} — got ${JSON.stringify(got)}`, JSON.stringify(got) === JSON.stringify(want));

// ── (a) a fully-specified CRE purchase query ────────────────────────────────
{
  const q = 'Should we purchase a commercial building for $2.5 million';
  const c = buildQueryContext(q, { now: 1000 });
  ok('(a) geo is absent (no ambiguity token)', c.geo.state === 'absent');
  ok('(a) unresolved contains "geo"', c.unresolved.includes('geo'));
  eq('(a) assetClass resolves to COMMERCIAL_REAL_ESTATE', c.assetClass.value, 'COMMERCIAL_REAL_ESTATE');
  ok('(a) decisionCues contains "purchase"', c.decisionCues.includes('purchase'));
  ok('(a) numbers contains 2500000', c.numbers.includes(2500000));
  ok('(a) context is deep-frozen', Object.isFrozen(c) && Object.isFrozen(c.intent) && Object.isFrozen(c.numbers) && Object.isFrozen(c.provenance));
  ok('(a) provenance.source === intake', c.provenance.source === 'intake');
  ok('(a) provenance.parserVersion pinned', c.provenance.parserVersion === QUERY_CONTEXT_VERSION);
}

// ── (b) spelled-scale currency ─────────────────────────────────────────────
{
  const c = buildQueryContext('acquire the portfolio company for $2.5 million', { now: 1 });
  eq('(b) "$2.5 million" → [2500000]', c.numbers, [2500000]);
}

// ── (c) bare directional query — every optional field absent, intent present ─
{
  const c = buildQueryContext('what is happening in capital markets', { now: 1 });
  ok('(c) intent present', !!c.intent && typeof c.intent.verb === 'string');
  ok('(c) assetClass absent', c.assetClass.state === 'absent');
  ok('(c) geo absent', c.geo.state === 'absent');
  eq('(c) numbers empty', c.numbers, []);
  eq('(c) decisionCues empty', c.decisionCues, []);
  ok('(c) unresolved lists geo+numbers+assetClass+decisionCues',
     ['geo', 'numbers', 'assetClass', 'decisionCues'].every(k => c.unresolved.includes(k)));
  ok('(c) no engine fields leaked', !('queryDomain' in c) && !('formation' in c) && !('convergence' in c));
}

// ── (d) determinism — same input + fixed now → deep-equal ──────────────────
{
  const q = 'should we lease 40,000 sq ft of office space for $80,000/mo';
  const a = buildQueryContext(q, { now: 12345 });
  const b = buildQueryContext(q, { now: 12345 });
  eq('(d) two builds are byte-identical', a, b);
  const c2 = buildQueryContext(q, { now: 99999 });
  ok('(d) id is a function of query text alone (now does not change it)', a.id === c2.id);
  ok('(d) only parsedAt varies with now', a.provenance.parsedAt !== c2.provenance.parsedAt);
}

// ── (e) engine-field boundary guard ───────────────────────────────────────
{
  let threw = false;
  try {
    // reach the private guard by simulating a leak: monkey-inspect is not exported,
    // so instead assert the built object can never contain a banned key.
    const c = buildQueryContext('acquire company', { now: 1 });
    const json = JSON.stringify(c);
    threw = !/"(queryDomain|signalCount|magnitude|evidence|formation|formationId|convergence|convergenceState|polarity|storyType|story)"\s*:/.test(json);
  } catch { threw = false; }
  ok('(e) built context contains zero Truth-Engine keys', threw);
}

// ── (f) non-string input is tolerated ─────────────────────────────────────
{
  const c = buildQueryContext(undefined, { now: 1 });
  ok('(f) undefined query → empty rawQuery, still frozen', c.rawQuery === '' && Object.isFrozen(c));
  eq('(f) undefined query → numbers empty', c.numbers, []);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
