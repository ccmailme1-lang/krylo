// 011_verify_connector_integration.mjs — proves the Σ wiring added to
// secownershipconnector.js actually executes inside the real connector function, not just
// in isolation (010's test called sigmaengine.js directly; this calls the connector).
//
// Honest scope: runSecOwnershipSync() has ZERO callers anywhere in src/ (confirmed via
// grep before writing this). There is no live consumer to prove "existing KRYLO path"
// integration against — that's a separate, still-open gap, not something this script can
// close. What this DOES prove: the new Σ wiring runs correctly against realistic EDGAR-
// shaped data through the actual connector code path, and every pre-existing field
// (registered/total/errors) is untouched.
//
// Run with: node architecture-recon/011_verify_connector_integration.mjs

import assert from 'node:assert/strict';

// Mock fetch — no live network access in this environment. Shape matches
// extractOwnershipPair()'s real expectations (src.ciks[0]=subject, [1]=filer), taken
// directly from the connector's own documented contract, not invented.
globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({
    hits: {
      hits: [
        {
          _id: 'test-hit-1',
          _source: {
            ciks: ['0000936395', '0001067983'], // Lockheed Martin, real CIK from entityregistry.json + a test filer CIK
            display_names: ['LOCKHEED MARTIN CORP', 'TEST FILER LLC'],
            file_date: '2026-08-01',
            adsh: '0000936395-26-000001',
          },
        },
      ],
    },
  }),
});

const { runSecOwnershipSync } = await import('../src/engine/connectors/secownershipconnector.js');

const result = await runSecOwnershipSync({ from: '2026-08-01', to: '2026-08-11' });

console.log('runSecOwnershipSync() result:', JSON.stringify(result, null, 2));

// Pre-existing contract, unchanged.
assert.strictEqual(result.registered, 1, 'FAIL: existing registered-count behavior broke');
assert.strictEqual(result.total, 1, 'FAIL: existing total-count behavior broke');
assert.deepStrictEqual(result.errors, [], 'FAIL: existing errors behavior broke');

// New Σ wiring, exercised through the real connector, not a fixture built in isolation.
assert.ok(result.sigma, 'FAIL: sigma field missing — new wiring did not execute');
assert.ok(result.sigma.vertexCount >= 2, 'FAIL: expected at least the subject+filer vertices');
assert.ok(result.sigma.edgeCount >= 1, 'FAIL: expected at least the ownership edge');
assert.strictEqual(result.sigma.traceable, true, 'FAIL: connector-produced Σ is not fully traceable via πΣ');

console.log('\nPASS: pre-existing connector contract unchanged.');
console.log('PASS: new Σ wiring executes inside the real connector and is traceable.');
console.log('OPEN: runSecOwnershipSync has zero callers in src/ — "existing KRYLO path adoption" for this connector is not yet demonstrated because no live path exists to demonstrate it through.');
