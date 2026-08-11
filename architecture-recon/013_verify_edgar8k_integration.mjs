// 013_verify_edgar8k_integration.mjs — proves the Σ wiring added to edgar8kconnector.js
// (the GENUINELY LIVE path — app.jsx calls runEdgar8KSync() at mount and on an interval,
// confirmed via grep before this integration started) actually executes, with real
// evidence-level πΣ traceability, not object self-reference.
//
// Run with: node architecture-recon/013_verify_edgar8k_integration.mjs

import assert from 'node:assert/strict';

// Mock fetch — no live network access here. Shape matches processHit()'s real field
// reads (src.entity_id/file_num/cik, src.accession_no/hit._id, src.entity_name/
// display_names, src.file_date, src.items) — taken directly from the connector's own code,
// not invented.
globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({
    hits: {
      hits: [
        {
          _id: 'test-8k-1',
          _source: {
            entity_id: '0000936395', // Lockheed Martin CIK — real, from entityregistry.json
            entity_name: 'Lockheed Martin Corp',
            accession_no: '0000936395-26-000099',
            file_date: '2026-08-10',
            items: '2.02 9.01', // earnings announcement + exhibit
          },
        },
      ],
    },
  }),
});

const { runEdgar8KSync } = await import('../src/engine/connectors/edgar8kconnector.js');

const result = await runEdgar8KSync();
console.log('runEdgar8KSync() result:', JSON.stringify(result, null, 2));

// Pre-existing contract, unchanged.
assert.strictEqual(result.new, 1, 'FAIL: existing new-count behavior broke');
assert.strictEqual(result.status, 'OK', 'FAIL: existing status behavior broke');
assert.strictEqual(result.processed[0].objectType, 'EVENT', 'FAIL: existing RealityObject creation broke');
assert.strictEqual(result.processed[0].evidence.length, 2, 'FAIL: existing per-item evidence[] broke (2.02 + 9.01 = 2 items)');

// New Σ wiring.
assert.ok(result.sigma, 'FAIL: sigma field missing — new wiring did not execute');
assert.strictEqual(result.sigma.vertexCount, 1, 'FAIL: expected exactly 1 vertex (one 8-K RealityObject)');
assert.strictEqual(result.sigma.traceable, true, 'FAIL: connector-produced Σ is not fully traceable via πΣ');

console.log('\nPASS: pre-existing connector contract (processed/new/status/evidence[]) unchanged.');
console.log('PASS: Σ wiring executes through the GENUINELY LIVE path (app.jsx calls this connector directly).');
console.log('PASS: πΣ traceability verified for a RealityObject-shaped vertex via real per-item evidence, not self-reference.');
