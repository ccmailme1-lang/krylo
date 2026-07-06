// KRYL-969 Phase 1 — EDGAR Narrative Connector
// Captures Item 1 ("Business") narrative text from 10-K / S-1 filings over time.
// Spec: specs/KRYL-969-identity-evolution-engine.md §6 (EDGAR)
//
// Boundary rules:
//   NO surfacerouter, NO rkmstore, NO identitykernel — pure capture into narrativesnapshotstore.js.
//   NO inference — section extraction is mechanical regex on a fixed heading pattern, not NLP.
//   entityresolution.js -> read-only, for CIK lookup only.
//   Distinct from edgar8kconnector.js, which remains 8-K-only and untouched.

import { resolve as resolveEntity } from '../entityresolution.js';
import { recordNarrativeSnapshot, SOURCE } from '../narrativesnapshotstore.js';

const SEARCH_BASE   = '/api/edgar';
const DOCUMENT_BASE = '/api/edgar-document';
const MAX_FILINGS   = 12; // one Item 1 section per filing is already a full narrative snapshot; cap for a sane single sync

// Mechanical section extraction: "Item 1. Business" up to the next top-level Item heading.
// Not NLP — a fixed structural convention SEC filings are required to follow.
const ITEM1_START_RE = /item\s+1\.?\s*business/gi;
const NEXT_ITEM_RE   = /item\s+1a\.?\s*risk\s*factors|item\s+2\.?\s*properties/gi;
// Every 10-K/S-1 opens with a table of contents that also matches ITEM1_START_RE —
// TOC entries are a few words apart from the next heading; the real body section is
// thousands of characters long. This is a structural fact about SEC filing layout, not
// a tuned/learned threshold — confirmed against a real Apple 10-K during Phase 1 build.
const MIN_BODY_LENGTH = 1000;

// Decodes HTML entities BEFORE whitespace collapsing — real SEC filings pad headings
// with numeric non-breaking-space entities (e.g. "Item 1.&#160;&#160;Business"), which
// is literal non-whitespace text until decoded and would otherwise silently break any
// regex expecting \s between words. Confirmed against a real Apple 10-K during Phase 1 build.
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

function htmlToText(html) {
  if (!html) return '';
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  ).replace(/\s+/g, ' ').trim();
}

function extractItem1(text) {
  const starts = [...text.matchAll(ITEM1_START_RE)];
  const ends   = [...text.matchAll(NEXT_ITEM_RE)];
  if (!starts.length) return '';

  for (const startMatch of starts) {
    const startIdx = startMatch.index;
    const nextEnd  = ends.find(e => e.index > startIdx + startMatch[0].length);
    const endIdx   = nextEnd ? nextEnd.index : text.length;
    if (endIdx - startIdx >= MIN_BODY_LENGTH) {
      return text.slice(startIdx, endIdx).trim();
    }
  }
  // No candidate met the body-length threshold (e.g. a TOC-only match at end of text) — withhold rather than return a TOC fragment.
  return '';
}

async function searchFilings(cik, forms, startdt, enddt) {
  const params = new URLSearchParams({
    ciks:      String(cik).padStart(10, '0'),
    forms,
    dateRange: 'custom',
    startdt,
    enddt,
  });
  const res = await fetch(`${SEARCH_BASE}?${params}`);
  if (!res.ok) throw new Error(`EDGAR search HTTP ${res.status}`);
  const json = await res.json();
  return json.hits?.hits ?? [];
}

// hit._id is "{accession-with-dashes}:{primary-document-filename}"
function parseHitId(id) {
  const [accession, file] = String(id ?? '').split(':');
  return { accession: accession ?? '', file: file ?? '' };
}

async function fetchDocumentText(cik, accession, file) {
  if (!accession || !file) return '';
  const accessionNoDashes = accession.replace(/-/g, '');
  const params = new URLSearchParams({ cik, accession: accessionNoDashes, file });
  const res = await fetch(`${DOCUMENT_BASE}?${params}`);
  if (!res.ok) throw new Error(`EDGAR document fetch HTTP ${res.status}`);
  return htmlToText(await res.text());
}

// Mechanical: find the EX-99(.N)? row in a filing's human-readable index page and
// return its href. SEC's Document Format Files table lists a "Type" column (e.g.
// "8-K", "EX-99.1") next to each document's link — this scans <tr> rows for that
// exact convention, no inference. Confirmed against a real Apple 8-K during build.
const EX99_ROW_RE = /<tr.*?<\/tr>/gis;
const EX99_TYPE_RE = />EX-99(?:\.\d+)?</i;
const HREF_RE      = /href="([^"]+)"/i;

function findExhibit99Href(indexHtml) {
  const rows = indexHtml.match(EX99_ROW_RE) ?? [];
  for (const row of rows) {
    if (EX99_TYPE_RE.test(row)) {
      const hrefMatch = row.match(HREF_RE);
      if (hrefMatch) return hrefMatch[1];
    }
  }
  return null;
}

async function fetchFilingIndexHtml(cik, accession) {
  const accessionNoDashes = accession.replace(/-/g, '');
  const indexFile = `${accession}-index.htm`;
  const params = new URLSearchParams({ cik, accession: accessionNoDashes, file: indexFile });
  const res = await fetch(`${DOCUMENT_BASE}?${params}`);
  if (!res.ok) throw new Error(`EDGAR filing index fetch HTTP ${res.status}`);
  return res.text();
}

// Main entry point. entityName resolves to a CIK via entityresolution.js's registry —
// if the entity isn't in entityregistry.json with an edgar identifier, this throws
// rather than guessing a CIK (per zero-inference boundary).
export async function runEdgarNarrativeCapture({ entityName, from, to }) {
  const entityCard = resolveEntity(entityName);
  const cik = entityCard?.identifiers?.edgar;
  if (!cik) throw new Error(`runEdgarNarrativeCapture: no EDGAR CIK on file for "${entityName}"`);

  const startdt = from ?? '2001-01-01'; // EDGAR full-text search coverage begins 2001
  const enddt   = to   ?? new Date().toISOString().slice(0, 10);

  let hits;
  try {
    hits = await searchFilings(cik, '10-K,S-1', startdt, enddt);
  } catch (err) {
    return { recorded: [], total: 0, error: err.message };
  }

  const recorded = [];
  const errors   = [];

  for (const hit of hits.slice(0, MAX_FILINGS)) {
    const src = hit._source ?? {};
    const { accession, file } = parseHitId(hit._id);
    const filingDate = src.file_date ?? null;
    if (!filingDate) { errors.push({ hit: hit._id, error: 'missing file_date' }); continue; }

    try {
      const fullText = await fetchDocumentText(cik, accession, file);
      const item1    = extractItem1(fullText);
      if (!item1) { errors.push({ hit: hit._id, error: 'Item 1 section not found' }); continue; }

      const entry = recordNarrativeSnapshot({
        entityId:    entityCard.canonicalId,
        source:      SOURCE.EDGAR,
        sourceUrl:   `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, '')}/${file}`,
        contentDate: filingDate,
        rawText:     item1,
        sourceRef:   { cik, accessionNumber: accession, formType: src.root_forms?.[0] ?? src.form ?? 'UNKNOWN', itemSection: 'Item 1 - Business' },
      });
      recorded.push(entry);
    } catch (err) {
      errors.push({ hit: hit._id, error: err.message });
    }
  }

  return { recorded, total: hits.length, errors };
}

// KRYL-969 Phase 1.x extension (built same session, per Founder GO) — captures a
// company's own press release text via 8-K Exhibit 99.1, which is routinely the
// verbatim press release a company issues for earnings, M&A, and other announcements.
// Still EDGAR-sourced (SOURCE.EDGAR, not a new source) — same CIK resolution, same
// document-fetch proxy, same zero-inference boundary as runEdgarNarrativeCapture.
export async function runEdgarPressReleaseCapture({ entityName, from, to }) {
  const entityCard = resolveEntity(entityName);
  const cik = entityCard?.identifiers?.edgar;
  if (!cik) throw new Error(`runEdgarPressReleaseCapture: no EDGAR CIK on file for "${entityName}"`);

  const startdt = from ?? '2001-01-01';
  const enddt   = to   ?? new Date().toISOString().slice(0, 10);

  let hits;
  try {
    hits = await searchFilings(cik, '8-K', startdt, enddt);
  } catch (err) {
    return { recorded: [], total: 0, error: err.message };
  }

  const recorded = [];
  const errors   = [];

  for (const hit of hits.slice(0, MAX_FILINGS)) {
    const src        = hit._source ?? {};
    const { accession } = parseHitId(hit._id);
    const filingDate  = src.file_date ?? null;
    if (!filingDate || !accession) { errors.push({ hit: hit._id, error: 'missing file_date or accession' }); continue; }

    try {
      const indexHtml = await fetchFilingIndexHtml(cik, accession);
      const href      = findExhibit99Href(indexHtml);
      if (!href) { errors.push({ hit: hit._id, error: 'no EX-99 exhibit in this filing' }); continue; }

      const file = href.split('/').pop();
      const text = await fetchDocumentText(cik, accession, file);
      if (!text) { errors.push({ hit: hit._id, error: 'exhibit fetched but empty' }); continue; }

      const entry = recordNarrativeSnapshot({
        entityId:    entityCard.canonicalId,
        source:      SOURCE.EDGAR,
        sourceUrl:   `https://www.sec.gov${href}`,
        contentDate: filingDate,
        rawText:     text,
        sourceRef:   { cik, accessionNumber: accession, formType: '8-K', itemSection: 'Exhibit 99.1 - Press Release' },
      });
      recorded.push(entry);
    } catch (err) {
      errors.push({ hit: hit._id, error: err.message });
    }
  }

  return { recorded, total: hits.length, errors };
}
