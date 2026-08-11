# SPEC — CARL: Concept Alias Retrieval Layer (TRENDING Chip Recall)

Status: **REJECTED (2026-08-11, same session as build).** Built (`src/engine/domainconcepts.js`,
`src/engine/carl.js`, wired into `analysisidlefield.jsx`), tested live, then explicitly rejected
by the Founder — "not accepting CARL" — and cleanly reverted to the pre-CARL trending
implementation (literal token/stem matching against the flat `DOMAIN_PRECURSORS` list +
`deriveTrendingTerms`, unchanged from before this spec existed). Kept here as a design record
only — do not resurrect this implementation without a fresh Founder "go." The one thing worth
carrying forward from this attempt is not the feature: it's the observation that the same
normalize → resolve-against-canonical-form → explicit-gap-disposition pattern CARL used also
appears independently in AS-DIFF (Canonical Comparison Systems) — cite that working system, not
CARL, if this pattern comes up again.
Outside the Lean Ontology adoption track; never touched, extended, or depended on the
O/E/R/ℒ/Gᵂ/σ/Σ/πΣ substrate closed under `architecture-recon/027_step8_adoption_closure.md`.
Date: 2026-08-11
Author: drafted by agent from a Founder-directed design discussion; the design itself was
relayed from an external AI in three successive drafts, each verified against real code and
corrected in this conversation before being recorded here — not accepted at face value.
Target file(s) if ever built: `src/components/analysis/analysisidlefield.jsx`,
`src/engine/trendingterms.js` (or a new `src/engine/carl.js`).
Supersedes in part: `specs/SPEC-trending-subject-matter-keying.md` (2026-08-04) — see
"Relationship to prior spec" below.

---

## 0. WHERE THIS SITS (already built vs. proposed)

**A. Already built and live this session (not part of this spec, recorded for context):**
1. `src/engine/intentparser.js` — `extractEntities()` now rejects any capitalized-phrase
   candidate composed entirely of a fixed stopword set (generic prose/label words), so
   plain-English paragraphs no longer get parsed into fake "entities."
2. `src/components/analysis/analysisidlefield.jsx` — the TRENDING chip block was rewritten:
   chips require actual typed text (a domain pill alone renders nothing; the default view
   renders nothing); when text is present, candidates (`DOMAIN_PRECURSORS[pill]` +
   `deriveTrendingTerms(rawSignals, domain)`) are scored by literal token/stem overlap
   against the typed text and only kept if score > 0 — no filler, no forced population.
   This is a direct reversal of the 2026-08-04 directive recorded in
   `SPEC-trending-subject-matter-keying.md` §0.A.2 ("chips must always populate, never sit
   empty") — that directive is superseded as of this session; absence is now a legitimate
   outcome (§22).

**B. This spec (CARL) — proposed, NOT built:** a retrieval-recall improvement on top of (A).
Item A's literal token/stem matching is real but narrow: most natural typed phrasing shares
no literal words with the small curated `DOMAIN_PRECURSORS` list, so the chip row is
correct-but-frequently-empty. CARL is the corrected proposal for improving recall without
reintroducing fabrication or growing the vocabulary without limit.

---

## PROBLEM

TRENDING chips (item A above) are working as designed: domain defines the candidate space,
typed text is the relevance filter, and an empty result is an honest "nothing qualifies"
rather than padded filler. But the filter itself is exact-token/stem matching against a small,
hand-authored list (`DOMAIN_PRECURSORS`, 8 terms per domain pill) — so for the large majority
of realistic typed queries, literally zero candidates share a word with what was typed, and the
row comes back empty even when the query is clearly on-topic for the domain.

Two obvious fixes were considered and rejected:
- **Grow the candidate list.** Cheap, but doesn't fix the mechanism — it only shrinks the miss
  rate. Every additional hand-written term is more maintenance for the same brittleness.
- **Semantic/ML matching** (embeddings, similarity classifiers). Fixes the mechanism, but
  introduces exactly the kind of epistemic ambiguity and infrastructure this codebase has
  deliberately avoided everywhere else (`intentparser.js`'s own header: "No LLM. Constrained
  grammar + regex + finite ontology. Determinism guarantee.").

---

## SOLUTION

**CARL (Concept Alias Retrieval Layer)** — a deterministic, lexical retrieval adapter that sits
strictly downstream of the existing candidate pools. It does not change what is allowed to
surface; it only improves how typed text is matched against what's already authorized.

**Two pools, two matching rules — never merged:**

1. **Canonical concepts** (today's `DOMAIN_PRECURSORS[pill]` entries, restructured from flat
   strings into `{ id, label, aliases: string[] }`). Each concept carries a small, explicitly
   governed list of textual manifestations — e.g. `CAPITAL_ALLOCATION` might carry aliases
   `["capital allocation", "allocate capital", "capital deployment", "investment allocation"]`.
   A concept surfaces if typed text token/phrase-matches (normalized, boundary-aware — not raw
   substring) any of its aliases, not just its canonical label.

2. **Live signal labels** (today's `deriveTrendingTerms(rawSignals, domain)` output). These are
   connector-generated at read time and have no fixed identity to attach governed aliases to.
   They keep exactly today's matching behavior — literal/normalized lexical match against the
   typed text, no alias expansion, no concept wrapper.

**Invariant:** `C* ⊆ C` (concepts) and `L* ⊆ L(t)` (live labels) — alias retrieval can change
*which* already-authorized concepts surface for a given query; it can never introduce a concept
that isn't already in `C`, and it never touches the live-label pool's matching rule at all.

**Ranking:** a simple deterministic weighted score — exact phrase match > full token match >
4-char stem/prefix match (same scheme as the token-scoring already shipped in item A). No BM25,
no statistical ranking, until real usage data shows ordering is inadequate — this is
infrastructure this codebase has never needed elsewhere and shouldn't add speculatively.

**Alias governance (the corrected, locked version):**
- **Canonical concepts:** aliases are explicitly Founder-approved before they enter the
  runtime vocabulary. No exceptions.
- **Live signal labels:** runtime-only lexical matching; no aliasing, ever — they are not
  concepts and do not get a concept's governance treatment.
- **Alias discovery:** offline tooling (e.g. mining connector schemas or domain docs for
  candidate synonyms) may exist only as a *proposal generator* — its output is a suggestion
  list for human review, never a runtime input and never authoritative on its own. No
  auto-bootstrap path where mined candidates become live aliases without explicit approval.
- **Runtime:** deterministic and read-only against the already-approved alias vocabulary. The
  matcher never writes, learns, or expands its own vocabulary during a request.
- **No ontology changes.** CARL is Layer 4 / UI only. It references the Lean Ontology's
  existing domain taxonomy for scoping; it does not modify it, does not add a primitive, and
  does not change the Lean Ontology's closed/locked status in any way.
- **No epistemic claim.** CARL improves retrieval recall in the UI. It makes no claim about
  improving signal quality, confidence, or groundedness — those are unrelated axes (§23
  orthogonal axis integrity) and CARL must never be described as touching them.
- **CARL is not a second relevance engine.** It is a retrieval adapter over two already-
  authorized pools, each with its own matching rule. It must not grow into a general-purpose
  scoring/ranking system beyond what's specified here.

---

## COMPONENTS

| Component | Change | Notes |
|---|---|---|
| `DOMAIN_PRECURSORS` (analysisidlefield.jsx) | Restructure `string[]` → `{ id, label, aliases }[]` per domain | Existing 8 terms/domain become canonical labels; aliases added separately, governed |
| Normalizer (`norm()`) | New — case-fold, whitespace/punctuation normalize | Deterministic, no stemmer library dependency needed beyond what's already used |
| Concept matcher | New — token/phrase match (not raw substring) against `aliases[]` | Boundary-aware to avoid false positives (e.g. "art" inside "market") |
| Live-label matcher | Unchanged | Reuses today's `deriveTrendingTerms` + scoring exactly as shipped in item A |
| Alias governance list | New — version-controlled, provenance-tagged (`added_by`, `source`) | Lives in a plain data file, reviewed like any other Founder-authored content (`DOMAIN_PRECURSORS` already sets this precedent) |
| Offline alias-proposal tool | Optional, out of scope for v1 | Produces a review list only; never writes to the governed alias file directly |

**Explicitly out of scope:** embeddings, semantic similarity, LLM classification, runtime
alias generation, ontology expansion, new ontology primitives, automatic synonym adoption that
changes production behavior without review, BM25/statistical ranking (until justified by data).

---

## VALIDATION

If built, Definition of Done would require:
- Grep check confirming the alias-governed matcher and the live-label matcher are two distinct
  code paths (no shared function that could blur the `C*`/`L*` boundary).
- A query with zero literal overlap but a governed alias match (e.g. "where is investment
  moving?" against a `CAPITAL_ALLOCATION` concept whose aliases include "investment
  allocation") surfaces the chip.
- A query with no alias or literal match anywhere in either pool renders nothing — the
  zero-result case from item A must remain intact and untouched.
- A substring false-positive case (e.g. a query containing "art" must not match a concept
  whose alias is "market") is explicitly tested and passes.
- No new network call, no new dependency, sub-millisecond matching cost at the current alias
  vocabulary scale (hundreds of concepts × tens of aliases, per the original proposal's own
  complexity estimate).

---

## ROLLBACK

Nothing to roll back — this is a design note only, no code has been written against it. If
CARL is later built and needs to be reverted, the rollback is: restore `DOMAIN_PRECURSORS` to
its current flat-`string[]` shape and remove the concept-matcher module; the live-signal path
(`deriveTrendingTerms`) is untouched throughout CARL's lifecycle either way, so it needs no
rollback of its own.

---

## GUIDELINES

- Do not build without explicit Founder "go" — this spec's status is CONCEPTUAL / NOT-BUILD
  and stays that way until changed explicitly.
- Do not frame this as part of the Lean Ontology substrate in any future document or commit
  message — it is a UI/retrieval concern layered on top of, and clearly separable from, the
  closed Lean Ontology adoption (`architecture-recon/027`). Conflating the two borrows
  authority from already-verified architecture that this feature has no relationship to.
- Any alias list, if authored, follows the same governance the Founder already applies to
  `DOMAIN_PRECURSORS` today — content ownership stays with the Founder; the agent implements
  the matcher, not the vocabulary.
- Re-read `specs/SPEC-trending-subject-matter-keying.md` before touching this area again — it
  documents the 2026-08-04 predecessor design (including an unbuilt, related proposal,
  `extractSubjectWords()`, for generic stopword-filtered word extraction from typed text) and
  the "always populate" directive this session's item-A change explicitly superseded.

---

## Relationship to prior spec

`SPEC-trending-subject-matter-keying.md` (2026-08-04) proposed `extractSubjectWords()` — a
generic, stopword-filtered extractor pulling significant words directly out of typed text,
independent of any domain ontology. That proposal was never built. It is a different shape of
fix than CARL (unscoped word extraction vs. domain-governed concept/alias retrieval) and this
spec does not resolve or replace it — flagged here only so a future reader sees both open
proposals in one place rather than rediscovering the older one from scratch.
