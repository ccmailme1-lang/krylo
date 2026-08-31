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

// ── KRYL-1237 — Named-Unverified Subject ──────────────────────────────────────
// A submission that EXPLICITLY names its subject company resolves to that company
// even when it is not in the curated registry — but only when the name sits in an
// explicit-subject position and NOT an investor/context position, and only when
// exactly one such name survives. Contextual clues never silently establish
// identity (that is KRYL-1238); an explicitly named subject may.

const NU_STOPWORDS = new Set([
  'deal', 'submission', 'pitch', 'memo', 'why', 'invest', 'investment', 'the', 'our',
  'key', 'risks', 'risk', 'summary', 'overview', 'thesis', 'ask', 'round', 'series',
  'appendix', 'team', 'market', 'product', 'traction', 'financials', 'use', 'funds',
]);

// Multi-word Title-Case spans + quoted spans — a single capitalized token is too
// weak a signal to promote an unverified subject.
function namedCandidates(text) {
  const quoted = [...text.matchAll(/"([^"]+)"/g)].map(m => m[1].trim());
  // inter-word separator is a real space/tab only — never a newline, so a name at
  // the end of one line does not fuse with a name at the start of the next.
  const spans  = [...text.matchAll(/\b([A-Z][A-Za-z][A-Za-z.&'-]*(?:[ \t]+[A-Z][A-Za-z][A-Za-z.&'-]*)+)\b/g)]
    .map(m => m[1].trim());
  return [...new Set([...quoted, ...spans])]
    .filter(s => s.length >= 3)
    .filter(s => !s.split(/\s+/).every(w => NU_STOPWORDS.has(w.toLowerCase())));
}

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Faithful slug of the named string — NOT entityresolution's match-normalized form
// (which strips corporate suffixes), so "Oriole Networks" and "Oriole Capital" get
// distinct ids.
const namedSlug = s => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function inExplicitSubjectPosition(name, text) {
  const N = esc(name);
  return [
    new RegExp(`${N}\\s+(?:is|are)\\s+(?:raising|seeking|closing|opening)\\b`, 'i'),
    new RegExp(`${N}\\s+(?:is|are)\\s+(?:a|an)\\s+(?:[a-z-]+\\s+){0,3}(?:compan|startup|start-up|business|firm|platform|team|venture|maker|developer|provider|lab|studio|company)`, 'i'),
    new RegExp(`${N}['’]?s?\\s+(?:series\\s+[a-j]|seed|pre-seed|round|raise|deal|financing|cap\\s+table|valuation)`, 'i'),
    new RegExp(`(?:deal\\s+submission|investment\\s+memo|pitch\\s+deck|company)\\s*[—–:\\-]+\\s*${N}`, 'i'),
    new RegExp(`(?:investing|invest|investment)\\s+in\\s+${N}\\b`, 'i'),
    new RegExp(`${N}\\s*[—–-]\\s*(?:a|an)?\\s*(?:compan|startup|platform|business|venture)`, 'i'),
  ].some(re => re.test(text));
}

function inContextPosition(name, text) {
  const N = esc(name);
  // direct attribution phrases
  const direct = [
    new RegExp(`\\bex[- ]${N}\\b`, 'i'),
    new RegExp(`former\\s+[\\w-]+\\s+(?:at|of)\\s+${N}\\b`, 'i'),
    new RegExp(`${N}\\s+(?:alum|alumni|veteran)\\b`, 'i'),
  ].some(re => re.test(text));
  if (direct) return true;
  // investor/attribution clauses — the name anywhere between the lead phrase and the
  // next sentence break ("led by A and B, with participation from C.")
  for (const lead of [/led\s+by/i, /backed\s+by/i, /participation\s+from/i, /investors?\s*(?:include|are|:)/i, /alongside/i, /advis(?:ed|or)/i]) {
    const m = lead.exec(text);
    if (!m) continue;
    const clause = text.slice(m.index, text.indexOf('.', m.index) + 1 || undefined);
    if (new RegExp(`\\b${N}\\b`, 'i').test(clause)) return true;
  }
  return false;
}

// → { name, namedVia } | { multiple: true } | null
function promoteNamedSubject(text) {
  const survivors = namedCandidates(text)
    .filter(n => inExplicitSubjectPosition(n, text) && !inContextPosition(n, text));
  // collapse a candidate that is a prefix/suffix of a longer survivor ("Oriole" vs
  // "Oriole Networks") — keep the longest
  const trimmed = survivors.filter(a => !survivors.some(b => b !== a && b.toLowerCase().includes(a.toLowerCase())));
  if (trimmed.length === 1) return { name: trimmed[0], namedVia: 'explicit-subject position' };
  if (trimmed.length > 1) return { multiple: true };
  return null;
}

// ── KRYL-1238 — comparison / reference position ──────────────────────────────
// A registry name that appears ONLY as a comparator or example ("Rigetti vs NVIDIA",
// "primes like Lockheed Martin") is NOT the subject. Resolving it silently — because
// it happens to be the one name in the 57-entry registry while the actual subject is
// not — is the Rigetti/NVIDIA defect. When the best match is comparison-only, discard
// it rather than substitute an unrelated entity for an ambiguous query.
const CMP_BEFORE = /(?:vs\.?|versus|compared\s+(?:to|with)|relative\s+to|against|(?:rather|better|worse|more|less|safer|cheaper)\s+than|\bthan|instead\s+of|unlike|not|like|such\s+as|e\.g\.,?|similar\s+to|the\s+likes\s+of|pick(?:ing)?\s+\w+\s+over|choose\s+\w+\s+over)\s+(?:the\s+)?$/i;
const CMP_AFTER  = /^\s*(?:vs\.?|versus)\b/i;

function isComparisonOnly(name, text) {
  const re = new RegExp(`\\b${esc(name)}\\b`, 'gi');
  let m, seen = 0;
  while ((m = re.exec(text))) {
    seen++;
    const before = text.slice(Math.max(0, m.index - 24), m.index);
    const after  = text.slice(m.index + name.length, m.index + name.length + 12);
    if (!CMP_BEFORE.test(before) && !CMP_AFTER.test(after)) return false; // a non-comparison occurrence → it may be the subject
  }
  return seen > 0;
}

// Unresolved multi/single-word proper-noun candidates, first-occurrence order — the
// "there is a named thing here even though we could not resolve it" signal (Founder
// KRYL-1238 acceptance #1).
function unresolvedNamedCandidates(text) {
  const spans = [...text.matchAll(/\b([A-Z][A-Za-z][A-Za-z.&'-]*(?:[ \t]+[A-Z][A-Za-z][A-Za-z.&'-]*)*)\b/g)]
    .map(m => ({ name: m[1].trim(), index: m.index }))
    .filter(c => c.name.length >= 3)
    .filter(c => !c.name.split(/\s+/).every(w => NU_STOPWORDS.has(w.toLowerCase()) || TRIM_WORDS.has(w.toLowerCase())));
  const out = [];
  for (const c of spans) {
    if (out.some(o => o.name.toLowerCase() === c.name.toLowerCase())) continue;
    if (resolve(c.name)) continue;  // resolved names are handled by the ENTITY path
    out.push(c);
  }
  return out.sort((a, b) => a.index - b.index).map(c => c.name);
}

const SCALE = { k: 1e3, m: 1e6, mm: 1e6, b: 1e9, bn: 1e9, billion: 1e9, million: 1e6, thousand: 1e3 };
function scaleMoney(digits, suffix) {
  const n = parseFloat(String(digits).replace(/,/g, ''));
  if (isNaN(n)) return null;
  return suffix ? n * (SCALE[suffix.toLowerCase()] ?? 1) : n;
}
function titleStage(s) {
  return s.replace(/\bpre[- ]?seed\b/i, 'Pre-Seed')
          .replace(/\bseed\b/i, 'Seed')
          .replace(/series\s+([a-j])\d?/i, (_, l) => `Series ${l.toUpperCase()}`);
}

// Deal frame — labelled CONTEXT only, never a conclusion input.
export function extractDealFrame(text) {
  const t = text ?? '';
  const stageM = t.match(/\b(pre[- ]?seed|seed|series\s+[a-j]\d?)\b/i);
  const stage = stageM ? titleStage(stageM[1]) : null;
  let round = null, preMoney = null;
  for (const m of t.matchAll(/\$\s?(\d[\d.,]*)\s*(mm|bn|k|m|b|billion|million|thousand)?/gi)) {
    const val = scaleMoney(m[1], m[2]);
    if (val == null) continue;
    const end    = m.index + m[0].length;
    const after  = t.slice(end, end + 24).toLowerCase();
    const before = t.slice(Math.max(0, m.index - 30), m.index).toLowerCase();
    if (/^[\s,]*(?:pre[- ]?money|post[- ]?money|valuation)/.test(after)
        || /(?:pre[- ]?money|valuation)\s+(?:of\s+)?$/.test(before)) {
      if (preMoney == null) preMoney = val;
    } else if (/^\s*(?:series\s+[a-j]\b|seed\b|round\b|financing\b)/.test(after)
        || /(?:rais(?:e|ing)|round\s+of|invest(?:ing)?|deploy(?:ing)?)\s+(?:a\s+|an\s+|~|up\s+to\s+)?$/.test(before)) {
      if (round == null) round = val;
    }
  }
  if (!stage && round == null && preMoney == null) return null;
  return { stage, round, preMoney, source: 'submission' };
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
  // KRYL-1238 — do not resolve to a registry name that only ever appears as a
  // comparator / example. It is not the subject; substituting it for an ambiguous
  // query is the Rigetti/NVIDIA defect.
  let comparator = null;
  if (best && isComparisonOnly(best.matchedOn, text)) {
    comparator = best.entity.canonicalName;
    best = null;
  }
  if (best) {
    const e = best.entity;
    return {
      kind: 'ENTITY',
      verification: 'REGISTRY',
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

  // KRYL-1238 — the named thing(s) we could not resolve. Carried on every non-ENTITY
  // result so the packet / frame surface can say "candidate: Rigetti" instead of
  // silently dropping it or substituting a registry name.
  const candidates = unresolvedNamedCandidates(text);

  // 1b. NAMED_UNVERIFIED — the registry missed, but the text explicitly names its
  // subject company. Resolve to it as an ENTITY carrying NO identifiers and NO
  // domain tags: A(d, Subject) then runs and every domain is stated absence, because
  // subjectbinding needs an identifier to attach a facet (KRYL-1237). The submission
  // is the source; its claims never become evidence.
  const extra = { candidates, ...(comparator ? { comparator } : {}) };
  const named = promoteNamedSubject(text);
  if (named?.multiple) {
    return {
      kind: 'DECISION_FRAME',
      frame: text.slice(0, 140),
      dealFrame: extractDealFrame(text),
      reason: 'multiple named subjects — ambiguous; no silent pick',
      ...extra,
    };
  }
  if (named) {
    const cid = namedSlug(named.name);
    return {
      kind: 'ENTITY',
      verification: 'NAMED_UNVERIFIED',
      canonicalId: cid,
      entity: { canonicalId: cid, name: named.name, identifiers: {}, domainTags: [] },
      matchedOn: named.name,
      namedVia: named.namedVia,
      dealFrame: extractDealFrame(text),
      candidates: candidates.filter(c => c.toLowerCase() !== named.name.toLowerCase()),
      ...(comparator ? { comparator } : {}),
    };
  }

  // 2. GEO — only when intake already resolved an (ambiguous) location. Real geo
  // extraction is a querycontext.js follow-on; an unresolved place name is not
  // invented into a subject here.
  if (qc?.geo?.state === 'resolved') {
    return { kind: 'GEO', location: qc.geo.value?.location ?? qc.geo.value, source: 'queryContext.geo', ...extra };
  }

  // 3. DECISION_FRAME — decision cues but no entity. Subjecthood for decision
  // frames is the unsettled unit-of-analysis question (SPEC-unit-of-analysis-inquiry.md).
  const cues = qc?.decisionCues ?? [];
  if (Array.isArray(cues) && cues.length > 0) {
    return {
      kind: 'DECISION_FRAME',
      frame: text.slice(0, 140),
      dealFrame: extractDealFrame(text),
      reason: 'decision cues present, no entity resolved — unit-of-analysis unsettled',
      ...extra,
    };
  }

  return {
    kind: 'UNRESOLVED',
    reason: comparator
      ? `named subject unresolved; "${comparator}" appears only as a comparator, not the subject`
      : candidates.length
        ? 'named candidate(s) present but unresolved; no decision cues; no resolved geo'
        : 'no entity resolved; no decision cues; no resolved geo',
    ...extra,
  };
}

export function isScopable(scope) {
  return scope?.kind === 'ENTITY';   // GEO/DECISION_FRAME/UNRESOLVED → classified absence in A(d, Subject)
}
