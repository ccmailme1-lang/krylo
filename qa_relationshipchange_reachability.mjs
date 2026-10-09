// qa_relationshipchange_reachability.mjs -- KRYL-1386 reachability trace: the REAL entry point fireTopicConnectors(query) for a
// real entity query runs the ownership observation, then the source-dated comparison, stores the result and emits the event
// the brief listens for. Read-only against the local engine (needs it on :4000). Slow (SEC spacing): run on demand.
const BASE = process.env.KRYLO_ENGINE ?? 'http://localhost:4000';
const realFetch = globalThis.fetch;
globalThis.fetch = (u, o) => realFetch(typeof u === 'string' && u.startsWith('/') ? BASE + u : u, o);
const events = [];
globalThis.window = { dispatchEvent: (e) => { events.push(e); return true; }, addEventListener() {}, removeEventListener() {} };
globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init?.detail; } };
const { fireTopicConnectors } = await import('./src/engine/topicconnectors.js');
const { getRelationshipChange } = await import('./src/engine/relationshipchangeservice.js');
const q = process.argv[2] ?? 'Is Alphabet a good investment?';
const t0 = Date.now();
fireTopicConnectors(q);
const deadline = Date.now() + 240_000;
let entry = null;
while (Date.now() < deadline) { await new Promise(r => setTimeout(r, 2000)); entry = getRelationshipChange('alphabet'); if (entry?.state === 'done' || entry?.state === 'failed') break; }
const seen = events.map(e => e.type + (e.detail?.canonicalId ? ':' + e.detail.canonicalId : ''));
console.log(JSON.stringify({ query: q, seconds: Math.round((Date.now() - t0) / 1000), state: entry?.state ?? 'none', relationships: entry?.result?.relationships?.length ?? 0, events: [...new Set(seen)] }));
const ok = entry?.state === 'done' && entry.result.relationships.length > 0 && seen.includes('krylo-rho-updated:alphabet') && seen.includes('krylo-change-updated:alphabet');
console.log(ok ? 'REACHABLE: fireTopicConnectors -> ownership observation -> comparison -> store -> event' : 'NOT REACHABLE');
process.exit(ok ? 0 : 1);
