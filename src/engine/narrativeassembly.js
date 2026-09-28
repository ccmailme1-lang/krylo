// narrativeassembly.js — Narrative Assembly v0.2 (KRYL-1311 family).
//
// Governing rule (specs/SPEC-narrative-assembly-contract-v1.md §3):
//   Assembly is permitted. Invention is not.
//
// v0.2 change from the v0.1 checkpoint (86c4a6c, stopped for §11 non-compliance): stages that
// have a real RECONN canonical component now source from it (src/engine/reconnpayload.js's
// assembleReconnPayload()) instead of reading raw substrate directly. Two stages still read raw
// substrate — Formation and Evidence — because RECONN's Category (A) work did not build a
// `formations[]` or `evidence[]` canonical component; that is a disclosed, known scope gap, not
// an oversight (see specs/SPEC-reconn-factor-v1.1.md §5's full canonical tree vs. what Category
// (A) actually shipped, commit 4d76b96). Question/Context read analysisIntent's raw question
// text/domain list directly — that is the guest's own input being carried forward, not a
// computed reconnaissance object, so it is not a §11 backfill.
//
// Stage-by-stage sourcing, post-reconciliation (2026-09-20):
//   - Relationships: reconnPayload.relationshipCoverage — BLOCKED today (relationontology.js has
//     no persistence layer; see KRYL-1311/1134/1133/1310 Jira comments for the full chain). This
//     stage now honestly reports that instead of showing Formation's domain-pair edges as if they
//     were RECONN-compliant relationships (the exact violation the review gate caught and reverted
//     in reconnpayload.js itself).
//   - Developments/Chronology: reconnPayload.temporalState (per participating domain) — real now.
//     Reports what the 5-state model actually supports: anchor timing (deltaT) when available;
//     never a value/delta, since that scalar remains unresolved (see reconnpayload.js header).
//   - Unresolved: reconnPayload.structuralCoverage.excluded — same underlying data as before,
//     now sourced via the canonical, contract-compliant path instead of raw fieldFormation.
//   - Tension: still hardcoded WITHHELD — the PROJECTION propagation defect (convergenceclassifier.js
//     → convergenceRead()) is untouched by Category (A) and remains a separate, unresolved gap.
//   - Formation, Evidence: still raw fieldFormation — no canonical component exists yet.

const STAGE = Object.freeze({ PRESENT: 'PRESENT', WITHHELD: 'WITHHELD' });

function questionStage(analysisIntent) {
  const text = analysisIntent?.question?.value?.text;
  if (!text) return { stage: 'QUESTION', state: STAGE.WITHHELD, text: null, reason: 'no question resolved' };
  return { stage: 'QUESTION', state: STAGE.PRESENT, text: `The question: ${text}` };
}

function contextStage(analysisIntent, subjScope) {
  const scope = analysisIntent?.observationalScope;
  const domains = scope?.state === 'resolved' ? scope.value : null;
  const subjectPhrase = subjScope?.kind === 'ENTITY'
    ? `bound to ${subjScope.canonicalId}`
    : 'not bound to a single resolved entity — read as the live observable field';
  if (!domains) {
    return { stage: 'CONTEXT', state: STAGE.WITHHELD, text: null, reason: 'no domain signal in question' };
  }
  return {
    stage: 'CONTEXT', state: STAGE.PRESENT,
    text: `Context: the field examined is ${subjectPhrase}, spanning ${domains.join(', ')}.`,
  };
}

// Developments/Chronology — sourced from reconnPayload.temporalState (RECONN §13), real as of
// Category (A). Reports timing (deltaT) only — value_latest/delta stay unresolved (no governed
// scalar exists, see reconnpayload.js), so this never states a magnitude of change, only that
// movement was observed and roughly when.
function developmentsStage(reconnPayload) {
  const domains = reconnPayload?.temporalState ?? [];
  const withAnchors = domains.filter(d => d.state === 'PRESENT' || d.state === 'PARTIAL');
  if (!withAnchors.length) {
    const reason = domains[0]?.reason ?? 'no temporal substrate available for the observed domains';
    return { stage: 'DEVELOPMENTS', state: STAGE.WITHHELD, text: null, reason };
  }
  const present = withAnchors.filter(d => d.state === 'PRESENT');
  if (present.length) {
    const parts = present.map(d => {
      const days = Math.round(d.deltaT / 86_400_000);
      return `${d.domain} (${days} day${days !== 1 ? 's' : ''} between the two most recent observations)`;
    });
    return {
      stage: 'DEVELOPMENTS', state: STAGE.PRESENT,
      text: `Recent timing is observable for ${parts.join(', ')}. The size of the change is not stated — RECONN has no governed value scalar for these observations yet, only their timing.`,
    };
  }
  // Only PARTIAL entries (a single anchor, no prior to compare) — real, but weaker than a
  // reportable interval.
  const parts = withAnchors.map(d => d.domain);
  return {
    stage: 'DEVELOPMENTS', state: STAGE.PRESENT,
    text: `Only a single dated observation exists so far for ${parts.join(', ')} — recent enough to note, not enough yet to show how the field is moving.`,
  };
}

// Relationships — sourced from reconnPayload.relationshipCoverage (RECONN §10). BLOCKED today,
// unconditionally: relationontology.js has no persistence layer (KRYL-1133/1134/1310/1311 Jira
// comments carry the full chain). This deliberately no longer reads fieldFormation.graph.edges —
// doing so would present domainintelligence.js's domain-pair vocabulary as if it were RECONN's
// governed relationship authority, which the review gate found and reversed in reconnpayload.js
// itself. Same discipline applies here.
function relationshipsStage(reconnPayload) {
  const rc = reconnPayload?.relationshipCoverage;
  if (rc?.state === 'PRESENT' && rc.relationships?.length) {
    const parts = rc.relationships.map(r => `${r.a} ↔ ${r.b} (${r.type})`);
    return {
      stage: 'RELATIONSHIPS', state: STAGE.PRESENT,
      text: `${rc.relationships.length} governed relationship${rc.relationships.length !== 1 ? 's' : ''} connect the observed domains: ${parts.join('; ')}.`,
    };
  }
  return {
    stage: 'RELATIONSHIPS', state: STAGE.WITHHELD, text: null,
    reason: rc?.reason ?? 'Relationship Coverage is not yet available from RECONN\'s canonical payload',
  };
}

function tensionStage() {
  // Deliberately withheld — untouched by Category (A). See module header.
  return {
    stage: 'TENSION', state: STAGE.WITHHELD, text: null,
    reason: 'the only live classifier for structural tension/divergence self-labels its output PROJECTION (inferred, not observed), and that label is currently dropped before reaching any consumer — presenting it as narrated fact would violate the assembly-not-invention rule (SPEC-narrative-assembly-contract-v1.md §7 stage 05)',
  };
}

// Formation — no RECONN canonical `formations[]` component exists yet (Category A did not build
// one). Reads fieldFormation directly, disclosed as a known scope gap, not a violation of "use
// the canonical payload when available" — it genuinely isn't available yet.
function formationStage(fieldFormation, subjScope) {
  if (!fieldFormation) {
    return {
      stage: 'FORMATION', state: STAGE.WITHHELD, text: null,
      reason: 'NO_FORMATION_ESTABLISHED — a formation is earned from observations in two or more domains and at least one admitted cross-domain relationship; the Formation contract returned empty for this query',
    };
  }
  const scopeText = subjScope?.kind === 'ENTITY' ? `for ${subjScope.canonicalId}` : 'in the live observable field';
  return {
    stage: 'FORMATION', state: STAGE.PRESENT,
    text: `A structural formation became observable ${scopeText}: ${fieldFormation.participatingDomains.join(', ')}.`,
  };
}

// Evidence — no RECONN canonical `evidence[]` roll-up exists yet (Category A did not build one).
// Reads fieldFormation.particles directly, same disclosed-gap reasoning as Formation above.
function evidenceStage(fieldFormation) {
  if (!fieldFormation) {
    return { stage: 'EVIDENCE', state: STAGE.WITHHELD, text: null, reason: 'no formation to attribute evidence to' };
  }
  return {
    stage: 'EVIDENCE', state: STAGE.PRESENT,
    text: `The formation is composed of ${fieldFormation.particles?.length ?? 0} real observed signal${(fieldFormation.particles?.length ?? 0) !== 1 ? 's' : ''}, each independently attributable — no canonical evidence roll-up exists yet (SPEC-narrative-assembly-contract-v1.md §7 stage 07), so this reports count only, not a citation list.`,
  };
}

// Unresolved — sourced from reconnPayload.structuralCoverage.excluded (RECONN §9, labeled
// CLASSIFIED not the §9 ratio — see reconnpayload.js). Same underlying values as before
// (formationinference.js's boundary.excluded), now read via the canonical path.
function unresolvedStage(reconnPayload) {
  const sc = reconnPayload?.structuralCoverage;
  const excluded = sc?.excluded ?? [];
  if (!excluded.length) {
    return { stage: 'UNRESOLVED', state: STAGE.WITHHELD, text: null, reason: sc?.reason ?? 'nothing observed was excluded from this formation' };
  }
  const byDomain = new Map();
  for (const x of excluded) {
    const d = x.domain ?? 'unresolved domain';
    byDomain.set(d, (byDomain.get(d) ?? 0) + 1);
  }
  const parts = [...byDomain.entries()].map(([d, n]) => `${d}${n > 1 ? ` (×${n})` : ''}`);
  return {
    stage: 'UNRESOLVED', state: STAGE.PRESENT,
    text: `What remains unresolved: ${parts.join(', ')} did not make it into this formation.`,
  };
}

// ── Connected-prose assembly ─────────────────────────────────────────────────
function terminated(text) {
  const t = text.trim();
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

function buildParagraph(stages) {
  const by = Object.fromEntries(stages.map(s => [s.stage, s]));
  const sentences = [];

  // KRYL-1332 (2026-09-28) -- the full verbatim question is already shown once, in full, in
  // the READ section (QUESTION AS ASKED). Re-quoting all of it here too (a pasted brochure can
  // run 300+ words) turned this into the same text repeated, not a narrative. Short questions
  // are unaffected; only a long one gets shortened here.
  const shortQ = s => (s.length > 120 ? `${s.slice(0, 120).trim()}…` : s);
  if (by.QUESTION.state === STAGE.PRESENT && by.CONTEXT.state === STAGE.PRESENT) {
    const q = shortQ(by.QUESTION.text.replace(/^The question: /, ''));
    const c = by.CONTEXT.text.replace(/^Context: the field examined is /, '');
    sentences.push(terminated(`KRYLO examined "${q}" — the field examined is ${c}`));
  } else if (by.QUESTION.state === STAGE.PRESENT) {
    sentences.push(terminated(shortQ(by.QUESTION.text.replace(/^The question: /, 'The question asked was: '))));
  } else {
    // Known defect fixed here (recorded in SPEC-narrative-assembly-contract-v1.md §12, pending
    // exactly this resumption): a null/unresolved analysisIntent no longer silently skips the
    // opening — it states the withhold explicitly, per §1 Absence-Is-Signal.
    sentences.push(terminated(`No question or context could be resolved for this query (${by.QUESTION.reason ?? 'unresolved'})`));
  }

  if (by.DEVELOPMENTS.state === STAGE.PRESENT) {
    sentences.push(terminated(by.DEVELOPMENTS.text));
  } else {
    sentences.push(terminated(
      `How that field developed into its current shape isn't sequenced yet — ${by.DEVELOPMENTS.reason ?? 'no governed chronology orders the underlying observations'}, so that step is skipped rather than guessed at`
    ));
  }

  if (by.RELATIONSHIPS.state === STAGE.PRESENT) {
    const edges = by.RELATIONSHIPS.text.match(/: (.+)\.$/)?.[1] ?? '';
    sentences.push(terminated(`What KRYLO can show instead is what connected within it: ${edges}`));
  } else {
    sentences.push(terminated(
      `Relationship Coverage is withheld for this field — RECONN's governed relationship authority has no persisted admissions yet (a pre-existing, already-ratified architecture gap, not something discovered here), so no relationship claim is made`
    ));
  }

  if (by.FORMATION.state === STAGE.PRESENT && by.RELATIONSHIPS.state === STAGE.PRESENT) {
    sentences.push(terminated(
      `Because those relationships cross two or more domains, they satisfy Formation's admission ` +
      `requirement, and the resulting structure — ${by.FORMATION.text.match(/: (.+)\.$/)?.[1] ?? ''} — ` +
      `is what KRYLO currently observes as a formation`
    ));
  } else if (by.FORMATION.state === STAGE.PRESENT) {
    sentences.push(terminated(by.FORMATION.text));
  } else {
    sentences.push(terminated(
      'That falls short of a formation — Formation requires at least two connected domains, and that ' +
      'threshold wasn\'t reached here, which is a stated absence, not a low score'
    ));
  }

  sentences.push(terminated(
    'Whether that formation reflects rising or easing pressure is withheld too — the one live ' +
    'classifier for that produces an inferred read, not an observed one, and that distinction is ' +
    'currently lost before it would reach this narrative, so no tension read is stated'
  ));

  if (by.EVIDENCE.state === STAGE.PRESENT) {
    const n = by.EVIDENCE.text.match(/composed of (\d+)/)?.[1];
    sentences.push(terminated(`That formation rests on ${n} independently observed signals, each attributable on its own`));
  }

  if (by.UNRESOLVED.state === STAGE.PRESENT) {
    const list = by.UNRESOLVED.text.replace(/^What remains unresolved: /, '').replace(/ did not make it into this formation\.$/, '');
    sentences.push(terminated(`The same field also shows domains that didn't connect in: ${list}`));
  }

  return sentences.join(' ');
}

/**
 * assembleNarrative — the Narrative Assembly v0.2 entry point.
 * @param {{ analysisIntent: object|null, fieldFormation: object|null, subjScope: object, reconnPayload: object }} input
 * @returns {{ version: string, paragraph: string, stages: Array<{stage, state, text, reason?}> }}
 */
export function assembleNarrative({ analysisIntent, fieldFormation, subjScope, reconnPayload }) {
  const stages = [
    questionStage(analysisIntent),
    contextStage(analysisIntent, subjScope),
    developmentsStage(reconnPayload),
    relationshipsStage(reconnPayload),
    tensionStage(),
    formationStage(fieldFormation, subjScope),
    evidenceStage(fieldFormation),
    unresolvedStage(reconnPayload),
  ];
  return Object.freeze({
    version: 'narrative-assembly-0.2',
    paragraph: buildParagraph(stages),
    stages: Object.freeze(stages),
  });
}
