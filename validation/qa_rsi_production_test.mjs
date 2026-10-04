// __qa_rsi_run.mjs — RSI production test, 17 real questions against the actual live pipeline.
// Same invocation pattern as qa_intelligencebrief.mjs: synthesizeQuery() imported directly (plain
// JS, no DOM dep), buildBrief() pulled from intelligencebrief.jsx via a throwaway esbuild bundle
// (JSX can't be imported by plain Node). Real substrate throughout -- no mocked synthesis objects.
//   node __qa_rsi_run.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';
import { synthesizeQuery } from '../src/engine/querysynthesis.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(ROOT, '__qa_rsi_entry.mjs');
const BUNDLE = path.join(ROOT, '__qa_rsi_bundle.mjs');
fs.writeFileSync(ENTRY, `export { buildBrief } from './src/components/analysis/intelligencebrief.jsx';\n`);
await esbuild.build({
  entryPoints: [ENTRY], bundle: true, platform: 'node', format: 'esm', jsx: 'automatic',
  outfile: BUNDLE, external: ['react', 'react-dom'], logLevel: 'silent',
});
const { buildBrief } = await import(`${pathToFileURL(BUNDLE).href}?t=${Date.now()}`);
fs.unlinkSync(ENTRY);
fs.unlinkSync(BUNDLE);

const QUESTIONS = [
  { section: '1. Supplier / Vendor', n: 1, q: 'What structural relationships are emerging between restaurant suppliers, distributors, and technology providers that could affect RSI?' },
  { section: '1. Supplier / Vendor', n: 2, q: 'Where are supplier dependencies becoming more concentrated, and what entities are connected to those changes?' },
  { section: '1. Supplier / Vendor', n: 3, q: 'What relationships between suppliers and distributors appear to be changing?' },
  { section: '2. Facility / Distribution', n: 4, q: "What structural changes are occurring across distribution facilities that could affect RSI's supply network?" },
  { section: '2. Facility / Distribution', n: 5, q: 'Where are facility, logistics, and supplier relationships becoming more interconnected?' },
  { section: '2. Facility / Distribution', n: 6, q: 'What changes in distribution infrastructure could create new dependencies for member restaurants?' },
  { section: '3. Company / Market', n: 7, q: 'What relationships between major suppliers, distributors, and restaurant companies are changing?' },
  { section: '3. Company / Market', n: 8, q: 'Where are market conditions creating new relationships or disrupting existing ones across the restaurant supply chain?' },
  { section: '3. Company / Market', n: 9, q: 'What structural connections should RSI be watching across its supplier and distribution ecosystem?' },
  { section: '4. Technology / Operations', n: 10, q: 'How are automation and supply-chain technology changes altering relationships among facilities, suppliers, distributors, and restaurants?' },
  { section: '4. Technology / Operations', n: 11, q: 'What technology changes are creating new dependencies in restaurant distribution?' },
  { section: '4. Technology / Operations', n: 12, q: 'Where is technology changing the structure of the supply network rather than simply improving an existing process?' },
  { section: '5. Capital / Ownership', n: 13, q: 'What ownership or investment changes could alter relationships among suppliers, distributors, and restaurant companies?' },
  { section: '5. Capital / Ownership', n: 14, q: 'Where is capital moving in ways that could change the structure of the restaurant supply chain?' },
  { section: '5. Capital / Ownership', n: 15, q: 'What acquisitions or ownership changes are creating new connections across the ecosystem?' },
  { section: '6. Broad / End-to-End', n: 16, q: "What structural relationships across suppliers, distributors, facilities, companies, locations, and markets could affect RSI's supply network over the next several years?" },
  { section: '7. Critical Test', n: 17, q: 'There is friction in the finance market. Where is that friction occurring, what entities are connected to it, and how could it affect suppliers, distributors, partners, competitors, facilities, companies, locations, and markets?' },
];

const results = [];
for (const item of QUESTIONS) {
  const session = { query: item.q, lens: null, tensor: { domainLock: null, fields: {} } };
  let synthesis, brief, error = null;
  try {
    synthesis = synthesizeQuery(session);
  } catch (e) {
    error = `synthesizeQuery threw: ${e.stack ?? e.message}`;
  }
  if (!error) {
    try {
      brief = buildBrief(session, synthesis);
    } catch (e) {
      error = `buildBrief threw: ${e.stack ?? e.message}`;
    }
  }
  results.push({ ...item, synthesis, brief, error });
  console.log(`[${item.n}/17] ${error ? 'ERROR' : (synthesis?.mode ?? synthesis?.queryDomain ?? 'no-mode')}`);
}

fs.writeFileSync('./validation/rsi-production-test-raw.json', JSON.stringify(results, null, 2));
console.log('\nWrote validation/rsi-production-test-raw.json');
