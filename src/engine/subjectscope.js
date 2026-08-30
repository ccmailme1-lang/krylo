// subjectscope.js — WO-5B stage 5B-1 (KRYL-1234).
//
// Establishes THE canonical subject once, before any domain analysis, so a query
// resolves to one subject identity across all six domains (SPEC-WO5B §1, §2).
//
//   subjectScope(query | queryContext) →
//     { kind: 'ENTITY',        canonicalId, entity, matchedOn, confidence }
//   | { kind: 'GEO',           location }                       (from resolved queryContext.geo only)
//   | { kind: 'DECISION_FRAME', frame }                         decision cues, no entity — unit-of-analysis unsettled
//   | { kind: 'UNRESOLVED',     reason }
//
// The name-extraction rule ignores the leading question/aux stem so
// "Is Anduril a good acquisition target?" resolves to `Anduril`, not the
// "IS ANDURIL" pseudo-anchor (SPEC-subject-scoping-contract.md §3a).

import { resolve } from './entityresolution.js';

const TRIM_WORDS = new Set([
  // question / auxiliary stems
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
  'should', 'would', 'could', 'will', 'shall', 'do', 'does', 'did', 'can', 'may', 'might', 'must',
  'how', 'what', 'when', 'where', 'why', 'which', 'who', 'whom', 'whose',
  // articles / fillers that precede or trail a name in a question
  'a', 'an', 'the', 'good', 'bad', 'great', 'solid', 'strong', 'weak', 'poor',
  'possible', 'potential', 'worth', 'worthwhile', 'viable', 'attractive', 'ideal',
  'about', 'for', 'on', 'of', 'to', 'vs', 'versus',
]);

// Title-Case spans (1+ consecutive capitalized tokens) + quoted spans.
function nameCandidates(text) {
  const quoted = [...text.matchAll(/"([^"]+)"/g)].map(m => m[1].trim());
  const spans  = [...text.matchAll(/\b([A-Z][A-Za-z][A-Za-z.&'-]*(?:\s+[A-Z][A-Za-z][A-Za-z.&'-]*)*)\b/g)]
    .map(m => m[1].trim());

  const out = new Set();
  const addWindows = (words) => {
    let i = 0;            while (i < words.length && TRIM_WORDS.has(words[i].toLowerCase())) i++;
    let j = words.length; while (j > i && TRIM_WORDS.has(words[j - 1].toLowerCase())) j--;
    const core = words.slice(i, j);
    // every contiguous 1..4-word window of the trimmed span — resolve() gates
    // each, so junk windows fail closed
    for (let a = 0; a < core.length; a++)
      for (let b = a + 1; b <= Math.min(core.length, a + 4); b++)
        out.add(core.slice(a, b).join(' '));
  };
  for (const span of [...quoted, ...spans]) addWindows(span.split(/\s+/).filter(Boolean));
  // also the raw query itself (handles all-lowercase names like "anduril industries")
  const bare = text.split(/\s+/).filter(Boolean);
  if (bare.length <= 8) addWindows(bare);
  return [...out].filter(s => s.length >= 2 && !TRIM_WORDS.has(s.toLowerCase()));
}

function queryText(input) {
  if (typeof input === 'string') return input;
  return input?.rawQuery ?? input?.query ?? '';
}

export function subjectScope(input) {
  const text = queryText(input).trim();
  const qc   = (input && typeof input === 'object') ? input : null;

  if (!text) return { kind: 'UNRESOLVED', reason: 'empty query' };

  // 1. ENTITY — the strongest binding. Try every candidate, keep the best match.
  let best = null;
  for (const cand of nameCandidates(text)) {
    const e = resolve(cand);
    if (!e) continue;
    const better = !best || e.confidence > best.confidence ||
      (e.confidence === best.confidence && cand.length > best.matchedOn.length);
    if (better) best = { entity: e, matchedOn: cand, confidence: e.confidence };
  }
  if (best) {
    const e = best.entity;
    return {
      kind: 'ENTITY',
      canonicalId: e.canonicalId,
      entity: {
        canonicalId: e.canonicalId,
        name: e.canonicalName,
        identifiers: e.identifiers ?? {},
        domainTags: e.domainTags ?? [],
      },
      matchedOn: best.matchedOn,
      confidence: best.confidence,
    };
  }

  // 2. GEO — only when intake already resolved an (ambiguous) location. Real geo
  // extraction is a querycontext.js follow-on; an unresolved place name is not
  // invented into a subject here.
  if (qc?.geo?.state === 'resolved') {
    return { kind: 'GEO', location: qc.geo.value?.location ?? qc.geo.value, source: 'queryContext.geo' };
  }

  // 3. DECISION_FRAME — decision cues but no entity. Subjecthood for decision
  // frames is the unsettled unit-of-analysis question (SPEC-unit-of-analysis-inquiry.md).
  const cues = qc?.decisionCues ?? [];
  if (Array.isArray(cues) && cues.length > 0) {
    return {
      kind: 'DECISION_FRAME',
      frame: text.slice(0, 140),
      reason: 'decision cues present, no entity resolved — unit-of-analysis unsettled',
    };
  }

  return { kind: 'UNRESOLVED', reason: 'no entity resolved; no decision cues; no resolved geo' };
}

export function isScopable(scope) {
  return scope?.kind === 'ENTITY';   // GEO/DECISION_FRAME/UNRESOLVED → classified absence in A(d, Subject)
}
