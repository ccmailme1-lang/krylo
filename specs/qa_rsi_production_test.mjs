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
  // Round 2 (2026-09-29) -- 29 more questions, run with ZERO implementation changes, purely
  // diagnostic. Grouped as given.
  { section: '8. Supplier / Distributor', n: 18, q: 'Where are supplier and distributor relationships becoming more concentrated in U.S. foodservice?' },
  { section: '8. Supplier / Distributor', n: 19, q: 'Which distributors are expanding their physical distribution footprint, and what suppliers or customers are connected to those changes?' },
  { section: '8. Supplier / Distributor', n: 20, q: 'What acquisitions are changing the relationship between foodservice suppliers and distributors?' },
  { section: '8. Supplier / Distributor', n: 21, q: 'Where are distributors changing how restaurants receive food, supplies, or other products?' },
  { section: '9. Facility / Location', n: 22, q: 'Where are new foodservice distribution facilities being added, and which companies are connected to those locations?' },
  { section: '9. Facility / Location', n: 23, q: 'What relationships exist between distribution facilities and the markets they serve?' },
  { section: '9. Facility / Location', n: 24, q: 'Where are distribution networks expanding into new geographic markets?' },
  { section: '9. Facility / Location', n: 25, q: 'What companies are connecting distribution facilities to restaurant customers across different markets?' },
  { section: '10. Supplier / Company', n: 26, q: 'Which restaurant companies are changing their supplier relationships, and what suppliers are involved?' },
  { section: '10. Supplier / Company', n: 27, q: 'Where are restaurant companies becoming more dependent on particular suppliers or distribution channels?' },
  { section: '10. Supplier / Company', n: 28, q: 'What changes are occurring between major restaurant companies and their foodservice suppliers?' },
  { section: '11. Logistics / Facility', n: 29, q: 'What logistics relationships are changing around restaurant distribution facilities?' },
  { section: '11. Logistics / Facility', n: 30, q: 'Where are logistics providers becoming more connected to foodservice distribution networks?' },
  { section: '11. Logistics / Facility', n: 31, q: 'What changes in transportation or warehouse operations are altering relationships across restaurant supply chains?' },
  { section: '12. Technology / Facility', n: 32, q: 'Where is supply-chain technology changing relationships between distribution facilities and restaurant companies?' },
  { section: '12. Technology / Facility', n: 33, q: 'What technology providers are becoming connected to restaurant distribution operations?' },
  { section: '12. Technology / Facility', n: 34, q: 'Where are automation systems changing the relationships among warehouses, distributors, and restaurant operators?' },
  { section: '13. Company / Location / Market', n: 35, q: 'Which restaurant companies are expanding into markets where their existing supplier or distribution relationships may change?' },
  { section: '13. Company / Location / Market', n: 36, q: 'Where are changes in restaurant locations creating new supplier or distribution relationships?' },
  { section: '13. Company / Location / Market', n: 37, q: 'What relationships between companies, locations, and markets are changing across the restaurant supply chain?' },
  { section: '14. Ownership / Capital', n: 38, q: 'What ownership changes are creating new relationships among foodservice suppliers, distributors, and restaurant companies?' },
  { section: '14. Ownership / Capital', n: 39, q: 'Where is investment changing the structure of foodservice distribution?' },
  { section: '14. Ownership / Capital', n: 40, q: 'What acquisitions are connecting previously separate suppliers, distributors, facilities, or restaurant companies?' },
  { section: '15. Cross-Structure', n: 41, q: 'What structural relationships connect suppliers, distributors, facilities, logistics providers, companies, and markets across U.S. foodservice?' },
  { section: '15. Cross-Structure', n: 42, q: 'Where are multiple relationships changing at the same time across the restaurant supply network?' },
  { section: '15. Cross-Structure', n: 43, q: 'Which entities sit at the intersection of supplier, distributor, facility, and restaurant relationships?' },
  { section: '15. Cross-Structure', n: 44, q: 'Where is a change at one point in the restaurant supply network creating connections to other companies, facilities, or markets?' },
  { section: '15. Cross-Structure', n: 45, q: "What structural relationships could affect RSI's suppliers, distributors, member restaurants, facilities, and partners?" },
  { section: '16. Especially Important Test', n: 46, q: 'A distributor acquires another foodservice distributor. What other companies, facilities, suppliers, customers, and markets are connected to that change?' },
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

fs.writeFileSync('./specs/rsi-production-test-raw.json', JSON.stringify(results, null, 2));
console.log('\nWrote specs/rsi-production-test-raw.json');
