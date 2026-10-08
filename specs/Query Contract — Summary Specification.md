# Query Contract — Summary Specification

**Status:** DRAFT v2, 2026-10-07. Founder-authored normative text (§1–§13). Not authorized
for build. No Jira ticket assigned.
**Classification:** §2 Class **E** (actual capability gap).
**Supersedes:** v1 of this file (organized around the two failures; this version specifies the
general capability, and the failures are regression cases only).
**Evidence base:** Appendix A, traced against commit `343d104` (2026-10-06). Line references
must be re-checked against current `main` before build.
**Not modified:** `specs/def-subject-resolution-admits-subject-not-in-query-20261006.md`.

---

## 1. Purpose

KRYLO must determine what the user is asking about and what they want to know about it before
entity resolution or structural analysis begins.

The result is a single authoritative Query Contract.

**Core invariant:**

> SUBJECT + OBJECTIVE ARE THE QUERY CONTRACT.

**Required ordering:**

```
SELECT → LOCK → RESOLVE → ANALYZE
```

---

## 2. Query Contract

```ts
interface QueryContract {
  subject: {
    text: string;
    canonicalId: string | null;
    attribution: "RESOLVED" | "UNRESOLVED" | "AMBIGUOUS" | "NONE";
  };

  objective:
    | "INVESTMENT"
    | "ACQUISITION"
    | "STRUCTURAL_READ"
    | "DECISION_CONTEXT"
    | "DECISION_FRAME"
    | null;

  mentions: Array<{
    text: string;
    canonicalId: string | null;
    role: "CONTEXT" | "COMPARISON" | "OTHER";
  }>;

