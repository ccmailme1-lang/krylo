// qa_querycontract.mjs -- KRYL-1372 Query Contract selector (src/engine/querycontract.js).
// Fixtures are RECREATED from the observed failure patterns (the original submitted texts were not kept):
// each reproduces the structure that failed (question + tags + titled target content + a contextual entity).
import { buildQueryContract, OBJECTIVES } from './src/engine/querycontract.js';
import { subjectScope } from './src/engine/subjectscope.js';

let pass = 0, fail = 0;
const ok = (cond, label) => { if (cond) { pass++; console.log('  ✓ ' + label); } else { fail++; console.log('  ✗ ' + label); } };
const strip = (c) => { const { builtAt, ...rest } = c; return JSON.stringify(rest); };
const mention = (c, text) => c.mentions.find(m => m.text.toLowerCase() === text.toLowerCase());

console.log('Regression: a contextual entity must not displace the selected subject');
{ // Daytona question; target content mentions Meta (which the registry resolves)
  const c = buildQueryContract('Is this a good investment? Daytona Daytona gives every AI agent its own secure, isolated cloud computer, or "sandbox," purpose-built for autonomous agents. Backed by investors including Meta and others.');
  ok(c.subject.text === 'Daytona', 'Daytona: subject = Daytona (not Meta)');
  ok(c.subject.attribution === 'UNRESOLVED' && c.subject.canonicalId === null, 'Daytona: attribution UNRESOLVED, subject retained');
  ok(c.objective === OBJECTIVES.INVESTMENT, 'Daytona: objective INVESTMENT');
  ok(mention(c, 'Meta')?.role === 'CONTEXT' && mention(c, 'Meta')?.canonicalId === 'meta-platforms', 'Daytona: Meta is a CONTEXT mention (still resolved as a mention)');
}
{ // Subcritical Systems; mentions SpaceX
  const c = buildQueryContract('Is this a good investment? Subcritical Systems Subcritical Systems has an NRC-confirmed path to meltdown-proof nuclear plants built in 30 months at up to 55% lower cost. Khosla leads the round, with participation from SpaceX.');
  ok(c.subject.text === 'Subcritical Systems', 'Subcritical: subject = Subcritical Systems (not SpaceX)');
  ok(c.subject.attribution === 'UNRESOLVED', 'Subcritical: attribution UNRESOLVED');
  ok(c.objective === OBJECTIVES.INVESTMENT, 'Subcritical: objective INVESTMENT');
  ok(mention(c, 'SpaceX')?.role === 'CONTEXT', 'Subcritical: SpaceX = CONTEXT');
  ok(c.selectionRule === 'TITLE_REPEAT', 'Subcritical: selected by TITLE_REPEAT');
}
{ // Paramount / WBD with a comparison to Netflix (recreated pattern: tags, amount, combined-entity subject)
  const c = buildQueryContract("Good investment? Media & Entertainment $110bn Paramount / WBD Paramount's $31.00/share cash offer determined superior to a signed Netflix all-stock merger after the board review.");
  ok(c.subject.text === 'Paramount / WBD', 'Paramount/WBD: subject = the combined subject, tags and amount skipped');
  ok(c.subject.attribution === 'UNRESOLVED', 'Paramount/WBD: attribution UNRESOLVED');
  ok(c.objective === OBJECTIVES.INVESTMENT, 'Paramount/WBD: objective INVESTMENT');
  ok(mention(c, 'Netflix')?.role === 'COMPARISON', 'Paramount/WBD: Netflix = COMPARISON, not the subject');
}
{ // Zambia: implicit "this", tags, sovereign subject, deal question
  const c = buildQueryContract('Is this a good deal + Capital, Client opportunity The Republic of Zambia sought to buy back the outstanding bonds it had issued as part of its 2024 debt restructuring.');
  ok(c.subject.text === 'The Republic of Zambia', 'Zambia: subject = The Republic of Zambia (tags skipped, implicit "this")');
  ok(c.subject.attribution === 'UNRESOLVED', 'Zambia: attribution UNRESOLVED (not NONE)');
  ok(c.objective === OBJECTIVES.DEAL_EVALUATION, 'Zambia: objective = deal evaluation (provisional value)');
  ok(!c.mentions.some(m => /capital|client/i.test(m.text)), 'Zambia: "Capital" / "Client opportunity" are labels, not mentions');
}

console.log('Preserved behavior');
{
  const c = buildQueryContract('Is Anduril a good acquisition target?');
  ok(c.subject.text === 'Anduril' && c.subject.attribution === 'RESOLVED' && c.subject.canonicalId === 'anduril-industries', 'explicit named subject resolves as before');
  ok(c.objective === OBJECTIVES.ACQUISITION, 'objective ACQUISITION');
  ok(c.selectionRule === 'EXPLICIT_IN_QUESTION', 'rule EXPLICIT_IN_QUESTION');
}
{
  const c = buildQueryContract('NVIDIA: What structural relationships are forming around NVIDIA across ownership, technology, and capital?');
  ok(c.subject.text === 'NVIDIA' && c.subject.attribution === 'RESOLVED', 'single-entity query resolves');
  ok(c.objective === OBJECTIVES.STRUCTURAL_READ, 'objective STRUCTURAL_READ');
}
{
  const c = buildQueryContract('How should I think about the best plan for my 3 kids?');
  ok(c.subject.attribution === 'NONE' && c.subject.text === '', 'no subject -> NONE, never a guess');
  ok(c.objective === OBJECTIVES.DECISION_FRAME, 'decision question with no subject -> DECISION_FRAME');
}
{
  const c = buildQueryContract('');
  ok(c.subject.attribution === 'NONE' && c.objective === null && c.mentions.length === 0, 'empty -> NONE, no objective');
}

console.log('Competing subjects');
{
  const c = buildQueryContract('Is Nvidia or AMD a better investment?');
  ok(c.subject.attribution === 'AMBIGUOUS', 'two competing subjects -> AMBIGUOUS (do not guess)');
  ok(c.mentions.length === 2 && c.mentions.every(m => m.role === 'COMPARISON'), 'both are COMPARISON mentions');
  ok(c.objective === OBJECTIVES.INVESTMENT, 'objective selected independently: INVESTMENT');
}

console.log('subjectScope() reads the contract (one authority)');
{
  const d = subjectScope('Is this a good investment? Daytona Daytona gives every AI agent its own sandbox. Backed by Meta.');
  ok(d.kind === 'UNRESOLVED' && d.subject?.text === 'Daytona', 'Daytona: subjectScope = UNRESOLVED with subject Daytona (was ENTITY meta-platforms)');
  const s = subjectScope('Is this a good investment? Subcritical Systems Subcritical Systems has an NRC-confirmed path. Participation from SpaceX.');
  ok(s.kind === 'UNRESOLVED' && s.subject?.text === 'Subcritical Systems', 'Subcritical: subjectScope keeps the subject (was ENTITY spacex)');
  const z = subjectScope('Is this a good deal + Capital, Client opportunity The Republic of Zambia sought to buy back the outstanding bonds.');
  ok(z.kind === 'UNRESOLVED' && z.subject?.text === 'The Republic of Zambia' && z.subject?.objective === OBJECTIVES.DEAL_EVALUATION, 'Zambia: subject and objective carried on the scope');
  const a = subjectScope('Is Anduril a good acquisition target?');
  ok(a.kind === 'ENTITY' && a.canonicalId === 'anduril-industries', 'explicit named subject still resolves to ENTITY');
  const n = subjectScope('NVIDIA: What structural relationships are forming around NVIDIA across ownership, technology, and capital?');
  ok(n.kind === 'ENTITY' && n.canonicalId === 'nvidia', 'single-entity query still ENTITY');
}

console.log('Phrasing matrix (trailing question, buy/sell, multiple names, comparative)');
{
  const c = buildQueryContract('Daytona Daytona gives every AI agent its own sandbox. Backed by Meta. Is this a good investment?');
  ok(c.subject.text === 'Daytona' && c.subject.attribution === 'UNRESOLVED' && c.objective === OBJECTIVES.INVESTMENT, 'trailing question: subject Daytona, INVESTMENT');
  ok(c.mentions.length === 1 && c.mentions[0].text === 'Meta', 'mentions: only Meta (no "AI" / "Backed" noise)');
}
{
  const c = buildQueryContract('Should I buy Tesla stock?');
  ok(c.subject.text === 'Tesla' && c.objective === OBJECTIVES.INVESTMENT, 'buy/stock wording reads as INVESTMENT');
}
{
  const c = buildQueryContract('How are NVIDIA and TSMC connected?');
  ok(c.subject.attribution === 'AMBIGUOUS' && c.selectionRule === 'MULTIPLE_NAMED', 'two names, no cue -> AMBIGUOUS (never one merged fake entity)');
  ok(subjectScope('How are NVIDIA and TSMC connected?').kind === 'ENTITY', 'subjectScope keeps its previous behavior for it (ENTITY via best mention)');
  { const m = subjectScope('What is the structural relationship between Microsoft and OpenAI?'); ok(m.kind === 'ENTITY' && m.canonicalId === 'microsoft', 'Microsoft + OpenAI: multiple names do not override the legacy result (ENTITY microsoft)'); }
}
{
  const c = buildQueryContract('Is Nvidia a better investment than AMD?');
  ok(c.subject.text === 'Nvidia' && c.subject.attribution === 'RESOLVED' && c.selectionRule === 'COMPARATIVE', 'comparative: Nvidia is the subject');
  ok(c.mentions.find(m => m.text === 'AMD')?.role === 'COMPARISON', 'AMD = COMPARISON');
}
{
  const c = buildQueryContract('Good merger? Salesforce / Slack Salesforce announced the $27.7B acquisition of Slack.');
  ok(c.subject.text === 'Salesforce / Slack' && c.objective === OBJECTIVES.DEAL_EVALUATION, 'combined-entity subject kept whole');
}

console.log('Resolved subject displaced by a longer-named resolved mention (Google / Anthropic)');
{
  const g = "Is Google a good investment? Google (GOOG) (GOOGL) is a name I've been bullish on for years, as it was actually one of the first individual stocks I ever bought. Alphabet owns a large stake in Anthropic, and Anthropic's valuation keeps rising.";
  const c = buildQueryContract(g);
  ok(c.subject.text === 'Google' && c.subject.attribution === 'RESOLVED' && c.subject.canonicalId === 'alphabet', 'contract: subject = Google (alphabet)');
  const s = subjectScope(g);
  ok(s.kind === 'ENTITY' && s.canonicalId === 'alphabet', 'subjectScope: ENTITY alphabet, not anthropic (the longest mention no longer wins)');
  ok(c.mentions.some(m => m.text === 'Anthropic' && m.role === 'CONTEXT'), 'Anthropic is a CONTEXT mention');
  ok(subjectScope('Is Google a good investment?').canonicalId === 'alphabet', 'short form unchanged (ENTITY alphabet)');
}

console.log('Article-shaped inputs (stress test findings)');
{
  const c = buildQueryContract('Is this a good investment? Anthropic Raises $5 Billion Series F Led By Lightspeed, Valuing The AI Lab At $180 Billion. Google and Amazon are existing backers.');
  ok(c.subject.text === 'Anthropic' && c.subject.attribution === 'RESOLVED', 'headline: "Anthropic Raises ..." -> subject Anthropic (headline verb trimmed, resolves)');
  ok(c.mentions.every(m => m.text.split(' ').length <= 3) && c.mentions.some(m => m.text === 'Google'), 'headline junk is not a mention; Google is');
}
{
  const c = buildQueryContract('Is this a good investment? The company, a Delaware corporation founded in 2019, builds battery recycling plants. Tesla is a customer.');
  ok(c.subject.attribution === 'NONE', '"The company ..." has no named lead -> NONE (not Delaware, not Tesla)');
}
{
  const c = buildQueryContract('Is this a good deal? Capital, Client opportunity Kenya sought to refinance its 2028 Eurobond. JPMorgan led the exchange offer.');
  ok(c.subject.text === 'Kenya' && c.subject.attribution === 'UNRESOLVED' && c.objective === OBJECTIVES.DEAL_EVALUATION, 'sovereign (Kenya): subject kept, deal evaluation');
}
{
  const c = buildQueryContract('Good merger? Salesforce / Slack Salesforce announced the $27.7B acquisition of Slack.');
  ok(c.subject.text === 'Salesforce / Slack', 'combined "A / B" subject still kept whole after the prefix refinement');
}

console.log('Fallback scan (no subject selected): earliest mention wins, not the longest name');
{
  const s = subjectScope('the company says Alphabet owns a large stake in Anthropic');
  ok(s.kind === 'ENTITY' && s.canonicalId === 'alphabet', 'earliest resolvable mention (Alphabet) beats the longer, later one (Anthropic)');
}

console.log('Markdown-formatted prompts (live: Integrated Biosciences, 2026-10-08)');
{
  const body = 'Integrated Biosciences is using AI to discover drugs for age-related diseases, a shot at the ~$2T pharmaceutical industry.';
  const c = buildQueryContract('**Question:** Is this a good investment? **Target:** ## Integrated Biosciences\n' + body);
  ok(c.subject.text === 'Integrated Biosciences', 'markdown labels/emphasis/heading hashes are not content: subject is Integrated Biosciences, got "' + c.subject.text + '"');
  ok(c.objective === 'INVESTMENT', 'objective still INVESTMENT');
  const g = subjectScope('**Question:** Is this a good investment? **Target:** ## Google\nGoogle is using AI.');
  ok(g.kind === 'ENTITY' && g.canonicalId === 'alphabet', 'markdown-labeled Google prompt resolves to ALPHABET (Google is Alphabet)');
}

console.log('Prompt formatting must not change the subject');
{
  const cases = [
    ['Question: Is Nvidia a good buy?', 'Nvidia'],
    ['Target: Daytona\nQuestion: should we invest?', 'Daytona'],
    ['QUESTION: Is this a good investment?\nTARGET: Subcritical\nSubcritical builds AI chips.', 'Subcritical'],
    ['Is this a good investment? (Company: Daytona) Daytona runs sandboxes', 'Daytona'],
    ['Is this a good investment?\r\n\r\n## Daytona\r\nDaytona runs sandboxes', 'Daytona'],
    ['Target: SpaceX - Is it worth investing?', 'SpaceX'],
    ['Evaluate this deal: Paramount acquiring Warner Bros. Discovery', 'Paramount'],
    ['> Is this a good investment?\n> Target: Daytona', 'Daytona'],
    ['1. Question: is this a good investment 2. Target: Daytona', 'Daytona'],
    ['- Question: should I invest?\n- Company: Daytona\nDaytona gives every AI agent its own sandbox.', 'Daytona'],
    ['Is this a good investment? Target: Integrated Biosciences Integrated Biosciences is using AI to discover drugs.', 'Integrated Biosciences'],
  ];
  for (const [q, want] of cases) ok(buildQueryContract(q).subject.text === want, JSON.stringify(q.slice(0, 48)) + ' -> ' + want);
}

console.log('Sentence openers are not names (KRYL-1406)');
{
  const cases = [
    ['Across all six domains, what formation exists around Oracle?', 'Oracle'],
    ['Across all six domains, what formation exists around Intel?', 'Intel'],
    ['Across ownership, technology, and capital, what structure surrounds Ford?', 'Ford'],
    ['Within the last year, what changed around Verizon?', 'Verizon'],
    ['Overall, what relationships exist around Intel?', 'Intel'],
    ['Given the filings, what is forming around Netflix?', 'Netflix'],
    ['Across Apple Inc, what changed?', 'Apple Inc'],
    ['Between ownership and capital, how is Boeing connected?', 'Boeing'],
    ['What is forming around Boston Scientific across ownership and capital?', 'Boston Scientific'],
    // names that begin with a word that is also an opener keep it
    ['First Solar raised capital.', 'First Solar'],
    ['Under Armour reports earnings', 'Under Armour'],
    ['Is Anduril a good acquisition target?', 'Anduril'],
  ];
  for (const [q, want] of cases) ok(buildQueryContract(q).subject.text === want, JSON.stringify(q.slice(0, 56)) + ' -> ' + want);
  ok(buildQueryContract('Across all six domains, what formation exists?').subject.attribution === 'NONE', 'an opener-only question names no subject');
  ok(buildQueryContract('Between Apple and Google, how is capital connected?').subject.attribution === 'AMBIGUOUS', 'two names after an opener stay ambiguous (opener not a third name)');
  ok(buildQueryContract('Across all six domains, what formation exists around Oracle?').selectionRule === 'EXPLICIT_IN_QUESTION', 'a fronted scope phrase does not stop the sentence being the question');
}

console.log('Invariants');
{
  const t = 'Is this a good investment? Daytona Daytona gives every AI agent its own sandbox. Backed by Meta.';
  ok(strip(buildQueryContract(t)) === strip(buildQueryContract(t)), 'deterministic (same input -> same contract)');
  const c = buildQueryContract(t);
  ok(c.queryText === t && typeof c.builtAt === 'number' && typeof c.selectionRule === 'string', 'contract carries queryText, selectionRule and builtAt');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
