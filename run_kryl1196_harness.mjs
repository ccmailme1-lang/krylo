// run_kryl1196_harness.mjs — KRYL-1196 Validation Harness
// Implements specs/SPEC-KRYL-1196-validation-harness-contract.md (v3) exactly.
// Frozen SEC evidence snapshot: 2024-07-23 to 2024-08-22. No company selection, no
// case-specific evidence scoping, no threshold tuning. Run: node run_kryl1196_harness.mjs
//
// This harness starts a minimal local proxy on :4000 for '/api/edgar' (mirroring
// as-diff/engine.js's handleEdgarProxy -> efts.sec.gov) SOLELY so the real, unmodified
// secownershipconnector.js can be called as-is (its fetch('/api/edgar...') is a
// relative URL, which only resolves through the dev-server proxy in production). No
// connector code is changed to make this run.

import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';

import { runSecOwnershipSync } from './src/engine/connectors/secownershipconnector.js';
import { realiseSnapshot } from './src/engine/gwrealiser.js';
import { buildStructure } from './src/engine/sigmaengine.js';
import { toRelationshipSet } from './src/engine/structuralinputadapter.js';
import { recognizeStructure, DETERMINATION } from './src/engine/structuralrecognition.js';
import { TYPED_EDGES } from './src/engine/entitytopologyregistry.js';
import { resolveByIdentifier } from './src/engine/entityresolution.js';

const SNAPSHOT_FROM = '2024-07-23';
const SNAPSHOT_TO   = '2024-08-22';

// ── minimal local proxy: /api/edgar -> efts.sec.gov (same target the real dev server uses) ──
function startEdgarProxy() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      const options = {
        hostname: 'efts.sec.gov', path: '/LATEST/search-index' + qs, method: 'GET',
        headers: { Accept: 'application/json', 'User-Agent': 'krylo-signal-engine/1.0' },
      };
      const upstream = https.request(options, (up) => {
        let body = '';
        up.on('data', (c) => (body += c));
        up.on('end', () => { res.writeHead(up.statusCode, { 'Content-Type': 'application/json' }); res.end(body); });
      });
      upstream.on('error', (err) => { res.writeHead(502); res.end(JSON.stringify({ error: err.message })); });
      upstream.end();
    });
    server.listen(4000, () => resolve(server));
  });
}

async function main() {
  const report = { snapshot: { from: SNAPSHOT_FROM, to: SNAPSHOT_TO }, steps: {}, cases: [] };

  console.log('=== 1. Starting local /api/edgar proxy (:4000) ===');
  const proxy = await startEdgarProxy();
  report.steps.proxy_started = true;

  // Node's fetch has no browser-style base URL, so the connector's relative
  // '/api/edgar' request needs a harness-level shim to reach the local proxy above.
  // This patches the harness's execution environment, not the connector's code.
  const realFetch = globalThis.fetch;
  globalThis.fetch = (url, opts) =>
    realFetch(typeof url === 'string' && url.startsWith('/') ? `http://localhost:4000${url}` : url, opts);

  console.log(`=== 2. Running the REAL, unmodified secownershipconnector against frozen window ${SNAPSHOT_FROM} -> ${SNAPSHOT_TO} ===`);
  const typedEdgesBefore = TYPED_EDGES.length;
  const syncResult = await runSecOwnershipSync({ from: SNAPSHOT_FROM, to: SNAPSHOT_TO });
  console.log('  raw sync result:', JSON.stringify(syncResult));
  const errorCount = Array.isArray(syncResult.errors) ? syncResult.errors.length : (syncResult.error ? 1 : 0);
  report.steps.sync_result = { registered: syncResult.registered, total: syncResult.total, error_count: errorCount, fetch_error: syncResult.error ?? null };
  const typedEdgesAfter = TYPED_EDGES.length;
  report.steps.typed_edges_added = typedEdgesAfter - typedEdgesBefore;
  console.log(`  TYPED_EDGES: ${typedEdgesBefore} -> ${typedEdgesAfter} (+${typedEdgesAfter - typedEdgesBefore})`);

  proxy.close();

  if (syncResult.registered === 0) {
    console.error('FATAL: frozen snapshot produced zero registered pairs. Aborting — not fabricating a result.');
    process.exit(1);
  }

  console.log('=== 3. Building the harness\'s OWN whole-graph Σ (no seedId — full snapshot, no company selection) ===');
  // Two distinct time dimensions, not to be conflated: EVIDENCE time (the SEC filing's
  // historical date, 2024-07-23..2024-08-22 -- already used correctly above, by the
  // connector, to retrieve the frozen evidence) vs REGISTRATION time (when KRYLO
  // ingested the relationship into TYPED_EDGES -- registerTypedEdge's validFrom
  // defaults to runtime/creation time, i.e. right now). This window is the RUNTIME
  // REGISTRATION SNAPSHOT of the frozen 2024 evidence universe, not itself "the frozen
  // evidence snapshot" -- those are two different things and must be labeled as such.
  const REGISTRATION_WINDOW = { start: 0, end: Date.now() + 1000 };
  const snapshot = realiseSnapshot({ window: REGISTRATION_WINDOW });
  console.log(`  snapshot: ${snapshot.vertices.size} vertices, ${snapshot.edges.length} edges`);
  const sigma = buildStructure({ sigmaId: `KRYL-1196-${Date.now()}`, snapshot }); // no seedId => whole snapshot as C
  console.log(`  Σ: ${sigma.vertices.length} vertices, ${sigma.edges.length} edges, traceable=${sigma.traceable}`);
  report.steps.sigma = { vertices: sigma.vertices.length, edges: sigma.edges.length, traceable: sigma.traceable };

  console.log('=== 3b. Reconciliation check (mandatory before interpreting any recognition output) ===');
  const registeredCount = syncResult.registered;
  const snapshotEdgeCount = snapshot.edges.length;
  const sigmaEdgeCount = sigma.edges.length;
  console.log(`  registered -> ${registeredCount} | in realiseSnapshot() -> ${snapshotEdgeCount} | in Σ -> ${sigmaEdgeCount} | traceable -> ${sigma.traceable}`);
  report.steps.reconciliation = { registered: registeredCount, snapshot_edges: snapshotEdgeCount, sigma_edges: sigmaEdgeCount, traceable: sigma.traceable };
  if (registeredCount !== snapshotEdgeCount || snapshotEdgeCount !== sigmaEdgeCount) {
    console.error(`FATAL: reconciliation failed (${registeredCount} -> ${snapshotEdgeCount} -> ${sigmaEdgeCount}). Stopping before interpreting any recognition output, per instruction.`);
    fs.writeFileSync(`specs/results/KRYL-1196-run-${Date.now()}-FAILED-RECONCILIATION.json`, JSON.stringify(report, null, 2));
    process.exit(1);
  }
  console.log('  RECONCILED — counts match end to end. Proceeding.');

  console.log('=== 4. Structural input adapter (whole-Σ provenance gate + identity + type admissibility) ===');
  const relationshipSet = toRelationshipSet(sigma);
  console.log(`  RelationshipSet: ${relationshipSet.length} admitted relationships`);
  report.steps.relationship_set_size = relationshipSet.length;

  console.log('=== 5. Structural recognition ===');
  let determination = null;
  if (relationshipSet.length > 0) {
    determination = recognizeStructure(relationshipSet);
    console.log('  determination:', determination.determination);
  } else {
    console.log('  RelationshipSet empty (traceable=false or all edges refused) — no determination computed.');
  }
  report.steps.determination = determination
    ? { determination: determination.determination, organization: determination.organization?.status, dependence: determination.dependence?.status }
    : null;

  console.log('=== 6. Per-case classification (KRYL-1193 matrix, unmodified) ===');
  const matrix = JSON.parse(fs.readFileSync('specs/SPEC-KRYL-1193-sector-validation-matrix.json', 'utf8'));
  const relSetHash = JSON.stringify(relationshipSet.map(r => r.id).sort());
  const sharedGroup = [];

  for (const c of matrix.test_cases) {
    let state, caseEvaluated = null;
    if (c.current_state === 'REQUIRES-SUBSTRATE') {
      state = 'SUBSTRATE_BLOCKED';
    } else if (!c.canonical_domains.map(d => d.toUpperCase()).includes('OWNERSHIP')) {
      state = 'RELATION_BLOCKED'; // no connection to this connector's evidence type, window-independent
    } else if (relationshipSet.length === 0) {
      state = sigma.traceable ? 'RELATION_BLOCKED' : 'PROVENANCE_BLOCKED';
    } else {
      state = 'CASE_EVALUATED';
      sharedGroup.push(c.case_id);
      // Independent per-case hypothesis check record -- NOT auto-computed pass/fail
      // (V1 stays human-adjudicated, per this ticket's own prior resolution). Each
      // case gets its own record referencing its own falsifiable_test text, never
      // copied from another case_id even though the determination is shared.
      caseEvaluated = {
        checked_against: c.falsifiable_test,
        determination: determination.determination,
        result: null, // pending human adjudication
      };
    }
    report.cases.push({
      case_id: c.case_id, sector: c.sector, state,
      case_evaluated: caseEvaluated,
      relationship_set_hash: state === 'CASE_EVALUATED' ? relSetHash : null,
    });
  }

  // Annotate SHARED_SCOPE after the fact -- observed condition, not decided in advance.
  for (const rec of report.cases) {
    if (rec.state === 'CASE_EVALUATED' && sharedGroup.length > 1) {
      rec.shared_scope_group = sharedGroup.filter(id => id !== rec.case_id);
    } else {
      rec.shared_scope_group = [];
    }
  }

  const outPath = `specs/results/KRYL-1196-run-${Date.now()}.json`;
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\n=== Report written: ${outPath} ===`);

  console.log('\n=== Summary ===');
  for (const rec of report.cases) {
    console.log(`  case ${rec.case_id} (${rec.sector}): ${rec.state}${rec.shared_scope_group.length ? ' [shared with ' + rec.shared_scope_group.join(',') + ']' : ''}`);
  }
}

main().catch((err) => { console.error('FATAL:', err); process.exit(1); });
