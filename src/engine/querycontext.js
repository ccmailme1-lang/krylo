// querycontext.js — KRYL-1221 Phase 1
//
// One authoritative, immutable record of what the user submitted, built once at
// intake. It is an INTAKE ARTIFACT, not a second analytical engine (spec §0): it
// normalizes the query, it does not resolve a domain, weigh evidence, or touch a
// formation. `assertNoEngineFields` enforces that boundary.
//
// Phase 1 is additive: `buildQueryContext` is attached to the session by
// `createSession`; no consumer reads it yet. Spec: SPEC-KRYL-1221-query-context-contract.md

import { parseIntent } from './intentparser.js';
import { extractNumbers } from './numberextract.js';
import { resolveGeo } from './georesolver.js';

export const QUERY_CONTEXT_VERSION = '1.0.0-phase-1';

// Keys that only exist as Truth-Engine output. Their presence anywhere in a
// QueryContext means the intake boundary was crossed.
const ENGINE_KEYS = new Set([
  'queryDomain', 'signalCount', 'magnitude', 'evidence', 'evidenceRefs',
  'relationships', 'admittedRelationships', 'formation', 'formationId',
  'convergence', 'convergenceState', 'polarity', 'story', 'storyType',
  'provenanceLimit',
]);

function assertNoEngineFields(ctx) {
  const walk = (obj, path) => {
    if (!obj || typeof obj !== 'object') return;
    for (const k of Object.keys(obj)) {
      if (ENGINE_KEYS.has(k)) {
        throw new Error(`QueryContext boundary violation: "${path}${k}" is Truth-Engine territory (spec §2)`);
      }
      walk(obj[k], `${path}${k}.`);
    }
  };
  walk(ctx, '');
  return ctx;
}

function deepFreeze(o) {
  for (const k of Object.getOwnPropertyNames(o)) {
    const v = o[k];
    if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v);
  }
  return Object.freeze(o);
}

// djb2 — stable, deterministic; the id is a function of rawQuery alone (AC-3).
function stableHash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (((h << 5) + h) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

// ── Asset / entity class ─────────────────────────────────────────────────────
// Thin deterministic keyword map. Not domain routing — a characteristic of the
// query text.
const ASSET_CLASS_PATTERNS = [
  ['COMMERCIAL_REAL_ESTATE', /\bcommercial (?:unit|property|building|space|real estate|lot)\b|\boffice (?:building|space|tower)\b|\bretail (?:unit|space|storefront)\b|\bwarehouse\b|\bmultifamily\b|\bmixed[- ]use\b/i],
  ['RESIDENTIAL_REAL_ESTATE', /\b(?:home|house|condo|apartment|townhouse|duplex|co[- ]?op)\b/i],
  ['EQUITY_STAKE', /\b(?:equity stake|controlling stake|minority stake|common stock|preferred stock|share(?:s|holding))\b/i],
  ['DEBT_INSTRUMENT', /\b(?:bond|note|loan|debt|credit facility|mortgage|refinanc)\w*\b/i],
  ['PRIVATE_COMPANY', /\b(?:startup|private company|portfolio company|acquisition target|target company)\b/i],
  ['VEHICLE', /\b(?:car|truck|suv|vehicle|fleet)\b/i],
];

function deriveAssetClass(text) {
  for (const [cls, re] of ASSET_CLASS_PATTERNS) {
    if (re.test(text)) return { state: 'resolved', value: cls };
  }
  return { state: 'absent', reason: 'no asset-class keyword matched' };
}

// ── Decision cues ────────────────────────────────────────────────────────────
// Surface language hits, NOT a resolved decision.
const DECISION_CUE_VERBS = [
  'buy', 'purchase', 'sell', 'lease', 'acquire', 'divest', 'refinance', 'invest',
  'hire', 'merge', 'expand', 'exit', 'raise', 'relocate', 'consolidate',
];

function deriveDecisionCues(text) {
  const q = (text ?? '').toLowerCase();
  const cues = [];
  for (const v of DECISION_CUE_VERBS) {
    if (new RegExp(`\\b${v}(?:s|d|ed|ing|e)?\\b`).test(q)) cues.push(v);
  }
  return cues;
}

// ── parse confidence — deterministic aggregate, 0..1 ─────────────────────────
function computeParseConfidence({ intent, numbers, geo, assetClass, decisionCues }) {
  let score = 0;
  const dims = 5;
  score += intent.ambiguity_score < 0.5 ? 1 : intent.ambiguity_score < 0.9 ? 0.5 : 0;
  score += numbers.length > 0 ? 1 : 0;
  score += geo.state === 'resolved' ? 1 : 0;
  score += assetClass.state === 'resolved' ? 1 : 0;
  score += decisionCues.length > 0 ? 1 : 0;
  return parseFloat((score / dims).toFixed(3));
}

/**
 * buildQueryContext — the single build point (spec §5, §13).
 * @param {string} rawQuery  post geo-disambiguation-gate query text
 * @param {{ now?: number }} opts  now — injectable for deterministic tests
 * @returns frozen QueryContext
 */
export function buildQueryContext(rawQuery, opts = {}) {
  const now  = opts.now ?? Date.now();
  const text = typeof rawQuery === 'string' ? rawQuery : '';

  const intent  = parseIntent(text);
  const numbers = extractNumbers(text);

  // geo — resolveGeo is an ambiguity detector against a static table, not a
  // general geo extractor. Unambiguous locations ("New York city") → absent.
  const g = resolveGeo(text);
  const geo = g.resolvedLocation
    ? { state: 'resolved', value: { location: g.resolvedLocation, token: g.locationToken, source: 'ambiguity-table' } }
    : g.geoAmbiguous
      ? { state: 'absent', reason: `ambiguous location "${g.locationToken}" not disambiguated at intake` }
      : { state: 'absent', reason: 'no ambiguous location token in query (real geo extraction is a follow-on ticket)' };

  const assetClass    = deriveAssetClass(text);
  const decisionCues  = deriveDecisionCues(text);

  const unresolved = [];
  if (geo.state === 'absent')        unresolved.push('geo');
  if (numbers.length === 0)          unresolved.push('numbers');
  if (assetClass.state === 'absent') unresolved.push('assetClass');
  if (decisionCues.length === 0)     unresolved.push('decisionCues');

  const ctx = {
    id:       `qc_${stableHash(text)}`,
    rawQuery: text,
    geo,
    intent: {
      verb:      intent.normalized_verb,
      entities:  [...intent.entities],
      domains:   [...intent.domains],   // heuristic text hint — NOT engine domain resolution
      ambiguity: intent.ambiguity_score,
    },
    numbers:      [...numbers],
    assetClass,
    decisionCues,
    parseConfidence: computeParseConfidence({ intent, numbers, geo, assetClass, decisionCues }),
    unresolved,
    provenance: {
      parserVersion:       QUERY_CONTEXT_VERSION,
      intentParserVersion: intent.parser_version,
      parsedAt:            now,
      source:              'intake',
    },
  };

  assertNoEngineFields(ctx);
  return deepFreeze(ctx);
}
