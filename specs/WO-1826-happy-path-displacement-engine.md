# WO-1826 — Happy Path Displacement Engine

**Filed:** 2026-06-20
**Status:** OPEN
**Depends on:** WO-1821 (Happy Path Qualification Spec)
**Depended on by:** WO-1762 (EQ Canvas — renders what this engine decides)
**Build target:** src/engine/ — new engine module

---

## Purpose

The Happy Path is not a static designation. It is a live competition.

The displacement engine runs continuously, re-evaluating all active domain peaks against the five Happy Path qualification criteria (WO-1821). When a stronger candidate emerges and clears all criteria at higher magnitude than the current Happy Path, it displaces the existing one.

The displacement is not announced. The EQ canvas curve reshapes. The old peak flattens. The new peak rises and turns purple. The investor reads the shift.

---

## Core Principle

**The system is always running.** The Happy Path earns its position continuously — not just at the moment it first qualifies. A peak that qualified yesterday but has since decayed loses its designation. A stronger peak that just cleared all criteria takes it.

This is a higher-integrity system than a static badge. The designation reflects the current best evidence, not a historical one.

---

## Displacement Rules

### Rule 1 — Challenger must clear all five criteria
A challenger peak cannot displace the incumbent simply by having a higher score. It must independently satisfy all five qualification criteria from WO-1821:
1. Cross-domain convergence (min 2 independent domains)
2. Persistence threshold (min 72h)
3. Velocity direction (building)
4. Counter-signal resistance
5. Hard convergence floor

### Rule 2 — Incumbent loses designation when criteria fail
The current Happy Path loses its purple designation immediately when any of its five criteria are no longer met — even if no challenger exists. An expired Happy Path is not replaced with a lesser candidate. The canvas returns to no-purple state.

### Rule 3 — Displacement threshold
A challenger must exceed the incumbent's composite qualification score by a minimum margin before displacement fires. This prevents rapid oscillation between two near-equal peaks.

- Minimum displacement margin: **[threshold TBD — requires live signal calibration]**
- Below the margin: challenger is noted but does not displace

### Rule 4 — Hysteresis buffer
Displacement does not fire on a single-frame qualification event. The challenger must hold above the displacement threshold for a minimum buffer window before displacement is confirmed.

- Buffer window: **[TBD — likely 15–30 minutes, needs calibration]**
- Prevents noise-driven displacement

---

## Engine Output Contract

The engine emits a single state object consumed by the EQ canvas (WO-1762):

```js
{
  happyPath: {
    qualified:    boolean,
    domains:      string[],          // canonical domains contributing
    peakScore:    number,            // composite qualification score
    peakPosition: number,            // x-axis position on EQ canvas (domain index)
    since:        timestamp,         // when this peak first qualified
    velocity:     'BUILDING' | 'FLAT' | 'DECAYING',
  } | null,                          // null = no Happy Path currently qualified

  challengers: [                     // peaks building toward qualification
    {
      domains:      string[],
      peakScore:    number,
      peakPosition: number,
      criteriasMet: number,          // 0–5, how many of the five criteria satisfied
      gap:          number,          // how far below displacement threshold
    }
  ],

  lastDisplacement: {
    at:         timestamp,
    outgoing:   { domains, peakScore },
    incoming:   { domains, peakScore },
  } | null,
}
```

---

## Canvas Rendering Contract

The EQ canvas (WO-1762) reads this output and renders:

| Engine state | Canvas rendering |
|---|---|
| `happyPath: null` | No purple anywhere. Curve in lime/blue/slate. |
| `happyPath.qualified: true` | Peak at `peakPosition` renders in `#8A2BE2` |
| Displacement fires | Old peak fades from purple → lime/blue/slate. New peak rises to purple. Transition: 600ms ease. |
| Challenger visible | No visual change in default state. Visible in hover/transient mode only. |

---

## Triggerable Events (feeds WO-1820)

The engine emits events that the alert system (WO-1820) can watch:

| Event | Payload |
|---|---|
| `peak.emergence` | A domain peak rises above qualification floor |
| `peak.qualified` | Peak clears all 5 criteria — Happy Path designated |
| `peak.displaced` | Incumbent displaced by stronger challenger |
| `peak.decay` | Qualified peak begins losing strength below floor |
| `peak.multi_convergence` | 2+ peaks simultaneously reach qualifying strength |

---

## Open Items Before Build

1. Displacement margin threshold — requires live signal calibration
2. Hysteresis buffer window — 15–30min range, needs confirmation
3. Whether challengers are surfaced in the canvas hover mode (currently spec says yes — visible in transient mode only)
4. Bay linkage — open question: does peak qualification activate corresponding domain bay? Decision deferred.
