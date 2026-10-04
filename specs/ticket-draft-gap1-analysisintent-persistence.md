# Guest Perspective persistence: build analysisIntent for sessions created outside the idle field (Gap 1)

Type: Task. Project KRYL. Implemented and committed locally (232aa66) after an explicit Founder ruling on 2026-09-26 ("Gap 1 only. Proceed with that change."); this ticket exists so the change has a Jira record and can pass the Deploy to Prod gate (CLAUDE.md section 23). It ships in the same deploy as KRYL-1326. Not pushed, not deployed.

## The six required fields (CLAUDE.md section 10)

### 1. Original intent
Guest Perspective (GP) is realized by the existing analysisIntent (buildAnalysisIntent, src/engine/analysisintent.js), stored on session.tensor.analysisIntent. It was built only in the idle field at submit, so a session created by any other path (history re-run, cone assignment, ingestion, brief re-run) had no interpretation and the downstream READ block, ledger and narrative treated the intent as absent. Intent: carry the same interpretation object for the session lifetime on every session-creation path, reusing the existing function, with no new classifier, scorer, gate or UI and no change to synthesis.

### 2. Acceptance criteria
- createSession builds analysisIntent from the query when tensor.analysisIntent is absent and the query is non-empty (existing buildAnalysisIntent only).
- A tensor that already carries analysisIntent (idle field) is passed through by reference, unchanged.
- An empty or blank query adds nothing.
- A history re-run-shaped session and a cone-assignment-shaped session show a populated interpretation (READ block / ledger).
- Idle-field behavior is unchanged.
- No change to querysynthesis.js; no change to observation generation, narrative assembly or UI (Gap 2, synthesis reading analysisIntent, is NOT authorized and NOT part of this ticket).

### 3. Current implementation state (Maturity A for the store change; verification L + partial R)
- Commit 232aa66 on main: src/store/useanalysisstore.js, +9/-1 lines. createSession imports buildAnalysisIntent and sets sessionTensor = { ...tensor, analysisIntent: buildAnalysisIntent(query) } only when analysisIntent is absent and the query is a non-empty string; otherwise the tensor is passed through untouched.
- Verified: node unit checks on five shapes (idle-field tensor identical by reference; history-shaped; cone-assignment-shaped with source preserved; blank and empty queries unchanged); live render on localhost of the READ block (QUESTION AS ASKED, ESTABLISHED subject) for the history-shaped and cone-assignment-shaped sessions created through the store; 0 page errors; production build compiles.
- NOT verified: clicking through the real History bay and cone-assignment UI paths (the live check created sessions through the store using each path's session shape). The existing readers that now activate for these sessions, aiae.js:113 and intelligencebrief.jsx:217 (analysisIntent.objective), were not tested.
- Known consequence: this fixes persistence only. It does not change how the guest sees GP; more session paths now show the already-repeated READ block, ledger and narrative question lines (observed 2026-09-26). That display question is separate and is not covered here.
- Not pushed, not deployed.

### 4. Dependencies
buildAnalysisIntent (analysisintent.js); createSession (useanalysisstore.js); existing readers of tensor.analysisIntent: targetpacket.jsx, intelligencebrief.jsx, aiae.js, reconnpayload.js, narrativeassembly.js. Related: KRYL-1324 (semantic integrity boundary), KRYL-1306 Phase 1 (querysynthesis.js untouched), KRYL-1326 (its D3 ruling assumes analysisIntent exists on every session; ships in the same deploy).

### 5. Superseded by a newer ticket?
No. The follow-up Gap 2 (having the synthesis stage read analysisIntent) is separate and remains unauthorized pending its own ruling. KRYL-1326 builds on this change; it does not supersede it.

### 6. Still maps to the current KRYLO product model?
Yes. Consistent with the Founder's 2026-09-26 definition that GP is realized within analysisIntent (no new object or store) and with CLAUDE.md section 21 (no new inference or conversion; the interpretation stays question-bound).
