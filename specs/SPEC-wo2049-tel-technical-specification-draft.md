# SPEC — WO-2049 Truth Event Ledger: Technical Specification Draft + Dependency Map

Date: 2026-08-20
Status: SPECIFICATION DRAFT. No implementation. No governance decision made or implied. No
modification to KRYL-1133, the vocabulary amendment, Gate-0, or Formation-B.
Relationship to prior work: `specs/SPEC-wo2049-tel-capability-reconciliation.md` (Jira KRYL-1134,
2026-08-02, status verified live this session: `Ready`, unresolved) already performed the capability
inventory and options analysis this document builds on — re-verified below, not repeated blind, and
extended toward an actual technical draft as requested. That document's own §7 sequenced a full
technical spec *after* its gating question (DQ-1) resolves. This document proceeds anyway, per
explicit instruction, by drafting the option-agnostic technical core and marking every place the
design fork on DQ-1 rather than resolving it.

Every fact below is labeled **[FACT]** (checked directly against live code/Jira this session) or
**[DESIGN]** (proposed, not yet decided). Founder-level decisions are labeled **[FOUNDER DECISION
REQUIRED]** and are not resolved by this document.

---

## 1. Re-verification of prior findings (§27.8 — do not carry forward as settled without checking)

**[FACT]** `KRYL-1134` (the prior reconciliation ticket) — live Jira status: `Ready`, Resolution
`None`. DQ-1 was never resolved. Confirmed this session.

**[FACT]** `KRYL-1133` — live Jira status: `Ready`, Resolution `None`. Confirmed this session
(earlier work).

**[FACT]** `src/engine/identitylineage.js` — not re-read in full this session; prior finding
(in-memory pub/sub, no durable persistence) is carried forward as **unconfirmed, not reverified**,
per the standing rule that a prior claim must be labeled as such rather than restated as fact.

**[FACT]** `convictionstore.js` — same: prior finding (`sessionStorage`, mutable, not applicable)
carried forward as **unconfirmed, not reverified** this session.

## 2. New finding this session — not in the prior reconciliation document

**[FACT]** `src/egress/supabase-client.js` exists, live-coded (not a stub), tagged `WO-2010.5`.
It writes to a real Supabase table named **`event_envelope`** via:

```js
supabase.from('event_envelope').upsert(payload, { onConflict: 'session_id' })
```

**[FACT]** This is `.upsert()` keyed on `session_id` — each write **overwrites** the prior row for
that session. It is explicitly not append-only and not immutable, which directly conflicts with
TEL capability requirements #1 and #2 from the prior reconciliation (append-only persistence,
immutable historical events — both marked MUST).

**[FACT]** `persistConvergenceSnapshot()`, the only exported function in this file, has **zero live
callers** anywhere in `src/`. Confirmed by repository-wide search this session. Same
built-but-disconnected pattern as every other subsystem found in this investigation chain.

**[FACT]** `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are referenced but their
presence/validity was not checked (per §24 Secret Exposure Guardrail — existence-only checks
permitted, values never inspected; not performed here as it wasn't necessary to establish the
above).

**Conflict this creates, stated plainly:** a real table already exists in production Supabase
infrastructure named `event_envelope`, built for a different purpose (WO-2010.5's convergence
snapshot egress), with a shape (upsert-per-session) incompatible with TEL's append-only requirement.
Any future TEL implementation using Supabase must not reuse this table or this name without an
explicit reconciliation decision — silently colliding with it would either corrupt WO-2010.5's
intended use (if it's ever wired up) or silently violate TEL's own append-only invariant.

## 3. Capability requirements — re-affirmed from KRYL-1134, not restated as new

**[FACT]** The 12-item capability list in KRYL-1134 §2 was re-read this session and is
architecturally sound as a floor. Not re-derived from scratch — restating it here would risk silent
drift from the already-reviewed version. See that document directly.

**[DESIGN]** One addition proposed for this draft, not present in KRYL-1134: **item 13 — vocabulary
awareness.** Since this session's chain (H1/H2/DECISION-VOCAB-001) established that admitted
relationships may originate from two distinct governed vocabularies (5-kind RKM genealogy, 14-type
SRE RelationCore) under one governance authority, TEL's event schema must carry which vocabulary and
which specific type produced an event — not just a generic `relationshipId`. This wasn't knowable
when KRYL-1134 was written (2026-08-02, before the vocabulary amendment existed) and is a real,
concrete downstream consequence of this session's rulings landing on Path A (expand) rather than
Path B (restrict).

## 4. Option-agnostic technical core — draftable regardless of DQ-1's resolution

The following is common to KRYL-1134's Options A (Single Universal), B (Domain-Scoped), and C
(Hybrid) — it specifies *what an event looks like and how it's read/written*, not *how many ledgers
exist or who owns them*. This is the part of a technical spec that does not require DQ-1 to be
resolved first.

### 4.1 — Event schema (draft)

```
TruthEvent {
  eventId          ULID, globally unique, generation-ordered
  eventType        enum: RELATIONSHIP_PROPOSED | RELATIONSHIP_ADMITTED | RELATIONSHIP_REJECTED |
                         RELATIONSHIP_CHALLENGED | RELATIONSHIP_SUPERSEDED
                   (mirrors KRYL-1133's admissionState machine — not a new vocabulary)
  vocabulary       enum: RKM_GENEALOGY | SRE_RELATIONCORE        [DESIGN — new, §3]
  relationType     string, validated against the vocabulary's own closed enum at write time
                   (5-kind or 14-type per `vocabulary` above — never a free string)
  relationshipId   the RelationshipProposal/RelationCore id this event concerns
  subjectId        \
  objectId         / carried through unchanged from the source proposal, never re-derived
  decision         admissionState value, when eventType is a decision event
  rationale[]      { ruleId, outcome: PASS|FAIL|ESCALATE, message }   -- per KRYL-1133 §3
  decidedBy        authority boundary identifier                      -- capability #12
  rulesetVersion   sem-ver string                                     -- capability #6
  evidenceRefs[]   pass-through, never re-validated by TEL itself
  supersedes       nullable, prior eventId when this is a SUPERSEDED event
  recordedAt       server-assigned, monotonic within a partition
  producedAt       claimed by the proposer, distinct from recordedAt (capability #5, provenance)
}
```

**[DESIGN]** Every field above is either lifted directly from an already-ratified-in-substance
document (KRYL-1133's `RelationshipProposal`/`AdmissionDecision` shapes, §2.1/§2.2) or explicitly
marked as new. Nothing here invents new governance semantics — it is a storage shape for events
that already have a defined meaning elsewhere.

### 4.2 — Write contract

**[DESIGN]** Single write operation: `appendEvent(TruthEvent) → { eventId, recordedAt }`. No update,
no delete, no upsert. This is the one hard technical requirement that follows directly from
capability #1/#2 regardless of DQ-1 — and it is exactly what `supabase-client.js`'s `.upsert()`
pattern (§2) violates, which is why that table cannot be reused as-is.

**[DESIGN]** Idempotency (capability #8): write is keyed by a caller-supplied idempotency token
(e.g., `relationshipId + eventType + rulesetVersion`), not by `session_id` (the pattern in the
existing Supabase table, which is the wrong key for this purpose — a session is not a relationship).

### 4.3 — Read/replay contract

**[DESIGN]** Minimum: `getEventsFor(relationshipId) → TruthEvent[]`, ordered by `recordedAt`, and
`replayFrom(timestamp) → TruthEvent[]` for global-order replay (capability #3). Query patterns
beyond this (capability #9, SHOULD) are not specified here — genuinely fork on DQ-1, since a
single-ledger vs. domain-scoped-ledger answer changes what "query interface" even means
architecturally.

## 5. Where the design genuinely forks on DQ-1 — not resolved here

**[FOUNDER DECISION REQUIRED — DQ-1, carried forward from KRYL-1134, still open]:**
Single universal TEL, domain-scoped ledgers, or the hybrid model. This determines:
- Whether §4's schema lives in one physical store or is replicated per domain with a checkpoint
  protocol into a core store (Option C).
- Whether `getEventsFor`/`replayFrom` query one store or federate across several.
- Ownership/SLA (KRYL-1134 DQ-2), which cannot be assigned before DQ-1 is answered.

This document does not narrow KRYL-1134's three options or express a preference among them. §4 is
written so that whichever option is chosen, the event shape and write/read contract do not need to
be redesigned — only the deployment topology around them does.

**[FOUNDER DECISION REQUIRED — new, this session]:** whether `src/egress/supabase-client.js`'s
`event_envelope` table is retired, repurposed (with its upsert pattern removed), or left alone as an
unrelated WO-2010.5 artifact once TEL work begins. Not resolved here — flagged because it's a real,
concrete naming/shape collision a future implementer would otherwise hit without warning.

## 6. Dependency / implementation map

```
KRYL-1133 (Ready, unresolved)
        |
        v
Vocabulary Amendment (content complete, ratification pending)
        |
        v
Gate-0 (CLOSED — all 14 SRE types Defer; 5-kind RKM types independently unassessed by this
        session's Gate-0 pass, which scoped to the newly-recognized 14 only)
        |
        v
DQ-1 resolution (KRYL-1134, Ready, unresolved)         <-- FOUNDER DECISION, blocks everything below
        |
        v
TEL event schema + write/read contract ratification (this document's §4, once DQ-1 unblocks
        which topology it deploys into)
        |
        v
Supabase event_envelope disposition decision (§5, new this session)
        |
        v
TEL implementation (engine + storage, per DQ-1's chosen topology)
        |
        v
RelationCore producer (still separately blocked — needs TEL to exist to write admission events into)
        |
        v
Governed relational substrate
        |
        v
Formation-B
        |
        v
Structure Map
```

## 7. Explicit non-goals (restated per instruction)

No governance decision made. No ledger topology selected. No schema ratified — §4 is a draft input
to that ratification, not the ratification itself. No implementation. No changes to KRYL-1133, the
vocabulary amendment, Gate-0, or Formation-B. No claim that `event_envelope` is usable or unusable
for TEL — only that it conflicts with the append-only requirement as currently shaped, which is a
fact, not a recommendation to change it.

## 8. Standing state

Phase 3: FAILED (separation), null VALID. Formation-B boundary: provisional, B3 ∧ B4 ∧ B5.
"Admitted": RULED — R2. DECISION-VOCAB-001: RULED — Path A. Vocabulary amendment: content complete,
ratification pending. Gate-0: CLOSED, all 14 SRE types Defer. **KRYL-1134 / DQ-1: still open,
verified live via Jira this session, unchanged by this document.** WO-2049 technical draft: this
document — event schema and write/read contract proposed, topology undecided. New conflict found:
`event_envelope` Supabase table (WO-2010.5, orphaned, upsert-based) collides with TEL's append-only
requirement if reused without reconciliation. Producer: blocked. Formation-B: blocked. Structure
Map: unchanged, synthetic, honestly labeled.

---

# ADDENDUM A — DQ-1 RESOLVED + event_envelope DISPOSITION (Founder ruling, 2026-08-20)

## DQ-1: RESOLVED — single authoritative Truth Event Ledger

> **One append-only TEL. Not domain-scoped ledgers. Domain/vocabulary awareness lives inside each
> event, not in separate authorities.**

Rationale (Founder): admission is one governance act regardless of which vocabulary (RKM genealogy
or SRE RelationCore) the relationship belongs to. One authoritative history makes
Discovery ≠ Admission ≠ Storage enforceable and auditable. Separate ledgers would create
reconciliation overhead for exactly the cross-domain relationships KRYLO exists to expose.
Formation-B gets one unambiguous source: the admitted population derived from one ledger.

```
                 WO-2049
          SINGLE TRUTH EVENT LEDGER
                    |
       +------------+------------+
       |            |            |
     RKM          SRE          future
   genealogy    RelationCore   governed
       |            |
       +------------+------------+
                    |
              ADMITTED SET
                    |
               Formation-B
```

**Confirmed consistent with existing code, no rework required:** `src/engine/truthevent.js`
(written same session, 29/29 QA) already implements exactly this shape — one `TruthEvent` type
carrying a `vocabulary` field (`RKM_GENEALOGY` | `SRE_RELATIONCORE`) as domain-aware metadata
inside each event, not as separate event types or separate stores.

## event_envelope: RESOLVED — preserved separately, not converted

> **Do not silently convert the existing `event_envelope` (WO-2010.5) upsert contract into TEL.**
> Preserve it for its existing purpose. TEL gets its own append-only structure — either extending
> `event_envelope`'s infrastructure with a new table/schema, or a formally distinct one, decided at
> implementation time, not assumed now.

Rationale (Founder): `event_envelope` (operational event transport/storage) and TEL (authoritative
governance history) are different semantic objects that may share infrastructure but must not be
assumed identical. Converting the session-keyed upsert table into an append-only ledger would risk
breaking WO-2010's existing contract and conflating two different concerns.

**Confirmed consistent with existing code, no rework required:** `truthevent.js` does not reference
`event_envelope`, does not import `supabase-client.js`, and uses `relationshipId + eventType +
rulesetVersion` as its idempotency key — explicitly not `session_id` (`idempotencyKey()`'s own
comment already states this, written before this ruling landed).

## Standing state

Phase 3: FAILED (separation), null VALID. Formation-B boundary: provisional, B3 ∧ B4 ∧ B5.
"Admitted": RULED — R2. DECISION-VOCAB-001: RULED — Path A. Vocabulary amendment: content complete,
ratification pending. Gate-0: CLOSED, all 14 SRE types Defer. **DQ-1: RESOLVED — single ledger.**
**event_envelope: RESOLVED — preserved, not converted.** `truthevent.js`: built, 29/29 QA, additive,
not wired live. Next: admission machinery (evaluate against Gate-0 policy, emit TruthEvents),
tested against controlled RelationCore fixtures per the execution-mode sequence.
