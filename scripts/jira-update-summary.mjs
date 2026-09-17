#!/usr/bin/env node
// Reusable Jira summary updater. Reads specs/jira.md internally at runtime — never prints its
// contents or the parsed credential values. Same secret-safety pattern as the other jira-*.mjs
// scripts in this directory.
//
// Usage:
//   node scripts/jira-update-summary.mjs --check                           (parse-only, no API call)
//   node scripts/jira-update-summary.mjs <ISSUE-KEY> "<new summary text>"   (updates for real)
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

const issueKey = args[0];
const newSummary = args[1];
if (!issueKey || !newSummary) {
  console.log('Usage: node scripts/jira-update-summary.mjs <ISSUE-KEY> "<new summary text>"');
  process.exit(1);
}

const auth = Buffer.from(`${creds.email}:${creds.token}`).toString('base64');
const base = creds.baseUrl.replace(/\/$/, '');
const H = { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json', 'Accept': 'application/json' };

const body = JSON.stringify({ fields: { summary: newSummary } });
const url = new URL(`${base}/rest/api/3/issue/${issueKey}`);
const req = https.request(url, { method: 'PUT', headers: H }, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log(`${issueKey}: SUCCESS -> summary updated`);
    } else {
      console.log(`${issueKey}: FAILED (HTTP ${res.statusCode}) -> ${d.slice(0, 300)}`);
      process.exit(1);
    }
  });
});
req.on('error', e => { console.log('ABORT:', e.message); process.exit(1); });
req.write(body);
req.end();
