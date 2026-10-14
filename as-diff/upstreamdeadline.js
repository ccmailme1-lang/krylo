// upstreamdeadline.js -- a response deadline for the engine's ambient upstream proxies (FRED, EIA, BLS, Kalshi, ... ). Several of them had no deadline, so a slow upstream held a browser
// connection open for 20 to 50 seconds; the browser allows only about six connections per host and two are permanent streams, so those held connections starved the requests that matter
// (subject admission timed out, 2026-10-14). The deadline is the engine's existing upstream timeout (20 s: secnames.js, gleif.js). After it the caller gets 504 UPSTREAM_TIMEOUT at once and
// any late answer from the upstream is discarded (never written to a finished response).
export const UPSTREAM_DEADLINE_MS = 20_000;
// Routes that manage their own timing or are long-lived: streams, the SEC routes the admission path depends on, and the routes with their own gates and timeouts.
export const SELF_TIMED = /^\/api\/(?:signals\/stream|stats\/stream|edgar|edgar-document|sec-names|clinical-trials|patent-assignee|gleif-entity|media-observation|gdelt-doc|tester-telemetry|guest-state)\b|^\/v1\//;

export function applyUpstreamDeadline(req, res, { ms = UPSTREAM_DEADLINE_MS, setT = setTimeout, clearT = clearTimeout } = {}) {
  const url = String(req.url ?? '').split('?')[0];
  if (req.method !== 'GET' || !url.startsWith('/api/') || SELF_TIMED.test(url)) return false;
  const t = setT(() => {
    if (res.writableEnded || res.destroyed) return;
    const w = { writeHead: res.writeHead.bind(res), end: res.end.bind(res) };
    try { if (!res.headersSent) { w.writeHead(504, { 'Content-Type': 'application/json' }); w.end(JSON.stringify({ error: 'UPSTREAM_TIMEOUT', afterMs: ms })); } else res.destroy(); } catch { /* the connection is already gone */ }
    res.writeHead = () => res; res.write = () => true; res.end = () => res;      // a late upstream answer is discarded
  }, ms);
  res.on('close', () => clearT(t)); res.on('finish', () => clearT(t));
  return true;
}
