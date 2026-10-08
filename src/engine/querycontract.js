// querycontract.js -- Query Contract (KRYL-1372, specs/query-contract-summary-spec-sections-1-13-20261007.md).
//
//   SELECT -> LOCK -> RESOLVE -> ANALYZE
//
// SUBJECT + OBJECTIVE are the contract. Subject selection (what is the user asking about) is NOT entity
// resolution (which registry entity is that). The subject is selected from the complete submitted
// context first, locked, and only then resolved; a subject that does not resolve stays the subject with
// attribution UNRESOLVED -- it is never replaced by another entity that merely appears in the text.
//
// Pure and deterministic: no LLM, no I/O, no UI imports. v1 selection rules (the rule that fired is
// recorded in `selectionRule`, so a result can be audited):
//   EXPLICIT_IN_QUESTION   a name inside the question itself ("Is Anduril a good acquisition target?")
//   TITLE_REPEAT           the supplied content opens with its own title repeated ("Daytona Daytona gives ...",
//                          "Paramount / WBD Paramount's ...")
//   LEAD_NAME              the first named phrase of the supplied content, after any leading tags/amounts
//   SINGLE_ENTITY          exactly one named phrase in the whole text
//   COMPETING              "X or Y" / "X vs Y" in the question -> AMBIGUOUS (do not guess)
//   NONE                   no subject can be established
//
// Objective is selected independently of the subject. DEAL_EVALUATION is a PROVISIONAL value for
// "Is this a good deal / merger" questions: the spec's objective list has no such value yet (KRYL-1372
// open item (b)); the Founder names the final value.

import { resolve } from './entityresolution.js';

export const OBJECTIVES = Object.freeze({
  INVESTMENT: 'INVESTMENT',
  ACQUISITION: 'ACQUISITION',
  DEAL_EVALUATION: 'DEAL_EVALUATION', // provisional name, see header
  STRUCTURAL_READ: 'STRUCTURAL_READ',
  DECISION_CONTEXT: 'DECISION_CONTEXT',
  DECISION_FRAME: 'DECISION_FRAME',
});

const STEMS = new Set([
  'is', 'are', 'was', 'were', 'should', 'would', 'could', 'can', 'does', 'do', 'did', 'will', 'shall', 'may', 'might',
  'how', 'what', 'when', 'where', 'why', 'which', 'who', 'whom', 'whose', 'good', 'bad', 'great', 'worth', 'worthwhile',
  'this', 'that', 'it', 'a', 'an', 'the', 'and', 'or', 'but', 'with', 'for', 'on', 'of', 'to', 'in', 'at', 'by', 'as',
  'i', 'we', 'you', 'my', 'our', 'your', 'if', 'then',
]);

const DOMAIN_TAGS = /^(?:capital|ownership|technology|knowledge|labor|labour|media)\b/i;
const AMOUNT = /^\$[\d.,]+\s*(?:bn|b|mm|m|k|million|billion|trillion)?\b/i;
const CLIENT_TAG = /^client\s+opportunity\b/i;
// "Media & Entertainment" style sector tag: Title-Case words joined by '&', followed by an amount or a comma.
const SECTOR_TAG = /^[A-Z][A-Za-z]+(?:\s*&\s*[A-Z][A-Za-z]+)+(?=\s+\$|\s*[,;])/;
const COMPARE_BEFORE = /(?:\bvs\.?|\bversus|\bsuperior to|\bcompared (?:to|with)|\bagainst|\brather than|\binstead of|\bover)\s+(?:an?\s+|the\s+)?(?:\w+\s+){0,2}$/i;

const stripPoss = (w) => w.replace(/['’]s$/i, '');
const isCapToken = (w) => /^[A-Z][A-Za-z0-9.'’&-]*$/.test(w);
const isConnector = (w) => w === '/' || w === '&' || /^(?:of|de|von|van|and)$/i.test(w);

// Remove leading tags / amounts / punctuation that are labels on the content, not its subject.
function stripLeadingLabels(content) {
  let s = content.replace(/^[\s,;:+\-—–]+/, '');
  for (let guard = 0; guard < 12; guard++) {
    const m = [SECTOR_TAG, DOMAIN_TAGS, AMOUNT, CLIENT_TAG].map(re => s.match(re)).find(Boolean);
    if (!m) break;
    s = s.slice(m[0].length).replace(/^[\s,;:+\-—–]+/, '');
  }
  return s;
}

// Split the submitted text into a question and the supplied content. The question is a leading
// interrogative / "Good investment?" stem up to '?', '+', ':' or a line break; or a trailing "...?" sentence.
function splitQuestion(text) {
  const t = text.trim();
  const lead = t.match(/^(?:is|are|was|were|should|would|could|can|does|do|did|will|how|what|why|which|who|good|bad|great|worth)\b/i);
  if (lead) {
    const idx = t.search(/[?+:\n]/);
    const cut = idx === -1 ? Math.min(t.length, 80) : idx;
    if (cut <= 140) return { question: t.slice(0, cut).trim(), content: t.slice(cut + (idx === -1 ? 0 : 1)).trim() };
  }
  const tail = t.match(/([^.?!\n]*\b(?:is|are|should|would|could|can|does|do|will|good|worth)\b[^.?!\n]*\?)\s*$/i);
  if (tail && tail.index > 0 && tail[1].length <= 140) return { question: tail[1].trim(), content: t.slice(0, tail.index).trim() };
  return { question: '', content: t };
}

// Named phrases: runs of Title-Case tokens, allowing "of / and / & / /" inside and a leading "The".
function namedRuns(text) {
  const tokens = text.split(/\s+/).filter(Boolean);
  const runs = [];
  let cur = [];
  const flush = () => {
    while (cur.length && isConnector(cur[cur.length - 1])) cur.pop(); // a run never ends on of / and / & / "/"
    const isStem = (w) => STEMS.has(stripPoss(w).toLowerCase());
    while (cur.length > 1 && isStem(cur[0]) && cur[0].toLowerCase() !== 'the') cur.shift(); // "Is Anduril" -> "Anduril"
    while (cur.length > 1 && isStem(cur[cur.length - 1])) cur.pop();
    if (cur.length) runs.push(cur.slice());
    cur = [];
  };
  for (const raw of tokens) {
    const w = raw.replace(/^[("“'‘\[]+|[)"”,;:.!?\]]+$/g, '');
    const endsClause = /[,;:.!?]$/.test(raw) && !/^[A-Z]\.$/.test(raw);
    if (!w) { flush(); continue; }
    if (isCapToken(w) || (cur.length && isConnector(w))) cur.push(w);
    else { flush(); continue; } // any other lowercase word ends the run
    if (endsClause) flush();
  }
  flush();
  return runs;
}

const runText = (run) => run.join(' ').replace(/\s*\/\s*/g, ' / ').replace(/\s+&\s+/g, ' & ');
const isNoise = (run) => run.every(w => STEMS.has(stripPoss(w).toLowerCase()) || DOMAIN_TAGS.test(w));

// A content run is "X X ..." (title repeated) or "X Xs ..." (first token repeated, possibly possessive).
function leadTitle(run) {
  const first = stripPoss(run[0]);
  for (let k = 1; k < run.length; k++) {
    if (stripPoss(run[k]).toLowerCase() === first.toLowerCase() && !isConnector(run[k])) return { run: run.slice(0, k), repeated: true };
  }
  return { run, repeated: false };
}

function selectObjective(question, text) {
  const q = (question || '').toLowerCase();
  const all = text.toLowerCase();
  const probe = q || all.slice(0, 160);
  if (/\binvest(?:ment|ments|ing|or|ors)?\b/.test(probe)) return OBJECTIVES.INVESTMENT;
  if (/\b(?:deal|merger|mergers|merge|buy ?back|buyout|buy out)\b/.test(probe)) return OBJECTIVES.DEAL_EVALUATION;
  if (/\bacqui(?:re|res|sition|sitions|ring)\b|\btakeover\b/.test(probe)) return OBJECTIVES.ACQUISITION;
  if (/\bstructural\b|\brelationships?\b|\bdependenc|\bforming\b|\bco-?presence\b/.test(probe)) return OBJECTIVES.STRUCTURAL_READ;
  if (/\b(?:should i|should we|decide|decision|which option|best plan)\b/.test(probe)) return OBJECTIVES.DECISION_FRAME;
  return null;
}

function attributionFor(subjectText) {
  const probe = [subjectText, subjectText.replace(/^the\s+/i, '')];
  for (const p of probe) {
    const e = resolve(p);
    if (e) return { canonicalId: e.canonicalId, attribution: e.verification === 'NAMED_UNVERIFIED' ? 'UNRESOLVED' : 'RESOLVED' };
  }
  return { canonicalId: null, attribution: 'UNRESOLVED' };
}

export function buildQueryContract(input) {
  const queryText = (typeof input === 'string' ? input : (input?.rawQuery ?? input?.query ?? '')).trim();
  const base = { subject: { text: '', canonicalId: null, attribution: 'NONE' }, objective: null, mentions: [], selectionRule: 'NONE', queryText, builtAt: Date.now() };
  if (!queryText) return base;

  const { question, content } = splitQuestion(queryText);
  base.objective = selectObjective(question, queryText);

  const qRuns = namedRuns(question).filter(r => !isNoise(r));
  const body = stripLeadingLabels(content);
  const cRuns = namedRuns(body).filter(r => !isNoise(r));
  const all = [...qRuns, ...cRuns];

  let subjectRun = null, rule = 'NONE', ambiguous = null;

  // COMPETING: two named phrases joined by "or" / "vs" in the question.
  if (qRuns.length >= 2 && /\b(?:or|vs\.?|versus|compared (?:to|with))\b/i.test(question)) {
    ambiguous = qRuns.slice(0, 2);
    rule = 'COMPETING';
  } else if (qRuns.length >= 1) {
    subjectRun = qRuns[0]; rule = 'EXPLICIT_IN_QUESTION';
  } else if (cRuns.length) {
    // The supplied content's own lead phrase, only when it is at the very start of the content.
    const startsWithName = /^(?:The\s+)?[A-Z]/.test(body);
    if (startsWithName) {
      const lt = leadTitle(cRuns[0]);
      subjectRun = lt.run;
      rule = lt.repeated ? 'TITLE_REPEAT' : 'LEAD_NAME';
    } else if (all.length === 1) {
      subjectRun = all[0]; rule = 'SINGLE_ENTITY';
    }
  }

  if (ambiguous) {
    base.subject = { text: ambiguous.map(runText).join(' / '), canonicalId: null, attribution: 'AMBIGUOUS' };
    base.selectionRule = rule;
    base.mentions = ambiguous.map(r => ({ text: runText(r), canonicalId: resolve(runText(r))?.canonicalId ?? null, role: 'COMPARISON' }));
    return base;
  }
  if (!subjectRun) return base;

  const subjText = runText(subjectRun).replace(/['’]s$/i, '');
  const { canonicalId, attribution } = attributionFor(subjText);
  base.subject = { text: subjText, canonicalId, attribution };
  base.selectionRule = rule;

  // Every other named phrase is a mention, never the subject. COMPARISON when it follows a comparison cue.
  const seen = new Set([subjText.toLowerCase(), ...subjectRun.map(w => stripPoss(w).toLowerCase())]);
  for (const run of all) {
    const t = runText(run).replace(/['’]s$/i, '');
    const key = t.toLowerCase();
    if (seen.has(key) || run.every(w => seen.has(stripPoss(w).toLowerCase()))) continue;
    seen.add(key);
    const at = queryText.indexOf(run[0]);
    const before = at > 0 ? queryText.slice(Math.max(0, at - 40), at) : '';
    base.mentions.push({ text: t, canonicalId: resolve(t)?.canonicalId ?? null, role: COMPARE_BEFORE.test(before) ? 'COMPARISON' : 'CONTEXT' });
  }
  return base;
}
