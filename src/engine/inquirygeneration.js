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
import { CANONICAL_DOMAINS } from './ontology.js';

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
// REWRITTEN 2026-09-27, second pass (Founder correction: "explicit-word grounding" governs which
// DIMENSION is missing, not the literal vocabulary of every candidate VALUE). Two-level model, no
// chip-sequence memory -- every call recomputes fresh from the CURRENT full text:
//
//   1. DOMAIN  -- which of the six canonical pressures (the one ratified taxonomy that already
//      exists in this codebase; ontology.js CANONICAL_DOMAINS) has the guest established? Reused
//      verbatim, not invented. Established once the pressure's name is literally present in the
//      text (guest-typed or selected -- identical treatment). Not established -> offer the six
//      pressure names as candidates (this is a generic, guest-facing menu, but it is GATED: shown
//      only when domain is genuinely missing, never unconditionally for every input -- unlike the
//      six-pressure menu reverted earlier, which showed all six on every bare subject regardless).
//   2. STRUCTURAL DIMENSION -- once a domain is established, bare-value candidates within that
//      domain (currently authored: TECHNOLOGY only -- "architecture changes" / "vendor changes" /
//      "adoption changes"). Established the same way: the bare phrase literally present in the text.
//
// "Explicit-word grounding" now means: the GUEST'S TEXT explicitly determines which dimension needs
// assistance (has domain been stated yet? has a structural value been stated yet?) -- it does not
// mean every candidate VALUE must already appear in the text. Candidate generation may offer new
// vocabulary within the dimension the guest has left open.
// Zero-default (complete question / decision / scenario / number / geo cue) still applies -- KRYLO
// gets out of the way once the guest's text is already complete.
// Free text and chip selection are the same input, always: "Vendor Platform Decoupling Technology
// Architecture changes" typed by hand establishes DOMAIN=Technology and STRUCTURAL=Architecture
// changes exactly as if both had been selected.
// Ceiling: 2 dimensions total right now (DOMAIN, STRUCTURAL) -- not a target; if the guest never
// completes a dimension, or completes fewer than the ceiling with nothing further to assist,
// that is a valid, correct stop, not a defect.
export const MAX_CHIPS_PER_ROUND = 3;
export const MAX_ROUNDS          = 2; // number of dimensions currently defined (DOMAIN, STRUCTURAL)

// The one existing, ratified vocabulary -- aliased from ontology.js CANONICAL_DOMAINS (KRYL-1065
// guard: domain names are declared ONCE, there, never redeclared here), not an invented industry
// list. Capitalized for guest-facing display; matched case-insensitively. ontology.js order is
// technology/capital/knowledge/labor/media/ownership; kept in that order rather than re-sorting,
// so this stays a pure display alias with no independent ordering decision of its own.
const DOMAIN_PRESSURES = Object.freeze(
  CANONICAL_DOMAINS.map(d => d.charAt(0).toUpperCase() + d.slice(1))
);

// Structural-dimension values, authored per domain. TECHNOLOGY only for now -- other domains have
// no authored structural content yet (a stated absence, not an invented one); D4 phrase review for
// this content still applies.
const STRUCTURAL_BY_DOMAIN = Object.freeze({
  Technology: Object.freeze(['architecture changes', 'vendor changes', 'adoption changes']),
});

// Legacy word-triggered rows, kept reachable independently of the domain/structural model above
// (not yet mapped onto a canonical pressure -- a separate, disclosed scope gap, not silently
// dropped): contract/legal and the politician-reaction example from the product contract.
export const NEXT_DIRECTION_CATALOG = Object.freeze([
  { id: 'L2',  phrase: 'contract / obligation changes', triggers: ['contract', 'liability', 'lawsuit'] },
  { id: 'PB1', phrase: 'local politician reaction',     triggers: ['pushback', 'backlash', 'opposition', 'protest'] },
]);

const hasWord = (lowerText, w) => new RegExp('(^|[^a-z0-9])' + w + '(?:s|es)?(?![a-z0-9])').test(lowerText);

/**
 * establishedDirections — every dimension value the CURRENT text already states (domain, structural,
 * and legacy catalog rows), however it got there. Exported so the UI/tests can ask "how many
 * components does this query already have" without re-deriving the candidate logic.
 */
export function establishedDirections(text) {
  const lower = (text ?? '').toLowerCase();
  const out = [];
  const domain = DOMAIN_PRESSURES.find(d => hasWord(lower, d.toLowerCase()));
  if (domain) {
    out.push({ id: `dim:DOMAIN:${domain}`, phrase: domain });
    for (const s of STRUCTURAL_BY_DOMAIN[domain] ?? []) {
      if (lower.includes(s)) out.push({ id: `dim:STRUCT:${domain}:${s}`, phrase: s });
    }
  }
  for (const c of NEXT_DIRECTION_CATALOG) if (lower.includes(c.phrase)) out.push({ id: c.id, phrase: c.phrase });
  return out;
}

/**
 * deriveNextDirections — recomputed fresh every call from the CURRENT text alone. No memory of
 * prior rounds or prior selections; a guest who types the same end state by hand gets the same
 * answer as one who used every suggestion.
 * @param {{text: string}} input  the current full query text, verbatim.
 * @returns {Array<{id: string, label: string, appendText: string, basis: {keyword: string, start: number, end: number}}>}
 */
export function deriveNextDirections({ text } = {}) {
  const full = (text ?? '').trim();
  if (!full) return [];
  if (/[?]\s*$/.test(full)) return [];                              // a complete question: zero by default

  const ctx = buildQueryContext(full);
  if ((ctx.decisionCues ?? []).length > 0) return [];                // cue-bearing input: zero by default
  if (ctx.scenarioCues?.present) return [];
  if ((ctx.numbers ?? []).length > 0) return [];
  if (ctx.geo && ctx.geo.state && ctx.geo.state !== 'absent') return [];
  if (parseIntent(full).verb_matched) return [];                     // a recognized verb (e.g. an
                                                                      // explicit comparison, "AWS vs
                                                                      // Azure") already has enough
                                                                      // structure: zero by default

  const lower = full.toLowerCase();

  // Legacy word-triggered rows checked FIRST, independent of the domain/structural model below:
  // this is the same mechanism validated earlier today on real production input ("AI Data Center
  // Pushback" -> "local politician reaction"). "pushback" is not a domain-pressure word, so gating
  // it behind DOMAIN establishment first would silently break an already-approved case.
  const legacy = [];
  for (const c of NEXT_DIRECTION_CATALOG) {
    if (legacy.length >= MAX_CHIPS_PER_ROUND) break;
    if (lower.includes(c.phrase)) continue;
    const trigger = c.triggers.find(t => hasWord(lower, t));
    if (!trigger) continue;
    const m = new RegExp('(^|[^a-z0-9])' + trigger + '[a-z]*').exec(lower);
    legacy.push({
      id:         c.id,
      label:      c.phrase,
      appendText: ` + ${c.phrase}`,
      basis:      { keyword: trigger, start: m.index + m[1].length, end: m.index + m[0].length },
    });
  }
  if (legacy.length) return legacy;

  // Dimension 1 — DOMAIN: not established yet -> offer the six canonical pressures as candidates.
  const domain = DOMAIN_PRESSURES.find(d => hasWord(lower, d.toLowerCase()));
  if (!domain) {
    return DOMAIN_PRESSURES
      .map(d => ({ id: `dim:DOMAIN:${d}`, label: d, appendText: ` + ${d}`, basis: null }))
      .slice(0, MAX_CHIPS_PER_ROUND);
  }

  // Dimension 2 — STRUCTURAL, within the established domain: a single-value slot, same shape as
  // DOMAIN. Once ANY one structural value is present the dimension is complete (the guest picks
  // ONE direction, not a checklist) -- offering the other values afterward would be exactly the
  // "keep suggesting until 3 slots are full" behavior the Founder ruled against.
  const structuralValues = STRUCTURAL_BY_DOMAIN[domain] ?? [];
  const structuralEstablished = structuralValues.some(s => lower.includes(s));
  if (!structuralEstablished && structuralValues.length) {
    return structuralValues.slice(0, MAX_CHIPS_PER_ROUND).map(s => ({
      id: `dim:STRUCT:${domain}:${s}`, label: s, appendText: ` + ${s}`, basis: { keyword: domain.toLowerCase(), start: 0, end: 0 },
    }));
  }

  // No further defined dimension: domain and structural are both established, and no legacy row
  // is grounded. This is a valid, correct stop -- not every input has 2 dimensions to complete.
  return [];
}
