#!/usr/bin/env node
// check-undef.mjs -- crash-class guard (systemic plan item 3). Finds identifiers a source file uses but never declares
// (the class of bug behind the 2026-10-09 blank screen: `BRT` passed to a component, undefined, thrown only when a rare
// branch rendered). esbuild turns JSX into plain JS, acorn parses it, and a file-level declaration scan is compared with every
// identifier reference. File-level scoping is deliberately simple: low false positives, catches typos and forgotten imports.
// Existing findings live in scripts/undef-baseline.json; only NEW (file, identifier) pairs fail.
// Usage: node scripts/check-undef.mjs [--warn] [--update-baseline] [file ...]
import fs from 'fs';
import path from 'path';
import * as acorn from 'acorn';
import { transform } from 'esbuild';

const args = process.argv.slice(2);
const WARN = args.includes('--warn'), UPDATE = args.includes('--update-baseline');
const explicit = args.filter(a => !a.startsWith('--'));
const ROOT = process.cwd();
const BASELINE = path.join(ROOT, 'scripts', 'undef-baseline.json');

const GLOBALS = new Set(`undefined NaN Infinity globalThis window document navigator location history screen console localStorage sessionStorage indexedDB fetch Headers Request Response FormData URL URLSearchParams Blob File FileReader AbortController AbortSignal WebSocket EventSource XMLHttpRequest
setTimeout clearTimeout setInterval clearInterval requestAnimationFrame cancelAnimationFrame requestIdleCallback cancelIdleCallback queueMicrotask structuredClone performance
Object Array String Number Boolean Symbol BigInt Math JSON Date RegExp Error TypeError RangeError SyntaxError ReferenceError EvalError URIError AggregateError Map Set WeakMap WeakSet WeakRef Promise Proxy Reflect Intl ArrayBuffer SharedArrayBuffer DataView Atomics
Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array BigInt64Array BigUint64Array
parseInt parseFloat isNaN isFinite encodeURIComponent decodeURIComponent encodeURI decodeURI escape unescape eval arguments
self onmessage Event CustomEvent MessageEvent KeyboardEvent MouseEvent PointerEvent WheelEvent TouchEvent ErrorEvent StorageEvent ResizeObserver IntersectionObserver MutationObserver PerformanceObserver
Node Element HTMLElement HTMLCanvasElement HTMLIFrameElement HTMLInputElement SVGElement DOMParser XMLSerializer DOMRect getComputedStyle matchMedia alert confirm prompt open close postMessage addEventListener removeEventListener dispatchEvent
Image Audio Option Worker SharedWorker BroadcastChannel MessageChannel TextEncoder TextDecoder crypto atob btoa Path2D OffscreenCanvas ImageData ImageBitmap createImageBitmap WebGLRenderingContext WebGL2RenderingContext CanvasRenderingContext2D
process Buffer require module exports __dirname __filename import
__KRYLO_COMMIT_SHA__ __KRYLO_BUILD_TIME__ __KRYLO_DIRTY__`.split(/\s+/));

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else if (/\.(jsx?|mjs)$/.test(e.name) && !/ copy\./.test(e.name)) out.push(p);
  }
  return out;
}

const declarePattern = (n, set) => {
  if (!n) return;
  switch (n.type) {
    case 'Identifier': set.add(n.name); break;
    case 'ObjectPattern': for (const p of n.properties) declarePattern(p.type === 'RestElement' ? p.argument : p.value, set); break;
    case 'ArrayPattern': for (const e of n.elements) declarePattern(e, set); break;
    case 'RestElement': declarePattern(n.argument, set); break;
    case 'AssignmentPattern': declarePattern(n.left, set); break;
    default: break;
  }
};

function analyze(ast) {
  const declared = new Set(), refs = new Map();
  const visit = (n, parent, key) => {
    if (!n || typeof n.type !== 'string') return;
    switch (n.type) {
      case 'ImportDeclaration': for (const s of n.specifiers) declared.add(s.local.name); return;
      case 'VariableDeclarator': declarePattern(n.id, declared); break;
      case 'FunctionDeclaration': case 'FunctionExpression': case 'ArrowFunctionExpression':
        if (n.id) declared.add(n.id.name); for (const p of n.params) declarePattern(p, declared); break;
      case 'ClassDeclaration': case 'ClassExpression': if (n.id) declared.add(n.id.name); break;
      case 'CatchClause': declarePattern(n.param, declared); break;
      case 'Identifier': {
        const skip = (parent?.type === 'MemberExpression' && key === 'property' && !parent.computed)
          || (parent?.type === 'Property' && key === 'key' && !parent.computed && !parent.shorthand)
          || ((parent?.type === 'MethodDefinition' || parent?.type === 'PropertyDefinition') && key === 'key' && !parent.computed)
          || (parent?.type === 'LabeledStatement' || parent?.type === 'BreakStatement' || parent?.type === 'ContinueStatement')
          || (parent?.type === 'ExportSpecifier') || (parent?.type === 'ImportSpecifier')
          || (parent?.type === 'UnaryExpression' && parent.operator === 'typeof' && key === 'argument')
          || (parent?.type === 'MetaProperty');
        if (!skip) refs.set(n.name, (refs.get(n.name) ?? 0) + 1);
        return;
      }
      default: break;
    }
    for (const k of Object.keys(n)) {
      if (k === 'type' || k === 'start' || k === 'end') continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach(c => c && typeof c.type === 'string' && visit(c, n, k)); else if (v && typeof v.type === 'string') visit(v, n, k);
    }
  };
  visit(ast, null, null);
  return { declared, refs };
}

async function freeIdentifiers(file) {
  const src = fs.readFileSync(file, 'utf8');
  let js;
  try { js = (await transform(src, { loader: file.endsWith('.jsx') ? 'jsx' : 'js', jsx: 'transform', format: 'esm', sourcefile: file })).code; }
  catch (e) { return { error: String(e.message).split('\n')[0] }; }
  let ast;
  try { ast = acorn.parse(js, { ecmaVersion: 'latest', sourceType: 'module', allowHashBang: true }); }
  catch (e) { return { error: 'parse: ' + e.message }; }
  const { declared, refs } = analyze(ast);
  const free = [...refs.keys()].filter(n => !declared.has(n) && !GLOBALS.has(n) && n !== 'React').sort();
  return { free };
}

const files = (explicit.length ? explicit : [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'public')).filter(f => f.endsWith('.js'))]).map(f => path.relative(ROOT, path.resolve(f)));
const found = {}, errors = [];
for (const f of files) { const r = await freeIdentifiers(f); if (r.error) errors.push(`${f}: ${r.error}`); else if (r.free.length) found[f] = r.free; }

if (UPDATE) { fs.writeFileSync(BASELINE, JSON.stringify(found, null, 1) + '\n'); console.log(`baseline written: ${Object.keys(found).length} file(s) with existing findings`); process.exit(0); }

const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : {};
const fresh = [];
for (const [f, names] of Object.entries(found)) for (const n of names) if (!(baseline[f] ?? []).includes(n)) fresh.push(`${f}: ${n}`);
console.log(`check-undef: ${files.length} file(s) scanned, ${Object.keys(found).length} with baseline findings, ${fresh.length} NEW undeclared identifier(s)${errors.length ? `, ${errors.length} unparseable` : ''}`);
for (const l of fresh) console.log('  NEW  ' + l);
for (const l of errors.slice(0, 5)) console.log('  skip ' + l);
process.exit(fresh.length && !WARN ? 1 : 0);
