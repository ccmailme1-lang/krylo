// frameclassify.js — Frame Classification & Anchoring, stage 1 (Founder GO 2026-08-30).
//
// When subjectScope does NOT resolve an ENTITY, classify the analytical object the
// user supplied into a CLOSED set of 4, and produce the class-native anchor set —
// the anchors that would make the frame resolvable.
//
//   classifyFrame(query | queryContext) →
//     { class: 'DECISION_FRAME' | 'PORTFOLIO_FRAME' | 'MARKET_THEME' | 'NO_FRAME',
//       evidence: { ...what the engine already extracted },
//       anchors: [ { key, label, value | null, hint? } ],
//       unresolved: [ ...anchor keys with no value ] }
//
// CONTRACT: anchors establish the object and scope of OBSERVATION. They are never
// conclusion inputs and must never generate a verdict, score, recommendation, or
// formation. This module is a surface/remediation layer over what queryContext
// already computes — it does NOT import synthesis and does NOT redesign
// classification.

import { buildQueryContext } from './querycontext.js';

export const FRAME_CLASSIFY_VERSION = '1';
export const FRAME_CLASSES = Object.freeze(['DECISION_FRAME', 'PORTFOLIO_FRAME', 'MARKET_THEME', 'NO_FRAME']);

// ── surface-language detectors (evidence, not resolution) ────────────────────
const PORTFOLIO_RE = /\b(?:portfolio|fund|vintage|diversified|\blp\b|\bgp\b|limited partner|general partner|deployment mandate|deploy(?:ment)? vehicle|minimum (?:investment|ticket|check)|single commitment|candidate universe)\b|\b\d{1,3}\s*[-–—to]{1,3}\s*\d{1,3}\s+(?:companies|startups|names|positions|investments)\b|\btarget\s+(?:portfolio|count)\b/i;
const MARKET_RE   = /\b(?:market|sector|theme|industry|landscape|category|the\s+\w+\s+space|trend|tam|addressable market|market segment|sub[- ]?sector)\b/i;
const STAGE_RE    = /\b(?:pre[- ]?seed|seed|series\s+[a-f]\d?|angel|bridge|growth(?:\s+equity)?|early[- ]stage|late[- ]stage|mezzanine|buyout)\b/i;
const HORIZON_RE  = /\b(?:by\s+)?(?:q[1-4]\s*(?:20\d\d|['’]?\d\d)?|20\d\d|next\s+(?:quarter|year|\d+\s+(?:months?|years?|quarters?))|within\s+\d+\s+(?:months?|years?|quarters?)|\d+\s*(?:month|year|quarter)s?\s+(?:horizon|window|out))\b/i;
const SECTOR_RE   = /\b(ai(?:[- ]first)?(?:\s+infrastructure)?|artificial intelligence|machine learning|compute|semiconductor|chips?|data (?:layer|center|infrastructure)|networking|cloud|saas|fintech|biotech|healthtech|climate|energy|defen[cs]e|robotics|cybersecurity|edge ai|quantum|space|real estate|logistics|supply chain|consumer|enterprise software|developer tools|infrastructure)\b/i;

const TITLECASE_RE = /\b([A-Z][A-Za-z][A-Za-z.&'-]*(?:\s+[A-Z][A-Za-z][A-Za-z.&'-]*)*)\b/g;

function text(input) {
  if (typeof input === 'string') return input;
  return input?.rawQuery ?? input?.query ?? '';
}
function firstMatch(re, s) { const m = s.match(re); return m ? m[0].trim() : null; }

// ── anchor builders — each returns [{ key, label, value|null, hint? }] ───────
const anchor = (key, label, value, hint) => ({ key, label, value: value ?? null, ...(hint ? { hint } : {}) });

function decisionAnchors(t, qc) {
  const numeric = (qc.numbers ?? []).find(n => /[$£€]|k\b|m\b|mm\b|bn?\b|million|billion/i.test(String(n.raw ?? n)));
  return [
    anchor('decision_type',    'DECISION TYPE',    qc.decisionCues?.[0] ?? null),
    anchor('target_sector',    'TARGET SECTOR',    firstMatch(SECTOR_RE, t)),
    anchor('stage',            'STAGE / MATURITY', firstMatch(STAGE_RE, t)),
    anchor('ticket_size',      'TICKET SIZE',      numeric ? String(numeric.raw ?? numeric) : null),
    anchor('geography',        'GEOGRAPHY',        qc.geo?.state === 'resolved' ? (qc.geo.value?.location ?? null) : null),
    anchor('decision_horizon', 'DECISION HORIZON', firstMatch(HORIZON_RE, t)),
    anchor('candidate',        'CANDIDATE / TARGET', qc.intent?.entities?.[0] ?? null, 'a named candidate promotes this to a Target Packet'),
  ];
}

function portfolioAnchors(t, qc) {
  const count = firstMatch(/\b\d{1,3}\s*[-–—to]{1,3}\s*\d{1,3}\s+(?:companies|startups|names|positions|investments)\b|\btarget\s+(?:portfolio|count)\b/i, t);
  const minTicket = firstMatch(/minimum (?:investment|ticket|check)[:\s]*[$£€]?[\d,.]+\s*(?:k|m|mm|bn?)?/i, t);
  const vintage = firstMatch(/\b(?:vintage\s+20\d\d|20\d\d\s+vintage)\b/i, t);
  return [
    anchor('portfolio_identity', 'PORTFOLIO / FUND IDENTITY', qc.intent?.entities?.[0] ?? null),
    anchor('thesis_sector',      'INVESTMENT THESIS / SECTOR', firstMatch(SECTOR_RE, t)),
    anchor('vintage',            'VINTAGE',                   vintage),
    anchor('stage',              'STAGE',                     firstMatch(STAGE_RE, t)),
    anchor('geography',          'GEOGRAPHY',                 qc.geo?.state === 'resolved' ? (qc.geo.value?.location ?? null) : null),
    anchor('portfolio_size',     'PORTFOLIO SIZE / TARGET COUNT', count),
    anchor('minimum_ticket',     'MINIMUM TICKET',            minTicket),
    anchor('candidate_universe', 'CANDIDATE UNIVERSE',        null, 'if known'),
  ];
}

function marketAnchors(t, qc) {
  const entities = qc.intent?.entities ?? [];
  return [
    anchor('theme_sector',   'THEME / SECTOR',        firstMatch(SECTOR_RE, t)),
    anchor('geography',      'GEOGRAPHY',             qc.geo?.state === 'resolved' ? (qc.geo.value?.location ?? null) : null),
    anchor('time_horizon',   'TIME HORIZON',          firstMatch(HORIZON_RE, t)),
    anchor('market_segment', 'MARKET SEGMENT / SUB-SECTOR', null, 'e.g. compute / networking / data layer'),
    anchor('stage',          'STAGE / MATURITY',      firstMatch(STAGE_RE, t), 'if applicable'),
    anchor('named_entities', 'NAMED COMPANIES / ENTITIES', entities.length ? entities.join(' · ') : null, 'if any'),
  ];
}

export function classifyFrame(input) {
  const t  = text(input).trim();
  const qc = (input && typeof input === 'object' && input.rawQuery !== undefined)
    ? input
    : buildQueryContext(t);

  const evidence = {
    decisionCues: qc.decisionCues ?? [],
    sector:       firstMatch(SECTOR_RE, t),
    stage:        firstMatch(STAGE_RE, t),
    horizon:      firstMatch(HORIZON_RE, t),
    entities:     qc.intent?.entities ?? [],
    geo:          qc.geo?.state === 'resolved' ? (qc.geo.value?.location ?? null) : null,
    assetClass:   qc.assetClass?.state === 'resolved' ? qc.assetClass.value : null,
  };

  const hasDecision  = (qc.decisionCues ?? []).length > 0;
  const hasPortfolio = PORTFOLIO_RE.test(t);
  const hasMarket    = MARKET_RE.test(t) && !!evidence.sector;

  let cls;
  if (hasPortfolio)      cls = 'PORTFOLIO_FRAME';
  else if (hasDecision)  cls = 'DECISION_FRAME';
  else if (hasMarket)    cls = 'MARKET_THEME';
  else                   cls = 'NO_FRAME';

  const anchors =
    cls === 'DECISION_FRAME'  ? decisionAnchors(t, qc) :
    cls === 'PORTFOLIO_FRAME' ? portfolioAnchors(t, qc) :
    cls === 'MARKET_THEME'    ? marketAnchors(t, qc) :
    [];

  return Object.freeze({
    class: cls,
    evidence: Object.freeze(evidence),
    anchors: Object.freeze(anchors),
    unresolved: Object.freeze(anchors.filter(a => a.value == null).map(a => a.key)),
  });
}

// A one-line frame descriptor for the packet header: "DECISION FRAME · invest · AI infrastructure · Series B"
export function frameHeadline(result) {
  if (!result || result.class === 'NO_FRAME') return null;
  const label = result.class.replace(/_/g, ' ');
  const bits = [result.evidence.decisionCues[0], result.evidence.sector, result.evidence.stage].filter(Boolean);
  return bits.length ? `${label} · ${bits.join(' · ')}` : label;
}
