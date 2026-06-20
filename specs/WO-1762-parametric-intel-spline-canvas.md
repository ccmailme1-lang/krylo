# WO-1762 — Parametric Intel Spline Canvas (EQ Metaphor)

**Filed:** 2026-06-20 (spec written — WO approved previously)
**Status:** APPROVED — SPEC LOCKED, NOT BUILT
**Mode:** Advanced mode only
**Mobile:** Spec pending before build
**Depends on:** WO-1821 (Happy Path Qualification), WO-1826 (Happy Path Displacement Engine)
**Depended on by:** WO-1826 (renders what the displacement engine decides)

---

## Core Metaphor

The visual model is derived from FabFilter Pro-Q's parametric EQ interface.

In Pro-Q, frequency bands are draggable nodes positioned along a frequency/gain plane. Their bell curves combine into a composite EQ curve showing the total frequency response.

In Krylo, **frequency bands are replaced by signal strength positions.** The canvas shows the composite convergence profile across all active signals and domains.

---

## Axis Mapping (Locked)

| FabFilter Pro-Q | Krylo Signal Field |
|---|---|
| Frequency (x-axis) | Signal domain position (indexed across active domains) |
| Gain (y-axis) | Signal strength / convergence pressure (0–100 scale) |
| Bell curve node | Active signal or domain cluster |
| Composite EQ curve | Full convergence profile across all active signals |
| Peak | Happy Path candidate |
| Q / bandwidth | Persistence window — width reflects how sustained the signal pressure is |
| Multiple bands | Multiple domain signals contributing to the total curve |
| Flat line (0 gain) | Insufficient signal — no convergence |

**X-axis:** Domain index — the 6 canonical Krylo domains mapped as positions:
`TECHNOLOGY · CAPITAL · KNOWLEDGE · LABOR · MEDIA · OWNERSHIP`

**Y-axis:** Signal strength 0–100 (maps directly to convergence score)

**Curve:** Composite of all active domain signals. Each domain contributes a bell curve centered at its x-position, with height = convergence score, width = persistence window.

---

## Happy Path Visualization

The Happy Path candidate is the dominant peak in the composite curve.

Designation rules (from WO-1821):
- Peak must clear the hard convergence floor
- At least 2 independent domain peaks must contribute to the composite
- The composite peak must have sustained width (persistence threshold met)
- Velocity must be positive (peak building, not decaying)
- No counter-signal notch above the ceiling in the same domain range

**Visual treatment when Happy Path qualifies:**
- Peak color: `#8A2BE2` (unicorn purple — locked 2026-04-28)
- Subtle gravitational compression effect at peak (consistent with convergence state semantics)
- No label, no badge — the curve speaks for itself

**Visual treatment when no Happy Path:**
- Curve renders in `#66FF00` (lime) for BUILDING domains
- `#007FFF` (blue) for TURBULENT domains
- `#3a3d4a` (slate) for STABLE/LOW domains
- No purple anywhere — purple is earned

---

## Live Displacement (WO-1826 feeds this)

The curve is live. It updates as signal pressure changes.

When a stronger candidate emerges and clears all qualification criteria:
- The curve reshapes in real time
- The old peak flattens
- The new peak rises and turns purple
- No notification, no announcement — the curve moved

The displacement is visible, not announced. The investor reads the shift.

---

## Interaction Model

- **Read-only by default** — curve reflects signal field state, not user input
- **Advanced mode only** — not visible to free tier
- **No dragging** — nodes are not adjustable by the investor; signal field drives position

The EQ metaphor is visual, not editorial. The investor cannot reshape the curve. Only the signal field can.

### Two-State Visibility Model

**Default state:**
- Curve renders in lime / blue / slate per convergence state colors
- If Happy Path qualifies, that peak is rendered in `#8A2BE2` (purple) — no label, no badge
- The purple peak IS the signal — visible without interaction
- No purple anywhere = no Happy Path qualified

**Hover (Transient/Activate mode):**
- Canvas surface turns purple (FabFilter Pro-Q activation pattern)
- All resonant peaks illuminate — domains at or above qualification floor
- Labels surface on qualified peak: domain · score · persistence · leakage risk
- Everything below the floor stays dim
- Returns to default state on mouse leave

### Peak Interactions

**Click on peak → Commit Thesis (WO-1823)**
The investor found the path. The conviction gesture fires.

**Right-click / long-press on peak → Set Trigger (WO-1820)**
Opens trigger configuration for that specific peak:
- Which event to watch (emergence / qualification / displacement / decay / multi-peak)
- Persistence minimum before alert fires
- Notification method (in-app Phase A, push Phase B)

Triggers are peak-specific — not global. The investor watches a specific domain configuration, not the field in general.

### Triggerable Canvas Events

| Event | Trigger condition |
|---|---|
| Peak emergence | Domain peak rises above qualification floor |
| Peak qualification | Peak clears all 5 Happy Path criteria → turns purple |
| Peak displacement | Existing Happy Path overtaken by stronger peak |
| Peak decay | Purple peak loses strength below floor — early warning |
| Multi-peak convergence | 2+ peaks simultaneously reach qualifying strength |

---

## Canvas Renderer Spec

- **Technology:** HTML5 Canvas (2D context) — no WebGL, no SVG
- **Update cadence:** Redraws on each signal field update cycle
- **Smoothing:** Bezier curve interpolation between domain points
- **Background:** `#000000`
- **Grid lines:** Horizontal only, `rgba(255,255,255,0.04)` — Tufte data-ink principle
- **No axes labels rendered on canvas** — labels live outside the canvas in DOM

---

## Open Items Before Build

1. Mobile spec — layout TBD (canvas collapses to sparkline on small viewport?)
2. Number of visible domain positions — all 6 always shown, or only active domains?
3. Animation speed of live curve update — needs Founder input
4. Whether to show individual domain bell curves underneath the composite, or composite only
