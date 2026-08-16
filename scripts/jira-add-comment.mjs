#!/usr/bin/env node
// Reusable Jira comment adder. Reads specs/jira.md internally at runtime — never prints its
// contents or the parsed credential values. Only prints: parse status (booleans), and on
// success, the comment id — same secret-safety pattern as jira-create-issue.mjs.
//
// Usage:
//   node scripts/jira-add-comment.mjs --check                      (parse-only, no API call)
//   node scripts/jira-add-comment.mjs <ISSUE-KEY> <path-to-txt>     (posts the comment for real)
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const raw = fs.readFileSync(path.join(REPO, 'specs/jira.md'), 'utf8');

// Deliberately permissive — tries many shapes so this never needs interactive format-guessing
// again. Order matters: more specific patterns first. (Kept identical to jira-create-issue.mjs.)
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
  for (const k of candidates) {
    const v = extract(k);
    if (v) return v;
  }
  return null;
}

const creds = {
  email:   resolveField(KEY_CANDIDATES.email),
  token:   resolveField(KEY_CANDIDATES.token),
  baseUrl: resolveField(KEY_CANDIDATES.baseUrl),
};

const mode = process.argv[2];

if (mode === '--check') {
  for (const [k, v] of Object.entries(creds)) {
    console.log(`${k}: ${v ? 'PARSED' : 'MISSING'}`);
  }
  process.exit(Object.values(creds).every(Boolean) ? 0 : 1);
}

const missing = Object.entries(creds).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  console.log('ABORT: could not parse required fields:', missing.join(', '));
  console.log('Run with --check to see per-field parse status. No API call made.');
  process.exit(1);
}

const issueKey = process.argv[2];
const bodyPath = process.argv[3];
if (!issueKey || !bodyPath) {
  console.log('Usage: node scripts/jira-add-comment.mjs <ISSUE-KEY> <path-to-comment-txt>');
  process.exit(1);
}

const commentText = fs.readFileSync(path.resolve(bodyPath), 'utf8');

const auth = Buffer.from(`${creds.email}:${creds.token}`).toString('base64');
const body = JSON.stringify({
  body: {
    type: 'doc', version: 1,
    content: [{ type: 'paragraph', content: [{ type: 'text', text: commentText }] }],
  },
});

const url = new URL(`${creds.baseUrl.replace(/\/$/, '')}/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`);
const req = https.request(url, {
  method: 'POST',
  headers: {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
}, res => {
  let resBody = '';
  res.on('data', d => resBody += d);
  res.on('end', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('SUCCESS', JSON.parse(resBody).id);
    } else {
      console.log('HTTP_ERROR', res.statusCode);
      try {
        const parsed = JSON.parse(resBody);
        console.log('DETAILS', JSON.stringify(parsed.errorMessages || parsed.errors || {}));
      } catch { console.log('DETAILS non-JSON, length:', resBody.length); }
    }
  });
});
req.on('error', e => console.log('REQUEST_ERROR', e.message));
req.write(body);
req.end();
