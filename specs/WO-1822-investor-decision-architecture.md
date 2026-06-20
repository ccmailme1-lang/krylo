# WO-1822 — Investor Decision Architecture

**Filed:** 2026-06-20
**Status:** OPEN
**Priority:** Architecture — ships before WO-1823, 1824, 1825
**Depended on by:** WO-1823, WO-1824, WO-1825
**Build target:** Existing targetpacket component

---

## The Problem

Krylo today is data-centric. It tells the investor what is happening. The signal field surfaces pressure. The synthesis articulates the narrative. Then the session ends and nothing is retained.

The investor has no system of record for their decisions. No way to commit to a thesis. No way to track whether the signal that drove the commitment held. No way to know, over time, whether their signal reads are accurate.

This WO defines the full architecture of the investor's decision cycle within Krylo — the five moments that transform signal intelligence into decision intelligence.

---

## The Five-Moment Decision Cycle

### Moment 1 — Signal (exists)
The convergence field surfaces. ETRs accumulate. The investor sees domain pressure before consensus. Krylo already owns this moment.

### Moment 2 — Thesis Formation (partial)
The synthesis panel generates a narrative from the convergence state. Currently ephemeral — lives in the session, disappears when it ends. Needs to become the seed of a persistent thesis object.

### Moment 3 — Conviction (WO-1823)
The investor commits. One gesture: "I'm taking this." The thesis becomes a Conviction Record — a named, timestamped, persistent decision object linked to the signals that generated it and the synthesis that articulated it. From this moment, the system has a job: watch this.

### Moment 4 — Monitoring (WO-1824)
The system watches the domains and signals that anchored the conviction. When the signal field drifts — convergence drops, velocity reverses, counter-signals emerge — the investor is notified. Not a price alert. A thesis integrity alert. The system tells the investor whether their original read is still holding.

### Moment 5 — Lineage (WO-1825)
The investor resolves the conviction: confirmed, denied, or timed out. The system captures the full arc — signal emergence, convergence trajectory, commitment, pressure evolution, resolution, outcome. Over time this becomes a calibration record: what does the investor's edge actually look like?

---

## Premium Payload Structure

The full premium output = **Target Packet + Action Plan**

**Target Packet** — What is happening and why.
Intelligence brief: ETR synthesis, domain pressure, convergence state, forensic trail. The analyst's read. Builds on existing targetpacket component.

**Action Plan** — What to do about it, and whether it worked.
Decision object: viable paths ranked by convergence backing, Happy Path designation (when qualified), commitment gesture, monitoring, lineage.

Together they close the loop every other tool leaves open. Bloomberg gives data. Krylo gives the read AND the decision system.

---

## Tier Structure

| Tier | What the investor gets |
|---|---|
| Free | Signal field, convergence state, ETR surface |
| Premium | Target Packet (full intelligence brief) |
| Premium+ | Action Plan (decision object — conviction, monitoring, lineage) |

The Action Plan is the highest-value tier because it compounds. Every conviction record makes the next one smarter. That is the moat.

---

## Build Notes

- All builds for this architecture target the **existing targetpacket component**
- Do not create new components that overlap with targetpacket
- Architecture audit required before any code is written — read targetpacket's current rendering pattern first
- WO-1823, 1824, 1825 are the implementation WOs — this WO is the governing spec

---

## Open Items

- Confirm targetpacket component file path before build
- Define the exact "commit" gesture UX — button, gesture, keyboard shortcut
- Determine whether Action Plan is a separate panel or an extension of Target Packet within the same component
