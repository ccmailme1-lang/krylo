# Question Assistance & Interpretation — PRE-SUBMIT / SUBMIT / POST-SUBMIT behavioral contract

Label: `needs-spec`. D1–D3 RULED by the Founder 2026-09-26 (see RULINGS below). Residual items R1–R4 must be reconciled against the repo before the ticket leaves Backlog (CLAUDE.md §10: an undefined item in the File Map = BLOCKED). Type: Task. Project KRYL.
Source: Founder-relayed "Engineering Handoff — Ratified Behavioral Contract" (received 2026-09-26). The contract text below is reproduced as relayed; the discrepancies section is the result of a read-only pre-code trace of the repository at HEAD 232aa66.
Nothing in this ticket authorizes code. Explicit Founder "go" is required after D1–D3 are ruled on. Deploy requires status "Deploy to Prod" (CLAUDE.md §23) plus explicit "deploy".

## The six required fields (CLAUDE.md §10)

### 1. Original intent
Implement the PRE-SUBMIT → SUBMIT → POST-SUBMIT question behavior without changing KRYLO's evidence/observation boundaries: help the guest formulate a better question; treat exactly what the guest submits as the sole authoritative QUESTION; establish Guest Perspective (GP) from that question; clarify only when unresolved ambiguity would materially change the investigation.

### 2. Acceptance criteria
See "Acceptance criteria" below (PRE-SUBMIT 1–8, SUBMIT 1–4, POST-SUBMIT 1–7) and the eight red-team cases. Completion additionally requires behavioral verification through the actual guest path, not unit tests alone.

### 3. Current implementation state — Maturity B (primitives exist; the composed capability does not); verification L/C (lexical + conceptual; not runtime-traced for the PRE-SUBMIT items)
- `analysisIntent` exists: `buildAnalysisIntent()` (src/engine/analysisintent.js:178, v1.1.0), built once at submit in analysisidlefield.jsx (~line 1209), carried on `tensor.analysisIntent`.
- Gap 1 (commit 232aa66, local, NOT pushed, NOT deployed): `createSession` (src/store/useanalysisstore.js) builds `analysisIntent` when a non-empty query arrives without one. Persistence only; unit + live-render verified for history-shaped and cone-assignment-shaped sessions.
- Query text state: `seedQuery` (analysisidlefield.jsx:729); submit reads `centerTextareaRef.current.value` at `handleExecute` (line 1173/1183).
- Existing chip surfaces: STRUCTURAL SIGNALS (chipsubstrate.js, KRYL-1304/1306) and WHAT TO EXAMINE inquiry chips (KRYL-1290), both toggling `selectedRefinementIds` via `toggleRefinement` (line 1125), which by ratified design never touches `seedQuery`.
- POST-SUBMIT clarification: NOT BUILT. `AmbiguousState` (ambiguousstate.jsx, WO-1875) is a static withheld state; `classifyAmbiguity` (domainambiguitygate.js) scores domain ambiguity, not referent/intent ambiguity. No sufficiency test, no targeted question, no GP-update loop.
- PRE-SUBMIT question-building assistance (additive `+` text append): NOT BUILT.
- The `COMPLETE THE PICTURE / + timeline` block was removed from the idle field (d3ccf93, deployed 2026-09-26); the underlying chip logic (`completionChips`, src/engine/completionchips.js) remains, unrendered.

### 4. Dependencies
KRYL-1324 (Semantic Integrity Boundary; QUESTION > INTERPRETATION > OBSERVATION > RELATIONSHIP > ANSWER STATUS); KRYL-1325 (Inquiry Formation Layer V1) — see #5; KRYL-1306 / KRYL-1304 (structural signal chips, additive refinement pool); KRYL-1290 (Autonomous Inquiry Chips); KRYL-1221 (queryContext). Existing analysisIntent path (232aa66). Founder rulings D1–D3 below.

### 5. Superseded by a newer ticket?
None known. OVERLAP UNDETERMINED with KRYL-1325 (Inquiry Formation Layer V1), whose Slice C (UI) also concerns pre-execution question formation surfaces. Not resolved by this ticket; needs a Founder call on whether this contract is a sibling, a sub-part, or a replacement of that surface.

### 6. Still maps to the current KRYLO product model?
Yes with conditions. Consistent with CLAUDE.md §21 (no conversion of structure into recommendation; decision boundary stays with the guest) and the GP definition (Founder, 2026-09-26: GP = the question-bound interpretation, realized by `analysisIntent`, not a new object). In tension with the ratified KRYL-1306 / §13 "no second query, no query rewrite" contract — see D1.

---

## NON-NEGOTIABLE PRODUCT MODEL
Three distinct stages, never collapsed into one interpretation pipeline:
- PRE-SUBMIT: help the guest formulate a better question.
- SUBMIT: exactly what the guest submits is the authoritative QUESTION.
- POST-SUBMIT: determine whether KRYLO understands what the guest wants investigated; clarify only when unresolved ambiguity materially changes the investigation.

## PRE-SUBMIT
Ownership: the guest owns the text at all times. KRYLO must never silently rewrite the guest's text, complete the guest's intent, substitute a different question, or submit on the guest's behalf.

Assistance eligibility — offer additive question-building language ONLY when all four are true:
1. The current input expresses a meaningful subject, condition, or concern.
2. A material dimension of the intended investigation remains unstated.
3. KRYLO can propose that dimension without inventing the guest's objective.
4. The proposed dimension is within KRYLO's investigative role and introduces no new decision, recommendation, or personal-suitability criterion.
If any condition fails: do not offer assistance.

Permitted dimensions: subject refinement, scope, timeframe, relationship, comparison dimension, structural condition, investigative focus.
Never proposed: personal suitability criteria, risk tolerance, financial capacity, portfolio circumstances, a recommendation, a decision the guest did not articulate.

Form: explicitly additive, using the `+` interaction. Example: input `Vendor Platform Decoupling`; offered `+ technology / architecture changes`; selecting produces `Vendor Platform Decoupling + technology / architecture changes`. The original text remains intact; the appended wording is visible actual query language (not a hidden label or code); the guest sees the complete resulting query and may edit/delete/add; selecting never submits; no completeness checklist; no mandatory PRE-SUBMIT clarification flow. This is question construction, not interpretation.

## SUBMIT
The submitted string is the sole authoritative QUESTION. No displayed suggestion becomes authoritative merely by being displayed; no hidden pre-submit interpretation is promoted into fact; no partial interpretation is promoted into the InterpretationFrame; only the submitted question may CREATE the authoritative `analysisIntent` / InterpretationFrame. After creation, only an explicit guest clarification response may refine its GP interpretation (ruling D3); the submitted QUESTION itself stays immutable.

## POST-SUBMIT
Establish GP exclusively from the submitted question. GP is not a completeness checklist; do not manufacture missing fields.
Sufficiency test: "Do I understand enough about what the guest wants investigated to investigate it without inventing intent?" Yes → PROCEED. No → decide whether the unresolved ambiguity would materially change the investigation.
Clarification rule: missing information alone is never sufficient reason to interrupt. Clarify only when unresolved ambiguity would materially change the investigation that would otherwise be performed. When required: ask the smallest targeted question resolving that specific ambiguity; ground it in what KRYLO already knows; no generic metadata form; do not ask for what KRYLO already has; no recommendation/suitability criteria; use the answer to update GP; re-evaluate sufficiency; investigate once GP is sufficient. Broad does not automatically mean ambiguous — a broad question may be an intentional request to expose a field.

## InterpretationFrame / analysisIntent invariants
Created once from the submitted question; persists for the session lifetime; remains question-bound; the submitted QUESTION stays immutable, while its GP interpretation may be refined only by an explicit guest clarification response (ruling D3); never becomes an observational fact, an admission gate, or a source of manufactured decision parameters; never converts an objective such as "invest" into a recommendation; never silently turns guest context into an observation; never substitutes for evidence. No second competing interpretation object if `analysisIntent` can represent the state; one authoritative interpretation path.

## Existing code context — preserve / verify
Verify 232aa66 is present on the branch; preserve valid work; do not duplicate `analysisIntent`; do not redesign querysynthesis.js absent a concrete contract violation; no new relevance scorer, keyword matcher, or parallel classifier; do not alter observation semantics to compensate.

## Required behavioral cases
1. Bare subject `Vendor Platform Decoupling` → assistance eligible; e.g. `+ technology / architecture changes`; selection appends; no submit.
2. Fully specified concern (Amazon, three years, warehouse automation/labor) → no assistance; do not manufacture parameters.
3. `Is SpaceX a good long-term investment?` → do not solicit personal financial criteria (no risk tolerance, portfolio size, liquidity, suitability); a neutral structural dimension only if genuinely grounded and within KRYLO's role; otherwise leave it to POST-SUBMIT.
4. `I'm 55, live in Philly, looking to invest in SpaceX for the next 10+ years. Is this a good fit?` → no suitability interrogation; no additional personal-financial criteria.
5. `What happened with the platform migration last year?` → do not invent a referent; POST-SUBMIT clarification only if the ambiguity materially changes the investigation.
6. Empty or `???` → no assistance; no completeness checklist.
7. `AWS vs Azure vs on-prem for our ERP` → (amended 2026-09-26, R2-Q3) no assistance is required in the current deterministic R2 slice; comparison-dimension assistance is deferred and must not be fabricated. Never `+ which should we choose`.
8. Already-formed paragraph (subject, horizon, concern, constraints) → no assistance unless a genuinely material dimension remains and can be proposed without invention.

## Acceptance criteria
PRE-SUBMIT: (1) original text preserved; (2) addition visibly marked `+`; (3) accepting appends only the displayed wording; (4) result stays editable; (5) accepting does not submit; (6) removing the suggestion restores the original query meaning; (7) no hidden fields silently populated as authoritative intent; (8) no recommendations, decisions, or personal-suitability criteria.
SUBMIT: (1) exact submitted text is authoritative; (2) `analysisIntent` derived from the submitted question; (3) no suggestion authoritative unless actually submitted; (4) no pre-submit interpretation treated as observational fact.
POST-SUBMIT: (1) GP established from the submitted question; (2) missing fields alone do not trigger clarification; (3) clarification only when ambiguity materially changes the investigation; (4) clarification targeted and minimal; (5) the guest's response updates GP; (6) sufficiency re-evaluated after the update; (7) investigation proceeds once GP is sufficient.

## Scope control (out of scope)
No redesign of the observation layer or narrative layer; no predictive scoring or recommendation logic; no new composite relevance score; no fabricated defaults; no conversion of uncertainty into certainty; no query completeness as an admission gate; no unrelated UI changes; no rewrite of querysynthesis.js merely to make this work.

## Required workflow and delivery
Before code: read implementation and branch state; trace submit flow, `analysisIntent` creation/persistence, and the query input UI; identify the smallest PRE-SUBMIT insertion points; confirm POST-SUBMIT can distinguish submitted question / GP / observation / clarification state. Then implement incrementally and run the 8 cases against the contract, reporting per case: PRE-SUBMIT behavior, submitted QUESTION, GP/InterpretationFrame behavior, whether clarification occurs, and why it satisfies the contract. Behavioral verification through the actual guest path is required.
Delivery: STARTED (files/components, current state, discrepancies found before coding) → IN PROGRESS (changes, tests) → COMPLETE (commit hash, exact files, 8-case results, guest-path verification, explicit statement that no out-of-scope architecture changed). Do not deploy until behavioral verification is complete; deploy also requires this ticket in "Deploy to Prod" (CLAUDE.md §23).

---

## RULINGS (Founder, 2026-09-26) — supersede the discrepancy notes of the same names

D1 — Explicit `+` append. ADOPTED as a deliberate superseding ruling. The 2026-09-16 direction that rejected append-to-query (commit db196fb; "i meant add the chip to the box") is superseded. An explicit guest-selected `+` append into the query text is the authorized PRE-SUBMIT behavior. Example: `Vendor Platform Decoupling` + selecting `+ technology / architecture changes` -> `Vendor Platform Decoupling + technology / architecture changes`; no other guest text changes. Rules from that 09-16 correction that REMAIN: one shared `selectedRefinementIds` pool; selecting a chip never submits; selecting a chip never changes the active situation; chip selection is disabled while processing. `+ ADDED` row: COEXISTS with the appended query text — the query box holds the guest's current composed question; the `+ ADDED` row remains the visible record of the refinement selected through question assistance and is not a second query source and does not itself mutate or submit the question.

D2 — PRE-SUBMIT suggestion source. ADOPTED. The existing deterministic `inquirygeneration.js` mechanism (KRYL-1290) is the PRE-SUBMIT suggestion source; no new suggestion architecture and no LLM source in this ticket. STRUCTURAL SIGNALS (chipsubstrate.js) is excluded: it is observation-derived and unavailable pre-submit. The generator's output contract changes to candidate ADDITIVE verbiage. It must not produce query restatements (e.g. "EXAMINE ..."), malformed extraction, invented domains, fabricated objectives, recommendations, or decisions. Existing source, new output contract.

D3 — analysisIntent and GP. ADOPTED WITH SPEC AMENDMENT. No new GP state store. `analysisIntent` remains the single authoritative interpretation object (GP is realized within it). The submitted QUESTION remains immutable. `analysisIntent` is created once from the submitted QUESTION and persists for the session; its GP interpretation may be explicitly refined when the guest answers a post-submit clarification. Still prohibited: PRE-SUBMIT modification of `analysisIntent`; silent mutation of the submitted QUESTION; observational facts or evidence written into `analysisIntent`; inferred personal suitability or recommendations.

## RESIDUAL ITEMS to reconcile against the repo before this leaves Backlog (found while recording the rulings)
R1 — "the GP portion of analysisIntent" is not a defined field set. analysisIntent (analysisintent.js v1.1.0) carries actor, subject, objective, question, observationalScope, vReq, sReq, eReq, rCmp, tReq; none is labeled GP. Define which fields a clarification may refine, and how the refinement is recorded without mutating `question`.
R2 — D2 output contract: the "additive verbiage" rule and its deterministic derivation are not yet specified. Against the contract cases, the current generator: restates the query (Case 1), mis-extracts the entity "Is Space" (Case 3; extraction lives in intentparser.js, disposition EXTEND-not-REPLACE), invents TECHNOLOGY for an ambiguous referent (Case 5), and yields nothing for the comparison (Case 7). Specify what text is derived, from which ParsedIntent fields, with no new classifier/matcher, and whether fixing intentparser.js extraction is in scope.
R3 — `+ ADDED` coexistence: specify the exact interaction (chip select -> append text + `+ ADDED` token; deselect -> restore original query text and remove token, per acceptance criterion PRE-SUBMIT 6) and how edits the guest makes to the appended text interact with the token.
R4 — File Map and touch points not yet listed (inquirygeneration.js output contract, analysisidlefield.jsx selection handler and textarea write path, any clarification state/UI location). Required by CLAUDE.md §10 before Ready.

Prior work: 232aa66 (createSession builds analysisIntent when absent) is present on main, not pushed, not deployed.

## RULINGS (Founder, 2026-09-26, second batch)

R1 — ADOPTED. Use an additive `refinements` array within `analysisIntent` as clarification provenance (original interpretation -> guest clarification -> updated interpretation). Current interpretation fields remain the resolved state: `subject`, `objective`, `observationalScope` refinable; `question` immutable (the submitted QUESTION); `sReq`, `vReq`, `rCmp` derived/recomputed; `actor`, `eReq`, `tReq` not refinable in KRYL-1326. No separate GP state store.

R2 — OPEN; PROPOSAL REJECTED. The entity+domain gate and the "phrase already present" proxy do not satisfy the ratified assistance contract across the eight cases; textual presence of a phrase is not a valid proxy for "fully specified". R2-Q1 and R2-Q2 are not adopted; R2-Q3 is rejected. `inquirygeneration.js` remains the authorized PRE-SUBMIT suggestion source. A revised proposal must state what deterministic evidence in the typed text permits an additive dimension without inventing the guest's objective, domain, decision, or other material intent. No new LLM source is authorized.

R3 — ADOPTED. Selected additions are tracked by their exact appended text. Deselect removes that exact text only if it remains verbatim in the textarea; if the guest edited it, the token is no longer authoritative and deselect is a no-op for the edited text. Do not add these tokens to `tensor.structuralRefinements`. No inline textarea styling in this ticket. The `+ ADDED` row remains and coexists with the appended query text as the visual indication of the refinement.

R4 — ADOPTED. Split KRYL-1326 into two implementation slices. PRE-SUBMIT slice: R1, R2, R3 and the existing suggestion source / `+` append behavior. POST-SUBMIT slice: deferred until KRYL-1324 defines the materiality rule; no clarification-trigger implementation is authorized before that ruling. The traced file map may be recorded now and used as the PRE-SUBMIT boundary.

Status: R1 closed, R3 closed, R4 closed, R2 open (revised proposal below awaits ruling). KRYL-1326 remains in Backlog. No code authorized.

## RULINGS (Founder, 2026-09-26, third batch) — R2

R2-Q2 — ADOPTED: TECHNOLOGY ONLY for this implementation. Do not extend to FINANCIAL, MARKET, LEGAL, HEALTH or CAREER in KRYL-1326 (their mappings to the canonical domains are many-to-one and can introduce semantics the guest did not express); revisit later with evidence.

R2-Q3 — ADOPTED: rule A1-A3 with rule B deferred. A1: input is a bare subject phrase containing exactly one entity phrase and nothing more. A2: no verb, decision, scenario, number, comparison, or geo cues. A3: exactly one domain keyword matches, and that domain is TECHNOLOGY. Then offer the canonical TECHNOLOGY additive refinement; otherwise offer nothing. The broader comparison rule is deferred.

Case 7 acceptance wording — AMENDED: "Comparison query: no assistance is required in the current deterministic R2 slice; comparison-dimension assistance is deferred and must not be fabricated." (Applied to the Required behavioral cases above.)

R2-Q1 — ADOPTED IN PRINCIPLE; STRING NOT YET FIXED. Ruling: use the existing ratified TECHNOLOGY pill-to-canonical phrase verbatim; no new phrase; no "EXAMINE"; no entity restatement; output `[original query] + [canonical TECHNOLOGY refinement]`. REPO FINDING (searched src, public, specs): no such ratified phrase exists. ANALYSIS_PILL_TO_DOMAIN (analysisidlefield.jsx:99-108) maps pill keys to canonical domain NAMES only (TECHNOLOGY -> 'TECHNOLOGY'); no per-domain phrase table exists anywhere. The only occurrence of `technology / architecture changes` is the example in the relayed contract text and this ticket. The exact string therefore cannot be copied from an authoritative table. Needed from the Founder: confirm the exact string to use as the canonical TECHNOLOGY refinement (candidate: `technology / architecture changes`, the contract's own example), or supply another. Until then the phrase is undefined and engineering must not choose one (CLAUDE.md section 5 copy authority; section 10 undefined item = BLOCKED).

Status after this batch: R1 closed, R3 closed, R4 closed, R2 closed except the R2-Q1 exact string. PRE-SUBMIT slice becomes buildable once that string is confirmed and the file-level plan is reconciled. POST-SUBMIT slice deferred to the KRYL-1324 materiality rule. KRYL-1326 remains in Backlog. No code authorized.

## RULINGS (Founder, 2026-09-26, fourth batch) — R2-Q1 closed

R2-Q1 — ADOPTED: the canonical TECHNOLOGY additive phrase for KRYL-1326 is exactly `technology / architecture changes`. This phrase is newly ratified by this ruling; it is NOT inherited from an existing repository phrase or table (correcting the earlier wording of the R2-Q1 ruling). Behavior: `Vendor Platform Decoupling` -> offered `+ technology / architecture changes` -> after selection `Vendor Platform Decoupling + technology / architecture changes`.

Status: R1, R2, R3, R4 closed. PRE-SUBMIT spec complete. POST-SUBMIT deferred to the KRYL-1324 materiality ruling. Remaining gate: the final file-level implementation plan reconciled against the repo (drafted below; three reconciliation questions P-Q1..P-Q3 need a ruling). KRYL-1326 remains in Backlog. No code authorized.

## RULINGS (Founder, 2026-09-26, fifth batch) — plan reconciliation P-Q1..P-Q3

P-Q1 — ADOPTED: separate additive token state `appendedAdditions`. The earlier "shared selectedRefinementIds" rule (D1) applies to the existing legacy chip sources, which stay in `selectedRefinementIds`. The new PRE-SUBMIT additive-assistance selections are tracked in `appendedAdditions`; both may appear in the `+ ADDED` presentation; additive state persists after the candidate disappears from the suggestion list (the addition is now part of the guest's composed question). Additive tokens are NOT forced into `selectedRefinementIds`. This is a deliberate extension of D1, not a reversal.

P-Q2 — ADOPTED: "clear all" behaves as bulk deselect: remove every still-intact KRYLO-appended segment and its additive token. It must not erase guest-authored or guest-edited text. Untouched appended text -> removed; appended text edited by the guest -> edited text left intact, token removed; guest-authored text that merely resembles an addition -> never removed because it matches the phrase. Invariant: KRYLO may remove only text it can still identify as its own unmodified addition.

P-Q3 — ADOPTED: the existing WHAT TO EXAMINE restatement chips stop appearing to the guest in this PRE-SUBMIT flow. The new row header is `ADD TO YOUR QUESTION`. Interaction: under ADD TO YOUR QUESTION the guest sees `+ technology / architecture changes`; after selection the `+ ADDED` row shows `technology / architecture changes`. `tensor.structuralRefinements` remains untouched.

Status: P-Q1, P-Q2, P-Q3 closed. The PRE-SUBMIT plan below is reconciled. Ticket remains in Backlog. No code authorized until the Founder gives an explicit "go".

## RULING (Founder, 2026-09-26, sixth batch) — no `+ ADDED` row for additive assistance; SUPERSEDES P-Q3 (and the coexistence part of R3)

Once the refinement is explicitly appended into the query text, `+ ADDED` is redundant for PRE-SUBMIT additive assistance. The interaction is: suggestion `+ technology / architecture changes`; after selection the query reads `Vendor Platform Decoupling + technology / architecture changes`. There is no separate `+ ADDED` token and no separate `x clear all` control for additions; the visible query is the source of truth and the guest edits or deletes the appended language directly in the query. Principle: KRYLO adds language to the guest's question; it does not create a parallel representation of that addition. (The existing `+ ADDED` row remains only for the legacy STRUCTURAL SIGNALS chips, which still use it.)

Consequences for the plan (APPLIED in commit 07df267 after the Founder's explicit GO, 2026-09-26; the earlier c9b4af8 state is superseded):
- P-Q1 (separate `appendedAdditions` state), P-Q2 ("clear all" bulk deselect and the ownership invariant) and the R3 token/offset tracking become MOOT: with no token and no deselect control there is nothing for KRYLO to own or remove, so no offset tracking is needed. The "delete-and-retype-identical-text breaks ownership" acceptance point is moot for the same reason (KRYLO never removes text after the append).
- Implementation delta: remove appendedAdditions state, the position-tracking helper, removeAddition/clearAllAdditions, the onChange offset sync and the reset hooks, and the addition tokens in the `+ ADDED` row (the row keeps rendering only legacy chip tokens). Keep: the ADD TO YOUR QUESTION row, the append on select, deriveAdditiveAssist, and structuralRefinements untouched.
- Test delta: keep the 9 case tests, the append test, and the submit test; remove the deselect / clear-all / edit-appended / edit-original / delete-retype / identical-copy tests; add an assertion that no `+ ADDED` token or clear-all appears after an additive selection.
- PRE-SUBMIT acceptance criterion 6 ("removing the suggestion restores the original query meaning") is satisfied by the guest deleting the appended text in the query.

## PROPOSALS (drafted 2026-09-26 from a read-only repo trace at HEAD 65e8a37) — awaiting Founder rulings, one at a time. Nothing below is adopted. No code authorized.

### R1 Proposal — ADOPTED 2026-09-26 (see RULINGS, second batch) — which analysisIntent fields are GP, and which a clarification may refine
Evidence: buildAnalysisIntent (src/engine/analysisintent.js:178-233, v1.1.0) returns ten keys. The header (lines 1-70) states each one's authoritative source. Live consumers read the original five by EXACT key name (targetpacket.jsx, aiae.js, intelligencebrief.jsx) and reconnpayload.js ratifyIntent() (line 43) destructures vReq/sReq/eReq/rCmp/tReq/version, so the SHAPE must not change.
Proposed classification (no new field named "GP" is created):
- question {text, verb, verbMatched} — the submitted QUESTION. IMMUTABLE (D3). Not GP; it is GP's source.
- subject {state, value: subjectScope result} — GP. REFINABLE by clarification, only by re-resolving the guest's answer through the existing subjectScope() (never by assigning free text). Case 5 (ambiguous referent) is the use case.
- objective {cues | scenario} — GP. REFINABLE, additive only (new decision/scenario cues found in the clarification answer are added; nothing is converted into a recommendation).
- observationalScope {domains} — GP. REFINABLE (domains found in the answer are added).
- sReq (passthrough of observationalScope), vReq (0-or-1 array derived from subject), rCmp (derived from raw text via the explicit-comparison rule) — DERIVED. They follow their source field and are recomputed from it; never refined independently.
- actor — always unresolved by design (no actor detection exists in the codebase). NOT refinable in this ticket.
- eReq, tReq — always NOT_DETECTED by design (no relationship-type or temporal-stance vocabulary exists). NOT refinable in this ticket; making them refinable means building a detector, which the contract forbids.
Open question R1-Q1 for the Founder: record refinements as an additive `refinements` array on analysisIntent (each {prompt, response}, so the original QUESTION-derived values stay auditable and the ledger can show original vs refined) — RECOMMENDED — or overwrite the refinable fields in place? Either stays inside the single analysisIntent object (no new store).
Consequence to accept: buildInterpretationLedger (analysisintent.js:264) and its two readers (targetpacket.jsx, intelligencebrief.jsx) would need to read refinements if the ledger is to show them.

### R2 Proposal (original) — REJECTED 2026-09-26; superseded by the revised proposal below — minimum change so the existing generator produces valid additive verbiage
Evidence (functions executed, not inferred): deriveInquiryPossibilities (src/engine/inquirygeneration.js:94-137) builds every candidate from three shapes only — entity x domain, entity alone, domain alone — each a VERB-TEMPLATED RESTATEMENT of the parsed entity/domain ("EXAMINE Vendor Platform Decoupling'S TECHNOLOGY STRUCTURE"). It never emits a dimension to add. Its only consumer is analysisidlefield.jsx:898.
Failures against the contract cases, with root cause:
- Case 1 "Vendor Platform Decoupling": parser gives entity "Vendor Platform Decoupling", domain TECHNOLOGY (keyword "platform"). The output restates entity + verb; the parser already holds the domain evidence an additive phrase would need. FAIL = output shape.
- Case 3 "Is SpaceX a good long-term investment?": entity "Is Space". Root cause: intentparser.js splitCollapsedCompounds() splits camelCase "SpaceX" -> "Space X" (SpaceX is not in KNOWN_CAMELCASE_BRANDS, lines 70-76), and the entity regex requires each word >= 2 letters, dropping "X". Domains [] , so under the proposal below this case yields ZERO output and the bad entity never reaches guest-visible text. => the intentparser fix is NOT necessary for this ticket. It is a separate defect (fix = add 'SpaceX' to KNOWN_CAMELCASE_BRANDS, per the file's own instruction "extend it when a real brand name gets reported broken"); intentparser.js is shared (also read by analysisintent.js, querycontext.js, ingestionbuilder.jsx), so it needs its own §2 gate and its own ticket.
- Case 5 "What happened with the platform migration last year?": entities [], domains [TECHNOLOGY] -> domain-only candidate "EXAMINE TECHNOLOGY STRUCTURE". The parser's domain hit is real keyword evidence, but the contract says do not invent a referent.
- Case 7 "AWS vs Azure vs on-prem for our ERP": verb COMPARE matched, entities [], domains [] -> zero output; the contract expects a comparison-dimension addition. AWS/Azure are not recognized as entities.
- Cases 2, 4, 6: zero output already — but Cases 2/4 are zero ONLY because the entity regex needs two capitalized words ("Amazon", "SpaceX" alone never match). That is accidental, not a principled "fully specified => no assistance" rule.
Proposed minimum change (all inside inquirygeneration.js, reusing ParsedIntent, no new parser/classifier/matcher, no LLM):
 1. Add an `additive` string per candidate (the phrase to append, beginning with "+ "). The existing label/question output stays for any other use.
 2. Eligibility gate: emit an additive candidate only when entities.length >= 1 AND domains.length >= 1 (Case 1 offers; Case 5 has no entity -> zero; Case 3 no domain -> zero), and only when the additive phrase is not already contained (case-insensitive) in the typed text.
 3. Case 7: when verb_matched is true and normalized_verb === 'COMPARE', offer one comparison-dimension additive phrase from a fixed phrase table (no entity required).
 4. The additive phrase text is looked up from a fixed table keyed by parser domain / COMPARE — a label lookup, not detection; detection stays in the parser.
Founder decisions this needs:
 - R2-Q1 COPY: the phrase table contents ("technology / architecture changes", "compare integration, operating cost, and control" appear only as contract examples). Wording is Founder copy authority (CLAUDE.md §5; inquirygeneration.js header says final chip copy is a Founder decision).
 - R2-Q2 TAXONOMY: the parser's DOMAIN_MAP (intentparser.js:20-27) uses FINANCIAL/MARKET/LEGAL/HEALTH/CAREER/TECHNOLOGY — NOT the six locked canonical domains (CAPITAL/TECHNOLOGY/KNOWLEDGE/LABOR/MEDIA/OWNERSHIP). Suggestions built on it would name domains outside the locked six. Which domains may the phrase table cover?
 - R2-Q3 "fully specified => no assistance" (Cases 2/8): no deterministic proxy for "a material dimension is unstated" exists without a completeness judgment. Proposed proxy = the "phrase already present" check in (2) only; a word-count or similar threshold would need a cited precedent (CLAUDE.md §1) and none exists. Accept the proxy, or rule otherwise.

### R3 Proposal — ADOPTED 2026-09-26 (see RULINGS, second batch) — exact state transitions for the `+` append and the `+ ADDED` row
Evidence: the query box is an UNCONTROLLED textarea (analysisidlefield.jsx:1761-1775: ref=centerTextareaRef, defaultValue=""); seedQuery mirrors it on a 150 ms debounce and on blur; handleExecute reads centerTextareaRef.current.value (line 1183). The removed KRYL-1290 code set both textarea.value and setSeedQuery (db196fb diff) — precedent for the write path. Chip candidates are derived from seedQuery (line 898) and selectedRefinementIds is PRUNED whenever a selected id leaves the candidate set (lines 915-921). Hazard: appending text changes seedQuery, which regenerates candidates; the existing prune could then drop the token while the appended text is still in the box.
Data kept per addition: token {chipId, appendedText}, where appendedText is the exact string written (including the "+"). Tokens hold provenance only; the textarea holds the truth; the submitted text is read from the textarea alone (SUBMIT ruling).
Transitions:
- select `+`: if appendedText is not already in the box, write current text + " " + appendedText (no other character changes) and set seedQuery to match; add the token to selectedRefinementIds/+ ADDED; do not submit. Disabled while processing (existing rule).
- deselect (chip again, or the token's remove): if appendedText is still present verbatim, remove exactly that string and its one leading space; if it is not present verbatim (the guest edited or deleted it), leave all text alone and just drop the token. Never touches unrelated guest text.
- edit appended text: no automatic action while typing. Once appendedText is no longer a verbatim substring, the token is dropped (the guest has taken ownership; it is now guest text; nothing is restored).
- edit original text: no effect on tokens while appendedText remains verbatim; suggestions re-derive; an already-appended phrase is not offered again.
- delete appended text: same as edit — token dropped, no restoration.
- submit: the exact textarea string is the QUESTION. Tokens are not part of the payload as intent.
- Prune-effect change required (lines 915-921): tokens for appended text must be keyed to the appended string, not to the chip still being in the candidate set.
Governing invariant (proposed): a token exists only while its appendedText is present verbatim in the box, so the guest can always tell KRYLO-added text from their own (the "+ ..." wording in the text AND the + ADDED row), and no deselect ever alters text the guest wrote.
Open questions: R3-Q1 should appended-text tokens ALSO be copied into tensor.structuralRefinements (today selected chips ride there as inert payload, analysisidlefield.jsx ~1249)? Proposed NO — the text is already in the submitted QUESTION; copying would double-count. R3-Q2 a plain textarea cannot style part of its text, so distinguishability rests on the "+" wording and the + ADDED row; a visual distinction inside the box would be a UI change (Founder design authority).

### R4 Proposal — ADOPTED 2026-09-26 (see RULINGS, second batch) — file map and boundary (CLAUDE.md section 10)
PRE-SUBMIT (proposed scope of the first implementation slice, after R1-R3 rulings):
- src/engine/inquirygeneration.js — add `additive` output, eligibility gate, fixed phrase table (R2). Only consumer: analysisidlefield.jsx:898.
- src/components/analysis/analysisidlefield.jsx — toggleRefinement path for inquiry chips (line ~1125), textarea write + seedQuery sync (~1761-1775, using the ref), + ADDED row (~1790-1830), prune effect (915-921), chip render (~1806, 1865-1870), tensor.structuralRefinements handling (~1249, R3-Q1). handleExecute (1173) is unchanged: it already reads the textarea.
- NOT touched: src/engine/intentparser.js (Case 3 mis-extraction is a separate defect and ticket, R2), querysynthesis.js, the observation layer, narrativeassembly.js, chipsubstrate.js (STRUCTURAL SIGNALS stays as it is; excluded as a PRE-SUBMIT source).
POST-SUBMIT (clarification + GP refinement):
- src/engine/analysisintent.js — a pure function that applies a clarification to the refinable fields per R1, reusing subjectScope()/queryContext derivations; buildAnalysisIntent's returned shape unchanged.
- src/store/useanalysisstore.js — one store action to write the refined analysisIntent (same pattern as setOutputFilters/setStructuralRefinements, lines 127-183); no new store.
- Clarification prompt UI: LOCATION UNDECIDED (candidates: targetpacket.jsx, which already renders the READ block from analysisIntent, or the idle field after submit). Layout and wording are Founder design/copy authority. No existing component asks a targeted question (AmbiguousState is a static withheld state).
- BLOCKER: the trigger "clarify only when the ambiguity would MATERIALLY change the investigation" needs a materiality rule. None exists. KRYL-1324 lists the materiality rule as Founder-authored and OPEN, with its acceptance criterion 8 BLOCKED on it (specs/ticket-draft-semantic-integrity-boundary.md lines 31, 109, 130). Any POST-SUBMIT clarification built without it would invent that rule.
Proposed split for the Founder to decide (R4-Q1): (a) PRE-SUBMIT slice — files above, unblocked once R1-R3 and R2-Q1/Q2/Q3 are ruled; (b) POST-SUBMIT slice — stays in Backlog behind the KRYL-1324 materiality rule. Whether to file (b) as its own ticket is the Founder's call.
Shared-target gates (CLAUDE.md section 2) required before edits: inquirygeneration.js (one consumer), useanalysisstore.js (shared), analysisintent.js (consumers targetpacket/aiae/intelligencebrief/reconnpayload read exact keys).

### R2 Proposal (revised) — deterministic evidence that permits an additive dimension (drafted 2026-09-26; awaiting Founder ruling; prototype executed in the scratchpad only, no repo change)
The question to answer: what deterministic evidence in the typed text permits inquirygeneration.js to propose an additive dimension without inventing one?

Evidence inventory (verified by running buildQueryContext/parseIntent): the only deterministic signals in typed text are — entity phrases (parseIntent: title-case runs of two or more words), keyword domain hits (parseIntent DOMAIN_MAP), a matched verb incl. COMPARE, decisionCues, scenarioCues.present, numbers, geo, and an explicit comparison connector (vs / versus / compared to). QueryContext's keys are id, rawQuery, geo, intent, numbers, assetClass, decisionCues, scenarioCues, parseConfidence, unresolved, provenance. NOTHING detects a timeframe, a relationship type, a concern, or comparison criteria (analysisintent.js: tReq and eReq are NOT_DETECTED by design; Cases 2, 4 and 8 contain explicit time horizons that no existing code recognizes). So "which dimension is unstated" cannot be established for timeframe/relationship/criteria without building a detector, which the contract forbids. Consequence: the honest evidence base can support only one additive dimension type — the FOCUS dimension the guest's own keyword already implies.

Proposed rule A (all must hold, all deterministic):
 A1. parseIntent finds exactly one entity phrase AND the typed text, punctuation-stripped and lower-cased, equals that phrase — i.e. the input is a bare subject phrase and nothing else. (This replaces the rejected "phrase already present" proxy: rich, specified text can never qualify, with no word-count threshold and no completeness judgment.)
 A2. No other structure evidence: verb_matched false; decisionCues empty; scenarioCues.present false; no numbers; no comparison connector; no resolved geo.
 A3. Exactly one parser domain matched (unambiguous keyword evidence), mapped to a canonical domain by the ratified ANALYSIS_PILL_TO_DOMAIN table (analysisidlefield.jsx:99-108, Founder 2026-09-23). Two or more matched domains -> zero.
 Output: `+ ` + the fixed phrase for that canonical domain (Founder copy, R2-Q1). The phrase names an investigative focus the guest's own word evidences ("platform" -> technology); it names no objective, decision, value, timeframe, or suitability criterion.
Rule B (comparison basis, Case 7): DEFER. An explicit comparison connector is detectable, but whether criteria are already stated is not (no criteria vocabulary exists), so B would over-offer. Case 7 says assistance "may" be offered, so zero output is compliant.

Eight-case walk (prototype executed):
 1 "Vendor Platform Decoupling" -> OFFER canonical TECHNOLOGY (parser TECHNOLOGY). 2 formed concern -> zero (no entity phrase). 3 "Is SpaceX a good long-term investment?" -> zero (text is more than the subject phrase; the "Is Space" mis-extraction never reaches guest text). 4 personal context -> zero. 5 "platform migration last year" -> zero (no entity phrase; domain alone is not a subject). 6a empty / 6b "???" -> zero. 7 comparison -> zero (rule B deferred; permitted by "may"). 8 formed paragraph -> zero.
Adversarial checks: "Data Privacy Lawsuit" -> zero (two domains); "Mid Market Software" -> zero (two domains); "Amazon Web Services" -> zero (no domain); "Angel Investors" -> zero (no domain); single-word subjects such as "Amazon" -> zero (parser needs two capitalized words).
Known weakness the Founder should see: the ratified pill-to-canonical table is many-to-one (FINANCIAL/MARKET->CAPITAL, LEGAL->KNOWLEDGE, HEALTH/CAREER->LABOR). "Hospital Staffing Costs" -> OFFER canonical LABOR (parser HEALTH). A HEALTH keyword yields a LABOR phrase, which names a canonical domain the guest's text did not evidence by that name. Only TECHNOLOGY maps identity (TECHNOLOGY->TECHNOLOGY).

Coverage note: rule A is deliberately conservative — it offers assistance only for a multi-word, capitalized subject phrase that has exactly one domain keyword and nothing else. Most real inputs get zero suggestions. That satisfies the eight cases and every no-assistance requirement; whether it is useful enough is a Founder call.

Founder decisions requested:
 R2-Q1 COPY: the phrase for each permitted canonical domain (the contract's "technology / architecture changes" is an example only).
 R2-Q2 SCOPE: (a) rule A for TECHNOLOGY only (identity mapping; nothing offered from HEALTH/FINANCIAL/etc. keywords) — RECOMMENDED because it never names a domain the guest's word did not evidence; or (b) all four reachable canonical domains (CAPITAL, KNOWLEDGE, LABOR, TECHNOLOGY) via the ratified table, accepting the many-to-one risk above.
 R2-Q3: accept rule A1-A3 as the eligibility rule, and rule B deferred out of this slice?
 R2-Q4 (implementation note, not a decision): ANALYSIS_PILL_TO_DOMAIN is a private const in analysisidlefield.jsx; inquirygeneration.js would need it exported or relocated (a shared-target gate under CLAUDE.md section 2).

## FILE-LEVEL IMPLEMENTATION PLAN — PRE-SUBMIT SLICE (RECONCILED 2026-09-26 against rulings R1-R4, R2-Q1..Q3, P-Q1..P-Q3; repo at HEAD 65e8a37; no code authorized)

Scope: PRE-SUBMIT behavior only (R2 suggestion rule, R3 append/token behavior). POST-SUBMIT (R1 refinements, clarification) is NOT in this slice; it waits for the KRYL-1324 materiality ruling.

FILES TO CHANGE
1. src/engine/inquirygeneration.js — ADD one export, `deriveAdditiveAssist(rawInput)`, returning [] or one candidate {id: 'add:TECHNOLOGY', label: 'technology / architecture changes', appendText: ' + technology / architecture changes'}. Rule A1-A3 as ruled (bare subject phrase = exactly one entity phrase and nothing more; verb not matched, no decision/scenario cues, no numbers, no geo; exactly one domain match and it is TECHNOLOGY), built only from parseIntent() and buildQueryContext(). TECHNOLOGY-only makes the domain check an identity check on parseIntent().domains, so the private ANALYSIS_PILL_TO_DOMAIN table is not needed. deriveInquiryPossibilities stays UNCHANGED (kept, no cleanup; it simply stops being rendered). Its comparison clause is covered by "verb not matched": parseIntent matches COMPARE for "AWS vs Azure vs on-prem" (executed); at build time verify every comparison connector form (vs / versus / compared to) is in the parser's VERB_MAP.
2. src/components/analysis/analysisidlefield.jsx (the only UI file):
   a. Suggestion surface: replace the WHAT TO EXAMINE render block (currently fed by inquiryChips, ~line 898 and its render block) with a row headed `ADD TO YOUR QUESTION` showing the additive candidate as `+ technology / architecture changes`, gated on !processing (existing KRYL-1290 follow-up gate). Remove inquiryChips from allSelectableChips (line 908) so the legacy restatement chips no longer appear; STRUCTURAL SIGNALS and its shared selectedRefinementIds pool are unchanged.
   b. New state `appendedAdditions` = [{id, label, appendedText, offset}]. addAddition(cand): write textarea value = current + appendText through centerTextareaRef.current.value (uncontrolled textarea, lines 1761-1775) and setSeedQuery to the same string (precedent: the write path removed in db196fb); record offset = position where the appended segment starts; never submits.
   c. IDENTIFICATION (refinement forced by the P-Q2 invariant): a token identifies KRYLO's segment by TRACKED OFFSET plus verbatim match at that offset — not by searching the text for the string, which cannot tell KRYLO's segment from identical text the guest typed or retyped. On every text change, diff old vs new value (first differing index p, length delta d): if p is before a token's offset, shift its offset by d; if p falls inside the segment, drop the token (the guest edited it — the text is now theirs, nothing is restored or removed); if p is after the segment, leave the token alone. Deleting then retyping identical text is two edits and therefore drops the token.
   d. removeAddition(id) and "clear all": if the token is still intact (text at its offset equals appendedText), remove exactly that segment and its one leading space; otherwise leave all text alone; either way drop the token. Guest-authored text is never removed.
   e. + ADDED row (lines ~1795-1845): also render `appendedAdditions` tokens with a remove control; "clear all" (line 1842) acts on both the legacy pool and the additions as above.
   f. Reset points: add `setAppendedAdditions([])` where the pool is reset (lines 1143 and 1298 area).
   g. UNCHANGED: `selectedStructuralRefinements` and `tensor.structuralRefinements = selectedStructuralRefinements` (line 1254). Additive tokens never enter them. querysynthesis.js:4367 reads structuralRefinements for canonicalDomainOverride, so keeping additions out prevents any routing effect. handleExecute reads the textarea exactly as before.
3. tests/e2e — one new Playwright spec (file name chosen at build time), following the existing tests/e2e pattern, covering the 8 cases (Case 7 per the amended wording), select / deselect / edit appended / edit original / delete appended / clear all / submit, and the P-Q2 cases (untouched, edited, and guest-retyped identical text). Plus a node check of deriveAdditiveAssist over the 8 cases and the adversarial inputs already run (Data Privacy Lawsuit, Mid Market Software, Amazon Web Services, Angel Investors, Amazon).
NOT TOUCHED: intentparser.js ("Is Space" stays a separate ticket), analysisintent.js, querycontext.js, querysynthesis.js, useanalysisstore.js, chipsubstrate.js, narrativeassembly.js, targetpacket.jsx, intelligencebrief.jsx.
SHARED-TARGET GATE (CLAUDE.md section 2): inquirygeneration.js has one consumer (verified by grep) and gains an export only; analysisidlefield.jsx is the single UI owner of the surface.
ACCEPTANCE: PRE-SUBMIT criteria 1-8 of the contract; the 8 cases; no change to what is submitted; the idle field otherwise unchanged; a guest-path (Playwright) run through the real UI, not unit tests alone; no deploy until that verification is complete and the ticket is in "Deploy to Prod".
DELIVERY: STARTED / IN PROGRESS / COMPLETE per the contract; commit hash, exact files, the 8-case results, and an explicit statement that no out-of-scope architecture changed.
