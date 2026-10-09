#!/usr/bin/env node
// Read-only live run of the KRYL-1386 comparison through the local engine proxies (no writes).
// Usage: node scripts/run-relationship-change.mjs <issuerCik> "<issuer name>" [T=YYYY-MM-DD]
import { runRelationshipChange } from '../src/engine/relationshipchangeservice.js';
const [cik, name, T] = process.argv.slice(2);
if (!cik || !name) { console.error('usage: run-relationship-change.mjs <issuerCik> "<issuer name>" [T]'); process.exit(2); }
const t0 = Date.now();
const out = await runRelationshipChange({ issuerCik: cik, issuerName: name, canonicalId: 'cli', T: T ?? new Date().toISOString().slice(0, 10), baseUrl: process.env.KRYLO_ENGINE ?? 'http://localhost:4000' });
console.log(JSON.stringify({ state: out.state, seconds: Math.round((Date.now() - t0) / 1000), error: out.error ?? null, coverage: out.retrieval?.coverage && { complete: out.retrieval.coverage.complete, requests: out.retrieval.coverage.requests, failedWindows: out.retrieval.coverage.failedWindows, failedDocs: out.retrieval.coverage.failedDocs, reasons: out.retrieval.coverage.reasons }, excluded: out.retrieval?.excluded?.length }, null, 1));
for (const r of out.result?.relationships ?? []) {
  console.log(`\n${r.holderName} | CUSIP ${r.cusip ?? '?'} | ${r.summary}`);
  console.log(`  existence: ${r.existence.state}${r.existence.reason ? ' (' + r.existence.reason + ')' : ''}  magnitude: ${r.magnitude.state}${r.magnitude.deltaPoints != null ? ' ' + r.magnitude.deltaPoints + ' pts' : ''}${r.magnitude.reason ? ' (' + r.magnitude.reason + ')' : ''}  configuration: ${r.configuration.state}${r.configuration.subtypes?.length ? ' [' + r.configuration.subtypes.join(',') + ']' : ''}${r.configuration.reason ? ' (' + r.configuration.reason + ')' : ''}`);
  console.log(`  as of E0 ${r.periods.E0}: ${r.evidence.asOfE0 ? `${r.evidence.asOfE0.percent}% ${r.evidence.asOfE0.accession} event ${r.evidence.asOfE0.eventDate}` : 'none'} | P1: ${r.evidence.inP1.map(e => `${e.percent}% ${e.accession} event ${e.eventDate}`).join('; ') || 'none'}`);
  console.log(`  rules: ${r.rules.join(', ')}`);
}
