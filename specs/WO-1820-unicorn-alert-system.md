# WO-1820 — Unicorn Alert System

**Filed:** 2026-06-20
**Status:** OPEN
**Priority:** High — core Action Plan infrastructure
**Depends on:** Happy Path qualification spec, Action Plan (Target Packet premium tier), Conviction Record (sessions layer)

---

## Problem

The investor should not have to return to Krylo to discover a unicorn designation. The system watches the signal field continuously. The investor should be notified the moment a watch condition is met — and only when it is genuinely met.

Without this, Krylo is reactive. With it, Krylo becomes proactive.

---

## Core Principle

**Not every Action Plan produces a unicorn. Most won't.**

The alert system exists precisely because unicorn qualification is rare. The investor sets a watch condition and may wait days or weeks. When the alert fires, it carries weight because the qualification criteria are strict. If alerts fired frequently, they would become noise and lose all meaning.

**Rarity is structural, not editorial.** The qualification criteria decide — not the system's disposition toward optimism.

---

## Alert Object Definition

Each alert is a first-class object stored alongside conviction records:

```
{
  id:              uuid,
  createdAt:       timestamp,
  query:           string (optional — ties alert to a specific search/thesis),
  watchDomains:    string[] (e.g. ['CAPITAL', 'TECHNOLOGY'] — minimum 2),
  persistenceMin:  number (hours — minimum window before alert qualifies),
  status:          'watching' | 'fired' | 'expired',
  firedAt:         timestamp | null,
  firedState:      ConvergenceSnapshot | null  — full signal state at fire time
}
```

---

## Unicorn Qualification Criteria (ALL must hold simultaneously)

1. **Cross-domain convergence** — minimum 2 of the investor's watchDomains must be at HIGH convergence simultaneously. Single-domain HIGH does not qualify.

2. **Persistence threshold** — convergence must hold above HIGH for at least `persistenceMin` hours without dropping below threshold. Spikes do not qualify.

3. **Velocity direction** — each qualifying domain must be building (score increasing), not decaying. A domain at 80 trending down does not qualify.

4. **Counter-signal resistance** — active contradicting signals in the watched domains must be below a hard ceiling. Strong counter-signal presence disqualifies regardless of convergence score.

5. **Hard floor — no exceptions** — each qualifying domain must meet the minimum convergence threshold defined by the Happy Path qualification spec. Below the floor: no fire, no approximation, no "approaching unicorn" messaging.

---

## Alert States

| State | Meaning |
|---|---|
| `watching` | Conditions not yet met. System is monitoring. |
| `fired` | All qualification criteria simultaneously met. Investor notified. |
| `expired` | Watch window elapsed without qualification, or investor cancelled. |

There is no "approaching" or "nearly qualified" state. The system does not telegraph proximity to qualification — this would train the investor to pre-act on incomplete signal, defeating the purpose.

---

## UX

### Setting an alert — two entry points

**Entry Point 1: Action Plan panel**
- One gesture: "Watch for unicorn" button
- Micro-form: select domains to watch, set persistence window (default: 72h)
- Optional: tie to current query/thesis
- Confirmation: "Alert set. Watching CAPITAL + TECHNOLOGY. Will notify when unicorn qualification is met."

**Entry Point 2: EQ Canvas peak (WO-1762)**
- Right-click / long-press on any peak in the parabolic EQ canvas
- Trigger configuration opens for that specific peak
- Event selector: emergence / qualification / displacement / decay / multi-peak convergence
- Pre-populated with the peak's domain configuration — no manual domain selection needed
- More surgical than Action Plan entry — watches a specific domain configuration, not the field globally

Canvas-sourced triggers are the higher-value entry point. The investor has already investigated the peak in hover mode, seen it building, and is now committing to watch it. The context is richer than a generic "watch for unicorn."

### When it fires
- In-app notification (Phase A minimum)
- Push / email (Phase B)
- Notification carries: which domains qualified, convergence state at fire time, timestamp
- Opens directly to the signal field at the moment of qualification — investor sees what the system saw

### Alert history
- Fired alerts are preserved with full convergence snapshot
- Investor can review: "CAPITAL + TECHNOLOGY unicorn fired 2026-07-14. Here was the signal state."
- This becomes lineage — over time, a record of when unicorn conditions appeared and what followed

---

## What This Is Not

- Not a price alert. Not triggered by asset movement.
- Not a "trending" alert. Not triggered by ETR volume.
- Not an approximation. No "getting close" notifications.
- Not configurable below the qualification floor. The investor cannot lower the bar.

---

## Lineage Value

Every fired alert record feeds the investor's decision history:
- When did unicorn conditions appear?
- Did the investor act?
- What was the outcome?

Over time: *"Unicorn alerts have fired 4 times in your watched domains. You acted on 3. Resolution rate: 2/3 confirmed."*

This is calibration. The system earns trust by being right, and the record proves it.

---

## Phase Sequence

**Phase A (build now):**
- Alert object creation from Action Plan
- In-app notification on fire
- Alert history panel

**Phase B (deferred):**
- Push notifications
- Email delivery
- Cross-device sync

---

## Open Questions

- Persistence minimum — 72h default needs validation against real signal data
- Counter-signal ceiling threshold — needs definition from Happy Path qualification spec
- Maximum active alerts per user — needs decision (suggest: 5 for free, unlimited premium)
