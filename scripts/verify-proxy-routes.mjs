#!/usr/bin/env node
// KRYL-DIAG-2 — Proxy Route Drift Prevention
//
// Root cause of the six-domain cone coverage investigation (2026-08-05/06): as-diff/engine.js
// has real, working implementations for ~30 API routes, but vite.config.js's dev-server proxy
// only had explicit local rules for 3 of them -- every other route silently fell through to
// the generic '/api' -> https://krylo.org catch-all, which either 404s or behaves differently
// than the local implementation. No error was ever thrown; connectors caught the failure and
// dispatched a fake zero-signal record instead. This cost roughly two days to trace.
//
// This script prevents that exact failure class from recurring silently: every route
// as-diff/engine.js implements MUST have an explicit local proxy rule in vite.config.js.
// Run via `npm run dev` (see package.json) or standalone: node scripts/verify-proxy-routes.mjs
//
// This is prevention, not detection -- it runs before anything hits the network, and fails
// loudly (non-zero exit) rather than requiring someone to notice a silent 404 downstream.

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function extractAsDiffRoutes() {
  const src = readFileSync(path.join(ROOT, 'as-diff/engine.js'), 'utf8');
  // Matches lines like: if (req.method === 'GET'  && url === '/api/worldbank') return ...
  const re = /url\s*===\s*'([^']+)'/g;
  const routes = new Set();
  let m;
  while ((m = re.exec(src))) {
    const route = m[1];
    // /health and /compare are internal/ops endpoints, not connector data routes the app
    // fetches through the Vite proxy for domain signal purposes -- exclude from this check.
    if (route === '/health') continue;
    routes.add(route);
  }
  return routes;
}

function extractViteProxyRules() {
  const src = readFileSync(path.join(ROOT, 'vite.config.js'), 'utf8');
  // Matches proxy rule keys whose target is ANY localhost server (as-diff on 4000, or the
  // mock-server on 3001 -- e.g. /api/fuel is intentionally served by mock-server, which holds
  // the key). A rule that exists but points at krylo.org is exactly the bug this script
  // exists to catch, so it must not count as "covered" -- only a genuinely local target does.
  const re = /'([^']+)':\s*\{\s*target:\s*'http:\/\/localhost:\d+'/g;
  const rules = new Set();
  let m;
  while ((m = re.exec(src))) rules.add(m[1]);
  return rules;
}

function isCovered(route, localRules) {
  // A route is covered if there's an exact local rule for it, or a local rule for a path
  // prefix of it (Vite proxy matches by prefix, e.g. '/api/fuel' covers '/api/fuel?zip=...').
  if (localRules.has(route)) return true;
  for (const rule of localRules) {
    if (route === rule || route.startsWith(rule + '/') || route.startsWith(rule)) return true;
  }
  return false;
}

const asDiffRoutes = extractAsDiffRoutes();
const localRules   = extractViteProxyRules();

const uncovered = [...asDiffRoutes].filter(r => !isCovered(r, localRules)).sort();

if (uncovered.length > 0) {
  console.error('\n✘ PROXY ROUTE DRIFT DETECTED\n');
  console.error(`${uncovered.length} route(s) implemented in as-diff/engine.js have no local`);
  console.error('proxy rule in vite.config.js -- they will silently fall through to the');
  console.error('production krylo.org catch-all instead of the local engine:\n');
  for (const r of uncovered) console.error(`  ${r}`);
  console.error('\nFix: add an explicit rule in vite.config.js\'s server.proxy, pointing at');
  console.error('http://localhost:4000, before the generic \'/api\' catch-all.\n');
  process.exit(1);
}

console.log(`✓ Proxy route check passed — all ${asDiffRoutes.size} as-diff/engine.js route(s) have a local proxy rule.`);
process.exit(0);
