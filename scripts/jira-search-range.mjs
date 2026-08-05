#!/usr/bin/env node
// Reusable Jira date-range search. Reads specs/jira.md internally at runtime — never prints
// its contents or the parsed credential values. Only prints: parse status (booleans) in
// --check mode, or issue key/summary/created-date rows in real mode.
//
// Usage:
//   node scripts/jira-search-range.mjs --check
//   node scripts/jira-search-range.mjs <start-date YYYY-MM-DD> <end-date YYYY-MM-DD>
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
const PROJECT_KEY = 'KRYL'; // confirmed live key, see jira-create-issue.mjs

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

const [start, end] = process.argv.slice(2);
if (!start || !end) {
  console.log('Usage: node scripts/jira-search-range.mjs <start YYYY-MM-DD> <end YYYY-MM-DD>');
  process.exit(1);
}

const jql = `project = ${PROJECT_KEY} AND created >= "${start} 00:00" AND created <= "${end} 23:59" ORDER BY created ASC`;
const auth = Buffer.from(`${creds.email}:${creds.token}`).toString('base64');
const url = new URL(`${creds.baseUrl.replace(/\/$/, '')}/rest/api/3/search/jql`);

const body = JSON.stringify({ jql, fields: ['summary', 'created', 'issuetype', 'status'], maxResults: 100 });

const req = https.request(url, {
  method: 'POST',
  headers: {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
}, res => {
  let resBody = '';
  res.on('data', c => resBody += c);
  res.on('end', () => {
    if (res.statusCode >= 300) {
      console.log(`ABORT: Jira API returned ${res.statusCode}`);
      process.exit(1);
    }
    const data = JSON.parse(resBody);
    const issues = data.issues ?? [];
    console.log(`${issues.length} issue(s) created between ${start} and ${end}:\n`);
    for (const iss of issues) {
      const created = (iss.fields.created ?? '').slice(0, 16).replace('T', ' ');
      console.log(`${iss.key} | ${created} | ${iss.fields.issuetype?.name ?? '?'} | ${iss.fields.status?.name ?? '?'} | ${iss.fields.summary}`);
    }
  });
});
req.on('error', e => { console.log('ABORT: request error'); process.exit(1); });
req.write(body);
req.end();
