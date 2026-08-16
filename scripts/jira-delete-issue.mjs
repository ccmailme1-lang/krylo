#!/usr/bin/env node
// Reusable Jira issue deleter. Reads specs/jira.md internally at runtime — never prints its
// contents or the parsed credential values. Only prints: parse status (booleans), and on
// deletion, the result per key.
//
// Usage:
//   node scripts/jira-delete-issue.mjs --check
//   node scripts/jira-delete-issue.mjs KRYL-1182 KRYL-1183 KRYL-1184 KRYL-1185
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

function resolveField(candidates) {
  for (const k of candidates) { const v = extract(k); if (v) return v; }
  return null;
}

const creds = {
  email:   resolveField(KEY_CANDIDATES.email),
  token:   resolveField(KEY_CANDIDATES.token),
  baseUrl: resolveField(KEY_CANDIDATES.baseUrl),
};

if (process.argv[2] === '--check') {
  for (const [k, v] of Object.entries(creds)) console.log(`${k}: ${v ? 'PARSED' : 'MISSING'}`);
  process.exit(Object.values(creds).every(Boolean) ? 0 : 1);
}

const missing = Object.entries(creds).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  console.log('ABORT: could not parse required fields:', missing.join(', '));
  process.exit(1);
}

const keys = process.argv.slice(2);
if (!keys.length) {
  console.log('Usage: node scripts/jira-delete-issue.mjs <ISSUE-KEY> [ISSUE-KEY...]');
  process.exit(1);
}

const auth = Buffer.from(`${creds.email}:${creds.token}`).toString('base64');

function deleteOne(key) {
  return new Promise((resolve) => {
    const url = new URL(`${creds.baseUrl.replace(/\/$/, '')}/rest/api/3/issue/${key}`);
    const req = https.request(url, {
      method: 'DELETE',
      headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' },
    }, res => {
      let resBody = '';
      res.on('data', d => resBody += d);
      res.on('end', () => {
        if (res.statusCode === 204) {
          console.log(`${key}: DELETED`);
        } else {
          console.log(`${key}: HTTP_ERROR ${res.statusCode}`);
          try {
            const parsed = JSON.parse(resBody);
            console.log(`${key}: DETAILS`, JSON.stringify(parsed.errorMessages || parsed.errors || {}));
          } catch { console.log(`${key}: DETAILS non-JSON, length:`, resBody.length); }
        }
        resolve();
      });
    });
    req.on('error', e => { console.log(`${key}: REQUEST_ERROR`, e.message); resolve(); });
    req.end();
  });
}

for (const key of keys) {
  await deleteOne(key);
}
