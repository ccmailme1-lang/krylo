let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log(`  ${c ? '✓' : '✗'} ${m}`); };
const { applyUpstreamDeadline, SELF_TIMED, UPSTREAM_DEADLINE_MS } = await import('./as-diff/upstreamdeadline.js');
const mkRes = () => { const r = { headersSent: false, writableEnded: false, destroyed: false, listeners: {}, out: null, status: null,
  writeHead(s) { r.status = s; r.headersSent = true; return r; }, end(b) { r.out = b; r.writableEnded = true; return r; }, write() { return true; }, destroy() { r.destroyed = true; }, on(e, f) { r.listeners[e] = f; } }; return r; };
let fire = null, cleared = 0; const setT = (f, ms) => { fire = f; return { ms }; }; const clearT = () => { cleared++; };
ok(UPSTREAM_DEADLINE_MS === 20000, 'the deadline is the engine\'s existing 20 s upstream timeout');
let res = mkRes(); ok(applyUpstreamDeadline({ method: 'GET', url: '/api/eia?series_id=X' }, res, { setT, clearT }) === true, 'an ambient GET proxy gets a deadline');
fire(); ok(res.status === 504 && JSON.parse(res.out).error === 'UPSTREAM_TIMEOUT', 'after the deadline the caller gets 504 UPSTREAM_TIMEOUT');
res.writeHead(200); res.end('late'); ok(res.status === 504 && JSON.parse(res.out).error === 'UPSTREAM_TIMEOUT', 'a late upstream answer is discarded (never written to the finished response)');
res = mkRes(); applyUpstreamDeadline({ method: 'GET', url: '/api/fred' }, res, { setT, clearT }); res.end('ok'); res.listeners.finish(); fire(); ok(res.out === 'ok' && cleared >= 1, 'an answer before the deadline is untouched and the timer is cleared');
for (const u of ['/api/signals/stream', '/api/stats/stream', '/api/edgar', '/api/edgar-document', '/api/sec-names', '/api/patent-assignee', '/api/gleif-entity', '/api/media-observation', '/api/gdelt-doc', '/v1/canonical-store/relationships']) ok(applyUpstreamDeadline({ method: 'GET', url: u }, mkRes(), { setT, clearT }) === false, `${u}: manages its own timing, no deadline`);
ok(applyUpstreamDeadline({ method: 'POST', url: '/api/patentsview' }, mkRes(), { setT, clearT }) === false && applyUpstreamDeadline({ method: 'GET', url: '/health' }, mkRes(), { setT, clearT }) === false, 'only GET /api proxies');
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
