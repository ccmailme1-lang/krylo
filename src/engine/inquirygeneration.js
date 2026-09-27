// inquirygeneration.js — KRYL-1290 subtask 2
//
// Derives candidate Inquiry Chips from raw, possibly partial, user interest text.
// Sits strictly upstream of any formed query:
//
//   USER INTEREST -> ParsedIntent (WO-1342) -> inquiry possibilities (this module)
//                  -> ANALYTICAL QUESTION -> Analysis Intent (not built here)
//
// Pure derivation — no React, no side effects, no network. Every candidate is
// grounded in ParsedIntent evidence (`basis` names exactly which fields produced
// it); nothing here fabricates a subject or asserts a relationship/condition
// exists (spec §5, §7). Absence of both entity and domain evidence produces zero
// candidates, never a filler chip — a bare verb with nothing to examine names
// nothing examinable (Absence-Is-Signal, CLAUDE.md §1).
//
// Spec:        specs/SPEC-autonomous-inquiry-chips-v1.1.md
// Disposition: specs/ASSET-DISPOSITION-autonomous-inquiry-chips.md — EXTEND, DO NOT
//              REPLACE intentparser.js. This module consumes ParsedIntent as
//              evidence only; it does not modify or duplicate it.
//
// Non-goals (this subtask): no five-dimensional Analysis Intent object, no chip
// UI/React component, no wiring into analysisidlefield.jsx. Labels below are
// mechanical placeholders for testing candidate derivation — final chip copy is
// a Founder creative decision (CLAUDE.md §5 Design Sovereignty), not set here.
//
// KRYL-1290 subtask 5 — added `question` per candidate (spec §6, Chip -> Question
// Transition): a full sentence, distinct from `label` (unchanged), built from the
// exact same entity/domain/verb_matched values already grounding that candidate's
// `label` and `basis` — same provenance, no separate/generic source. `label`'s
// existing output is untouched (regression-safe: same inputs, same function).

import { parseIntent } from './intentparser.js';
import { buildQueryContext } from './querycontext.js';

const VERB_TEMPLATE = {
  TRACK:       x => `TRACK ${x} OVER TIME`,
  INVESTIGATE: x => `EXAMINE ${x}`,
  COMPARE:     x => `COMPARE ${x}`,
  MONITOR:     x => `MONITOR ${x} FOR CHANGE`,
  HEDGE:       x => `EXAMINE EXPOSURE AROUND ${x}`,
  SECURE:      x => `EXAMINE WHAT STABILIZES ${x}`,
  AUDIT:       x => `REVIEW ${x}`,
  ACCELERATE:  x => `EXAMINE WHAT CONSTRAINS ${x}`,
  REPOSITION:  x => `EXAMINE ALTERNATIVES TO ${x}`,
  VALIDATE:    x => `CHECK ${x} AGAINST STRUCTURE`,
};

const QUESTION_TEMPLATE = {
  TRACK:       x => `Track ${x} over time.`,
  INVESTIGATE: x => `Examine ${x}.`,
  COMPARE:     x => `Compare ${x}.`,
  MONITOR:     x => `Monitor ${x} for change.`,
  HEDGE:       x => `Examine the exposure around ${x}.`,
  SECURE:      x => `Examine what stabilizes ${x}.`,
  AUDIT:       x => `Review ${x}.`,
  ACCELERATE:  x => `Examine what constrains ${x}.`,
  REPOSITION:  x => `Examine alternatives to ${x}.`,
  VALIDATE:    x => `Check ${x} against structure.`,
};

const VISIBLE_CAP = 4;

// Only use the matched verb's template as real evidence-backed phrasing when the
// parser actually found that verb (verb_matched) — the INVESTIGATE fallback is a
// default, not a signal, per intentparser.js's own verb_matched contract.
function labelFor(verb, verbMatched, subject) {
  const template = verbMatched ? VERB_TEMPLATE[verb] : null;
  return template ? template(subject) : `EXAMINE ${subject}`;
}

function questionFor(verb, verbMatched, subject) {
  const template = verbMatched ? QUESTION_TEMPLATE[verb] : null;
  return template ? template(subject) : `Examine ${subject}.`;
}

// Sentence-case subject phrasing for `question` — kept separate from the
// all-caps subject strings `labelFor` uses, so `label`'s output is unaffected.
function entityDomainSubject(entity, domain) {
  return `${entity}'s ${domain.toLowerCase()} structure`;
}
function domainOnlySubject(domain) {
  return `the ${domain.toLowerCase()} structure`;
}

/**
 * deriveInquiryPossibilities — candidate Inquiry Chips for the given raw interest
 * text. Partial input is fully valid (spec §4) — a single entity or a single
 * domain, with or without a matched verb, is sufficient to produce candidates.
 * @param {string} rawInput
 * @returns {Array<{id: string, label: string, question: string, basis: string[]}>}
 *   up to VISIBLE_CAP candidates, most-specific first (entity+domain pairs, then
 *   entity-only, then domain-only). `question` is an editable natural-language
 *   sentence grounded in the same evidence as `label`/`basis` (spec §6).
 */
export function deriveInquiryPossibilities(rawInput) {
  const parsed = parseIntent(rawInput);
  const { verb_matched, normalized_verb, entities, domains } = parsed;

  const candidates = [];

  // Entity x domain pairs — most specific, highest priority.
  for (const entity of entities) {
    for (const domain of domains) {
      candidates.push({
        id:       `ed:${entity}:${domain}`,
        label:    labelFor(normalized_verb, verb_matched, `${entity}'S ${domain} STRUCTURE`),
        question: questionFor(normalized_verb, verb_matched, entityDomainSubject(entity, domain)),
        basis:    [...(verb_matched ? ['verb_matched'] : []), 'entities', 'domains'],
      });
    }
  }

  // Entity alone — only when no domain already paired with it above.
  if (domains.length === 0) {
    for (const entity of entities) {
      candidates.push({
        id:       `e:${entity}`,
        label:    labelFor(normalized_verb, verb_matched, entity),
        question: questionFor(normalized_verb, verb_matched, entity),
        basis:    [...(verb_matched ? ['verb_matched'] : []), 'entities'],
      });
    }
  }

  // Domain alone — only when no entity already paired with it above.
  if (entities.length === 0) {
    for (const domain of domains) {
      candidates.push({
        id:       `d:${domain}`,
        label:    labelFor(normalized_verb, verb_matched, `${domain} STRUCTURE`),
        question: questionFor(normalized_verb, verb_matched, domainOnlySubject(domain)),
        basis:    [...(verb_matched ? ['verb_matched'] : []), 'domains'],
      });
    }
  }

  return candidates.slice(0, VISIBLE_CAP);
}

export { VISIBLE_CAP };

// ── KRYL-1329 — PRE-SUBMIT next-question assistance, up to three rounds (Founder rulings 2026-09-26) ─
// Separate from deriveInquiryPossibilities above (unchanged). Deterministic, PRE-SUBMIT only, no LLM,
// no observations, no evidence, no ontology-derived candidates.
//
// Model: 0-3 candidates per round; the guest selects at most one; the exact text is appended; the next
// round re-evaluates the guest's text; at most three rounds; zero candidates ends assistance.
//
// GROUNDING (R-F): only GUEST-AUTHORED text grounds a candidate. Text KRYLO appended in an earlier round
// is removed before grounding, so KRYLO's own words never become evidence and a selection is not new
// evidence — it only removes that candidate from later rounds (a phrase already appended, or already in
// the text, is never offered again).
// Each candidate is grounded in an explicit SPAN of the guest's text: the keyword the parser matched
// (parseIntent().domain_hits from KRYL-1331, on the KRYL-1330 word-boundary matching), reported with
// its offsets. No span, no candidate.
// DIRECTIONALITY / zero-default: a candidate is suppressed when the guest's text already contains a
// content word of its own phrase (the direction is already expressed), when the guest's text carries a
// decision, scenario, number or place cue, or when it is a question (ends with "?").
//
// CATALOG STATUS: every phrase and trigger below is DRAFT for the Founder's review (D4) and the
// adjacent-direction license (D6) is ASSUMED for this localhost prototype only. Order = catalog order;
// no scoring, no ranking. `call` records the reviewer disposition from the D4 table.
export const MAX_CHIPS_PER_ROUND = 3;
export const MAX_ROUNDS          = 3;

export const NEXT_DIRECTION_CATALOG = Object.freeze([
  { id: 'T1', phrase: 'technology / architecture changes', triggers: ['tech', 'software', 'digital', 'ai', 'platform', 'infrastructure', 'compute', 'algorithm'], call: 'CHANGE' },
  { id: 'T2', phrase: 'technology / vendor changes',       triggers: ['platform', 'software', 'infrastructure', 'compute'], call: 'D6' },
  { id: 'T3', phrase: 'technology / adoption changes',     triggers: ['digital', 'software', 'ai', 'tech'], call: 'D6' },
  { id: 'F2', phrase: 'funding / allocation changes',      triggers: ['fund', 'portfolio', 'asset', 'equity'], call: 'D6' },
  { id: 'F3', phrase: 'ownership / stake changes',         triggers: ['equity', 'stock', 'portfolio'], call: 'D6' },
  { id: 'M3', phrase: 'competitive / share changes',       triggers: ['industry', 'sector', 'share'], call: 'D6' },
  { id: 'L2', phrase: 'contract / obligation changes',     triggers: ['contract', 'liability', 'lawsuit'], call: 'CHANGE' },
  { id: 'H3', phrase: 'hospital / capacity changes',       triggers: ['hospital', 'healthcare'], call: 'D6' },
  { id: 'C2', phrase: 'role / skills changes',             triggers: ['career', 'role', 'job'], call: 'D6' },
  { id: 'C3', phrase: 'organization / staffing changes',   triggers: ['organization', 'workforce', 'hiring'], call: 'D6' },
]);

const PHRASE_STOPWORDS = new Set(['changes', 'change']);
const hasWord = (lowerText, w) => new RegExp('(^|[^a-z0-9])' + w + '(?:s|es)?(?![a-z0-9])').test(lowerText);
const contentWords = phrase => phrase.split(/[^a-z]+/).filter(w => w && !PHRASE_STOPWORDS.has(w));

// The guest-authored text: `text` with every phrase KRYLO appended (first occurrence of " + <phrase>")
// removed. A phrase the guest has edited no longer matches and is treated as guest text.
export function guestAuthoredText(text, appended = []) {
  let out = text ?? '';
  for (const phrase of appended) {
    const i = out.indexOf(` + ${phrase}`);
    if (i !== -1) out = out.slice(0, i) + out.slice(i + ` + ${phrase}`.length);
  }
  return out;
}

/**
 * deriveNextDirections — candidates for the current round; [] when none qualifies or assistance is over.
 * @param {{text: string, appended?: string[]}} input  the current full query text and the phrases
 *   KRYLO has appended so far in this assistance sequence (round = appended.length).
 * @returns {Array<{id: string, label: string, appendText: string, basis: {keyword: string, start: number, end: number}}>}
 */
export function deriveNextDirections({ text, appended = [] } = {}) {
  const full = text ?? '';
  if (!full.trim() || appended.length >= MAX_ROUNDS) return [];

  const guest = guestAuthoredText(full, appended);
  if (!guest.trim()) return [];
  if (/[?]\s*$/.test(guest.trim())) return [];                     // a question: zero by default

  const ctx = buildQueryContext(guest);
  if ((ctx.decisionCues ?? []).length > 0) return [];               // cue-bearing input: zero by default
  if (ctx.scenarioCues?.present) return [];
  if ((ctx.numbers ?? []).length > 0) return [];
  if (ctx.geo && ctx.geo.state && ctx.geo.state !== 'absent') return [];

  const hits     = parseIntent(guest).domain_hits ?? [];           // span-level evidence (KRYL-1331)
  const lowerG   = guest.toLowerCase();
  const lowerAll = full.toLowerCase();
  const out = [];
  for (const c of NEXT_DIRECTION_CATALOG) {
    if (out.length >= MAX_CHIPS_PER_ROUND) break;
    if (appended.includes(c.phrase)) continue;                       // selection removes the candidate
    if (lowerAll.includes(c.phrase)) continue;                       // never offer text already present
    const hit = hits.find(h => c.triggers.includes(h.keyword));
    if (!hit) continue;                                              // no explicit span, no candidate
    if (contentWords(c.phrase).some(w => hasWord(lowerG, w))) continue;   // direction already expressed
    out.push({
      id:         `nd:${c.id}`,
      label:      c.phrase,
      appendText: ` + ${c.phrase}`,
      basis:      { keyword: hit.keyword, start: hit.start, end: hit.end },
    });
  }
  return out;
}
