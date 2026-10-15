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
  // imperative request verbs that open a prompt ("Evaluate this deal: ...") are not names
  'evaluate', 'assess', 'analyze', 'analyse', 'review', 'compare', 'check', 'explain', 'tell', 'show', 'give', 'summarize', 'summarise',
]);

const DOMAIN_TAGS = /^(?:capital|ownership|technology|knowledge|labor|labour|media)\b/i;
const AMOUNT = /^\$[\d.,]+\s*(?:bn|b|mm|m|k|million|billion|trillion)?\b/i;
const CLIENT_TAG = /^client\s+opportunity\b/i;
// "Media & Entertainment" style sector tag: Title-Case words joined by '&', followed by an amount or a comma.
const SECTOR_TAG = /^[A-Z][A-Za-z]+(?:\s*&\s*[A-Z][A-Za-z]+)+(?=\s+\$|\s*[,;])/;
const COMPARE_BEFORE = /(?:\bvs\.?|\bthan|\bversus|\bsuperior to|\bcompared (?:to|with)|\bagainst|\brather than|\binstead of|\bover)\s+(?:an?\s+|the\s+)?(?:\w+\s+){0,2}$/i;

const NOISE_MENTIONS = new Set(['AI', 'US', 'UK', 'EU', 'CEO', 'CFO', 'CTO', 'IPO', 'USD', 'ETF', 'LLC', 'Inc', 'Ltd']);

// Headline verbs that ride along in a Title-Case headline run ("Anthropic Raises ..."): trimmed off a subject.
const HEADLINE_VERBS = new Set(['raises','raised','announces','announced','acquires','acquired','launches','launched','reports','reported',
  'names','named','plans','planned','says','said','files','filed','secures','secured','hits','gets','cuts','buys','sells','signs','signed',
  'wins','faces','posts','sees','eyes','targets','lifts','boosts','tops','beats','misses','unveils','expands','leads','led','joins','lands',
  'closes','exits','enters','partners','backs','bets','seeks','sought','weighs','explores','nears','reaches','hires','appoints']);

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
  const STEM_RE = '(?:is|are|was|were|should|would|could|can|does|do|did|will|how|what|why|which|who)';
  // A question may open with a fronted scope phrase ("Across all six domains, what formation exists around Oracle?"): it is still the question.
  const fronted = !/^(?:is|are|was|were|should|would|could|can|does|do|did|will|how|what|why|which|who|good|bad|great|worth)\b/i.test(t) && t.search(/\?/) > 0
    && new RegExp(`^[^?.!\\n]{1,120},\\s*${STEM_RE}\\b[^?]*\\?`, 'i').test(t);
  const lead = fronted || t.match(/^(?:is|are|was|were|should|would|could|can|does|do|did|will|how|what|why|which|who|good|bad|great|worth)\b/i);
  if (lead) {
    const idx = t.search(/[?+:\n]/);
    const cut = idx === -1 ? Math.min(t.length, 80) : idx;
    if (cut <= 140) return { question: t.slice(0, cut).trim(), content: t.slice(cut + (idx === -1 ? 0 : 1)).trim() };
    // One question and nothing else (a single line whose only ? is the last character, no other sentence break): the whole input is the question however long it runs,
    // so its subject is EXPLICIT_IN_QUESTION and not read as content (a 210-character Berkshire query had no subject selected and no SEC filer admission).
    if (idx === t.length - 1 && t[idx] === '?' && !/[.!:+\n]/.test(t.slice(0, idx))) return { question: t.slice(0, idx).trim(), content: '' };
  }
  const tail = t.match(/([^.?!\n]*\b(?:is|are|should|would|could|can|does|do|will|good|worth)\b[^.?!\n]*\?)\s*$/i);
  if (tail && tail.index > 0 && tail[1].length <= 140) return { question: tail[1].trim(), content: t.slice(0, tail.index).trim() };
  return { question: '', content: t };
}

// A capital letter carried only by POSITION (the first word of a sentence) is not evidence of a name (KRYL-1406). Closed-class words that open a
// sentence are never a name by themselves: FRAMING words introduce a scope or a premise ("Across all six domains, ...", "Between ownership and capital, ...",
// "Given the filings, ...") and are dropped even when a name follows directly ("Across Apple" -> Apple); the others are dropped only when no Title-Case
// word follows ("Overall, ..."), because "First Solar" / "Under Armour" begin with a word that is also a name.
const FRAMING_OPENERS = new Set(['across', 'between', 'within', 'among', 'amongst', 'throughout', 'regarding', 'concerning', 'given', 'around', 'beyond',
  'despite', 'during', 'including', 'excluding', 'per', 'via', 'from', 'into', 'toward', 'towards', 'after', 'before', 'since', 'until', 'while', 'because',
  'although', 'though', 'considering', 'based', 'according']);
const LONE_OPENERS = new Set(['overall', 'however', 'also', 'then', 'so', 'currently', 'recently', 'today', 'here', 'there', 'these', 'those', 'some', 'any',
  'all', 'each', 'every', 'both', 'no', 'not', 'yes', 'please', 'next', 'first', 'last', 'under', 'over', 'up', 'out', 'off', 'now', 'still', 'again', 'together',
  'both', 'either', 'neither', 'other', 'another', 'such', 'many', 'most', 'several', 'few', 'more', 'less']);

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
  let sentenceStart = true;
  for (let ti = 0; ti < tokens.length; ti++) {
    const raw = tokens[ti];
    const w = raw.replace(/^[("“'‘\[]+|[)"”,;:.!?\]]+$/g, '');
    const atStart = sentenceStart; sentenceStart = /[.!?:]$/.test(raw) && !/^[A-Z]\.$/.test(raw);
    if (atStart && w && !cur.length) {                                     // capital by position only
      const lw = w.toLowerCase();
      const nextCap = tokens[ti + 1] ? isCapToken(tokens[ti + 1].replace(/^[("“'‘\[]+|[)"”,;:.!?\]]+$/g, '')) : false;
      if (FRAMING_OPENERS.has(lw) || (LONE_OPENERS.has(lw) && !nextCap)) { if (/[,;:.!?]$/.test(raw)) flush(); continue; }
    }
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
function splitAnd(runs) {
  const out = [];
  for (const run of runs) {
    if (!run.some(w => w.toLowerCase() === 'and') || resolve(runText(run))) { out.push(run); continue; }
    let cur = [];
    for (const w of run) {
      if (w.toLowerCase() === 'and') { if (cur.length) out.push(cur); cur = []; } else cur.push(w);
    }
    if (cur.length) out.push(cur);
  }
  return out;
}

// A lead run may carry headline words: prefer the longest prefix that resolves to a registry entity
// ("Anthropic Raises" -> "Anthropic"); otherwise trim trailing headline verbs. Combined subjects ("A / B") are kept whole.
function refineRun(run) {
  if (!run.includes('/')) {
    for (let k = run.length; k >= 1; k--) {
      const cand = run.slice(0, k), txt = runText(cand);
      if (resolve(txt) || resolve(txt.replace(/^the\s+/i, ''))) return cand;
    }
  }
  const r = run.slice();
  while (r.length > 1 && HEADLINE_VERBS.has(stripPoss(r[r.length - 1]).toLowerCase())) r.pop();
  return r;
}

// A long Title-Case run (a headline) is not one name: keep only the sub-phrases the registry resolves.
function expandLongRuns(runs) {
  const out = [];
  for (const run of runs) {
    const inner = run.slice(1);
    const nameLike = run.length <= 4 && !inner.some(w => (STEMS.has(stripPoss(w).toLowerCase()) && !/^(?:of|de|von|van|and)$/i.test(w)) || HEADLINE_VERBS.has(stripPoss(w).toLowerCase()));
    if (nameLike || resolve(runText(run))) { out.push(run); continue; }
    for (let i = 0; i < run.length; ) {
      let hit = 0;
      for (let k = Math.min(3, run.length - i); k >= 1; k--) {
        if (resolve(runText(run.slice(i, i + k)))) { out.push(run.slice(i, i + k)); hit = k; break; }
      }
      i += hit || 1;
    }
  }
  return out;
}

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
  if (/\b(?:buy|sell|stock|stocks|shares?)\b/.test(probe)) return OBJECTIVES.INVESTMENT;
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

  // Pasted prompts often arrive as markdown ("**Question:** ... **Target:** ## Name ..."). The emphasis marks, heading
  // hashes and the Question/Target labels are formatting, not content: strip them before selecting, or the first
  // named run is "Question" / "Target" and the real subject is lost (KRYL-1372 live case, Integrated Biosciences).
  const parseText = queryText
    .replace(/\*\*|__/g, '')
    .replace(/^[ \t]*#{1,6}[ \t]*/gm, '')
    .replace(/^[ \t]*[-*\u2022]\s+/gm, '')
    .replace(/(^|\s)#{1,6}\s+/g, '$1')
    .replace(/\b(?:question|query|prompt|ask|target|subject|company|entity|organization|organisation|asset|deal|investment|topic|name|about|context|background|overview|description|summary|notes?|objective|goal|thesis)\s*:\s*/gi, ' ')
    .replace(/[ \t]+/g, ' ').replace(/^\s+/gm, '')
    .replace(/^(?:evaluate|assess|analy[sz]e|review|compare|check|explain|summari[sz]e|tell me about|show me)\b\s*(?:(?:this|the|a|an)\s+)?(?:(?:deal|company|investment|merger)\s*)?/i, '')
    .trim();
  const { question, content } = splitQuestion(parseText);
  base.objective = selectObjective(question, queryText);

  const qRuns = splitAnd(namedRuns(question).filter(r => !isNoise(r)));
  const body = stripLeadingLabels(content);
  const cRuns = splitAnd(namedRuns(body).filter(r => !isNoise(r)));
  const all = [...qRuns, ...cRuns];

  let subjectRun = null, rule = 'NONE', ambiguous = null;

  // COMPETING: two named phrases joined by "or" / "vs" in the question.
  let ambiguousRole = 'COMPARISON';
  if (qRuns.length >= 2 && /\b(?:or|vs\.?|versus|compared (?:to|with))\b/i.test(question)) {
    ambiguous = qRuns.slice(0, 2);
    rule = 'COMPETING';
  } else if (qRuns.length >= 2 && /\bthan\b/i.test(question) && /\b(?:better|worse|more|less|higher|lower|cheaper|stronger|weaker)\b/i.test(question)) {
    subjectRun = qRuns[0]; rule = 'COMPARATIVE'; // "Is X a better investment than Y?": X is the subject, Y the comparison
  } else if (qRuns.length >= 2) {
    ambiguous = qRuns.slice(0, 2);
    rule = 'MULTIPLE_NAMED'; ambiguousRole = 'OTHER'; // several names, no cue says which is asked about: do not guess
  } else if (qRuns.length >= 1) {
    subjectRun = qRuns[0]; rule = 'EXPLICIT_IN_QUESTION';
  } else if (cRuns.length) {
    // The supplied content's own lead phrase, only when it is at the very start of the content.
    const firstRaw = namedRuns(body)[0];
    const startsWithName = !!firstRaw && !isNoise(firstRaw) && body.startsWith(firstRaw[0]);
    if (startsWithName) {
      const lt = leadTitle(cRuns[0]);
      subjectRun = refineRun(lt.run);
      rule = lt.repeated ? 'TITLE_REPEAT' : 'LEAD_NAME';
    } else if (all.length === 1) {
      subjectRun = all[0]; rule = 'SINGLE_ENTITY';
    }
  }

  if (ambiguous) {
    base.subject = { text: ambiguous.map(runText).join(' / '), canonicalId: null, attribution: 'AMBIGUOUS' };
    base.selectionRule = rule;
    base.mentions = ambiguous.map(r => ({ text: runText(r), canonicalId: resolve(runText(r))?.canonicalId ?? null, role: ambiguousRole }));
    return base;
  }
  if (!subjectRun) return base;

  let subjText = runText(subjectRun).replace(/['’]s$/i, '');
  { const w = subjText.split(' '); const h = w.length / 2; if (w.length % 2 === 0 && w.slice(0, h).join(' ') === w.slice(h).join(' ')) subjText = w.slice(0, h).join(' '); } // "Daytona Daytona" (name repeated across a bracket/label) is one name
  const { canonicalId, attribution } = attributionFor(subjText);
  base.subject = { text: subjText, canonicalId, attribution };
  base.selectionRule = rule;

  // Every other named phrase is a mention, never the subject. COMPARISON when it follows a comparison cue.
  const seen = new Set([subjText.toLowerCase(), ...subjectRun.map(w => stripPoss(w).toLowerCase())]);
  for (const run of expandLongRuns(all)) {
    const t = runText(run).replace(/['’]s$/i, '');
    const key = t.toLowerCase();
    if (seen.has(key) || key.startsWith(subjText.toLowerCase() + ' ') || run.every(w => seen.has(stripPoss(w).toLowerCase()))) continue;
    seen.add(key);
    if (run.length === 1 && NOISE_MENTIONS.has(run[0])) continue;
    const at = queryText.indexOf(run[0]);
    if (run.length === 1 && !resolve(t) && (at <= 0 || /[.!?]\s*$/.test(queryText.slice(Math.max(0, at - 3), at)))) continue;
    const before = at > 0 ? queryText.slice(Math.max(0, at - 40), at) : '';
    base.mentions.push({ text: t, canonicalId: resolve(t)?.canonicalId ?? null, role: COMPARE_BEFORE.test(before) ? 'COMPARISON' : 'CONTEXT' });
  }
  return base;
}
