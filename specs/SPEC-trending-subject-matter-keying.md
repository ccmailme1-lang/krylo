# WO HARDENING TEMPLATE — Thunder in a Bottle — Bottle Test v1.0

## HEADER

**SPEC — TRENDING Chip Subject-Matter Keying**
Date: 2026-08-04
Author: drafted by agent at Founder direction, for Founder review before execution
Target file(s): `src/engine/trendingterms.js`, `src/components/analysis/analysisidlefield.jsx`

---

## 0. WHERE THIS SITS (already built vs. proposed)

Two things are being conflated in this spec on purpose — because the Founder's last correction
("that's called closing the loop" / "key on subject matter, not static domain chips") changed the
target mid-build. Both need sign-off before more code moves.

**A. Already built + build-verified, NOT committed/deployed:**
1. `deriveTrendingTerms()` (`trendingterms.js`) — real signals only, sourced from live connector
   dispatches (`routedSignals`), §22-compliant (zero-confidence records excluded).
2. `DOMAIN_PRECURSORS` static list restored as **last-resort filler only** (Founder directive:
   chips must always populate, never sit empty) — FINANCIAL entries updated 2026-08-04 from real
   cited 2026 finance search-trend sourcing, all other domains still the original generic terms.
3. Query-text domain detection (`detectDomain`) unions with clicked pills so typed text
   influences which domain's real signals get pulled.

**B. Proposed, NOT built, rejected mid-implementation pending this spec:**
4. `extractSubjectWords()` — a generic stopword-filtered extractor pulling significant words
   directly out of the typed query text (e.g. "UK mortgage lenders...deposit...savings..." ->
   MORTGAGE, LENDERS, PROPERTY, DEPOSIT, SAVINGS, LIQUID), to catch subject matter that
   `parseIntent()`'s existing entity extractor misses (it only catches Title-Case proper
   nouns/quoted phrases — works on "KPMG Managing Partner...", misses plain-prose queries).

This spec is item B onward. Item A is a separate, already-verified deliverable — flagging it here
for visibility, not asking it to be re-approved.

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Given the literal text typed into the search box, extract the significant words in it —
nothing more. No classification, no scoring, no domain inference (that's `detectDomain`'s job,
unchanged), no ranking beyond first-seen order.

**Output:** An array of uppercase strings, each one guaranteed to be a real word (or word-with-
punctuation, e.g. "50%") that literally appears in the text the user typed.

---

## 2. BOUNDARY DECLARATION

**Input contract:** A single string — `seedQuery.trim()`. Nothing else. No access to signals,
domain state, or session data.

**Output contract:** `string[]`, length ≤ `limit` (default 8), deduplicated case-insensitively,
each entry uppercase, order = first-occurrence in the input text.

**Explicit exclusions:**
- Does NOT decide which words are "relevant" to any domain or subject — the only filter is a
  fixed, closed set of English function words (a/the/is/of/etc — linguistic scaffolding, not
  curated content). This is the line that keeps it from becoming "another static list": stopwords
  are a closed grammatical category, not an editorial judgment about what's trending.
- Does NOT touch `deriveTrendingTerms()`, `DOMAIN_PRECURSORS`, `detectDomain()`, or any existing
  chip-merge logic — this is a new, independent input source that gets unioned in, not a
  replacement for what's already built.
- Does NOT persist, log, or send the extracted words anywhere — render-only, same render-cycle as
  today's chip computation.

---

## 3. ZERO DRIFT CONFIRMATION

- [x] UI layer touched → display does NOT introduce new data dependencies.
  **Note:** confirmed — the only new input is text already held in existing component state
  (`seedQuery`); no new prop, no new fetch, no new store subscription.
- [ ] Detection/Scoring/Inference layers — not touched. This is presentation-layer word
  extraction only, same class of change as `deriveTrendingTerms()` already was.

**Drift notes:** The stopword list itself is the one piece of "static content" in this WO. Risk:
it could accrete into a de facto curated list over time if words get added for reasons other than
"this is a function word in standard English." Mitigation: any addition to `STOPWORDS` must be a
genuine closed-class function word (article/preposition/pronoun/auxiliary-verb/conjunction), never
a content word being suppressed because it's "not relevant" — that judgment call is exactly what
this WO exists to avoid making.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** Removes the last place in the TRENDING surface where a human has to keep a word
list current — subject-relevant chips now derive from what the guest actually typed, so the
feature can't go stale the way the original hand-authored `DOMAIN_PRECURSORS` list did.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is a chip list that can never be accused
of being made up, because every word in it is a word the guest already typed."**

---

## 6. FORMULA / CONTRACT

**Formula / contract:**
```
extractSubjectWords(text, limit = 8):
  words = text.replace(/[^\w%$.-]+/g, ' ').split(/\s+/).filter(Boolean)
  for w in words (in order):
    lower = w.toLowerCase()
    skip if lower.length < 4
    skip if lower in STOPWORDS
    skip if lower already seen
    emit w.toUpperCase()
    stop once `limit` emitted
```
Units: N/A (string labels, not a scored signal).
Normalization: N/A — this does not feed the 0–100 signal scale (§16); it is chip display text
only, never dispatched to `surfaceRouter` or treated as a signal.

**Merge order with existing chip sources (proposed, open for Founder to change):**
1. `extractSubjectWords(seedQuery)` — subject words from typed text (this WO)
2. `parseIntent(seedQuery).entities` — proper nouns/quoted phrases (already built, tonight)
3. `deriveTrendingTerms(rawSignals, domain)` — real live connector signals (already built)
4. `DOMAIN_PRECURSORS[pill]` — static filler, last resort only (already built)

Total cap 8, first-come priority in the order above, deduplicated case-insensitively.

**Open question for Founder — not decided here:** should (1) and (2) be merged/deduped against
each other before applying the cap, or should typed-text sources (1+2 combined) always win every
slot over domain-signal sources (3+4) regardless of count? The order above assumes the former
(natural interleave by priority); an alternative is "typed text always fills first, only spill to
3/4 if text alone doesn't reach 8."

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| `src/engine/trendingterms.js` | Add `STOPWORDS` set + `extractSubjectWords()` export | `deriveTrendingTerms()`, `SOURCE_LABELS`, `formatLabel()` all untouched |
| `src/components/analysis/analysisidlefield.jsx` | TRENDING chip merge logic gets a 4th source (`extractSubjectWords`) added to the existing merge | `DOMAIN_PRECURSORS`, `detectDomain` union logic, `parseIntent` entity extraction all untouched |

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES |
| Does this have a single dominant output? | YES |
| Are all boundaries explicitly defined? | YES |
| Can this be built without touching an undefined dependency? | YES |
| Does it avoid increasing expressive flexibility in the core? | YES — presentation layer only |

**Verdict:** PASS, pending Founder sign-off on the open merge-order question in §6.

---

## 9. FOUR-AXIS HARDENING RUBRIC

**SI:** No existing invariant touched; purely additive function + one new merge input.
**SC:** Terminology consistent with existing "subject matter keying" language from tonight's
discussion; no duplicate construct (this is distinct from both `parseIntent` entities and
`deriveTrendingTerms` real signals — three genuinely different sources, not overlapping ones).
**EC:** Declarative, no side effects, no runtime state beyond the existing render cycle.
**DE:** Low drift risk — the one soft spot is the STOPWORDS list (see §3 drift note).

**Outcome tag:** PASS

---

## 10. DEFINITION OF DONE

Grep check: `grep -n "extractSubjectWords" src/engine/trendingterms.js
src/components/analysis/analysisidlefield.jsx` shows the export and its one call site.
Visual check: type a lowercase, no-proper-noun query (e.g. the UK mortgage example) into the
Analysis search box with no domain pill selected yet, and confirm real words from that text
(MORTGAGE, PROPERTY, DEPOSIT, SAVINGS, LIQUID, etc.) appear as TRENDING chips.
