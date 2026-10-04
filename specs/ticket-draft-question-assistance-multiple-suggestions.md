# Question Assistance: more than one additive suggestion (catalog + cardinality)

Label on filing: `needs-spec` (Backlog: not yet vetted). Type: Task. Project KRYL. Follow-on to KRYL-1326 (deployed 2026-09-26). Raised by the Founder on 2026-09-26: "one will not cut it." No code is authorized; this ticket starts vetting.

## The six required fields (CLAUDE.md section 10)

### 1. Original intent
KRYL-1326's PRE-SUBMIT assistance offers a single suggestion, `+ technology / architecture changes`, and only for a bare subject phrase whose one matched domain is TECHNOLOGY. The Founder's position is that one suggestion is not enough: the guest should be offered the available question-expansion opportunities for their input, each as explicit additive wording that appends to the query and never submits, with no personal-suitability criteria, recommendations or decisions (KRYL-1326 contract unchanged).

### 2. Acceptance criteria (DRAFT — to be ruled)
- The PRE-SUBMIT row offers every eligible additive suggestion for the typed text, up to a stated cap; selecting one appends exactly that wording, never submits, and creates no `+ ADDED` token (KRYL-1326 sixth-batch ruling stands).
- Each suggestion has an authored phrase and a deterministic eligibility rule built from existing parser/QueryContext evidence only (no new classifier, keyword matcher, scorer or LLM).
- The eight KRYL-1326 behavioral cases are re-run: "no assistance" cases stay at no assistance unless a newly ruled phrase legitimately applies; the guest's text is never altered by a suggestion; exact submitted text remains the QUESTION.
- Guest-path (real browser) verification; no deploy without the ticket in Deploy to Prod and an explicit "deploy".

### 3. Current implementation state (Maturity B: mechanism exists, catalog does not; verification C + R)
- Deployed 2026-09-26 (bundle index-0si6fA9r.js): src/engine/inquirygeneration.js `deriveAdditiveAssist` returns an ARRAY, but rule A3 hard-codes exactly one matched domain that is TECHNOLOGY, and the only authored phrase is `technology / architecture changes` (newly ratified in KRYL-1326 R2-Q1; no other phrase exists in the repo). So at most one suggestion can render, and only for a bare subject phrase.
- No ruling established a cardinality of one. It follows from the first slice's plan wording ("[] or one candidate") and from the single phrase; the KRYL-1326 rulings say "offer the canonical TECHNOLOGY additive refinement" in the singular.
- The evidence base in typed text is narrow (verified): entity phrases, keyword domain hits, matched verb, decision cues, scenario cues, numbers, geo, explicit comparison connector. Nothing detects a timeframe, relationship type, concern or comparison criteria (tReq/eReq are NOT_DETECTED by design), so "which dimension is unstated" cannot be established for those without a new detector.
- The parser's domains (FINANCIAL, MARKET, LEGAL, HEALTH, CAREER, TECHNOLOGY) map many-to-one onto the six canonical domains (ANALYSIS_PILL_TO_DOMAIN, analysisidlefield.jsx); KRYL-1326 R2-Q2 limited the slice to TECHNOLOGY because the other mappings can name a domain the guest did not express.
- Precedent for a cap: VISIBLE_CAP = 4 in inquirygeneration.js (existing chip surface).

### 4. Dependencies
KRYL-1326 (the mechanism, deployed). Founder decisions needed (none made): Q1 the authored phrase catalog (exact wording per dimension is Founder copy authority, CLAUDE.md section 5); Q2 which dimensions/domains qualify and whether the many-to-one domain mapping is accepted (revisits KRYL-1326 R2-Q2); Q3 the cap on suggestions shown (proposal: reuse the existing VISIBLE_CAP precedent of 4); Q4 the eligibility rule for each phrase, including whether a suggestion may be offered after the guest has added their own words (today rule A1 requires a bare subject phrase); Q5 whether TECHNOLOGY may carry several phrases or one phrase per domain. Any new dimension that needs detection (timeframe, relationship, comparison criteria) is blocked on a detector ruling and is out of scope here.

### 5. Superseded by a newer ticket?
No. It amends the KRYL-1326 R2-Q2/R2-Q3 rulings and the "[] or one candidate" plan wording; it does not supersede KRYL-1326's other rulings. POST-SUBMIT clarification stays deferred to KRYL-1324.

### 6. Still maps to the current KRYLO product model?
Yes. KRYLO adds language to the guest's question and never converts structure into a recommendation (CLAUDE.md section 21); more suggestions do not change that as long as each is explicit, additive, guest-selected and free of decision or suitability content.

## RULINGS (Founder, 2026-09-26) — KRYL-1329 product rulings; supersede the draft acceptance criteria and questions Q1-Q5 above

Design: FIXED SIX-PRESSURE MENU, not evidence-gated. The parser's signals are incomplete and misclassified (verified on 12 sample subjects; OWNERSHIP and MEDIA have no keyword coverage), so parser gating would let parser defects decide which questions the guest may formulate. The menu makes NO applicability claim: it presents possible dimensions the guest may choose to add; the guest decides whether one belongs in the question. The parser remains evidence for POST-SUBMIT investigation and does not gate the PRE-SUBMIT vocabulary. No parser expansion is required for the menu.

Vocabulary (ratified PRE-SUBMIT phrases): CAPITAL `capital / financing changes`; OWNERSHIP `ownership / control changes`; TECHNOLOGY `technology / architecture changes` (already ratified in KRYL-1326); KNOWLEDGE `knowledge / research changes`; LABOR `labor / workforce changes`; MEDIA `media / coverage changes`. Changes from the first pass: "investment" removed from CAPITAL (not in the locked definition; decision framing); "information" removed from KNOWLEDGE and MEDIA (axis overlap).

"changes" kept: each phrase indicates a direction for inquiry, not an assertion that change exists; KRYLO must never render `+ technology / architecture changes` as if it had established that technology or architecture is changing.

Cardinality: SIX, as unranked peers; VISIBLE_CAP = 4 is NOT applied (a cap of four would force KRYLO to drop two pressures, an implicit ranking). Order: fixed KRYL-1329 presentation order CAPITAL, OWNERSHIP, TECHNOLOGY, KNOWLEDGE, LABOR, MEDIA. This presentation order is NOT derived from CANONICAL_DOMAINS (ontology.js order: technology, capital, knowledge, labor, media, ownership) and carries no ranking or priority; no scoring, no "top" pressures.

Interaction: `ADD TO YOUR QUESTION` shows the six as `+ <phrase>` chips; selecting one appends exactly that text to the existing subject (KRYL-1326 mechanics unchanged: no submit, no `+ ADDED` token, plain guest-editable text). KRYLO does not say the pressure is relevant, does not infer why it was chosen, does not rank.

Applicability gating for PRE-SUBMIT: REJECTED.

Relationship to KRYL-1325: SIBLING (not a replacement or a sub-part). KRYL-1329 = PRE-SUBMIT question formation (the six pressures as guest-selectable vocabulary; no observations, no entity-resolution gating, no applicability claim). KRYL-1325 = post-entity-resolution, evidence-grounded pressure selection.

## OPEN ITEMS found while mapping the rulings onto the code (not ruled)

T1 — WHEN the menu appears. The rulings drop rule A3 (a domain keyword match) as a gate, but they do not say what triggers the menu. The only deterministic proxy for "not already fully specified" (KRYL-1326 contract cases 2, 4, 8) is rules A1-A2: the typed text is a bare subject phrase with no verb, decision, scenario, number or geo cue. Proposal: keep A1-A2 as the trigger; drop A3. Caveat to accept: A1 relies on the parser's entity extraction (two or more capitalized words), so single-word subjects ("Amazon", "SpaceX") and mis-extractions ("Is SpaceX ..." -> "Is Space") do not trigger the menu. The failure mode is conservative (no menu), not a wrong pressure. Alternative: define a trigger that does not depend on the parser (for example any non-empty single-line input under a stated shape), which needs its own rule and precedent.
T2 — after ONE direction is appended, the text is no longer a bare subject phrase, so under A1 the menu disappears: the guest can add only one direction (the same "nothing after that" behavior as KRYL-1326). Confirm one-and-done, or rule that the menu stays for further additions (peers minus those already appended), which needs an eligibility rule that treats "subject plus prior additions" as still eligible. (KRYL-1325's own selection is exactly-one, with multi-select an open item D11.)

Implementation delta if ruled (nothing coded): deriveAdditiveAssist returns the six candidates (ids add:CAPITAL ... add:MEDIA) in canonical order under the T1 trigger; analysisidlefield.jsx needs no structural change (StaggeredChips already renders a list; appendAssist re-checks by id); the e2e spec's Case 1 expectation becomes six chips, "no assistance" cases unchanged, plus tests for order, exact append per chip, and that no applicability wording appears. Ships only through its own ticket: Backlog -> Ready -> In Progress -> Review -> Deploy to Prod, localhost first, explicit GO and "deploy".

## RULINGS (Founder, 2026-09-26, second batch) — T1 and T2 closed

T1 — ADOPTED: menu trigger = rules A1 + A2. A1: the input is a bare subject phrase (a single extracted entity phrase and nothing more). A2: no verb, decision, scenario, number, comparison or geo cues. If both hold, show the six unranked pressure suggestions; otherwise show no pressure-assistance menu. This is a CONSERVATIVE ELIGIBILITY GATE, not a completeness detector. The parser limitation is accepted: the failure mode is absence of assistance, not fabricated assistance. Amazon alone may not trigger the menu if entity extraction does not recognize it; KRYLO must never guess a pressure merely because the subject is known; fully formed queries stay untouched.

T2 — ADOPTED: ONE. Selecting one pressure ends the PRE-SUBMIT assistance state for that query: the menu disappears; the guest can still add anything manually; the submitted query stays entirely guest-owned. Contract: KRYL-1329 PRE-SUBMIT assistance provides ONE optional investigative direction for a bare subject; it does not build the guest's investigative frame for them (no multi-add).

Resulting behavior: bare subject + no disambiguating cues -> six unranked pressure choices -> guest selects one -> exact phrase appended -> assistance disappears -> guest edits normally -> submit. No parser expansion, no evidence gating, no ranking, no multi-add.

## FINAL IMPLEMENTATION CONTRACT AND FILE-LEVEL PLAN (drafted 2026-09-26 from the repo at HEAD; awaiting the Founder's Load and GO; no code authorized)

Files to change
1. src/engine/inquirygeneration.js — deriveAdditiveAssist(rawInput): replace rule A3 and the single TECHNOLOGY phrase with the ratified six-phrase catalog in the fixed KRYL-1329 presentation order (CAPITAL, OWNERSHIP, TECHNOLOGY, KNOWLEDGE, LABOR, MEDIA; not derived from CANONICAL_DOMAINS; no ranking or priority; ids add:CAPITAL ... add:MEDIA; appendText = " + " + phrase). Returns all six when A1 + A2 hold, otherwise []. No scoring, no ranking, no domain lookup. The technology phrase is unchanged from KRYL-1326. deriveInquiryPossibilities stays unchanged.
2. src/components/analysis/analysisidlefield.jsx — expected NO change: StaggeredChips already renders a list, appendAssist already re-checks eligibility by id against the text in the box, and the row disappears once the text is no longer a bare subject (which enforces one-and-done). To be confirmed on localhost (six chips wrapping in the row; no layout regression).
3. tests/e2e/question-assistance-pre-submit.spec.js — Case 1 expects exactly six chips in the canonical order with the six ratified labels; each chip appends exactly its phrase (parametrized) and the menu then disappears; the "no assistance" cases stay at no menu; add a test that no applicability wording appears; keep the no-token / no-clear-all, direct-edit, delete-restores-menu and submit tests.
Not touched: intentparser.js, analysisintent.js, querycontext.js, querysynthesis.js, the store, chipsubstrate.js, tensor.structuralRefinements.

Behavior changes to be aware of (from dropping A3): any bare multi-word capitalized subject phrase now gets the menu, whether or not it contains a domain keyword — for example "Angel Investors", "Amazon Web Services", "Data Privacy Lawsuit" and "Mid Market Software", which produced no suggestion under KRYL-1326. Single-word subjects and any input with a verb, cue, number or geo still get nothing.

Verification (real browser, localhost first): the 8 KRYL-1326 cases re-run (Case 1 = six chips; Cases 2-8 = no menu); order; exact append per chip; one-and-done; no `+ ADDED` token; submit uses the exact text and structuralRefinements stays empty; production build; 0 page errors; visual check. Ship only via this ticket in Deploy to Prod and an explicit "deploy".
Remaining open: none for the PRE-SUBMIT behavior. Ticket is in Backlog and needs the Founder's Load to Ready and an explicit GO before any code.

## RULING (Founder, 2026-09-26, third batch) — order wording corrected; implementation approved
The ratified sequence CAPITAL, OWNERSHIP, TECHNOLOGY, KNOWLEDGE, LABOR, MEDIA is the KRYL-1329 PRESENTATION order. It is not the repository's CANONICAL_DOMAINS order and carries no ranking or priority. The implementation (commit 07c266b) already matches the ruling; the issue was ticket wording ("fixed canonical order"), now corrected above. No code change. Review result: APPROVED; KRYL-1329 may move to Deploy to Prod. Deploy remains gated on an explicit "deploy".
