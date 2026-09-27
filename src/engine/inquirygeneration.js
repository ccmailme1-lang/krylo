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

// ── KRYL-1329 — PRE-SUBMIT next-question assistance (Founder rulings 2026-09-26/27) ─────────────
// REWRITTEN 2026-09-27 (Founder: "stop patching the chip filter, you're solving the wrong problem").
// This is NOT a chip-sequence/round tracker. There is no remembered state at all: every call
// recomputes from scratch against whatever the CURRENT full query text is, whether the guest typed
// it, edited it, or arrived at it by selecting a suggestion. The governing question, asked fresh
// every time:
//
//   "Given the guest's CURRENT text, is there a materially useful, EXPLICITLY GROUNDED direction
//    the guest has not already established?" -- yes -> offer it (up to 3 at once); no -> [].
//
// Grounding rule (Founder-ruled 2026-09-27, unchanged from the audit fix): a candidate must trace
// to an explicit trigger WORD present anywhere in the current text. No generic/ontology-derived
// category menus (the six-pressure menu this replaced was rejected for exactly that). "Already
// established" is decided ONLY by the candidate's exact phrase already being present in the text --
// never by a single word of the phrase coincidentally appearing elsewhere (that was the bug: the
// word "vendor" in the SUBJECT "Vendor Platform" wrongly suppressed the candidate "technology /
// vendor changes", which the guest had never actually stated).
// Free text and chip selection are the same input: a guest who types
// "Vendor Platform Decoupling + technology / architecture changes" gets IDENTICAL treatment to one
// who selected that chip -- both are just "the current text contains that phrase already."
// Maximum 3 established directions total (a ceiling, not a target): once 3 of the catalog's
// phrases are present in the text, or no ungrounded/unestablished catalog row remains, return [].
//
// CATALOG STATUS: every phrase and trigger below is DRAFT for the Founder's review (D4). Order =
// catalog order; no scoring, no ranking.
export const MAX_CHIPS_PER_ROUND = 3;
export const MAX_ROUNDS          = 3; // kept as the "3 components max" ceiling name for compatibility

// RATIFIED (Founder product contract + UI approval, 2026-09-27, KRYL-1329): D4/D6 closed by direct
// ruling. Grounding is a trigger WORD the guest actually wrote, found anywhere in their own text --
// not restricted to the parser's fixed six-domain vocabulary (see deriveNextDirections below): a
// catalog row's triggers are matched directly against the guest text, independent of DOMAIN_MAP.
export const NEXT_DIRECTION_CATALOG = Object.freeze([
  { id: 'T1',  phrase: 'technology / architecture changes', triggers: ['tech', 'software', 'digital', 'ai', 'platform', 'infrastructure', 'compute', 'algorithm'] },
  { id: 'T2',  phrase: 'technology / vendor changes',       triggers: ['platform', 'software', 'infrastructure', 'compute'] },
  { id: 'T3',  phrase: 'technology / adoption changes',     triggers: ['digital', 'software', 'ai', 'tech'] },
  { id: 'L2',  phrase: 'contract / obligation changes',     triggers: ['contract', 'liability', 'lawsuit'] },
  { id: 'PB1', phrase: 'local politician reaction',         triggers: ['pushback', 'backlash', 'opposition', 'protest'] },
]);

// Alias so the mechanism test file's exhaustive coverage (round progression, contamination matrix,
// purity fuzz) keeps running against a fixed reference catalog.
export const _TEST_ONLY_DRAFT_CATALOG = NEXT_DIRECTION_CATALOG;

const hasWord = (lowerText, w) => new RegExp('(^|[^a-z0-9])' + w + '(?:s|es)?(?![a-z0-9])').test(lowerText);

/**
 * establishedDirections — which catalog directions the CURRENT text already states, regardless of
 * how they got there (guest typed them, or a chip was selected). Exported so the UI/tests can ask
 * "how many components does this query already have" without re-deriving the candidate logic.
 * @returns {Array<{id: string, phrase: string}>}
 */
export function establishedDirections(text, catalog = NEXT_DIRECTION_CATALOG) {
  const lower = (text ?? '').toLowerCase();
  return catalog.filter(c => lower.includes(c.phrase));
}

/**
 * deriveNextDirections — recomputed fresh every call from the CURRENT text alone. No memory of
 * prior rounds or prior selections; a guest who types the same end state by hand gets the same
 * answer as one who used every suggestion.
 * @param {{text: string}} input  the current full query text, verbatim.
 * @returns {Array<{id: string, label: string, appendText: string, basis: {keyword: string, start: number, end: number}}>}
 */
export function deriveNextDirections({ text, catalog = NEXT_DIRECTION_CATALOG } = {}) {
  const full = (text ?? '').trim();
  if (!full) return [];
  if (/[?]\s*$/.test(full)) return [];                              // a complete question: zero by default

  const ctx = buildQueryContext(full);
  if ((ctx.decisionCues ?? []).length > 0) return [];                // cue-bearing input: zero by default
  if (ctx.scenarioCues?.present) return [];
  if ((ctx.numbers ?? []).length > 0) return [];
  if (ctx.geo && ctx.geo.state && ctx.geo.state !== 'absent') return [];

  if (establishedDirections(full, catalog).length >= MAX_ROUNDS) return []; // 3 components max, a ceiling

  const lower = full.toLowerCase();
  const out = [];
  for (const c of catalog) {
    if (out.length >= MAX_CHIPS_PER_ROUND) break;
    if (lower.includes(c.phrase)) continue;                          // already established -- guest-typed
                                                                      // or previously selected, treated the same
    // Grounding: an explicit trigger word present anywhere in the current text. This is the ONLY
    // "already expressed" signal (no single-word-overlap heuristic): "vendor" appearing in the
    // subject "Vendor Platform" must not suppress "technology / vendor changes" merely because
    // that candidate's own phrase happens to contain the word "vendor" too (found on real input,
    // 2026-09-27) -- the candidate is only excluded once ITS OWN phrase is literally in the text.
    const trigger = c.triggers.find(t => hasWord(lower, t));
    if (!trigger) continue;                                          // no explicit word, no candidate
    const m = new RegExp('(^|[^a-z0-9])' + trigger + '[a-z]*').exec(lower);
    out.push({
      id:         `nd:${c.id}`,
      label:      c.phrase,
      appendText: ` + ${c.phrase}`,
      basis:      { keyword: trigger, start: m.index + m[1].length, end: m.index + m[0].length },
    });
  }
  return out;
}
