# Parser: read-only exposure of the matched keyword and its text span for domain and verb hits (grounding)

Type: Task. Project KRYL. Filed on the Founder's ruling of 2026-09-26 (KRYL-1329 D1): domain-level grounding is not enough; the assistance layer must be able to show the explicit text span that justifies a candidate. This is a tightly scoped, read-only parser change and must not alter detection behavior; KRYL-1329 must not modify the parser to obtain it.

## The six required fields (CLAUDE.md section 10)

### 1. Original intent
Let a consumer see WHICH keyword matched and WHERE in the guest's text (start and end offsets) for each domain hit and the verb hit, so a suggestion can answer "show me the explicit text span that justifies this candidate" without duplicating the parser's vocabulary in a second matcher.

### 2. Acceptance criteria
- For each domain hit and for the verb hit, the parser reports the matched keyword and its start/end offsets in the guest's text (through parseIntent or a sibling read-only function).
- Detection results and every existing output field are byte-identical to before on the regression corpus (the reviewed 30-input corpus and the misfire examples): no behavior change.
- The vocabulary (DOMAIN_MAP, VERB_MAP) stays in intentparser.js and is not copied elsewhere.
- Offsets are correct on the corrected matching (see dependency).
- The consumers' outputs are unchanged.

### 3. Current implementation state (Maturity C for this need; verification L/C)
Not started. DOMAIN_MAP and VERB_MAP are private consts in src/engine/intentparser.js (lines 7-27); parseIntent returns only the domain names, entities, normalized_verb and verb_matched. A consumer cannot see which keyword matched or where.

### 4. Dependencies
Depends on the matching-correction ticket (the substring misfires): exposing spans over the current substring matching would expose misfire spans. Proposed order: matching correction first, then span exposure, then KRYL-1329 (Founder to confirm the order). Shared function (CLAUDE.md section 2 gate): consumers analysisintent.js, querycontext.js, inquirygeneration.js, ingestionbuilder.jsx, analysisidlefield.jsx. Its own build, localhost verification, Deploy to Prod gate and an explicit "deploy".

### 5. Superseded by a newer ticket?
No.

### 6. Still maps to the current KRYLO product model?
Yes. It makes detection auditable (the span behind a hit is visible) and supports the rule that nothing is shown that cannot be traced to the guest's own words.
