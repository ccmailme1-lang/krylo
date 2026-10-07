# KRYLO — Positioning

**Status:** DRAFT (2026-10-07). Subordinate to `specs/PROBLEM-STATEMENT-and-commercial-funnel.md`
(FROZEN, 2026-08-29). Where this file and that spec disagree, the spec governs.

---

## 1. One line

> **The world already produces the signals. People already collect them. KRYLO helps them see when
> those signals begin to form something.**

Positioning (locked): **We don't predict. We detect.**

## 2. The problem — the distributed answer

Organizations are not short of information. They already have data feeds, terminals, dashboards,
analysts, consultants, and domain experts.

What they lack is a way to see **which separate signals are becoming meaningfully related**. The
answer to a consequential question is rarely inside one feed, one department, or one industry. It
is distributed across the relationships between them, and today a human has to assemble it by
hand:

```
collect → read → compare → connect → hypothesize → validate → repeat
```

The expensive step is not finding information. It is establishing whether apparently separate
things are actually connected — and doing it while the situation is still live.

## 3. Signal intelligence vs. structural intelligence

| | Signal intelligence | Structural intelligence (KRYLO) |
|---|---|---|
| Question | *Is something changing?* | *What is the change connected to, and is something forming?* |
| Unit | An event, a metric, an alert | A relationship between observations, and the formation those relationships constitute |
| Typical output | "Port congestion is up." "Fuel is up." | "These observations across capital, labor, and technology are becoming related — here is the formation, and here is the evidence that admitted each relationship." |
| Existing tools | Terminals, dashboards, news, alerting | No established tool category is built for this (see `docs/market/competitive-landscape.md`) |

Signal intelligence stops at "something changed." Structural intelligence continues:

```
SIGNAL → RELATIONSHIP → FORMATION → PROPAGATION      │ GUEST: INTERPRETATION → DECISION
              (KRYLO presents)                        │ (the guest owns)
```

- **Signal** — an observation that something moved.
- **Relationship** — an evidenced connection between observations, admitted only with provenance.
- **Formation** — a set of admitted relationships that together constitute emerging structure.
- **Propagation** — the observed paths along which the formation is reaching other entities and
  domains.

KRYLO's responsibility ends at presentation. It does not convert structure into a prediction,
recommendation, risk verdict, or action (CLAUDE.md §21). It also never withholds substantiated
structure because a guest might draw a conclusion from it.

## 4. What KRYLO is — and is not

**Is:** a structural intelligence layer that observes distributed evidence across six domains —
TECHNOLOGY · CAPITAL · KNOWLEDGE · LABOR · MEDIA · OWNERSHIP — identifies relationships between
signals, and tests whether those relationships constitute an emerging structural formation. It can
be pointed at any subject: a company, an industry, a transaction, a market, an emerging situation.

**Is not:**
- a data feed (it consumes them),
- a dashboard (dashboards answer "what is happening to this metric"),
- an AI research assistant (those can build a coherent explanation without proving the
  relationship is real — *don't confuse coherence with truth*),
- an industry-specific operational tool,
- a predictor, recommender, or decision engine.

It sits **between observation and judgment** and replaces none of the tools above.

## 5. Why the industry changes but the problem doesn't

Semiconductors, biopharma, defense, automotive, logistics, media — the subject changes; the
structural problem is identical: *the answer is distributed across relationships the customer
cannot see assembled.* One engine serves all of them. Industries are **subjects**, not separate
products. Buyers are defined by job (see `docs/go-to-market/gtm-strategy.md` §2).

Industry-by-industry problem statements: `docs/market/problem-markets.md`.

## 6. Claims we do not make

Until evidence exists in `docs/evidence/evidence-log.md`, do not say:
- "the only platform that…"
- "deterministic accuracy" / "no hallucination"
- any specific lead time ("90 days ahead", "before the market")
- that KRYLO caught, would have caught, or saved money on any real event
- that KRYLO tells the customer what to do

## 7. Language rules

| Use | Avoid |
|---|---|
| detects, observes, presents, exposes the relationship | predicts, forecasts, recommends, advises |
| formation, relationship, propagation | verdict, signal score as conclusion |
| "here is the evidence that admitted it" | "trust us" / confidence costume |
| "the guest decides" | "KRYLO determines who wins" |
