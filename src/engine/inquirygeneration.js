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

// ── KRYL-1326 / KRYL-1329 — PRE-SUBMIT additive question assistance (Founder rulings 2026-09-26) ─
// Separate from deriveInquiryPossibilities above (unchanged): that function restates the parsed
// entity/domain; this one only ever proposes ADDITIVE phrases the guest may append to what they are
// typing. Deterministic, PRE-SUBMIT only, built from parseIntent()/buildQueryContext() and nothing
// else — no observations, no evidence, no LLM, no new classifier or keyword matcher.
//
// KRYL-1329: a FIXED MENU of the six canonical pressures. The menu makes NO applicability claim —
// it presents possible dimensions the guest may choose to add; the guest decides whether one
// belongs in the question. The parser's domain signals do not gate it (they are incomplete and
// many-to-one). All six are unranked peers, in the fixed order below; there is no scoring, no
// ranking, no cap. Each phrase indicates a direction for inquiry, never an assertion that the
// change exists.
//
// Eligibility — a CONSERVATIVE gate, not a completeness detector (T1): the menu is offered only
// when the typed text is a bare subject phrase and nothing else. Otherwise [].
//   A1. exactly one parsed entity phrase, and the typed text (punctuation/case-insensitive) equals
//       that phrase.
//   A2. no other structure evidence: no matched verb (this also covers the comparison verb), no
//       decision cues, no scenario cues, no numbers, no resolved geo.
// The parser limitation is accepted: a single-word subject, or a mis-extraction, yields NO menu
// (absence of assistance, never a fabricated one). The menu never guesses a pressure.
//
// One-and-done (T2): once a phrase is appended the text is no longer a bare subject phrase, so the
// menu disappears by rule A1 — no multi-add.
export const ADDITIVE_PRESSURE_PHRASES = Object.freeze([
  { pressure: 'CAPITAL',    phrase: 'capital / financing changes' },
  { pressure: 'OWNERSHIP',  phrase: 'ownership / control changes' },
  { pressure: 'TECHNOLOGY', phrase: 'technology / architecture changes' },
  { pressure: 'KNOWLEDGE',  phrase: 'knowledge / research changes' },
  { pressure: 'LABOR',      phrase: 'labor / workforce changes' },
  { pressure: 'MEDIA',      phrase: 'media / coverage changes' },
]);

const compareForm = t => (t ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * deriveAdditiveAssist — the six additive suggestions for a bare subject phrase; [] otherwise.
 * @param {string} rawInput
 * @returns {Array<{id: string, label: string, appendText: string, basis: string[]}>}
 *   `appendText` is exactly what is appended to the guest's text (leading space + "+ " + phrase).
 */
export function deriveAdditiveAssist(rawInput) {
  const text = (rawInput ?? '').trim();
  if (!text) return [];

  const parsed = parseIntent(text);
  // A1 — a bare subject phrase, nothing else.
  if (parsed.entities.length !== 1) return [];
  if (compareForm(text) !== compareForm(parsed.entities[0])) return [];
  // A2 — no other structure evidence.
  if (parsed.verb_matched) return [];
  const ctx = buildQueryContext(text);
  if ((ctx.decisionCues ?? []).length > 0) return [];
  if (ctx.scenarioCues?.present) return [];
  if ((ctx.numbers ?? []).length > 0) return [];
  if (ctx.geo && ctx.geo.state && ctx.geo.state !== 'absent') return [];

  return ADDITIVE_PRESSURE_PHRASES.map(({ pressure, phrase }) => ({
    id:         `add:${pressure}`,
    label:      phrase,
    appendText: ` + ${phrase}`,
    basis:      ['entities'],
  }));
}
