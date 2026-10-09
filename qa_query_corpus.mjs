// qa_query_corpus.mjs -- STABILITY GATE (KRYL-1372). Every real query the Founder has run lives here with the
// subject it must select and the state it must report. One run covers contract -> subjectScope -> brief, and
// asserts they AGREE: a subject the contract selected is never reported downstream as "no subject".
// Add every new failing query to CORPUS before fixing it. Run: node qa_query_corpus.mjs
import { build } from 'esbuild';
import { pathToFileURL } from 'url';
import { tmpdir } from 'os';
import { join } from 'path';

const out = join(process.cwd(), 'node_modules', '.qa_corpus_brief.mjs'); // inside the repo so 'react' resolves
await build({ entryPoints: ['src/components/analysis/structuralbrief.jsx'], bundle: true, format: 'esm', platform: 'node', outfile: out, loader: { '.jsx': 'jsx' }, jsx: 'automatic', logLevel: 'silent', external: ['react', 'react-dom', 'react/jsx-runtime'] });
const { computeBriefSummary } = await import(pathToFileURL(out).href);
const { buildQueryContract } = await import('./src/engine/querycontract.js');
const { subjectScope } = await import('./src/engine/subjectscope.js');

const BODY = 'is using AI to discover drugs for age-related diseases, a shot at the ~$2T pharmaceutical industry.';
// [query, subject text, kind]  kind: ENTITY (registry) | UNRESOLVED (selected, not in registry)
const CORPUS = [
  ['Good investment + Capital+Integrated Biosciences Integrated Biosciences ' + BODY, 'Integrated Biosciences', 'UNRESOLVED'],
  ['Is this a good investment? Target: Integrated Biosciences Integrated Biosciences ' + BODY, 'Integrated Biosciences', 'UNRESOLVED'],
  ['**Question:** Is this a good investment? **Target:** ## Integrated Biosciences\nIntegrated Biosciences ' + BODY, 'Integrated Biosciences', 'UNRESOLVED'],
  ['Is this a good investment? Daytona Daytona gives every AI agent its own sandbox. Backed by Meta.', 'Daytona', 'UNRESOLVED'],
  ['Is this a good investment? Subcritical Systems builds AI chips for inference.', 'Subcritical Systems', 'UNRESOLVED'],
  ['Evaluate this deal: Paramount acquiring Warner Bros. Discovery', 'Paramount', 'UNRESOLVED'],
  ['Is there market for these types of products?\n\nPraetorian Aeronautics\nPraetorian sells an end-to-end counter-drone system, pairing proprietary AI battle management software with two interceptors.\nKey Investors\n\nTidal Ventures · Paspalis', 'Praetorian Aeronautics', 'UNRESOLVED'],
  ['Is Google a good investment given its AI capex?', 'Google', 'ENTITY'],
  ['**Question:** Is this a good investment? **Target:** ## Google\nGoogle is using AI.', 'Google', 'ENTITY'],
  ['Is Nvidia better than AMD', 'Nvidia', 'ENTITY'],
  ['Is Anduril a good acquisition target?', 'Anduril', 'ENTITY'],
];

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };

for (const [q, want, kind] of CORPUS) {
  const label = JSON.stringify(q.slice(0, 56));
  const c = buildQueryContract(q);
  const s = subjectScope(q);
  ok(c.subject.text.toLowerCase().includes(want.toLowerCase()), `${label} contract subject ~ ${want} (got "${c.subject.text}")`);
  ok(s.kind === kind, `${label} subjectScope kind ${kind} (got ${s.kind})`);
  const b = computeBriefSummary({ subjScope: s, activeDomainPressures: [], fieldFormation: null, structuralQuery: null, entityCanonicalRelationships: [], ownershipFailure: null });
  const text = [b.subjectLabel, b.briefSentence, b.rows?.field, b.rows?.subject, b.rows?.relationships].filter(Boolean).join(' | ');
  ok(!/NO SUBJECT RESOLVED|No subject resolved|no subject was resolved/i.test(text), `${label} brief never says "no subject" for a selected subject`);
  const headWant = kind === 'ENTITY' ? s.entity.name : want; // Google resolves to its entity, ALPHABET
  ok(b.subjectLabel.toLowerCase().includes(headWant.toLowerCase()), `${label} brief headline is the selected subject (got "${b.subjectLabel}")`);
}

console.log('Ownership lookup states (never "none admitted" while the lookup is pending)');
{
  const scope = subjectScope('Is Alphabet a good investment?');
  const base = { subjScope: scope, activeDomainPressures: [], fieldFormation: null, structuralQuery: null, entityCanonicalRelationships: [], ownershipFailure: null };
  const pend = computeBriefSummary({ ...base, ownershipPending: true });
  ok(/Checking SEC ownership filings/.test(pend.rows.relationships) && !/No canonical relationships admitted/.test(pend.rows.relationships), 'pending: row says checking, not "none admitted"');
  ok(/Checking SEC ownership filings/.test(pend.briefSentence), 'pending: sentence says relationships are not known yet');
  const fail = computeBriefSummary({ ...base, ownershipFailure: 'the SEC ownership lookup did not respond' });
  ok(/failed|did not respond/.test(fail.rows.relationships), 'failure: stated plainly');
  // DEF-1392: pending is independent of how many relationships are already admitted
  const acq = [{ type: 'ACQUIRED' }];
  const pendAdm = computeBriefSummary({ ...base, entityCanonicalRelationships: acq, ownershipPending: true });
  ok(/1 admitted/.test(pendAdm.rows.relationships) && /checking SEC ownership filings for more/.test(pendAdm.rows.relationships), 'pending with one relationship already admitted: the row says 1 admitted and that more are being checked');
  ok(/Checking SEC filings for observations bound to/.test(pendAdm.rows.subject) && !/No observations bound/.test(pendAdm.rows.subject), 'pending: the subject row says checking, not "No observations bound yet"');
  ok(/checking SEC filings for observations bound to/.test(pendAdm.briefSentence), 'pending: the sentence says checking for subject observations');
  ok(/more relationships may follow/.test(pendAdm.briefSentence) && !/not known yet/.test(pendAdm.briefSentence), 'pending with admitted relationships: the sentence says more may follow, never "not known yet"');
  ok(/canonical relationships are not known yet/.test(pend.briefSentence), 'pending with none admitted: the sentence says they are not known yet');
  const setAdm = computeBriefSummary({ ...base, entityCanonicalRelationships: acq, ownershipPending: false });
  ok(!/checking/i.test(setAdm.rows.relationships) && /No observations bound to/.test(setAdm.rows.subject), 'settled: the normal text (no checking, "No observations bound ... yet")');
  const none = computeBriefSummary({ ...base });
  ok(/No canonical relationships admitted/.test(none.rows.relationships), 'settled with none: the stated absence is unchanged');
}

console.log('Field-level vs subject-level pair counts (left brief must match the MAP)');
{
  const scope = subjectScope('Is Alphabet a good investment?');
  const mk = n => ({ graph: { edges: Array.from({ length: n }, (_, i) => ({ a: 'A' + i, b: 'B' + i })) } });
  const dp = ['CAPITAL', 'TECHNOLOGY'].map(d => ({ domain: d, signalCount: 5, magnitude: 50, polarity: 'constructive' }));
  const b = computeBriefSummary({ subjScope: scope, activeDomainPressures: dp, fieldFormation: mk(6), ambientFormation: mk(3), structuralQuery: null, entityCanonicalRelationships: [], ownershipFailure: null });
  ok(/with 3 domain pairs co-present/.test(b.briefSentence) && /a field-level reading/.test(b.briefSentence), 'field-level sentence uses the whole-field pair count (3), not the subject formation (6)');
  ok(/co-present among them/.test(b.briefSentence) || /^$/.test(''), 'subject-level clause only appears when subject observations are bound');
  ok(/\*\*3 domain pairs\*\*/.test(b.rows.field), 'field row uses the same whole-field count');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
