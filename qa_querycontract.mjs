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

console.log('Invariants');
{
  const t = 'Is this a good investment? Daytona Daytona gives every AI agent its own sandbox. Backed by Meta.';
  ok(strip(buildQueryContract(t)) === strip(buildQueryContract(t)), 'deterministic (same input -> same contract)');
  const c = buildQueryContract(t);
  ok(c.queryText === t && typeof c.builtAt === 'number' && typeof c.selectionRule === 'string', 'contract carries queryText, selectionRule and builtAt');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
