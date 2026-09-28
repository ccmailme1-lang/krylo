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
//   OBJECTIVE            <- queryContext.decisionCues (transactional vocabulary,
//                           the same signal subjectScope's own DECISION_FRAME
//                           path uses) first, falling back to queryContext.scenarioCues
//                           (strategic/operational scenario structure, KRYL-1308
//                           follow-on, 2026-09-18) -- two distinct evidence classes,
//                           never merged into one
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
//
// Phase 3 canonical INTENT extension (Founder GO, 2026-09-18, KRYL-1311 / RECONN Factor v1.1
// §6). Additive only -- actor/subject/objective/question/observationalScope above are
// UNCHANGED (targetpacket.jsx/aiae.js/intelligencebrief.jsx read them by exact key name;
// reshaping any of the five would break those three live consumers). Adds vReq/sReq/eReq/
// rCmp/tReq as a pure derivation over the same already-resolved data -- no new parsing
// engine, per the RECONN ownership-boundary rule (§21: "may not create a competing query
// interpretation engine").
//
//   sReq <- observationalScope's domain array, passthrough.
//   vReq <- subject's single resolved value wrapped as a 0-or-1 element array. Real
//           multi-subject V_req support is a separate, larger question -- not this pass.
//   eReq <- always {state:'unresolved', reason:'NOT_DETECTED'}. No relationship-type
//           requirement detection exists anywhere in this codebase (confirmed, KRYL-1310
//           audit) -- never fabricated.
//   tReq <- always {state:'unresolved', reason:'NOT_DETECTED'}. No temporal-stance
//           vocabulary detection exists anywhere in this codebase -- never fabricated.
//   rCmp <- the guarded case (Founder ruling, 2026-09-18): queryContext.scenarioCues's own
//           outcomeVariables split (querycontext.js's SCENARIO_OUTCOME_RE .split on
//           versus|vs|compared to|and) discards which delimiter matched -- "X and Y" and
//           "X versus Y" are indistinguishable once split. Two outcomeVariables therefore
//           does NOT by itself establish that a comparison was requested. rCmp re-checks
//           the raw, unsplit outcomeQuestion text for an EXPLICIT comparison connector
//           (versus/vs/compared to, excluding bare "and") before resolving -- otherwise a
//           plain two-item list would be fabricated into a comparison request. Two distinct
//           unresolved reasons, per Founder instruction: NOT_DETECTED (no comparison
//           connector present -- none was requested) vs. INSUFFICIENT_VARIABLES (a
//           comparison connector IS present but the split didn't cleanly yield exactly two
//           usable variables).

import { parseIntent }      from './intentparser.js';
import { buildQueryContext } from './querycontext.js';
import { subjectScope }      from './subjectscope.js';

export const ANALYSIS_INTENT_VERSION = '1.1.0';

// Explicit comparison connector only -- deliberately excludes bare "and" (querycontext.js's
// own split includes "and", which is why outcomeVariables alone can't prove a comparison).
const EXPLICIT_COMPARISON_RE = /\bversus\b|\bvs\.?\b|\bcompared\s+to\b/i;

function resolved(value) {
  return { state: 'resolved', value };
}

function unresolved(reason) {
  return { state: 'unresolved', reason };
}

function notDetected() {
  return { state: 'unresolved', reason: 'NOT_DETECTED' };
}

// Word-boundary tokens an operand window stops at -- prepositions/articles/the connector's own
// verb, never part of a candidate operand. Deliberately small and mechanical (proximity to the
// connector, not entity recognition) -- this is not a duplicate of intentparser.js's
// ENTITY_STOPWORDS (a different, private list this read-only module cannot import), just the
// minimum needed to bound a window around an already-located match.
const OPERAND_BOUNDARY_WORDS = new Set([
  'the', 'a', 'an', 'in', 'on', 'for', 'of', 'with', 'to', 'and', 'or', 'is', 'are', 'was', 'were',
  'evidence', 'compare', 'comparing', 'contrast', 'benchmark',
]);

// extractComparisonOperands -- KRYL, P1 fix, 2026-09-23. Given raw text containing an EXPLICIT
// comparison connector (vs/versus/compared to), returns the contiguous run of non-boundary
// tokens immediately adjacent to the connector on each side, as PARSED CANDIDATE text -- not a
// resolved entity, not verified against any registry, never fed into session creation or
// execution (same posture as subject_a/subject_b already had for the scenario-gated case
// below; the only new part is where the raw text comes from). Returns null if either side
// yields nothing (e.g. the connector is at the very start/end of the string).
function extractComparisonOperands(rawText) {
  const m = (rawText ?? '').match(EXPLICIT_COMPARISON_RE);
  if (!m) return null;
  const before = rawText.slice(0, m.index).trim().split(/\s+/).filter(Boolean);
  const after  = rawText.slice(m.index + m[0].length).trim().split(/\s+/).filter(Boolean);

  const left = [];
  for (let i = before.length - 1; i >= 0; i--) {
    const clean = before[i].replace(/[^\w-]/g, '');
    if (!clean || OPERAND_BOUNDARY_WORDS.has(clean.toLowerCase())) break;
    left.unshift(clean);
  }
  const right = [];
  for (const tok of after) {
    const clean = tok.replace(/[^\w-]/g, '');
    if (!clean || OPERAND_BOUNDARY_WORDS.has(clean.toLowerCase())) break;
    right.push(clean);
  }

  const subject_a = left.join(' ');
  const subject_b = right.join(' ');
  return (subject_a && subject_b) ? { subject_a, subject_b } : null;
}

// deriveRCmp -- see header comment. Never infers a comparison from outcomeVariables'
// cardinality alone; requires the explicit connector in the raw, unsplit outcome text.
//
// KRYL — P1 fix, 2026-09-23: a plain comparative sentence ("Compare Latuda vs Vraylar...")
// has an explicit comparison connector but no hypothetical-scenario structure (no "if we..."
// condition co-occurring with an outcome question), so scenarioCues.present is false and the
// scenario-gated split below never ran -- rCmp silently returned NOT_DETECTED for a query that
// plainly requested a comparison, which is what routed it into the single-subject SUBJECT
// conditioning UI with no honest signal available to do otherwise. Now extracts candidate
// operands via extractComparisonOperands() above for this case too, same resolved shape
// (subject_a/subject_b) the scenario-gated branch already returns -- condition is always null
// here since there is no hypothetical-scenario structure to report one from.
function deriveRCmp(scenarioCues, rawText) {
  if (!scenarioCues.present) {
    if (!EXPLICIT_COMPARISON_RE.test(rawText ?? '')) return notDetected();
    const operands = extractComparisonOperands(rawText);
    return operands
      ? resolved({ subject_a: operands.subject_a, subject_b: operands.subject_b, condition: null })
      : { state: 'unresolved', reason: 'COMPARISON_DETECTED_OUTSIDE_SCENARIO_STRUCTURE' };
  }
  if (!EXPLICIT_COMPARISON_RE.test(scenarioCues.outcomeQuestion ?? '')) return notDetected();
  const vars = scenarioCues.outcomeVariables ?? [];
  if (vars.length !== 2) return { state: 'unresolved', reason: 'INSUFFICIENT_VARIABLES' };
  return resolved({ subject_a: vars[0], subject_b: vars[1], condition: scenarioCues.condition });
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
 *   vReq: Array,
 *   sReq: Array,
 *   eReq: {state, reason},
 *   rCmp: {state, value|reason},
 *   tReq: {state, reason},
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
      vReq: [],
      sReq: [],
      eReq: notDetected(),
      rCmp: notDetected(),
      tReq: notDetected(),
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

    // KRYL-1308 follow-on (Founder GO, 2026-09-18): decisionCues (transactional vocabulary)
    // and scenarioCues (strategic/operational scenario structure) are two distinct evidence
    // classes, checked independently -- neither is folded into the other. Recognizing a
    // scenario's structure (condition / outcome question / outcome variables) is query
    // understanding, not claim generation: no projected outcome is stated or implied here.
    objective: queryContext.decisionCues.length > 0
      ? resolved({ cues: queryContext.decisionCues })
      : queryContext.scenarioCues.present
        ? resolved({ scenario: queryContext.scenarioCues })
        : unresolved('no decision cues or scenario structure present in question'),

    question: resolved({
      text,
      verb:        parsed.normalized_verb,
      verbMatched: parsed.verb_matched,
    }),

    observationalScope: queryContext.intent.domains.length > 0
      ? resolved(queryContext.intent.domains)
      : unresolved('no domain signal in question'),

    // Canonical INTENT (RECONN Factor v1.1 §6) -- additive, derived only from the same
    // already-resolved data above. See header comment for the full rationale per field.
    sReq: queryContext.intent.domains,
    vReq: scope.kind !== 'UNRESOLVED' ? [scope] : [],
    eReq: notDetected(),
    rCmp: deriveRCmp(queryContext.scenarioCues, text),
    tReq: notDetected(),

    version: ANALYSIS_INTENT_VERSION,
  };
}

const LEDGER_STOPWORDS = new Set([
  'the', 'a', 'an', 'in', 'on', 'for', 'of', 'with', 'to', 'and', 'or', 'is', 'are', 'was', 'were',
  'be', 'been', 'do', 'does', 'did', 'at', 'by', 'from', 'as', 'that', 'this', 'these', 'those',
  'it', 'its', 'their', 'our', 'my', 'we', 'i', 'you', 'me', 'us', 'about', 'into', 'than', 'then',
  'what', 'which', 'who', 'whom', 'how', 'why', 'when', 'where', 'can', 'could', 'should', 'would',
  'will', 'may', 'might', 'if', 'so', 'not', 'no', 'any', 'all', 'some', 'there', 'have', 'has',
  'had', 'between', 'over', 'under', 'per', 'vs', 'versus', 'compared', 'compare', 'comparing',
  'show', 'map', 'find', 'give', 'tell', 'identify', 'list', 'analyze', 'analyse', 'evaluate',
]);

function ledgerTokens(text) {
  return ((text ?? '').match(/[A-Za-z0-9][A-Za-z0-9'’-]*/g) ?? []).map(t => t.replace(/['’]s$/i, ''));
}

function tokenSet(text) {
  return new Set(ledgerTokens(text).map(t => t.toLowerCase()));
}

// buildInterpretationLedger -- pure, read-only derivation over an already-built analysisIntent.
// Interprets nothing new: it reports (a) what the intent established, (b) which words of the
// verbatim question are covered by nothing established (mechanical token subtraction, no
// entity recognition, no inference), and (c) what the observations that follow are bound to.
export function buildInterpretationLedger(intent) {
  if (!intent || intent.question?.state !== 'resolved') return null;
  const text = intent.question.value.text ?? '';
  const subj = intent.subject?.state === 'resolved' ? intent.subject.value : null;
  const entityName = subj?.kind === 'ENTITY' ? subj.entity.name : null;

  const covered = new Set();
  if (entityName) {
    tokenSet(entityName).forEach(t => covered.add(t));
    tokenSet(subj.matchedOn).forEach(t => covered.add(t));
  }
  if (intent.objective?.state === 'resolved' && intent.objective.value.cues) {
    intent.objective.value.cues.forEach(c => tokenSet(String(c)).forEach(t => covered.add(t)));
  }

  const established = [];
  if (entityName) established.push(`subject: ${entityName}`);
  else if (subj) established.push(`subject frame: ${subj.kind.replace(/_/g, ' ').toLowerCase()}`);
  if (intent.observationalScope?.state === 'resolved') {
    established.push(`scope: ${intent.observationalScope.value.join(', ')}`);
  }
  if (intent.objective?.state === 'resolved') {
    established.push(intent.objective.value.cues
      ? `objective cues: ${intent.objective.value.cues.join(', ')}`
      : 'objective: scenario structure');
  }

  const comparison = [];
  if (intent.rCmp?.state === 'resolved') {
    for (const op of [intent.rCmp.value.subject_a, intent.rCmp.value.subject_b]) {
      const opT = [...tokenSet(String(op))];
      const enT = [...tokenSet(entityName ?? '')];
      const observed = !!entityName && opT.length > 0 && enT.length > 0 && (
        opT.every(t => enT.includes(t)) || enT.every(t => opT.includes(t))
      );
      comparison.push({ operand: op, observed });
    }
  }

  const notCarried = [];
  let run = [];
  for (const tok of ledgerTokens(text)) {
    const lc = tok.toLowerCase();
    if (covered.has(lc) || LEDGER_STOPWORDS.has(lc)) {
      if (run.length) { notCarried.push(run.join(' ')); run = []; }
    } else run.push(tok);
  }
  if (run.length) notCarried.push(run.join(' '));

  const objectiveOpen = intent.objective?.state !== 'resolved';
  const unobservedOperand = comparison.some(c => !c.observed);
  const answersNothingAbout = notCarried.length > 0 || objectiveOpen || unobservedOperand;

  let basis;
  if (entityName) {
    basis = `Observations in this packet are bound to ${entityName} alone.` +
      (answersNothingAbout
        ? ` They describe ${entityName}; they do not answer the relationship, comparison or objective the question asks about.`
        : '');
  } else {
    basis = 'Observations in this packet are the live field. They are not scoped to a subject named in the question and do not answer it.';
  }

  const seen = new Set();
  const unaddressed = [...comparison.filter(c => !c.observed).map(c => c.operand), ...notCarried]
    .filter(x => { const k = x.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });

  // KRYL-1332 (2026-09-28) -- display-only squelch. `notCarried`/`unaddressed` above are
  // UNCHANGED (still real per-run token data, still what answersNothingAbout/callers reason
  // over) -- this only stops a long pasted block (a brochure, not a question) from being
  // reprinted as dozens of punctuation-stripped fragments. A short, real leftover (e.g. one
  // comparison operand, "TSMC relationship binding") is never squelched -- only the case a
  // human would recognize as "that's just the input text, not new information."
  const notCarriedWordCount = notCarried.reduce((n, run) => n + run.split(/\s+/).filter(Boolean).length, 0);
  const notCarriedDisplay = notCarried.length === 0 ? []
    : notCarriedWordCount > 25
      ? [`${notCarriedWordCount} words of unstructured input text not carried into observation (see the question above)`]
      : notCarried;
  const seen2 = new Set();
  const unaddressedDisplay = [...comparison.filter(c => !c.observed).map(c => c.operand), ...notCarriedDisplay]
    .filter(x => { const k = x.toLowerCase(); if (seen2.has(k)) return false; seen2.add(k); return true; });

  return { verbatim: text, established, comparison, notCarried, unaddressed, notCarriedDisplay, unaddressedDisplay, basis };
}
