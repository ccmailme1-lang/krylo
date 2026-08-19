#!/usr/bin/env node
// Relationship Validator — write-firewall guard.
// Implements SPEC-relationship-validator-adapter-orchestration-design.md §5.2 and
// SPEC-relationship-validator-implementation-wo.md §5 (Definition of Done).
//
// Every file under src/engine/validator/operators/ and src/engine/validator/context/ is
// restricted to read-only accessor imports. A denylisted export name appearing in an import
// specifier from ANY module (not just known write-capable ones) fails the check — the rule is
// deliberately name-based and conservative, not an allowlist of known-safe files, so a new
// write-capable function added anywhere in the codebase later is still caught if an operator or
// context provider ever imports it.

import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GUARDED_DIRS = [
  join(ROOT, 'src/engine/validator/operators'),
  join(ROOT, 'src/engine/validator/context'),
];

// Denylisted export-name prefixes — SPEC-...-adapter-orchestration-design.md §5.2.
const DENY_PREFIXES = ['update', 'insert', 'save', 'delete', 'admit', 'create', 'write'];
const isDenied = (name) => DENY_PREFIXES.some(p => name.toLowerCase().startsWith(p));

// Also explicitly forbidden regardless of prefix (§5.3/§5.4 — no candidate construction, no
// admission API dependency), named exactly since they don't match the prefix rule above.
const DENY_EXACT = new Set(['makeRelationCore', 'RelationshipProposal', 'AdmissionDecision']);

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(jsx?|mjs)$/.test(name)) yield p;
  }
}

// Matches: import { a, b as c } from '...'; and import a from '...';
const IMPORT_RE = /import\s+(?:\{([^}]+)\}|(\w+))\s+from\s+['"][^'"]+['"]/g;

const violations = [];
for (const dir of GUARDED_DIRS) {
  for (const file of walk(dir)) {
    const rel = relative(ROOT, file);
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(IMPORT_RE)) {
      const named = m[1] ? m[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim()) : [];
      const dflt  = m[2] ? [m[2].trim()] : [];
      for (const symbol of [...named, ...dflt]) {
        if (!symbol) continue;
        if (isDenied(symbol) || DENY_EXACT.has(symbol)) {
          const line = text.slice(0, m.index).split('\n').length;
          violations.push(`  ${rel}:${line}  →  imports "${symbol}" (denylisted for validator write-firewall)`);
        }
      }
    }
  }
}

if (violations.length) {
  console.error('\n✗ Validator write-firewall guard: denylisted import(s) found.');
  console.error('  Operators and context providers must be read-only — see SPEC-relationship-');
  console.error('  validator-adapter-orchestration-design.md §5.\n');
  console.error(violations.join('\n') + '\n');
  process.exit(1);
}
console.log('✓ Validator write-firewall guard: no denylisted imports under operators/ or context/.');
