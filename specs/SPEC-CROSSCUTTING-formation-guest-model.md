# CROSS-CUTTING — Formation Guest Model

Applies to **KRYL-1221, 1222, 1223, 1224, 1225**. Not a ticket. Principles the
five specs share; each spec references this file rather than restating it.

---

## The unified model

```
1221  QUERY CONTEXT
      One authoritative record of what was asked + what was left open
              ↓
1222  COMPLETION
      What is missing?
              ↓
      ┌──────────────────────────────┐
      │        FORMATION             │
      │  1223 Story Type             │
      │  1224 3-Second Read          │
      │  1225 Forecast Boundary      │
      │  +    Provenance Boundary    │
      └──────────────────────────────┘
              ↓
      TRUSTED STRUCTURAL READ
              ↓
      ACT EARLY
```

---

## Principle 1 — Provenance Boundary

Not an implementation detail of 1223/1225. A first-class product property.

> **KRYLO shows where the evidence supports the formation — and where it stops.**

Every guest-facing structural read (Story Type, cone field, forecast) carries an
explicit boundary: *supported through these domains / observations; not corroborated
by those.* This is one of the strongest differentiators in the system — every other
analytical tool presents its conclusion without showing where corroboration ends.

## Principle 2 — Trusted Read → Early Action

The five tickets are not ultimately about prettier visualization or better query UX.
They construct the conditions for:

> **See a structural position clearly enough to act before it becomes obvious.**

Crucially: **KRYLO does not tell the guest to act.** It provides a sufficiently
grounded structural read that *the guest* decides whether to act. No action score,
no "buy window", no recommendation — a read they can trust and own.

## Principle 3 — Layered, not dumbed down

> **The guest view provides the read; inspection provides the reasoning.
> The system is layered, not dumbed down.**

Three seconds does not mean less intelligence. It means: compress the evidence into
a perceptually immediate structural read, and preserve the full reasoning underneath
for anyone who opens inspection. The compression is the product; the reasoning is
never discarded.

This is the convergence of the five tickets.
