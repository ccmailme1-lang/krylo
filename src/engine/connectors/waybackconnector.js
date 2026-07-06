// KRYL-969 Phase 1 — Wayback Machine Connector
// Captures archived homepage/About-page text over time via the Internet Archive's
// free, unauthenticated Wayback Machine CDX + snapshot APIs.
// Spec: specs/KRYL-969-identity-evolution-engine.md §6 (WAYBACK)
//
// Boundary rules:
//   NO surfacerouter, NO rkmstore, NO identitykernel — pure capture into narrativesnapshotstore.js.
//   NO NLP / summarization — html→text is mechanical tag-stripping only, not inference.
//   Domain is caller-supplied — entityregistry.json has no website field, so this
//   connector does not attempt entity→domain resolution itself.

import { recordNarrativeSnapshot, SOURCE } from '../narrativesnapshotstore.js';

const CDX_BASE      = '/api/wayback-cdx';
const SNAPSHOT_BASE = '/api/wayback-snapshot';
const MAX_CAPTURES  = 12; // sample at most one per year across a typical decade-scale range

// Decodes HTML entities before whitespace collapsing — real-world markup commonly pads
// text with numeric entities (e.g. &#160;), which is literal non-whitespace text until
// decoded. Found and fixed against a real EDGAR filing during Phase 1 build; applies
// equally to archived web pages, which use the same entity conventions.
function decodeEntities(str) {
  return str
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

// Strip tags/scripts/styles down to visible text. Mechanical only — no summarization,
// no meaning extraction (per spec §2 exclusions, that is Phase 2's job).
function htmlToText(html) {
  if (!html) return '';
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  ).replace(/\s+/g, ' ').trim();
}

// CDX rows: first row is the header ["urlkey","timestamp","original","mimetype","statuscode","digest","length"]
function parseCdxRows(json) {
  if (!Array.isArray(json) || json.length < 2) return [];
  const [header, ...rows] = json;
  const tsIdx  = header.indexOf('timestamp');
  const urlIdx = header.indexOf('original');
  return rows.map(r => ({ timestamp: r[tsIdx], originalUrl: r[urlIdx] }));
}

// Sample down to ~one capture per calendar year, oldest-first — avoids ingesting
// thousands of near-duplicate daily captures for a heavily-crawled domain.
function sampleByYear(captures, max) {
  const byYear = new Map();
  for (const c of captures) {
    const year = c.timestamp.slice(0, 4);
    if (!byYear.has(year)) byYear.set(year, c); // first capture seen per year (CDX returns ascending order)
  }
  return Array.from(byYear.values()).slice(-max);
}

async function fetchCdx(domain, from, to) {
  const params = new URLSearchParams({ url: domain });
  if (from) params.set('from', from);
  if (to)   params.set('to', to);
  const res = await fetch(`${CDX_BASE}?${params}`);
  if (!res.ok) throw new Error(`Wayback CDX fetch HTTP ${res.status}`);
  return parseCdxRows(await res.json());
}

async function fetchSnapshotText(timestamp, domain) {
  const params = new URLSearchParams({ timestamp, url: domain });
  const res = await fetch(`${SNAPSHOT_BASE}?${params}`);
  if (!res.ok) throw new Error(`Wayback snapshot fetch HTTP ${res.status}`);
  return htmlToText(await res.text());
}

// timestamp is Wayback's own 14-digit format: YYYYMMDDHHMMSS
function timestampToIso(ts) {
  const y = ts.slice(0, 4), mo = ts.slice(4, 6), d = ts.slice(6, 8);
  const h = ts.slice(8, 10) || '00', mi = ts.slice(10, 12) || '00', s = ts.slice(12, 14) || '00';
  return `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
}

// Main entry point. domain: bare hostname (e.g. "example.com"), no protocol/path.
export async function runWaybackCapture({ entityId, domain, from = '', to = '' }) {
  if (!entityId) throw new Error('runWaybackCapture: entityId is required');
  if (!domain)   throw new Error('runWaybackCapture: domain is required (no entity->domain resolution exists)');

  let allCaptures;
  try {
    allCaptures = await fetchCdx(domain, from, to);
  } catch (err) {
    return { recorded: [], total: 0, error: err.message };
  }

  const sampled  = sampleByYear(allCaptures, MAX_CAPTURES);
  const recorded = [];
  const errors    = [];

  for (const capture of sampled) {
    try {
      const rawText = await fetchSnapshotText(capture.timestamp, domain);
      if (!rawText) continue;
      const entry = recordNarrativeSnapshot({
        entityId,
        source:      SOURCE.WAYBACK,
        sourceUrl:   `https://web.archive.org/web/${capture.timestamp}/${capture.originalUrl}`,
        contentDate: timestampToIso(capture.timestamp),
        rawText,
        sourceRef:   { timestamp: capture.timestamp, originalUrl: capture.originalUrl },
      });
      recorded.push(entry);
    } catch (err) {
      errors.push({ timestamp: capture.timestamp, error: err.message });
    }
  }

  return { recorded, total: sampled.length, errors };
}
