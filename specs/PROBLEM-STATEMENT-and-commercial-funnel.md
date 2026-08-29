# KRYLO — Problem Statement & Commercial Funnel

**Status:** FROZEN — Founder problem statement (2026-08-29). Recorded, not
originated. Positioning, not architecture — does not change any gated engineering
work, but constrains the eventual entry/UI.
**Related:** `SPEC-structural-domain-substrate-architecture.md` v0.2.2 (FROZEN),
`SPEC-domain-substrate-integration-contract.md`, `SPEC-subject-scoping-contract.md`.

> Freeze the commercial problem statement before touching the entry UI again.

---

## 1. The problem (the buyer's underlying problem)

> **I have plenty of information. I don't know which separate signals are becoming
> meaningfully related.**

Decision-makers are drowning in signals but still have to manually determine what
matters. They have research, news, market data, economic indicators, technology
signals, workforce data, policy changes, company activity — but these are
organized by **source, industry, or domain**. The structural relationship between
them is left to the human.

The analyst's workflow: `collect → read → compare → connect → hypothesize →
validate → repeat`. The expensive part is not finding information — it is figuring
out whether apparently separate things are actually becoming related.

## 2. How it's addressed today

| workaround | good at | not built for |
|---|---|---|
| **Human analysts** | mental models, spreadsheets, research notes | scale; constrained by the analyst's existing model |
| **Dashboards** (Bloomberg, FactSet, Capital IQ, BI) | *what is happening to this metric* | *what relationships are forming across systems* |
| **Search / AI research tools** | retrieval + synthesis | can construct a compelling explanation without proving the relationship is structurally real (→ "don't confuse coherence with truth") |
| **Domain experts** | the synthesis layer | expensive, hard to scale, bounded by the expert's mental model |

Today's default is **human synthesis**.

## 3. What KRYLO is (the capability)

> KRYLO continuously observes distributed evidence across six domains, identifies
> relationships between signals, and tests whether those relationships constitute
> an emerging structural formation.

It sits **between observation and judgment** — it does not replace Bloomberg,
research databases, news, BI, analysts, domain expertise, or AI research
assistants.

```
INFORMATION
     ↓
OBSERVATION
     ↓
RELATIONSHIPS      ← KRYLO
     ↓
FORMATION          ← KRYLO
     ↓
HUMAN INVESTIGATION
     ↓
DECISION
```

The customer does not buy KRYLO because they need more information. They buy it
because they already have too much information and need help seeing **what is
forming** across it.

## 4. Three layers — do not conflate

1. **The buyer's problem** — §1. Universal to the target buyers.
2. **The buyer's question** — varies by specialty (§5). Entry points, **not
   different products**.
3. **KRYLO's capability** — §3. One engine underneath all of them.

## 5. Specialized entry points

Not "everyone interested in the future" — people whose **job is explicitly to
detect change**. They don't need to be convinced that cross-domain change
matters; their problem is *seeing the relationships*.

| buyer / specialty | they wake up asking… | KRYLO's job |
|---|---|---|
| **Investment Research** | What structural change is emerging beneath the market narrative? | detect cross-domain relationships that may matter to an investment thesis |
| **Corporate Strategy** | What external changes are beginning to alter our operating environment? | surface emerging structural shifts before they become conventional wisdom |
| **Government / Resilience** | Where are multiple systems beginning to experience the same structural pressure? | expose convergence across otherwise separate systems |
| **Demographic Strategy** | What is population change beginning to restructure? | trace demographic pressure across labor, capital, technology, ownership, knowledge |
| **Technology / AI Strategy** | Where is technology adoption beginning to reorganize other systems? | detect second- and third-order structural effects |

## 6. The commercial funnel

```
ENTRY          "Something changed."
   ↓
ORIENTATION    "Show me what is moving."
   ↓
DISCOVERY      "Show me what is connected."
   ↓
VALIDATION     "Is this relationship actually supported by evidence?"
   ↓
FORMATION      "Is something structurally forming?"
   ↓
INSPECTION     "What evidence created this formation?"
```

NOT: `sign up → choose six domains → stare at a visualization`.

## 7. Entry-UI direction

- **Do not** lead with `KRYLO — Structural Intelligence Platform` (category
  language, the product's explanation).
- **Lead with the professional question** (§5), then demonstrate the answer, then
  let them look at something immediately.
- Example homepage: *"Something is changing. Find out what is forming."* →
  *"Across markets, technology, labor, capital, ownership, knowledge and media,
  the signals are already there. KRYLO finds the relationships forming between
  them."*
- The visitor recognizes their **problem** first; the architecture is described
  later.

## 8. Architectural tie-in (why the lens work matters commercially)

The **six domains are the observational substrate — not the commercial starting
point.** The user's problem is the starting point.

```
BUYER QUESTION
     ↓
SEARCHED SUBJECT
     ↓
LENS  (the reusable I_d primitive — Track #3)
     ↓
MICRO-LENS ANALYSIS  (A(d, Subject) — the packet scroll)
     ↓
CROSS-LENS RELATIONSHIPS
     ↓
FORMATION  (F)
     ↓
EVIDENCE / INSPECTION
```

NOT: `choose six domains → inspect data → figure out why you're here`.

This reinforces `SPEC-domain-substrate-integration-contract.md` — AC "Subject
anchors analysis, not the question" — and the subject-scoping contract. It also
means the current `CHOOSE A DOMAIN` control on the Analysis idle search is the
anti-pattern this positioning rejects; its disposition is an integration-phase
item, not a fix now.

Doctrine preserved throughout: **KRYLO detects. The human judges.** The system
never says "therefore the future is X"; it says "these observations are becoming
related — here is the emerging formation — here is the evidence that admitted the
relationships."

## 9. Concise articulation (strongest so far)

> **The world already produces the signals. People already collect them. KRYLO
> helps them see when those signals begin to form something.**
