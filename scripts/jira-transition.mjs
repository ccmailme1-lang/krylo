#!/usr/bin/env node
// Reusable Jira status transition. Reads specs/jira.md internally at runtime — never prints its
// contents or the parsed credential values. Same secret-safety pattern as jira-add-comment.mjs.
//
// Usage:
//   node scripts/jira-transition.mjs --check                       (parse-only, no API call)
//   node scripts/jira-transition.mjs --list <ISSUE-KEY>            (print available transitions)
//   node scripts/jira-transition.mjs <ISSUE-KEY> "<target status>"  (transition, e.g. "Done")
//   node scripts/jira-transition.mjs --batch "<target>" KEY-1 KEY-2 ...
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const raw = fs.readFileSync(path.join(REPO, 'specs/jira.md'), 'utf8');

function extract(key) {
  const patterns = [
    new RegExp(`^export\\s+${key}=(\\S+)`, 'm'),
    new RegExp(`\\*\\*${key}\\*\\*\\s*[:=]?\\s*\`([^\`]+)\``, 'i'),
    new RegExp(`\`${key}\`\\s*[:=]\\s*\`([^\`]+)\``, 'i'),
    new RegExp(`^\\s*${key}\\s*[:=]\\s*\`([^\`]+)\``, 'im'),
    new RegExp(`^\\s*${key}\\s*[:=]\\s*"([^"]+)"`, 'im'),
    new RegExp(`^\\s*${key}\\s*[:=]\\s*'([^']+)'`, 'im'),
    new RegExp(`^\\s*${key}\\s*[:=]\\s*(\\S+)`, 'im'),
    new RegExp(`\\*\\*${key}\\*\\*[^\\n]*?:\\s*([^\\n]+)`, 'i'),
  ];
  for (const p of patterns) {
    const m = raw.match(p);
    if (m && m[1] && m[1].trim()) return m[1].trim().replace(/^["'`]|["'`]$/g, '');
  }
  return null;
}

const KEY_CANDIDATES = {
  email:   ['JIRA_EMAIL', 'EMAIL'],
  token:   ['JIRA_TOKEN', 'JIRA_API_TOKEN', 'API_TOKEN', 'TOKEN'],
  baseUrl: ['JIRA_BASE_URL', 'JIRA_URL', 'BASE_URL'],
};
const resolveField = (cands) => { for (const k of cands) { const v = extract(k); if (v) return v; } return null; };
const creds = {
  email:   resolveField(KEY_CANDIDATES.email),
  token:   resolveField(KEY_CANDIDATES.token),
  baseUrl: resolveField(KEY_CANDIDATES.baseUrl),
};

const args = process.argv.slice(2);
const mode = args[0];

if (mode === '--check') {
  for (const [k, v] of Object.entries(creds)) console.log(`${k}: ${v ? 'PARSED' : 'MISSING'}`);
  process.exit(Object.values(creds).every(Boolean) ? 0 : 1);
}
const missing = Object.entries(creds).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.log('ABORT: could not parse:', missing.join(', ')); process.exit(1); }

const auth = Buffer.from(`${creds.email}:${creds.token}`).toString('base64');
const base = creds.baseUrl.replace(/\/$/, '');
const H = { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json', 'Accept': 'application/json' };

function api(method, urlStr, bodyObj) {
  return new Promise((resolve) => {
    const req = https.request(new URL(urlStr), { method, headers: H }, res => {
      let b = ''; res.on('data', d => b += d);
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    req.on('error', e => resolve({ status: 0, body: e.message }));
    if (bodyObj) req.write(JSON.stringify(bodyObj));
    req.end();
  });
}

async function listTransitions(key) {
  const r = await api('GET', `${base}/rest/api/3/issue/${encodeURIComponent(key)}/transitions`);
  if (r.status < 200 || r.status >= 300) return { error: `HTTP ${r.status}` };
  return { transitions: JSON.parse(r.body).transitions.map(t => ({ id: t.id, name: t.name, to: t.to?.name })) };
}

async function transition(key, target) {
  const lt = await listTransitions(key);
  if (lt.error) return `${key}: LIST_FAILED ${lt.error}`;
  const want = target.toLowerCase();
  const match = lt.transitions.find(t => (t.to || t.name).toLowerCase() === want)
             || lt.transitions.find(t => (t.to || t.name).toLowerCase().includes(want));
  if (!match) return `${key}: NO_TRANSITION_TO "${target}" — available: ${lt.transitions.map(t => t.to || t.name).join(', ')}`;
  const r = await api('POST', `${base}/rest/api/3/issue/${encodeURIComponent(key)}/transitions`, { transition: { id: match.id } });
  if (r.status >= 200 && r.status < 300) return `${key}: OK -> ${match.to || match.name}`;
  let detail = '';
  try { const p = JSON.parse(r.body); detail = JSON.stringify(p.errorMessages || p.errors || {}); } catch { detail = `len ${r.body.length}`; }
  return `${key}: HTTP_${r.status} ${detail}`;
}

(async () => {
  if (mode === '--list') {
    const lt = await listTransitions(args[1]);
    console.log(JSON.stringify(lt, null, 2));
    return;
  }
  if (mode === '--batch') {
    const target = args[1];
    const keys = args.slice(2);
    for (const k of keys) { console.log(await transition(k, target)); }
    return;
  }
  const [key, target] = args;
  if (!key || !target) { console.log('Usage: jira-transition.mjs <ISSUE-KEY> "<target status>"'); process.exit(1); }
  console.log(await transition(key, target));
})();
