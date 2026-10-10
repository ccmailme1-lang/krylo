// qa_errorboundary.mjs -- the boundary turns a render error into a visible, named panel and keeps its siblings alive.
import { build } from 'esbuild';
import { pathToFileURL } from 'url';
import { join } from 'path';
const out = join(process.cwd(), 'node_modules', '.qa_errorboundary.mjs');
await build({ entryPoints: ['src/components/errorboundary.jsx'], bundle: true, format: 'esm', platform: 'node', outfile: out, loader: { '.jsx': 'jsx' }, jsx: 'automatic', logLevel: 'silent', external: ['react', 'react-dom', 'react/jsx-runtime'] });
const { default: ErrorBoundary, ErrorPanel } = await import(pathToFileURL(out).href);
const { renderToStaticMarkup } = await import('react-dom/server');
const { createElement } = await import('react');
let pass = 0, fail = 0;
const ok = (c, l) => { if (c) { pass++; console.log('  ✓ ' + l); } else { fail++; console.log('  ✗ ' + l); } };
const text = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

ok(ErrorBoundary.getDerivedStateFromError(new Error('boom')).error.message === 'boom', 'a thrown error is captured into state');
const b = new ErrorBoundary({ label: 'Structural brief', children: null });
b.state = ErrorBoundary.getDerivedStateFromError(new ReferenceError('BRT is not defined'));
const html = renderToStaticMarkup(b.render());
ok(/STRUCTURAL BRIEF COULD NOT BE DISPLAYED/.test(text(html)) && /BRT is not defined/.test(text(html)), 'the fallback names the section and shows the real error (the failure is not hidden)');
ok(/RETRY/.test(text(html)) && /role="alert"/.test(html), 'the fallback offers a retry and is announced as an alert');
const healthy = new ErrorBoundary({ label: 'x', children: createElement('p', null, 'still here') });
ok(/still here/.test(renderToStaticMarkup(healthy.render())), 'with no error the children render untouched');
ok(/APPLICATION COULD NOT BE DISPLAYED/.test(text(renderToStaticMarkup(createElement(ErrorPanel, { label: 'Application', message: 'x' })))), 'the app-level panel is a visible panel, never a black page');
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
