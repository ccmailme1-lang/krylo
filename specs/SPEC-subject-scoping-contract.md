# Design Note — Subject-Scoping Contract for `A(d, Subject, scope, queryContext)`

**Status:** DESIGN NOTE — not a spec, not implementation-authorized
**Version:** 0.1
**Parent:** `SPEC-structural-domain-substrate-architecture.md` v0.2.2 §5, §7, §12
**Purpose:** define the chain that must exist before the Data Substrate can render
subject-scoped domain observations. Answers the question the §21 ruling exposed:

> **How does KRYLO determine that an observation belongs to the searched subject?**

No code. This note becomes an input to the later integration ticket, not a licence
to build.

---

## 1. The required chain

```
SEARCH
  ↓
SUBJECT IDENTITY / RESOLUTION      what, precisely, is being asked about?
  ↓
EVIDENCE RELEVANCE                 which observations bear on that subject?
  ↓
DOMAIN ATTRIBUTION                 which domain axis does each relevant observation sit on?
  ↓
A(d, Subject, scope, queryContext) the subject-scoped application function
  ↓
OBSERVATIONS                       per-domain, per-subject
```

Until this chain exists, `signalIntensity = 0.75` can be a real number that is
**semantically unbound** to the thing the user asked about. Rendering it in a
subject-labelled tab asserts a binding that has not been computed. That is the
field-observation → searched-subject collapse v0.2.2 forbids.

---

## 2. What already exists (partial coverage)

| chain step | existing module | what it does | gap for this contract |
|---|---|---|---|
| SUBJECT IDENTITY | `engine/querycontext.js` (KRYL-1221) | intake record: intent verb, entities, numbers, geo-ambiguity, assetClass, decisionCues | extracts *candidates*; does not resolve "the subject" as a single addressable thing |
| SUBJECT IDENTITY | `engine/entityresolution.js` (ERK, KRYL-1007) | raw name string → canonical entity card (normalize + registry lookup) | needs a **name**; a decision-frame query ("open a second facility") has no name to resolve |
| SUBJECT IDENTITY | `engine/mcvresolver.js` (WO-1841) | `resolveMCV(query, session)` — intent-space behavioural priors | context vector, not subject identity; Phase A priors only |
| EVIDENCE RELEVANCE | `engine/relevancebroker.js` (KRYL-1026) | `computeRelevance(condition, signals)` — ranks signals by decision-value to a **detected SES condition** | scoped to an SES condition, not to a subject / `queryContext` |
| DOMAIN ATTRIBUTION | `engine/entityattribution.js` (WO-1725) | `attributeEntityToSignals(entityName, signals)` — per-domain attribution + weighting for a **named entity** | works for a named entity only; Phase A **static mock affinities** |
| `A(d, Subject, ·)` | — | — | **does not exist.** `computeDomainPressure(domain, windowMs)` is field-scoped, no subject parameter |
| domain pressure (field) | `engine/domaingravity.js` | `computeDomainPressure` / `getAllDomainPressures` — pool reads over a time window | the field baseline `A` would narrow from; not subject-aware |

So: the outer ends exist in primitive form (intake parse; field pressure). The
**middle three steps** — resolving a subject, scoping evidence to it, attributing
that evidence to a domain axis — are each partial and each scoped to a *different*
anchor (name / SES condition / named entity), none of them the searched subject
as such.

---

## 3. The blocking question — unit of analysis

The chain assumes "the subject" is a resolvable thing. For a large class of KRYLO
queries it is not a named entity — it is a **decision frame** ("should we open a
second facility", "hire in-house vs contract"). What the observation attaches to
in that case is unsettled.

This is not new and not for this note to decide: see
`specs/SPEC-unit-of-analysis-inquiry.md` — "the unit of analysis is precisely what
has never been settled … Formation-B unit of analysis: **blocked**."

**Consequence:** the subject-scoping contract cannot be finalised ahead of a
working definition of subjecthood for decision-frame queries. It can be *drafted*
against the entity case (where ERK + entity attribution already partly work) and
explicitly return **classified absence** for the decision-frame case until the
unit-of-analysis question has a working answer.

---

## 3a. Worked failure — "Is Anduril a good acquisition target?" (live, 2026-08-29)

A concrete case of the entity path failing today. Observed packet render:

- **Subject not resolved.** "Anduril" is an ERK-resolvable entity (defense tech
  company). The system instead grabbed `"Is Anduril"` as a 2-word chunk →
  `Anchor: IS ANDURIL`, `Lens: IS ANDURIL`, `P4 … IS ANDURIL LENS`. Pseudo-lens
  defect (same class as the "DAVID MILLER BUDGET" incident).
- **Routed to `GENERAL`** because the *question* is broad — even though the
  *subject* is fully resolvable.
- **Real signal discarded.** The render carries `Live OWNERSHIP signal: 56/100,
  29 active signals, fracture polarity` + `05 PROVENANCE: MEASURED` — yet PRIMARY
  SIGNAL says "no anchoring inputs detected" and PROVENANCE says "No verified
  record found … add a dollar amount". (Signal-resolution-mechanic territory.)
- Legacy generic scaffold rendered: STAKE / MOVE / WINDOW / LEVERAGE FIELD,
  "select your situation type", "add a capital floor", CAC/ROAS/LTV.

**Load-bearing distinction (Founder, 2026-08-29):** a question insufficient for a
*decision conclusion* is **not** insufficient for *observing the subject through
the six domains*. `subjectScope("Is Anduril a good acquisition target?")` must
yield `{ kind: 'ENTITY', canonicalId: <Anduril> }` and the packet must run
`A(d, Anduril)` for all six `d`. The acquisition verdict stays unscored; the six
domain observations are still owed.

**Adjacent (non-blocking) bug found:** the KRYL-1218 `hasDecision` regex matches
`acquir` (acquire/acquiring/acquired) but **not "acquisition"** — so "acquisition
target" reads as a directional signal with no decision detected. One-line fix
available (`acquir` → `acquir|acquisition`), but it patches the legacy layer this
architecture retires; note it, don't prioritise it.

---

## 4. A minimum working contract (for the entity case only)

```
subjectScope(queryContext) →
  { kind: 'ENTITY', canonicalId }          // ERK resolved a name
  | { kind: 'DECISION_FRAME', frame }      // decisionCues present, no entity → NOT yet scopable
  | { kind: 'UNRESOLVED', reason }         // neither

A(d, Subject, scope, queryContext):
  if subjectScope.kind !== 'ENTITY':
     return { signalIntensity: absent(structural), observationCount: 0,
              polarity: absent(structural), reason: 'subject not entity-resolvable' }
  // ENTITY path:
  relevant   = relevanceBroker over field signals, keyed to canonicalId (NOT SES condition)
  attributed = entityAttribution(canonicalId, relevant)      // real affinities, not mock
  return per-domain rollup of attributed, scoped to `scope.temporal`
```

Preconditions this exposes (all real work, none in scope here):

1. `relevancebroker.computeRelevance` must accept a **subject key** (canonicalId),
   not only an SES condition.
2. `entityattribution` must move off Phase A **mock affinities** to real
   per-domain attribution, or the numbers are fabricated (frozen spec §12, §16).
3. ERK (`entityresolution.js`) must be fed a **name extracted from the query** —
   `queryContext.intent.entities` is the candidate source; needs a selection rule.
4. The decision-frame path stays **classified absence** until unit-of-analysis is
   settled — it is not a bug to be papered over.

---

## 5. Relationship to the tracks

- This note is the "subject-scoping design" item the §21 ruling permits.
- It is a **precondition input** to: Track #1's `replace SIGNAL / PRESSURE`
  actions (they need subject-scoped `A`), and to the eventual Target Packet Data
  Substrate integration ticket.
- It does **not** unblock any `targetpacket.jsx` work. Integration stays gated
  behind `{T1, T2, T3} ≺ integration` and, additionally, behind a resolved (or
  explicitly deferred) unit-of-analysis question for decision-frame subjects.

---

## 6. Recommendation

1. Treat §4 as the draft contract, entity-case only.
2. Route the decision-frame case to classified absence — do not invent a subject.
3. Escalate the unit-of-analysis question (`SPEC-unit-of-analysis-inquiry.md`) as
   the real blocker for the majority of KRYLO queries, which are decision frames.
4. `entityattribution` Phase B (real affinities) and `relevancebroker` subject-key
   support are the two concrete engine pieces that would move this from note to
   buildable contract.
