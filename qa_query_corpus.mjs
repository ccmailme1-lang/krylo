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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
