# SPEC — Named-Unverified Subject (KRYL-1237)

**Status:** PROPOSED — awaiting Founder go. Recorded from Founder intent (Oriole
submission message, 2026-08-30), not originated.
**Parent:** `SPEC-WO5B-subject-binding.md` · `subjectscope.js` (KRYL-1234)
**Sequence:** 1239 ✓ → **1237** → 1238 → 1236

---

## PROBLEM

A deal submission that **explicitly names its subject company** resolves to
`DECISION_FRAME`, not to that company, because the name is not one of the 57
hand-curated `entityregistry.json` entries.

Oriole fixture — `"Oriole Networks is raising a $120M Series B at a $305M pre-money
valuation, led by Engine Ventures and Carbon Direct Capital, with participation from
AMD…"`:

| machinery already has | guest gets |
|---|---|
| `qc.intent.entities` includes `"Oriole Networks"` | `subjectScope → DECISION_FRAME` |
| `qc.numbers = [120M, 305M, 4, 5M]` | deal frame discarded |
| `decisionCues = ["invest"]` | raw pitch text becomes the packet identity |

The submission is the **capture / provenance**. The company is the **subject**. The
round is the **frame**. Today all three collapse into the raw-query blob.

Founder invariant for this fixture: *"Oriole resolved ✓ / Deal frame resolved ✓ /
Claims extracted ✓ / Evidence provenance preserved ✓ / Unverified fields remain
absent ✓"* — and *"contextual clues can drive entity resolution; they cannot
silently establish entity identity"* (explicit naming may; inference from clues may
not — that is 1238).

---

## CONTRACT (invariant)

> A named-unverified subject establishes the **object of observation**. It is never
> evidence, never a verified identity, and never a conclusion input. Its presence
> does not generate a verdict, score, or formation. Every domain answer for it is
> stated absence until a real source binds an identifier to it.

Pipeline unchanged: subject resolution → observation → formation. The only change
is that "subject resolution" can now land on an explicitly-named company that is
not in the curated registry.

---

## DESIGN — `subjectscope.js` resolution layer only

### 1. Result shape

`subjectScope` ENTITY result gains one field:

```
{ kind: 'ENTITY',
  verification: 'REGISTRY' | 'NAMED_UNVERIFIED',
  canonicalId, entity: { canonicalId, name, identifiers, domainTags },
  matchedOn, confidence?, namedVia? }
```

- Registry hits → `verification: 'REGISTRY'`. **No other behavior change.**
- A `NAMED_UNVERIFIED` result carries `identifiers: {}`, `domainTags: []`,
  `namedVia: '<the syntactic pattern that promoted it>'`.

### 2. Promotion rule (the guard against silent identity)

Runs **only after** the registry pass fails (a registry hit always wins). A
candidate name from `qc.intent.entities` / title-case spans is promoted to
`NAMED_UNVERIFIED` **iff** all hold:

1. It occurs in an **explicit-subject position**, one of:
   `<Name> is raising` · `<Name> (is|are) a[n]? (company|startup|business|firm|
   platform|team|venture)` · `<Name>('s)? (Series [A-Z]|seed|round|raise|deal|
   financing)` · `Deal Submission[\s—:-]+<Name>` · `(investing|invest) in <Name>` ·
   `<Name>[\s—-]+(a |an )?(company|startup|…) (that|building|developing)`
2. It does **not** occur in a context/attribution position:
   `led by <Name>` · `participation from <Name>` · `backed by <Name>` ·
   `alongside <Name>` · `ex[- ]<Name>` · `former .* (at|of) <Name>` ·
   `advisor[s]? <Name>` · `partner .* <Name>`
3. It is not stopword-only ("Deal Submission", "Why Invest" are rejected by the
   existing `ENTITY_STOPWORDS` / a small local list).
4. **Exactly one** candidate survives 1–3. Zero → stays `DECISION_FRAME`. Two or
   more → stays `DECISION_FRAME` (`reason: 'multiple named subjects — ambiguous'`).
   No silent pick.

### 3. `canonicalId`

`buildCanonicalId(name)` slug (`entityresolution.js`) → `oriole-networks`. Stable,
deterministic, no registry write.

### 4. Scopability + the evidence boundary (why this is safe)

`isScopable(scope)` stays `kind === 'ENTITY'`. `A(d, scope)` therefore runs for a
`NAMED_UNVERIFIED` subject:

- measures resolve `scope: 'subject'` → every one returns `STRUCTURAL_ABSENCE`
  naming its required source class (unchanged).
- `getDomainEvidenceFacets(D, { subject: scope })` binds facets by **identifier
  containment** (`subjectbinding.js`). A `NAMED_UNVERIFIED` subject has **no
  identifiers** → nothing binds → `observations: []` → `absence` set.

The evidence boundary is preserved **by construction**: with no identifiers, no
facet can attach, so no pitch claim can be laundered into evidence.

### 5. Deal frame (context, not conclusion)

`subjectScope` result gains `frame` for the `NAMED_UNVERIFIED` (and existing
`DECISION_FRAME`) case:

```
frame: { stage: 'Series B' | null, round: 120_000_000 | null,
         preMoney: 305_000_000 | null, source: 'submission' }
```

Derived from `qc.numbers` + a stage regex. Carried as labelled context only — same
invariant as Frame Anchoring: *never a conclusion input*.

---

## DOWNSTREAM — `targetpacket.jsx` PRIMARY SIGNAL

`verification === 'NAMED_UNVERIFIED'`:

> **{Name}** named as the subject of this submission — **not independently
> verified**. The submission is the source; its claims are not evidence. The six
> domains below are stated absence until a source binds to {Name}. This packet does
> not produce a decision verdict.

Meta line: `SUBJECT {canonicalId} · NAMED, UNVERIFIED · DEAL FRAME {stage} {round}`.
The `verification: 'REGISTRY'` copy is unchanged.

---

## NON-GOALS

- No write to `entityregistry.json`. No `createEntity()` runtime admission (that is
  an admission-provenance decision — KRYL-1201 — and separate).
- No NLP of the pitch body beyond the deal-frame numbers. Claim extraction is not
  in this ticket.
- No change to `resolve()`, `entityresolution.js`, formation, or the Class-E /
  facet machinery.
- No verdict, no score, no recommendation.
- 1238 (candidate resolution from *clues*) is untouched — this ticket only handles
  an **explicitly named** subject.

---

## VALIDATION

- `qa_namedunverified.mjs` (new): Oriole blob → `ENTITY / NAMED_UNVERIFIED /
  oriole-networks / "Oriole Networks"`; `A('CAPITAL', scope).scoped === true`,
  `observations === []`, every measure `STRUCTURAL_ABSENCE`, `absence` set;
  `"led by Engine Ventures"` alone does not promote; two named subjects → stays
  `DECISION_FRAME`; healthtech/ex-Neuralink blob → still `DECISION_FRAME`.
- Registry regression: Anduril / Lockheed / Microsoft → `verification: 'REGISTRY'`,
  all existing `qa_*` green (subjectscope, adsubject, guest acceptance, 5B-1).
- `vite build --mode development` clean.

## ROLLBACK

`subjectscope.js` additive branch + one `frame` field + `targetpacket.jsx` copy
branch. Revert = drop the `NAMED_UNVERIFIED` branch; `resolve()` and the registry
are untouched.
