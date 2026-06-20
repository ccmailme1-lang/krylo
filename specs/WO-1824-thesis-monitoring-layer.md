# WO-1824 — Thesis Monitoring Layer

**Filed:** 2026-06-20
**Status:** OPEN
**Depends on:** WO-1822, WO-1823
**Depended on by:** WO-1825
**Build target:** Existing targetpacket component

---

## What It Does

Once a Conviction Record exists (WO-1823), the system has a job: watch the signal field against the thesis and surface drift.

This is not a price alert. It is a **thesis integrity alert** — the system tells the investor whether the convergence conditions that generated their conviction are still holding, degrading, or strengthening.

---

## What Gets Watched

For each active Conviction Record, the system monitors:

1. **Convergence score** — has it dropped below threshold in load-bearing domains?
2. **Velocity** — has direction reversed in any load-bearing domain?
3. **Counter-signals** — have new contradicting ETRs emerged above the counter-signal ceiling?
4. **Convergence state** — has any load-bearing domain dropped from HIGH to TURBULENT or below?
5. **Happy Path status** — if a Happy Path was designated at commit, is it still qualified?

---

## Alert Conditions

| Condition | Alert Type | Severity |
|---|---|---|
| Load-bearing domain drops below HIGH | Thesis weakening | Medium |
| Velocity reverses in load-bearing domain | Direction shift | Medium |
| Counter-signal above ceiling detected | Active contradiction | High |
| Load-bearing domain enters TURBULENT state | Signal contested | High |
| Happy Path no longer qualifies | Unicorn lost | High |
| All load-bearing domains strengthen | Thesis strengthening | Informational |

---

## Alert Language

Alerts surface inside the active Conviction Record panel. Language is precise and non-editorial:

- "CAPITAL convergence has dropped 14 points since commitment. Velocity now negative. Review recommended."
- "Active counter-signal detected in TECHNOLOGY domain. Thesis contested."
- "LABOR convergence entered TURBULENT state. Happy Path designation no longer active."
- "CAPITAL + TECHNOLOGY both strengthening since commitment. Thesis holding."

The system does not say "your trade might be wrong." It reports what the signal field is doing. The investor draws the conclusion.

---

## Monitoring Cadence

- Checked on each signal field update cycle
- Does not require user action — runs passively against all active Conviction Records
- Phase A: checked on page load / session open
- Phase B: background polling with push notification on high-severity alerts

---

## Display

Active convictions and their current monitoring status are visible in:
1. The Conviction Record within the Action Plan panel (primary)
2. The Sessions Explorer (secondary — status badge on each conviction)

---

## Open Items

- Monitoring cadence for Phase A — on page load only, or periodic while tab is open?
- Threshold for "weakening" vs "critical" — needs calibration from live signal data
- Whether to surface monitoring alerts inline in the signal field or only in the Action Plan panel
