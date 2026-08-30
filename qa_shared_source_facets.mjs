// qa_shared_source_facets.mjs — WO-2.
// The shared-source distinct-facet AC (SPEC-domain-substrate-integration-contract.md):
// one source may feed multiple domains, but each domain must receive a genuinely
// distinct facet — never the same number relabeled.
//
// Enforcement here: NO connector dispatch may carry `domain: [array]`. A legitimate
// multi-domain observation must be split into separate dispatch objects, each with
// its own computed `signal`/`confidence` (a distinct facet). An array dispatch is
// the identical-payload relabel the AC forbids.
// Run: node qa_shared_source_facets.mjs

import { readdirSync, readFileSync } from 'fs';

const DIR = './src/engine/connectors';
let pass = 0, fail = 0;
const ok = (label, cond) => { if (cond) { pass++; console.log(`  ✓ ${label}`); } else { fail++; console.log(`  ✗ ${label}`); } };

const files = readdirSync(DIR).filter(f => f.endsWith('.js'));
const offenders = [];

for (const f of files) {
  const src = readFileSync(`${DIR}/${f}`, 'utf8');
  // strip line + block comments so a documented "was domain: [...]" note doesn't trip it
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  // domain: [ 'X', 'Y' ] — an array literal as the domain of a dispatch object
  const m = code.match(/\bdomain:\s*\[[^\]]*['"][^\]]*\]/g);
  if (m) offenders.push({ file: f, hits: m });
}

console.log('\nconnectors scanned:', files.length);
if (offenders.length) {
  console.log('array-domain dispatches found:');
  for (const o of offenders) console.log(`  ${o.file}: ${o.hits.join(' | ')}`);
}

ok('no connector dispatches domain: [array] (identical-payload relabel)', offenders.length === 0);

// Positive: the previously-fixed shared-source connectors now dispatch one domain each.
const check = (file, expectSingleDomains) => {
  const src = readFileSync(`${DIR}/${file}`, 'utf8');
  const doms = [...src.matchAll(/\bdomain:\s*'([A-Z_]+)'/g)].map(x => x[1]);
  const uniq = [...new Set(doms)];
  ok(`${file}: dispatches ${JSON.stringify(uniq)} (single-domain per object)`,
     uniq.length > 0 && uniq.every(d => expectSingleDomains.includes(d)));
};
check('fecconnector.js',          ['CAPITAL']);
check('patentsviewconnector.js',  ['TECHNOLOGY', 'KNOWLEDGE']);
check('censusconnector.js',       ['LABOR', 'OWNERSHIP']);
check('supplychainconnector.js',  ['LABOR']);

// Census: LABOR and OWNERSHIP must be DIFFERENT computations, not the same var.
{
  const src = readFileSync(`${DIR}/censusconnector.js`, 'utf8');
  // employment-rate signal vs income-based signal — two distinct `const signal = ...` sites
  const signalDefs = (src.match(/const signal\s*=/g) || []).length;
  ok('censusconnector: LABOR and OWNERSHIP each compute their own signal (>=2 signal defs)', signalDefs >= 2);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
