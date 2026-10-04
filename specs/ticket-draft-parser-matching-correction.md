# Parser: keyword and verb matching use substring tests and misfire (parseIntent, src/engine/intentparser.js)

Type: Task. Project KRYL. Filed on the Founder's ruling of 2026-09-26 (KRYL-1329 D2): parser misfires must be corrected under their own ticket; KRYL-1329 must not build suggestions on the misfiring matches and must not work around them inside inquirygeneration.js.

## The six required fields (CLAUDE.md section 10)

### 1. Original intent
A domain hit or verb hit from parseIntent should mean the guest actually wrote that word, not that the letters appear inside another word. Matching must respect word or phrase boundaries so the hits can be trusted as grounding for anything built on them (KRYL-1329 next-question assistance and any other consumer).

### 2. Acceptance criteria
- Every executed misfire below no longer produces the wrong hit.
- Every legitimate hit on a reviewed regression corpus is preserved. The corpus is the 30-input KRYL-1329 corpus plus the misfire examples; a before/after table of parseIntent domains, verb and verb_matched is produced and reviewed by the Founder before the change ships; any changed result is listed and explained.
- The parseIntent output shape is unchanged.
- The effect on every consumer is reported (analysisintent.js, querycontext.js, inquirygeneration.js, ingestionbuilder.jsx, analysisidlefield.jsx) before any deploy.
- No other parser behavior changes (entity extraction, including the "Is SpaceX" -> "Is Space" mis-extraction, is out of scope unless the Founder adds it).

### 3. Current implementation state (Maturity A, wiring live; verification R — misfires reproduced by execution 2026-09-26)
- src/engine/intentparser.js: inferDomains tests `lower.includes(keyword)` over DOMAIN_MAP (lines 20-27); matchVerb tests `lower.includes(pattern)` over VERB_MAP (lines 7-17). Both are substring matches.
- Domain misfires executed: "Thai Restaurant Chain" -> TECHNOLOGY ("ai " inside "thai "); "Shareholder Voting Rights" -> MARKET ("share"); "Glossary Publishing House" -> FINANCIAL ("loss"); "Refund Processing Center" -> FINANCIAL ("fund"); "Bondi Beach Resort" -> FINANCIAL ("bond"); "Series Finale Production" -> FINANCIAL ("series").
- Verb misfires executed: "Different Ways Teams Operate" -> COMPARE ("diff"); "Checkout Process Redesign" -> AUDIT ("check"); "Reviewer Board Meeting" -> AUDIT ("review"); "Growth Equity Partners" -> ACCELERATE ("grow"); "Transferable Skills Program" -> REPOSITION ("transfer").
- Not started.

### 4. Dependencies
Shared function (CLAUDE.md section 2 gate required before any edit). Consumers of parseIntent: analysisintent.js, querycontext.js (intent.domains feeds observationalScope and the ledger), inquirygeneration.js, ingestionbuilder.jsx, analysisidlefield.jsx. The deployed KRYL-1326 eligibility rule uses verb_matched, so its behavior may change (fewer false "verb matched"). Blocks KRYL-1329 and the span-exposure ticket (spans are only meaningful on corrected matching). Needs its own build, localhost verification, the Deploy to Prod gate and an explicit "deploy".

### 5. Superseded by a newer ticket?
No. Related but separate: the camelCase entity mis-extraction ("Is SpaceX" -> "Is Space").

### 6. Still maps to the current KRYLO product model?
Yes. It is detection integrity: a hit must be explainable from the guest's own words; it removes fabricated-by-substring signals (CLAUDE.md section 1).
