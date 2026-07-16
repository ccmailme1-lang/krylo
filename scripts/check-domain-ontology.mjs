#!/usr/bin/env node
// KRYL-1065 — Ontology guard. §17 canonical domains live ONLY in src/engine/ontology.js.
// Two violations (narrow by design — legitimately USING canonical domains as values, e.g. a
// connector routing a signal to ['capital','labor'], is fine and must NOT trip this):
//   1. FULL RE-DECLARATION — a bare array that lists all six §17 domains (import instead).
//   2. PILLAR REGRESSION   — the retired pillar taxonomy reappearing (tell: 'operating' AND
//      'personal' together, which only occur in the old pillar list).
// Allowlisted: ontology.js (the source) + Founder-classified derived-view surfaces + backups.

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC  = join(ROOT, 'src');

const CANONICAL = ['technology', 'capital', 'knowledge', 'labor', 'media', 'ownership'];
const PILLAR    = ['financial', 'operating', 'time', 'personal', 'market']; // retired — must never reappear
const TOKENS    = new Set([...CANONICAL, ...PILLAR]);

// Allowlist: the single source of truth + the Founder-classified derived-view surfaces + backups.
const ALLOW = [
  'engine/ontology.js',
  'components/oracleview_v2.jsx',
  'components/feeds/feedsbay.jsx',
  'components/surface/leveragetowers.jsx',
];
const isAllowed = (rel) => ALLOW.some(a => rel.endsWith(a)) || / copy\.|\.copy\./.test(rel);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(jsx?|mjs)$/.test(name)) yield p;
  }
}

// bare string-array literal: [ 'a', 'b', ... ] — quoted strings, commas, whitespace only.
const ARRAY_RE = /\[(?:\s*'[^']*'\s*,?)+\]/g;

const violations = [];
for (const file of walk(SRC)) {
  const rel = relative(SRC, file);
  if (isAllowed(rel)) continue;
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(ARRAY_RE)) {
    const toks = new Set([...m[0].matchAll(/'([^']*)'/g)].map(t => t[1].toLowerCase()));
    const fullReDeclaration = CANONICAL.every(d => toks.has(d));
    const pillarRegression  = toks.has('operating') && toks.has('personal');
    if (fullReDeclaration || pillarRegression) {
      const line = text.slice(0, m.index).split('\n').length;
      const why  = pillarRegression ? 'PILLAR REGRESSION' : 'full §17 re-declaration';
      violations.push(`  src/${rel}:${line}  →  ${why} (import CANONICAL_DOMAINS)`);
    }
  }
}

if (violations.length) {
  console.error('\n✗ Ontology guard (KRYL-1065): domain-list literal(s) found outside ontology.js.');
  console.error('  Domains come from src/engine/ontology.js — alias against it, do not redeclare.\n');
  console.error(violations.join('\n') + '\n');
  process.exit(1);
}
console.log('✓ Ontology guard: no stray domain-list literals. §17 single source intact.');
