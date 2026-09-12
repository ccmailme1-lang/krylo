// analysisintent.js — KRYL-1290 subtask 3
//
// Represents a formed analytical question across five internal dimensions —
// ACTOR, SUBJECT, OBJECTIVE, QUESTION, OBSERVATIONAL SCOPE (spec §3, §8). This is
// an INTERPRETATION of an already-formed question, never a form the user fills
// out and never a prerequisite for further progress.
//
//   raw interest -> ParsedIntent -> inquiry possibilities -> QUESTION
//                -> Analysis Intent (this module) -> existing KRYLO flow
//
// Read-only against every shared module it consumes — no edits to
// subjectscope.js, querycontext.js, or intentparser.js. Every dimension is
// grounded in a real, already-authoritative source (asset-first audit,
// specs/ASSET-DISPOSITION-autonomous-inquiry-chips.md):
//
//   SUBJECT              <- subjectScope() (WO-5B/KRYL-1234), the canonical
//                           subject resolver — not reimplemented here.
//   OBSERVATIONAL SCOPE  <- queryContext.intent.domains (already curated)
//   OBJECTIVE            <- queryContext.decisionCues (already computed;
//                           the same signal subjectScope's own DECISION_FRAME
//                           path uses)
//   QUESTION             <- the verbatim question text + normalized_verb /
//                           verb_matched (queryContext.intent doesn't pass
//                           verb_matched through, so parseIntent() is called
//                           directly for this one field — confirmed in
//                           KRYL-1290 subtask 1's isolation test)
//   ACTOR                <- no actor-detection evidence exists anywhere in
//                           this codebase — always unresolved, never
//                           fabricated (CLAUDE.md §1 Absence-Is-Signal)
//
// Every dimension returns { state: 'resolved'|'unresolved', value|reason } —
// the same shape querycontext.js already uses for geo/assetClass (precedent,
// not invented, per CLAUDE.md §1).
//
// Spec: specs/SPEC-autonomous-inquiry-chips-v1.1.md
//
// Non-goals (this subtask): no "KRYLO READ" UI component, no wiring, no chip UI.

import { parseIntent }      from './intentparser.js';
import { buildQueryContext } from './querycontext.js';
import { subjectScope }      from './subjectscope.js';

export const ANALYSIS_INTENT_VERSION = '1.0.0';

function resolved(value) {
  return { state: 'resolved', value };
}

function unresolved(reason) {
  return { state: 'unresolved', reason };
}

/**
 * buildAnalysisIntent — the five-dimensional interpretation of a formed
 * analytical question. Not a form; nothing here blocks on a missing dimension.
 * @param {string} question  the formed, possibly user-edited, question text
 * @returns {{
 *   actor: {state, reason},
 *   subject: {state, value|reason},
 *   objective: {state, value|reason},
 *   question: {state, value},
 *   observationalScope: {state, value|reason},
 *   version: string,
 * }}
 */
export function buildAnalysisIntent(question) {
  const text = typeof question === 'string' ? question : '';

  if (!text.trim()) {
    return {
      actor:               unresolved('no actor-detection evidence in scope'),
      subject:              unresolved('empty question'),
      objective:            unresolved('empty question'),
      question:             unresolved('empty question'),
      observationalScope:  unresolved('empty question'),
      version: ANALYSIS_INTENT_VERSION,
    };
  }

  const queryContext = buildQueryContext(text);
  const scope         = subjectScope(queryContext);
  const parsed         = parseIntent(text);

  return {
    // No module in this codebase extracts actor from text — never fabricated.
    actor: unresolved('no actor-detection evidence in scope'),

    subject: scope.kind === 'UNRESOLVED'
      ? unresolved(scope.reason)
      : resolved(scope),

    objective: queryContext.decisionCues.length > 0
      ? resolved({ cues: queryContext.decisionCues })
      : unresolved('no decision cues present in question'),

    question: resolved({
      text,
      verb:        parsed.normalized_verb,
      verbMatched: parsed.verb_matched,
    }),

    observationalScope: queryContext.intent.domains.length > 0
      ? resolved(queryContext.intent.domains)
      : unresolved('no domain signal in question'),

    version: ANALYSIS_INTENT_VERSION,
  };
}
