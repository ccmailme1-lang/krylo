# WO-1823 — Conviction Record Object

**Filed:** 2026-06-20
**Status:** OPEN
**Depends on:** WO-1822 (Investor Decision Architecture)
**Depended on by:** WO-1824, WO-1825, WO-1820
**Build target:** Existing targetpacket component

---

## What It Is

The Conviction Record is the object created when an investor commits to a thesis. It is the join between signal intelligence and decision intelligence — the moment the investor says "I'm taking this" and the system acknowledges the commitment and begins watching.

It is not a note. Not a saved session. A first-class decision object that the system owns and can interrogate.

---

## Object Definition

```
{
  id:              uuid,
  createdAt:       timestamp,
  query:           string,              // the original search that generated the signal
  thesis:          string,              // the investor's commitment statement
  domains:         string[],            // load-bearing domains (e.g. ['CAPITAL', 'TECHNOLOGY'])
  timeHorizon:     string,              // e.g. '90 days', 'Q3 2026'
  convergenceAt:   ConvergenceSnapshot, // full signal state at moment of commitment
  happyPath:       boolean,             // was a Happy Path designated at commit time?
  status:          'active' | 'resolved' | 'expired',
  resolvedAt:      timestamp | null,
  resolution:      'confirmed' | 'denied' | 'timed_out' | null,
  notes:           string | null        // optional investor annotation
}
```

---

## The Commitment Gesture

One button in the Action Plan panel: **"Commit Thesis"**

On click:
1. Micro-form appears — thesis statement (pre-populated from synthesis), time horizon, confirmation of load-bearing domains
2. Investor reviews, edits if needed, confirms
3. Conviction Record is created and stored
4. System confirms: "Conviction recorded. Watching CAPITAL + TECHNOLOGY. Time horizon: 90 days."
5. Record is now live — WO-1824 monitoring begins

The gesture should feel deliberate. This is not a one-click save. The investor is committing to a read.

---

## Storage

- Stored in localStorage alongside session records (`krylo_convictions`)
- Linked to the session that generated it via session ID
- Accessible from Sessions Explorer
- Persistent across sessions — convictions survive browser close

---

## Convergence Snapshot

At the moment of commitment, the system captures a full snapshot of the signal field:

```
ConvergenceSnapshot {
  timestamp:     number,
  domains: {
    [domain: string]: {
      convergenceScore:  number,
      convergenceState:  string,
      velocity:          number,
      etrs:              ETR[]
    }
  }
}
```

This snapshot is the baseline. WO-1824 monitoring measures drift against it. WO-1825 lineage captures the full arc from this point to resolution.

---

## UX States

| State | Display |
|---|---|
| `active` | "Watching" — visible in Sessions Explorer and Action Plan |
| `resolved` — confirmed | "Confirmed" — archived in lineage |
| `resolved` — denied | "Denied" — archived in lineage |
| `expired` | "Timed out" — time horizon elapsed without resolution |

---

## Open Items

- Pre-population of thesis statement from synthesis — confirm synthesis output format
- Time horizon options — free text vs. preset durations (30/60/90/180 days)
- Maximum active convictions per user — needs product decision
