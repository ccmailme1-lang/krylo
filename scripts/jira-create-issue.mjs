#!/usr/bin/env node
// Reusable Jira issue creator. Reads specs/jira.md internally at runtime — never prints its
// contents or the parsed credential values. Only prints: parse status (booleans), and on
// creation, the resulting issue key or a sanitized error.
//
// Usage:
//   node scripts/jira-create-issue.mjs --check                 (parse-only, no API call)
//   node scripts/jira-create-issue.mjs <path-to-ticket-csv>     (creates the issue for real)
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const raw = fs.readFileSync(path.join(REPO, 'specs/jira.md'), 'utf8');

// Deliberately permissive — tries many shapes so this never needs interactive format-guessing
// again. Order matters: more specific patterns first.
function extract(key) {
  const patterns = [
    new RegExp(`^export\\s+${key}=(\\S+)`, 'm'),                       // export KEY=value (confirmed format)
    new RegExp(`\\*\\*${key}\\*\\*\\s*[:=]?\\s*\`([^\`]+)\``, 'i'),   // **KEY**: `value`
    new RegExp(`\`${key}\`\\s*[:=]\\s*\`([^\`]+)\``, 'i'),             // `KEY`: `value`
    new RegExp(`^\\s*${key}\\s*[:=]\\s*\`([^\`]+)\``, 'im'),           // KEY: `value`
    new RegExp(`^\\s*${key}\\s*[:=]\\s*"([^"]+)"`, 'im'),              // KEY: "value"
    new RegExp(`^\\s*${key}\\s*[:=]\\s*'([^']+)'`, 'im'),              // KEY: 'value'
    new RegExp(`^\\s*${key}\\s*[:=]\\s*(\\S+)`, 'im'),                 // KEY: value / KEY=value
    new RegExp(`\\*\\*${key}\\*\\*[^\\n]*?:\\s*([^\\n]+)`, 'i'),        // **KEY** ... : value (same line, prose)
  ];
  for (const p of patterns) {
    const m = raw.match(p);
    if (m && m[1] && m[1].trim()) return m[1].trim().replace(/^["'`]|["'`]$/g, '');
  }
  return null;
}

const KEY_CANDIDATES = {
  email:      ['JIRA_EMAIL', 'EMAIL'],
  token:      ['JIRA_TOKEN', 'JIRA_API_TOKEN', 'API_TOKEN', 'TOKEN'],
  baseUrl:    ['JIRA_BASE_URL', 'JIRA_URL', 'BASE_URL'],
};

// jira.md's stored JIRA_PROJECT_KEY value ("KRYLO") is stale — confirmed 2026-08-04 via a live
// API call that failed with it and succeeded with 'KRYL'. Every real issue created this session
// (KRYL-975 through KRYL-1140) uses this prefix — it's the project's actual key, not a secret.
// Hardcoded here instead of parsed, so this script doesn't repeat the same failed call.
const PROJECT_KEY = 'KRYL';

function resolveField(candidates) {
  for (const k of candidates) {
    const v = extract(k);
    if (v) return v;
  }
  return null;
}

const creds = {
  email:      resolveField(KEY_CANDIDATES.email),
  token:      resolveField(KEY_CANDIDATES.token),
  baseUrl:    resolveField(KEY_CANDIDATES.baseUrl),
  projectKey: PROJECT_KEY,
};

const mode = process.argv[2];

if (mode === '--check') {
  // Boolean-only report — never the values themselves.
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

const csvPath = mode;
if (!csvPath) {
  console.log('Usage: node scripts/jira-create-issue.mjs <path-to-ticket-csv>');
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let field = '', row = [], inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' && row.length) { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const csv = fs.readFileSync(path.resolve(csvPath), 'utf8');
const [header, data] = parseCsv(csv);
const rec = Object.fromEntries(header.map((h, i) => [h.trim(), data[i]]));

const summary     = rec['Summary'];
const issueType    = rec['Issue Type'] || 'Task';
const description = rec['Description'];
const labels       = (rec['Labels'] || '').split(/\s+/).filter(Boolean);

const auth = Buffer.from(`${creds.email}:${creds.token}`).toString('base64');
const body = JSON.stringify({
  fields: {
    project: { key: creds.projectKey },
    summary,
    issuetype: { name: issueType },
    description: {
      type: 'doc', version: 1,
      content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }],
    },
    labels,
  },
});

const url = new URL(`${creds.baseUrl.replace(/\/$/, '')}/rest/api/3/issue`);
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
      console.log('SUCCESS', JSON.parse(resBody).key);
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
