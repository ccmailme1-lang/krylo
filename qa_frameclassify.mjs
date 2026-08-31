// qa_frameclassify.mjs — Frame Classification & Anchoring, stage 1.
// 4-class closed set; anchors are class-native and filled from queryContext;
// NO_FRAME fabricates nothing; deterministic; no synthesis import.
// Run: node qa_frameclassify.mjs

import { classifyFrame, frameHeadline, FRAME_CLASSES } from './src/engine/frameclassify.js';
import { readFileSync } from 'node:fs';

let pass = 0, fail = 0;
const ok = (l, c) => { if (c) { pass++; console.log(`  ✓ ${l}`); } else { fail++; console.log(`  ✗ ${l}`); } };

// 1. The two validated cases.
const dec = classifyFrame('Should I invest: AI Infrastructure | Series B — compute and networking');
ok('decision query → DECISION_FRAME', dec.class === 'DECISION_FRAME');
ok('decision: evidence has the verb (invest)', dec.evidence.decisionCues.includes('invest'));
ok('decision: sector filled (AI infrastructure)', /ai/i.test(dec.evidence.sector || ''));
ok('decision: stage filled (Series B)', /series b/i.test(dec.evidence.stage || ''));
ok('decision: anchor set is the 7 decision anchors', dec.anchors.map(a => a.key).join() ===
   'decision_type,target_sector,stage,ticket_size,geography,decision_horizon,candidate');
ok('decision: decision_type + stage + target_sector are FILLED', [...dec.anchors.filter(a => a.value != null).map(a => a.key)].sort().join() === 'decision_type,stage,target_sector');
ok('decision: ticket/geo/horizon/candidate are OPEN', [...dec.unresolved].sort().join() === 'candidate,decision_horizon,geography,ticket_size');
ok('decision: candidate anchor did NOT fill from a bare title-case span (KRYL-1238)', dec.anchors.find(a => a.key === 'candidate')?.value == null);
ok('headline reads the frame', /DECISION FRAME · invest · ai/i.test(frameHeadline(dec)));

const port = classifyFrame('Target Portfolio ~20–30 companies. Minimum Investment $5K. AI-First thesis. Seed through late-stage venture. Single Commitment · Diversified Portfolio');
ok('portfolio query → PORTFOLIO_FRAME', port.class === 'PORTFOLIO_FRAME');
ok('portfolio: 8 portfolio anchors', port.anchors.length === 8);
ok('portfolio: thesis_sector filled', port.anchors.find(a => a.key === 'thesis_sector')?.value != null);
ok('portfolio: portfolio_size filled from "20–30 companies"', /20.{1,3}30\s+companies/i.test(port.anchors.find(a => a.key === 'portfolio_size')?.value || ''));
ok('portfolio: minimum_ticket filled from "$5K"', /\$?5\s*k/i.test(port.anchors.find(a => a.key === 'minimum_ticket')?.value || ''));

// 2. MARKET_THEME.
const mkt = classifyFrame('the AI infrastructure market in North America over the next 2 years');
ok('market query → MARKET_THEME', mkt.class === 'MARKET_THEME');
ok('market: no decision cue, no portfolio signal', mkt.evidence.decisionCues.length === 0);
ok('market: theme_sector filled', mkt.anchors.find(a => a.key === 'theme_sector')?.value != null);

// 3. NO_FRAME — the escape hatch. No fabricated anchors.
const none = classifyFrame('what is the best way to do this thing');
ok('ambiguous query → NO_FRAME', none.class === 'NO_FRAME');
ok('NO_FRAME has ZERO anchors (nothing fabricated)', none.anchors.length === 0);
ok('NO_FRAME headline is null (no dressed-up prompt)', frameHeadline(none) === null);

// 4. Priority — portfolio beats decision when both present.
const both = classifyFrame('Should I invest in a portfolio of 25 seed companies with a $5K minimum ticket');
ok('portfolio + decision language → PORTFOLIO_FRAME (portfolio wins)', both.class === 'PORTFOLIO_FRAME');

// 4b. KRYL-1238 — candidate entity resolution: clues propose, never establish.
const health = classifyFrame('Should I invest in a healthtech company, Series D, founded by an ex-Neuralink engineer');
ok('healthtech/ex-Neuralink → DECISION_FRAME', health.class === 'DECISION_FRAME');
ok('healthtech: subject NOT resolved (state NONE)', health.subjectResolution.state === 'NONE');
ok('healthtech: sector clue preserved (healthtech)', /healthtech/i.test(health.evidence.candidateClues.sector || ''));
ok('healthtech: stage clue preserved (Series D-ish)', /series\s+d|seed/i.test(health.evidence.candidateClues.stage || health.evidence.stage || ''));
ok('healthtech: ex-Neuralink surfaced as an association, not a subject', health.evidence.candidateClues.associations.some(a => /neuralink/i.test(a)));
ok('healthtech: NONE prompt names the honest next step', /no subject resolved/i.test(health.subjectResolution.prompt));

const oneReal = classifyFrame('Should I invest in Palantir this year?');
// (subjectScope would already resolve this to ENTITY upstream; classifyFrame is only
// reached for non-ENTITY inputs — but the resolver logic must still behave.)
ok('single resolvable name → RESOLVED_CANDIDATE', oneReal.subjectResolution.state === 'RESOLVED_CANDIDATE');
ok('RESOLVED_CANDIDATE → candidate anchor fills with the canonical name',
   oneReal.anchors.find(a => a.key === 'candidate')?.value === oneReal.subjectResolution.candidate.name);
ok('RESOLVED_CANDIDATE prompt says "confirm"', /confirm/i.test(oneReal.subjectResolution.prompt));

// 5. Closed set — never anything outside the 4.
for (const q of ['x', 'buy a house', 'the market', 'invest', 'fund', 'nothing here'])
  ok(`"${q}" → one of the 4 classes`, FRAME_CLASSES.includes(classifyFrame(q).class));

// 6. Determinism.
ok('deterministic', JSON.stringify(classifyFrame('Should I invest: AI Infrastructure | Series B')) === JSON.stringify(classifyFrame('Should I invest: AI Infrastructure | Series B')));

// 7. Quarantine — no synthesis import.
const src = readFileSync(new URL('./src/engine/frameclassify.js', import.meta.url), 'utf8');
ok('frameclassify.js does not import querysynthesis / synthGeneral', !/querysynthesis|synthGeneral|recommendedAction/.test(src));

// 8. Contract note present (anchors ≠ conclusion inputs).
ok('contract stated in the module header', /never .*conclusion inputs|never generate a verdict/i.test(src));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
