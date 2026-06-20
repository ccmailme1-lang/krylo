# WO-1825 — Decision Lineage

**Filed:** 2026-06-20
**Status:** OPEN
**Depends on:** WO-1822, WO-1823, WO-1824
**Build target:** Existing targetpacket component

---

## What It Is

Decision Lineage is the record of what the investor believed, what the signal did, and what happened. It is the full arc from signal emergence to resolution — captured, queryable, and compounding over time.

This is what separates Krylo from every other signal tool. Bloomberg tells you what happened in the market. Krylo tells you whether *your read* of the signal was accurate — and builds a calibration profile from the evidence.

---

## The Resolution Event

When the investor marks a Conviction Record as resolved, the system captures:

```
ResolutionRecord {
  convictionId:       uuid,
  resolvedAt:         timestamp,
  resolution:         'confirmed' | 'denied' | 'timed_out',
  signalArc: [
    { timestamp, domain, convergenceScore, convergenceState, velocity }
    // one entry per monitoring check from commitment to resolution
  ],
  happyPathHeld:      boolean,   // did Happy Path qualify at commit AND hold through resolution?
  notes:              string     // optional investor annotation on outcome
}
```

---

## Resolution Types

| Type | Meaning |
|---|---|
| `confirmed` | Thesis proved correct — signal resolved in the direction the investor anticipated |
| `denied` | Thesis proved incorrect — signal resolved against the investor's read |
| `timed_out` | Time horizon elapsed without clear resolution — signal remained ambiguous |

Resolution is investor-declared. The system does not auto-resolve. The investor makes the call — this preserves honesty and prevents the system from gaming its own calibration.

---

## Calibration Output

After sufficient convictions are resolved, the system derives calibration metrics for the investor:

**Overall accuracy:**
*"You have resolved 12 convictions. Confirmed: 8. Denied: 3. Timed out: 1. Accuracy: 73%."*

**Domain-specific accuracy:**
*"Your CAPITAL + TECHNOLOGY reads confirm at 83%. Your LABOR-only reads confirm at 38%."*

**Happy Path accuracy:**
*"Happy Path was designated at commitment in 4 of your 12 convictions. All 4 confirmed. Happy Path accuracy: 100%."*

**Time horizon accuracy:**
*"Your 90-day convictions confirm at 78%. Your 30-day convictions confirm at 45%."*

These metrics are not shown until a minimum threshold of resolved convictions exists — calibration requires data. Before threshold: no metrics displayed.

---

## The Compounding Effect

Each resolved conviction feeds the next:
- The investor learns which domain configurations they read accurately
- The system learns which signal patterns in this investor's history tend to resolve
- Over time: personalized signal intelligence — not just what the market is doing, but what *this investor's edge* actually looks like

This is the moat. Not data. Not synthesis. Calibrated, personalized decision history. No Bloomberg terminal offers this. No Palantir contract includes it.

---

## Display

**Lineage panel** within the Action Plan / targetpacket component:
- Timeline view: each resolved conviction as a row — date, thesis, domains, resolution, Happy Path Y/N
- Calibration metrics (when threshold reached)
- Expandable: click any row to see full signal arc from commitment to resolution

**Sessions Explorer:**
- Resolved convictions archived separately from active ones
- Badge counts: X active, Y resolved

---

## Minimum Threshold for Calibration Display

- Overall accuracy: 5 resolved convictions minimum
- Domain-specific accuracy: 3 resolved convictions in the same domain configuration minimum
- Happy Path accuracy: 2 resolved Happy Path convictions minimum

Below threshold: panel shows resolved convictions list but no calibration metrics. Copy: *"Calibration metrics appear after more convictions are resolved."*

---

## Open Items

- Whether calibration is per-lens (investor calibration vs. realtor calibration stored separately)
- Export of lineage record — investor may want to take this data elsewhere
- Whether timed_out convictions count toward accuracy denominator (suggest: yes, as unresolved reads)
