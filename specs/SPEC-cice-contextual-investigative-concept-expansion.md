# SPEC — CICE: Contextual Investigative Concept Expansion (Investigative Chips)

Status: **TARGET CAPABILITY — AUTHORIZED FOR IMPLEMENTATION.** Scope: paraphrase/surface-form
expansion only (see §SCOPE DECISION). Design drafted from a Founder-directed discussion, relayed
from an external AI across several drafts; each drafted claim was verified against real code in
this conversation (2026-08-11) before being recorded here — not accepted at face value.
Date: 2026-08-11
Target file(s): `src/components/analysis/analysisidlefield.jsx` (existing TRENDING/entity chip
pipeline), `src/engine/intentparser.js` (existing entity extraction), new closed rewrite-table
module (name/location TBD at implementation time).

---

## SCOPE DECISION (2026-08-11 — read this first)

CICE was originally scoped around two example queries. They turned out to be two different
problems, only one of which is buildable inside KRYLO's locked constraints:

1. **Paraphrase expansion** — `"looking to purchase home"` → Mortgage, Real Estate, Down Payment.
   The query text paraphrases the target concepts. Solvable deterministically with a closed
   surface-form → concept-ID rewrite table. **IN SCOPE. Authorized.**

2. **Demographic/thematic inference** — `"45 year old male"` → Income, Retirement, Assets. There
   is no textual relationship between the query and the target concepts — the only way to
   produce this output is a table that maps age/gender directly to assumed financial concerns.
   That is demographic profiling, not concept expansion. It contradicts the founding instruction
   of this feature ("I would not hard-code '45-year-old male → these 10 chips'") and the
   Demographic/Profile Guardrail below. Every mechanism proposed for it during this spec's
   drafting (a governed alias layer, a "signal → concept set" table) was structurally the same
   lookup under a different name. **OUT OF SCOPE. Explicitly dropped, not deferred.**

Dropping (2) means CICE's actual mechanism is a **closed, hand-curated, deterministic
surface-form rewrite table** — the same shape as CARL (rejected same-day, no stated technical
reason given), narrowed to exclude any demographic/behavioral signal input. Authorizing it here
is a deliberate, named reversal of that earlier rejection, scoped down — not a rename intended to
smuggle the same thing back in.

---

## 0. WHERE THIS SITS (already built vs. proposed)

**Already built and live (not part of this spec, recorded for context):**
- `intentparser.js` `extractEntities()` — deterministic, regex-based. Extracts quoted phrases and
  2+-word Title-Case sequences as plain strings. Includes `splitCollapsedCompounds()`, which
  repairs collapsed camelCase text before matching — confirmed by direct trace, this closed out
  the `PROFILERISK`/`SNAPSHOTAGE` lexical question; it is not a CICE blocker (§GUIDELINES).
- `analysisidlefield.jsx` TRENDING chip block — chips require typed text (no text, no chips).
  Candidates = `DOMAIN_PRECURSORS[pill]` (a small hand-curated list per domain, currently 8 terms
  for FINANCIAL) + `deriveTrendingTerms(rawSignals, domain)` (live signal labels), scored by
  literal token/stem overlap against the typed text, kept only if score > 0.

**This spec (CICE) — proposed, NOT yet built:** a closed rewrite table sitting alongside the
existing literal matcher. It does not replace literal matching; it adds a second, equally
deterministic path for known paraphrases of governed concepts.

---

## PROBLEM

Chip generation today is literal-match-only. For `"looking to purchase home"` against FINANCIAL,
the candidate vocabulary (`AGENTIC AI, AI ACCOUNTABILITY, AFFORDABILITY PRESSURE, LOUD BUDGETING,
YIELD HUNTING, STABLECOIN ADOPTION, PRIVATE CREDIT, CYBERSECURITY`) has zero relevant terms —
not a matching-precision problem, the concepts (Mortgage, Real Estate) aren't in the list, and no
paraphrase of "purchase home" would match them even if they were, because matching is literal
token/stem only.

---

## SOLUTION

A closed, versioned, hand-curated table mapping explicit surface forms → a single governed
concept ID, matched deterministically against the query text alongside (not replacing) the
existing literal matcher.

```
Query → [existing literal/stem matcher] ─┐
                                          ├─→ merged candidates → existing scoring/Top-N → chips
Query → [surface-form rewrite table]   ──┘
```

**Mechanism constraints (locked):**
- Zero LLM / ML / embeddings / similarity scoring.
- Table is finite and enumerable — every entry is an explicit, reviewed `surface form → concept
  ID` mapping. No fuzzy matching, no stemming beyond what `intentparser.js` already does.
- Hard rejection of unmatched tokens — no fallback, no soft match. Absence stays absence.
- Hand-curated and frozen per release. New entries require explicit review — no runtime growth,
  no auto-bootstrap from mined data.
- Input is query text only. **No demographic, behavioral, or profile signal may be used as a
  rewrite-table key**, per §SCOPE DECISION — this is the line that keeps this from becoming the
  dropped mechanism again.

**Doctrinal guardrails (mandatory, still apply):**
- **Projection, not prediction.** A chip represents an investigative avenue implied by the
  query text — never a claim about the person.
- **No demographic inference.** Enforced structurally now, not just by policy: the rewrite table
  has no demographic input field to key off of.
- **No demand creation.** Every entry traces to an explicit paraphrase relationship, reviewed
  by the Founder — never selected to maximize engagement.
- **Judgment-free.** A surfaced chip is not a classification of the subject.
- **Presentation stays an instrument label.** No trending/popularity UI language — same visual
  register as the existing chip row.

---

## COMPONENTS

| Component | Status | Notes |
|---|---|---|
| Domain constraint | Exists (pill → `DOMAIN_PRECURSORS` mapping) | Reusable as-is |
| Chip presentation | Exists (`{ lens, label }` render in `analysisidlefield.jsx`) | Reusable as-is, no new visual language |
| Literal token/stem matching | Exists | Unchanged, runs alongside the new table |
| **Surface-form rewrite table** | **To build** | New: `{ surfaceForms: string[], conceptId, canonicalLabel, domain }[]`, hand-curated, versioned. Matched via boundary-aware normalized phrase match (reuse `intentparser.js` normalization patterns), not raw substring. |
| Structured concept object (`conceptId`, provenance) | Not built | Rewrite table entries carry a `conceptId`; full provenance chain not required for this scope — chips remain `{ lens, label }` at render time, same as today |
| Demographic/behavioral signal input | **Explicitly excluded** | Not a component of this spec — see §SCOPE DECISION |

---

## VALIDATION

Definition of Done:
- A query with zero literal token overlap but a governed surface-form match (e.g. "looking to
  purchase home" → `REAL_ESTATE`) surfaces the chip.
- A query with no literal or surface-form match anywhere renders nothing — the existing
  "absence is a legitimate outcome, not padded filler" behavior is unchanged.
- A substring false-positive case (e.g. a query containing "art" must not match a concept whose
  surface form is "market") is tested and passes.
- Grep-confirmed: no code path accepts a demographic, profile, or behavioral value as a
  rewrite-table lookup key.
- No new network call, no new dependency, matching stays sub-millisecond at current vocabulary
  scale.

---

## ROLLBACK

Nothing built yet. If built and reverted: delete the new rewrite-table module and its import in
`analysisidlefield.jsx`; the existing literal matcher is untouched throughout and needs no
rollback of its own.

---

## GUIDELINES

- `PROFILERISK` / `SNAPSHOTAGE` is **not a CICE blocker** — closed as a lexical/entity-parser
  fix (`splitCollapsedCompounds()`, shipped in 0518a78), unrelated to this spec's mechanism.
- Do not re-add a demographic/behavioral/profile input to the rewrite table under any name
  ("signal table," "life-stage table," etc.) — that path was evaluated and explicitly dropped in
  §SCOPE DECISION for a structural reason, not a style preference.
- Do not grow this into a general ranking/relevance engine. It is a second deterministic match
  path feeding the same existing scoring/Top-N logic already in `analysisidlefield.jsx`.
- Vocabulary content (which surface forms map to which concepts) is Founder-authored/approved,
  same as `DOMAIN_PRECURSORS` today — the agent implements the matcher, not the vocabulary.

---

## STATUS

```
CICE                             — TARGET CAPABILITY, SCOPE: PARAPHRASE EXPANSION ONLY
CICE BUILD                       — AUTHORIZED
DEMOGRAPHIC/THEMATIC EXPANSION   — OUT OF SCOPE — explicitly dropped 2026-08-11, not deferred
PROFILERISK / SNAPSHOTAGE        — NOT A CICE BLOCKER — closed as a lexical/entity-parser fix
CANDIDATE-GENERATION MECHANISM   — DETERMINED — closed surface-form → concept-ID rewrite table
```
