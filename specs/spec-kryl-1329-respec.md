# KRYL-1329 — PRE-SUBMIT NEXT-QUESTION ASSISTANCE, THREE ROUNDS (replacement spec, PROPOSED for ratification — no code authorized)

Replaces the reverted six-pressure menu (dd6f681). Source: the Founder's three-round specification (2026-09-26) plus the four reviewer additions, incorporated below. This resolves the earlier conflict (R-A): THREE ROUNDS governs. Nothing is built. The Founder goes through the checklist line by line before any build; every line is validated again in a real browser on localhost before handoff, with evidence on the Jira ticket.

## 1. Purpose
Reduce the effort of formulating a useful question by offering successive, query-specific next directions the guest may optionally add. A three-round question-assistance interaction. It is NOT a six-domain menu, a completeness checklist, a recommendation system, an applicability declaration, post-submit clarification (KRYL-1324) or an interpretation verdict. Principle: given what the guest has typed, offer a few useful directions for what they could ask next, up to three successive rounds.

## 2. Core interaction model
Exactly three suggestion rounds maximum. Within each round: 0-3 candidates shown; the guest may select at most one; the selected text is appended exactly; unselected candidates are discarded; the next round evaluates the ENTIRE newly expanded query. A round with zero valid candidates ends assistance immediately. After round 3 there is a hard stop, no fourth round.
Independent limits: max 3 visible candidates per round; max 1 selection per round; max 3 rounds.
Flow: Q1 -> round 1 (select or stop) -> Q2 -> round 2 (select or stop) -> Q3 -> round 3 (select or stop) -> Q4 -> STOP. Each round generates fresh candidates from the current full query; nothing is carried over from the previous round.

## 3. Guest ownership
The guest owns the question at all times. KRYLO never silently rewrites, replaces, reorders, completes, submits, or promotes a suggestion to authoritative interpretation. Every selected phrase becomes ordinary editable query text. No `+ ADDED` row, no additive ownership state, no automatic submission.

## 4. Grounding and directionality
Every candidate must be Grounded (traceable to one or more explicit spans or structural relations in the CURRENT typed input; no identifiable textual basis = invalid) and Directional (moves the guest toward a more useful next question; not a paraphrase or repetition). Nothing generated solely from KRYLO's ontology, generic subject knowledge, inferred business intent, or post-submit evidence. A structural relation is a relationship explicitly expressed in the guest's current text; relations inferred from ontology, parser assumptions, observations or external evidence do not qualify. Each bounded phrase pattern must have a documented grounding rule naming the span or relation that permits it; a pattern without an approved grounding rule cannot generate a candidate. Two-part gate per candidate: (a) show the explicit span or relation in the input that justifies it; (b) show what materially useful new direction it adds that the text does not already express. Fail either and it does not exist.

## 5. The four reviewer additions (incorporated)
A1 Round transition timing: after a selection is appended, the next round evaluates the latest committed query text; no round runs against stale pre-selection text.
A2 Guest edits between rounds: if the guest edits the query after a selection and before the next round renders, the next round evaluates the guest's current full text, including those edits.
A3 No duplicate additions: a candidate whose exact text is already present in the current query may not be offered again in a later round.
A4 Immediate stop conditions: if the guest submits, clears the query, or otherwise leaves the assistance context before the next round, no further round is generated.

## 6. No fixed six-pressure menu
The six canonical pressures remain internal vocabulary, never a guest-facing menu. A pressure may influence a candidate only when the candidate is grounded in an explicit span or relation in the current input.

## 7. Generation (first release) and zero behavior
A controlled vocabulary of bounded phrase patterns; short additive phrases that append without grammatical breakage; no evaluative, predictive or intent-inferring language; no near-duplicates; prefer fewer strong candidates over padding to three. Zero valid candidates ends assistance. A relatively complete question should normally produce zero suggestions in round 1; do not manufacture specificity.

## 8. Relationship to other capabilities
PRE-SUBMIT (this spec) is three-round construction assistance before submission; POST-SUBMIT (KRYL-1324) is clarification after submission. Strictly separate; neither triggers the other.

## 9. Telemetry (non-blocking, later)
Suggestions shown, selected and ignored per round; resulting submitted question; whether the guest edited an appended phrase.

## 10. Gaps the Founder must rule on (found while mapping the spec to the repo; nothing assumed)
R-B. The pattern catalog and the grounding rule for each pattern are not authored anywhere. Only the Founder (or the spec) can supply them. Without them the honest result is 0 chips.
R-F. CIRCULAR GROUNDING in rounds 2 and 3: round 2 evaluates the whole expanded text, which now contains the phrase KRYLO itself appended. If that appended text counts as a span, a candidate can be "grounded" in KRYLO's own words. Proposed rule for ruling: only the guest's own words (including their later edits) count as grounding; text KRYLO appended does not. The rounds then depend on what the guest wrote, not on what was suggested.
R-C. The parser recognizes an entity phrase only from two or more capitalized words, and keyword domains only from a small fixed list; single words and lowercase phrases give no groundable span today (see the corpus results). Accept, or is a detector change in scope?
R-D. Carried over from KRYL-1326, confirm: exact append, no submit, no `+ ADDED`, no clear-all, exact submitted text = QUESTION, structuralRefinements untouched.
R-E. The single `+ technology / architecture changes` suggestion from KRYL-1326 is live in production; keep, replace with this, or remove?
R-G. What is a "round" trigger in the UI: does round 1 appear only for a bare subject (KRYL-1326 rule) or for any input where a grounded candidate exists, and when does round 2 appear after a selection (immediately)?

## 11. VALIDATION CORPUS (not any single sentence)
Success is defined over the whole corpus, never by passing one example. Categories, each with at least the listed inputs (the harness runs all of them):
A bare multi-word subjects (Lithium Battery Supply; Regional Bank Consolidation; Streaming Rights Deal; Hospital Staffing Costs; Union Contract Renegotiation; Private Equity Roll-Up; Cloud Data Migration; Patent Portfolio Licensing; Nuclear Fuel Enrichment; Urban Housing Zoning). B company or entity names (Tesla; Goldman Sachs; Novo Nordisk; Anduril; Nvidia TSMC). C short lowercase fragments (warehouse robotics; interest rate exposure; port congestion; cybersecurity insurance). D full sentences and questions (How exposed is our supply chain to a Taiwan disruption?; Is Anduril a good acquisition target?; What is driving lithium prices this year?). E comparisons (AWS vs Azure; Toyota versus Ford EV strategy). F personal context (I'm 40 and considering a career change into data science). G numbers and places (Housing market in Austin 2026; Top 10 semiconductor suppliers). H noise and empty (empty; ???; asdf).

## 12. CHECKLIST — validated line by line BEFORE the build (against this written spec) and BEFORE handoff (real browser, localhost, PASS/FAIL + evidence per line on the Jira ticket)
- C1 At no moment, in any round, for any corpus input, are more than 3 chips shown. V1: assertion at every step of every test; one limit constant; the test fails if exceeded.
- C2 At most 3 rounds; there is never a fourth round. V2: drive a full three-round session and assert nothing is offered after round 3.
- C3 At most 1 selection per round; unselected chips are discarded and never reappear. V3: assert after a selection the previous round's chips are gone.
- C4 Zero candidates ends assistance immediately. V4: a round with no valid candidate produces no chips and no later rounds.
- C5 Each round evaluates the latest full text (A1) including guest edits between rounds (A2). V5: select, edit, and assert the next round's grounding basis reflects the edited text.
- C6 No duplicate additions (A3). V6: a phrase already in the text is never offered again.
- C7 Stop conditions (A4): submit, clearing the text, or leaving the context generates no further round. V7: submit and clear mid-sequence; assert no chips afterwards.
- C8 Grounding: every displayed chip prints (guest span or relation -> pattern -> chip); no printed basis = FAIL. V8: evidence log for every corpus input.
- C9 Grounding boundary: spans in text KRYLO appended never count (pending ruling R-F); relations inferred from ontology, parser assumptions or evidence never count. V9: inputs supported only by ontology give 0 chips; a round-2 candidate grounded only in KRYLO's own appended phrase is rejected.
- C10 Pattern rule: a pattern without an approved grounding rule cannot generate a candidate. V10: catalog checked against the grounding-rule table before the build.
- C11 Directionality: a chip must add a direction the text does not already express. V11: corpus inputs that already express the direction give 0 chips.
- C12 Complete questions give 0 chips in round 1. V12: category D and F inputs.
- C13 Query-specific: unrelated corpus inputs do not receive an identical non-empty set unless each is independently grounded. V13: pairwise comparison across the corpus.
- C14 No six-pressure menu ever. V14: string check for the six-phrase set.
- C15 Form: `+ [text]`; exact append; never submits; guest text otherwise untouched; ordinary editable text; no `+ ADDED`, no clear-all. V15: browser test on the exact box value and absence of those controls.
- C16 Chip wording is short, additive, free of evaluative / predictive / intent-inferring language, no near-duplicates, and Founder-approved before the build. V16: signed-off wording table; banned-word lint over the catalog.
- C17 The exact submitted text is the QUESTION; tensor.structuralRefinements untouched. V17: submit test reading the store.
- C18 Localhost first: every line run in a real browser on localhost and recorded on the Jira ticket before handoff; production only when the Jira ticket is in "Deploy to Prod" and the Founder says "deploy". V18: run log on the Jira ticket.
- C19 Nothing outside scope changes. V19: the diff lists only the planned files.
- C20 Telemetry (non-blocking, later).

## 13. CORPUS RESULTS — what the existing detectors give on the 30-input corpus (executed 2026-09-26, read-only)
Signals available for grounding today: an entity phrase (a run of two or more capitalized words), a keyword domain hit (parser keyword list), a matched verb, and an explicit comparison connector. Results over the 30 inputs:
- At least one groundable signal: 19 of 30. NO signal at all: 11 of 30 (37%), which can only ever give 0 chips.
- Entity phrase: 15. Keyword domain: 9. Matched verb: 2 (both comparisons). Cue, number or geo present: 3.
- A bare multi-word subjects (10): all 10 have an entity phrase; only 6 have a keyword domain (Lithium Battery Supply, Hospital Staffing Costs, Union Contract Renegotiation, Private Equity Roll-Up, Cloud Data Migration, Patent Portfolio Licensing); Regional Bank Consolidation, Streaming Rights Deal, Nuclear Fuel Enrichment and Urban Housing Zoning have none.
- B names (5): Goldman Sachs, Novo Nordisk and Nvidia TSMC have an entity phrase; single-word names (Tesla, Anduril) have NO signal.
- C short lowercase fragments (4 of 4): NO signal (warehouse robotics, interest rate exposure, port congestion, cybersecurity insurance).
- D questions (3): only weak signals (one keyword domain, one entity phrase); "What is driving lithium prices this year?" has none.
- E comparisons (2): an explicit comparison verb in both; "AWS vs Azure" has no entity phrase and no domain.
- F, G: signals come from keywords and cues (career/technology, market, numbers); these are the complete-question cases where zero suggestions is the default.
- H noise (3): none, as intended.
Consequences for the spec: (1) grounded chips are only possible for inputs with a span the detectors find; lowercase fragments and single-word names get none. (2) A keyword hit maps to a DOMAIN (many-to-one), not to a phrase; a phrase pattern needs a grounding rule per keyword or span, and only the Founder can author them (R-B). (3) Rounds 2 and 3 do not create new grounding: unless the guest adds words, they see the same guest spans as round 1 (and by proposed ruling R-F the appended phrase does not count), so more than one round only continues if the catalog holds several distinct patterns grounded on the same guest span. The number of authored patterns per span type therefore decides whether two or three chips per round, or three rounds, are reachable at all.

## 14. DRAFT PATTERN CATALOG (read-only research, 2026-09-26; nothing built, no parser or code change; ALL PHRASE WORDING IS DRAFT for the Founder to edit — copy is Founder authority)

Working assumption (proposed ruling R-F, endorsed): KRYLO-added text never grounds a later suggestion; each round's grounding base is the guest-authored text present before assistance began. Later rounds therefore re-use the same guest span and offer the patterns not yet appended (a phrase already in the text is not offered again, A3).

### 14.1 The only grounding signals that exist without touching the parser (exact sources)
- Keyword domain hit: `parseIntent(text).domains`, from DOMAIN_MAP in src/engine/intentparser.js lines 20-27 via inferDomains (a substring test, `lower.includes(keyword)`). Parser domains: FINANCIAL (fund, equity, capital, portfolio, stock, bond, asset, revenue, profit, loss, debt, liquidity, valuation, series, raise); MARKET (market, sector, industry, competitive, demand, supply, pricing, trend, share); LEGAL (legal, regulat, compliance, filing, disclosure, lawsuit, contract, enforcement, liability); HEALTH (health, medical, clinical, patient, drug, pharma, healthcare, hospital); CAREER (career, job, employment, hiring, salary, role, layoff, organization, workforce); TECHNOLOGY (tech, software, "ai ", data, platform, digital, compute, model, algorithm, infrastructure).
- Entity phrase: `parseIntent(text).entities` (a run of two or more capitalized words). Matched verb: `normalized_verb` / `verb_matched` (VERB_MAP, same file lines 7-17; the COMPARE patterns are compare, contrast, versus, " vs ", benchmark, diff, difference between). Decision cues: `buildQueryContext(text).decisionCues` (DECISION_CUE_VERBS, src/engine/querycontext.js line 76: buy, purchase, sell, lease, acquire, divest, refinance, invest, hire, merge, expand, exit, raise, relocate, consolidate). Also scenarioCues, numbers, geo.
- Nothing detects a timeframe, a relationship type, a concern, or comparison criteria.

### 14.2 Two constraints found (verified by execution) that any catalog must respect
1. The keyword vocabulary is a PRIVATE const in intentparser.js and is not exported. Without modifying the parser, a generator can read only the parser's outputs (the domain name, entities, verb), not which keyword hit. So patterns can be keyed to the parser DOMAIN, not to an individual keyword, and the generator cannot print the exact text span that grounded a chip (spec item 4(a) "show me the span"): it can only say "keyword-domain hit: X". Naming the span needs the vocabulary exported (a parser change) or duplicated (a second keyword matcher) — the Founder must rule.
2. The keyword test is a SUBSTRING match, so domain hits misfire on unrelated words. Executed examples: "Thai Restaurant Chain" -> TECHNOLOGY (the letters "ai " in "thai "); "Shareholder Voting Rights" -> MARKET ("share"); "Glossary Publishing House" -> FINANCIAL ("loss"); "Refund Processing Center" -> FINANCIAL ("fund"); "Bondi Beach Resort" -> FINANCIAL ("bond"); "Series Finale Production" -> FINANCIAL ("series"). A chip grounded on such a hit would be a misfire (for example "Thai Restaurant Chain" offered a technology direction). Fixing the matching (word boundaries) is a change to a shared parser function and would need its own ticket and gate (consumers: analysisintent.js, querycontext.js, ingestionbuilder.jsx, the inquiry generator).

### 14.3 Draft patterns (each parser domain gets 3 distinct-direction phrases so rounds can go 3 -> 2 -> 1; gate for round 1 = bare subject phrase with no verb/decision/scenario/number/geo cue, KRYL-1326 rules A1+A2, evaluated on guest-authored text only)
| ID | Trigger (guest text) | Repo source | Grounding rule | DRAFT phrase | Direction created | Corpus hits (30) | False-positive risk | Rounds |
|---|---|---|---|---|---|---|---|---|
| T1 | parser domain TECHNOLOGY | intentparser.js DOMAIN_MAP / parseIntent().domains | a technology keyword is in the guest text | technology / architecture changes | opens a systems / architecture direction | Cloud Data Migration | "ai " misfires (Thai...); "data", "model", "platform" are broad | 1st, 2nd or 3rd; once |
| T2 | same | same | same | technology / vendor changes | opens a supplier / vendor direction | same | same | same |
| T3 | same | same | same | technology / adoption changes | opens an adoption direction | same | same | same |
| F1 | parser domain FINANCIAL | same | a financial keyword is in the guest text | capital / financing changes | opens a financing direction | Private Equity Roll-Up; Patent Portfolio Licensing | "fund", "bond", "loss", "series", "raise" misfire (Refund, Bondi, Glossary, Series Finale); "Patent Portfolio" is an IP topic | 1st-3rd; once |
| F2 | same | same | same | funding / allocation changes | opens an allocation direction | same | same | same |
| F3 | same | same | same | ownership / stake changes | opens a holdings direction ("equity", "portfolio" relate; "bond" does not) | same | wrong for non-holding hits | same |
| M1 | parser domain MARKET | same | a market keyword is in the guest text | market / demand changes | opens a demand direction | Lithium Battery Supply | "share" misfires (Shareholder); "supply" hits supply-chain phrases | 1st-3rd; once |
| M2 | same | same | same | supply / pricing changes | opens a supply / price direction | same | same | same |
| M3 | same | same | same | competitive / share changes | opens a competitive direction | same | same | same |
| L1 | parser domain LEGAL | same | a legal keyword is in the guest text | regulatory / compliance changes | opens a regulatory direction | Union Contract Renegotiation | "contract" in a labor topic; "filing" | 1st-3rd; once |
| L2 | same | same | same | contract / obligation changes | opens a contractual direction | same | same | same |
| L3 | same | same | same | disclosure / filing changes | opens a disclosure direction | same | same | same |
| H1 | parser domain HEALTH | same | a health keyword is in the guest text | clinical / care changes | opens a care direction | Hospital Staffing Costs | "drug", "patient" narrow | 1st-3rd; once |
| H2 | same | same | same | drug / treatment changes | opens a treatment direction | same | same | same |
| H3 | same | same | same | hospital / capacity changes | opens a capacity direction | same | same | same |
| C1 | parser domain CAREER | same | a career keyword is in the guest text | workforce / hiring changes | opens a hiring direction | none (only cue-bearing inputs) | "role", "job", "organization" broad | 1st-3rd; once |
| C2 | same | same | same | role / skills changes | opens a skills direction | none | same | same |
| C3 | same | same | same | organization / staffing changes | opens a staffing direction | none | same | same |
Corpus coverage under the bare-subject gate: 6 of 30 inputs get chips (all from category A). Category B names, C lowercase fragments, D-H all get 0: they either lack a keyword domain, are not bare subjects, or carry cues. Rounds shape for a hit: 3 chips, then 2, then 1 (each round re-evaluates the same guest-authored text and offers the phrases not yet appended).

### 14.4 Patterns considered and REJECTED (fail grounding or need a missing detector)
- Comparison criteria (for example "on cost", "on integration"): the explicit comparison relation is groundable, but the specific criteria are not in the guest's text; they would be KRYLO-invented dimensions. Rejected under the grounding rule.
- Entity-only inputs with no keyword domain (Regional Bank Consolidation, Streaming Rights Deal, Nuclear Fuel Enrichment, Urban Housing Zoning; Goldman Sachs; Novo Nordisk): any direction would come from ontology or generic subject knowledge. Rejected: 0 chips.
- Timeframe, relationship type, concern, single-word names and lowercase fragments: no detector exists; nothing to ground on.
- A pressure-based menu: rejected by spec item 6.

### 14.5 Founder decisions this catalog needs
D1. Domain-level grounding without the exact span (14.2 #1), or authorize a read-only export of the vocabulary so the generator can show the span?
D2. The substring misfires (14.2 #2): accept the misfire rate for the first release, or fix the parser matching first under its own ticket (recommended before relying on it).
D3. The round-1 gate: keep the bare-subject gate (A1+A2)?
D4. The wording of every phrase (all draft).
D5. Whether three phrases per parser domain (the 3 -> 2 -> 1 shape) is the intended catalog size.

## 15. RULINGS (Founder, 2026-09-26, third batch) — D1-D5 on the catalog evidence

D1 ADOPTED: domain-level grounding is NOT accepted. A domain match alone is insufficient; exact grounding requires access to the matched vocabulary/span. Authorized: a READ-ONLY parser exposure of the matched keyword and its span, as a separate, tightly scoped ticket (KRYL-1331). KRYL-1329 must not modify parsing behavior merely to obtain the vocabulary.
D2 ADOPTED: the parser misfires (Thai Restaurant Chain, Shareholder Voting Rights, Glossary Publishing House, Refund Processing Center, Bondi Beach Resort, Series Finale Production) mean the current detector cannot be trusted as a grounding authority. KRYL-1329 must not build suggestions on those domain matches, and must NOT work around them inside inquirygeneration.js (that would create a second parser). The correction is its own ticket (KRYL-1330); KRYL-1329 depends on it before implementation of grounded suggestions.
D3 REJECTED: the bare-subject gate. It came from the single early example and the 30-input corpus shows it is too narrow. Round 1 may produce assistance whenever the input contains a candidate with valid, explicit grounding that passes the directionality test. A complete question, a short fragment or a bare subject can each legitimately produce zero; "bare subject" is not the definition of eligibility. This supersedes KRYL-1326 rules A1/A2 for KRYL-1329 (KRYL-1326's live behavior is unchanged until KRYL-1329 ships).
D4 OPEN: the phrase wording is NOT ratified. The governing rule: the phrase must express the next investigative direction supported by the grounding span, without interpretation, causality, prediction, recommendation or a new decision, and it must work grammatically as `[guest's query] + [candidate]`. The 18 draft phrases are reviewed individually, not approved as a set.
D5 REJECTED: the three-patterns-per-domain quota (an artifact of six-domain thinking). The catalog holds as many valid patterns as the evidence supports (some groups may have five, others one or none). The UI contract stays 0-3 candidates per round.
R-F ADOPTED (with the selection rule): KRYLO-added text never grounds a later suggestion; only guest-authored text establishes grounding. SELECTION removes the candidate from consideration; selection does not become new grounding evidence. Round 2 re-evaluates the same guest-authored grounding and offers the remaining candidates (for example A, B, C -> select A -> B, C -> select B -> C -> stop).

Corrected architecture: guest text -> reliable explicit grounding -> bounded candidate patterns -> 0-3 useful directions -> one selection -> the same guest-grounded evidence minus the selected candidate -> new 0-3 -> up to three rounds.

## 16. DEPENDENCIES AND STATE
KRYL-1329 is NOT built until D4 is resolved and the parser dependencies are done. Jira tickets: KRYL-1330 (parser matching correction; proposed first) and KRYL-1331 (read-only span exposure; depends on 1330, order for the Founder to confirm). Status: Jira ticket KRYL-1329 in Backlog; no code authorized.

## 17. D4 REVIEW TABLE (compiled 2026-09-26; nothing ratified; no code; all wording DRAFT)
Rule applied: the existing six-domain grouping is NOT evidence that a candidate should exist. A candidate earns review only from its trigger, grounding, directional usefulness and corpus behavior. Research criteria are as supplied by the Founder side (directional relevance; usefulness over mere relevance; grounded, bounded candidates); I have not independently verified the literature. Triggers are keyword-level from the parser vocabulary (intentparser.js DOMAIN_MAP lines 20-27); the exact span becomes visible only after KRYL-1330 and KRYL-1331. "My call" is my recommendation for the Founder to mark KEEP / CHANGE / DROP; the Founder decides.

THE FINDING THAT DECIDES MOST ROWS. A phrase that names the SAME domain as the guest's keyword is grounded but RESTATES the query: it fails the directionality test ("add a direction the text does not already express"). Example: "platform" already expresses technology, so "+ technology / architecture changes" mostly repeats it. A phrase that names an ADJACENT direction (for example technology -> vendor) is directional, but what licenses it is not the guest's text — it is Founder-authored knowledge that the keyword and the direction are related. The spec forbids candidates generated solely from ontology or generic subject knowledge. So the catalog exists only if the Founder rules that a matched keyword span is a sufficient LICENSE for a Founder-authored adjacent direction (D6 below). If not, only restating candidates exist, and they fail directionality: the catalog would be empty.

| ID | Trigger (guest words, keyword level) | Repo evidence | Grounding rule | Proposed phrase (DRAFT) | Direction | Corpus hits (30) | False-positive risk | Research fit (directional + useful?) | My call |
|---|---|---|---|---|---|---|---|---|---|
| T1 | platform, infrastructure, compute, algorithm (strong); tech, software, digital, ai (generic) | DOMAIN_MAP TECHNOLOGY | keyword span present | technology / architecture changes | architecture | Cloud Data Migration; data-science input | "ai " (Thai); "data", "model" broad | strong triggers restate technology (weak); generic triggers add an architecture direction (OK) | CHANGE: limit to the generic triggers |
| T2 | platform, software, infrastructure, compute | same | keyword span licenses an adjacent direction (needs D6) | technology / vendor changes | supplier / vendor | same | same | directional (adjacent); usefulness plausible; license unproven | needs D6 |
| T3 | digital, software, ai, tech | same | same (needs D6) | technology / adoption changes | adoption | same | same | directional (adjacent) | needs D6 |
| F1 | capital, debt, liquidity, raise, series | DOMAIN_MAP FINANCIAL | keyword span present | capital / financing changes | financing | Private Equity Roll-Up; Patent Portfolio Licensing | fund, bond, loss, series, raise misfire | restates finance (weak) | DROP |
| F2 | fund, portfolio, asset, equity | same | licenses adjacent (D6) | funding / allocation changes | allocation | same | same | directional (adjacent) | needs D6 |
| F3 | equity, stock, portfolio | same | licenses adjacent (D6) | ownership / stake changes | holdings | same | wrong for "bond", "debt"; "Patent Portfolio" is IP | directional (adjacent) | needs D6 |
| M1 | market, sector, industry, demand, trend | DOMAIN_MAP MARKET | keyword span present | market / demand changes | demand | Lithium Battery Supply; supply-chain question; Housing market 2026 | "share" misfires (Shareholder); "supply" in supply-chain phrases | restates market (weak) | DROP |
| M2 | supply, pricing, demand | same | keyword span present | supply / pricing changes | supply-price | same | same | restates (weak) | DROP |
| M3 | competitive, industry, sector, share | same | licenses adjacent (D6) | competitive / share changes | competitive position | same | "share" misfires | directional (adjacent) | needs D6 |
| L1 | legal, regulat, compliance, enforcement | DOMAIN_MAP LEGAL | keyword span present | regulatory / compliance changes | regulatory | Union Contract Renegotiation | "contract" in a labor topic | restates legal (weak) | DROP |
| L2 | contract, liability, lawsuit | same | partly restates / licenses adjacent | contract / obligation changes | contractual | same | same | mixed | CHANGE |
| L3 | filing, disclosure | same | keyword span present | disclosure / filing changes | disclosure | none | low | restates (weak) | DROP |
| H1 | clinical, patient, medical, health | DOMAIN_MAP HEALTH | keyword span present | clinical / care changes | care | Hospital Staffing Costs | narrow | restates health (weak) | DROP |
| H2 | drug, pharma, clinical | same | keyword span present | drug / treatment changes | treatment | none | narrow | restates (weak) | DROP |
| H3 | hospital, healthcare | same | licenses adjacent (D6) | hospital / capacity changes | capacity | Hospital Staffing Costs | narrow | directional (adjacent) | needs D6 |
| C1 | workforce, hiring, employment, job, layoff | DOMAIN_MAP CAREER | keyword span present | workforce / hiring changes | hiring | data-science career input (cue-bearing) | "role", "job", "organization" broad | restates (weak) | DROP |
| C2 | career, role, job | same | licenses adjacent (D6) | role / skills changes | skills | same | broad | directional (adjacent) | needs D6 |
| C3 | organization, workforce, hiring | same | licenses adjacent (D6) | organization / staffing changes | staffing | none | broad | directional (adjacent) | needs D6 |
Tally of my calls: DROP 8 (F1, M1, M2, L1, L3, H1, H2, C1); CHANGE 2 (T1, L2); needs D6 8 (T2, T3, F2, F3, M3, H3, C2, C3). The 18 rows are not a quota; rows are dropped freely.

### 17.1 New decisions this table exposes
D6. Is a matched keyword span a sufficient LICENSE for a Founder-authored ADJACENT direction (for example "platform" licenses "technology / vendor changes")? If yes, each adjacency row is judged on wording and usefulness. If no, the candidates that remain are the same-domain restatements, which fail directionality, and the catalog is empty.
D7. Enforcing "complete question = zero" now that D3 removed the bare-subject gate. With no gate, an input such as "How exposed is our supply chain to a Taiwan disruption?" (a MARKET keyword hit) would qualify. The deterministic replacement must live in the catalog: each pattern lists the words that mean its direction is already expressed (for example T1 is suppressed if the text contains "architecture"), plus a per-pattern suppression rule for full questions. Which rule do you want, or is a small detector needed?
D8. Corpus behavior with no gate: the grounded triggers also fire on the F and G inputs (career/data, market/2026) that carry cues. State whether cue-bearing inputs are suppressed (my proposal: yes, decision, scenario, number and geo cues suppress every pattern) or allowed.
