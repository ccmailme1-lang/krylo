# State-of-System Artifact — 2026-06-26
## Architectural Reconciliation: WO as Interpretation Layer

Source: session conversation 2026-06-26 (post WO-1879 build)
Status: REFERENCE — do not act on until Founder signals "done"

---

## 1. What was achieved

Converged from "WO ontology expansion" into **architectural reconciliation against an existing runtime system**.

Key correction:
> 7 of 10 proposed WO-2001–2010 systems already exist under different names in the runtime.

That is state space de-duplication, not documentation work.

---

## 2. Canonical collapse rule (locked)

**Old model:**
```
WO → system design → implementation
```

**Correct model:**
```
runtime system → observed behavior → WO labeling → compression artifact
```

> WO ≠ system component
> WO = interpretation layer over existing runtime behavior

---

## 3. Current runtime systems (already exist)

| File | Runtime role | Spec alias |
|---|---|---|
| `driftmonitor.js` | SDI / stability tracking | WO-2001 class |
| `epistemictier.js` | Validation / epistemic gating | WO-2006 class |
| `querysynthesis.js` | Orchestration / intent execution | WO-2010 class |
| `gravity.js` | Domain attraction model | WO-2003 partial |
| `domaingravity.js` | Domain pressure + polarity (NEW WO-1879) | WO-1879 |

---

## 4. True primitives — actual gaps (not WOs)

### 1. CanonicalEvent identity schema
Not a workflow. An **identity invariant schema across all systems**.

Missing consequence: no stable object identity across pipelines. Merge/split is currently implicit, not enforced.

Implementation note: not a module — a **constraint field** embedded into every stage. See spec: `specs/canonical-event-invariants.md` (to be written).

### 2. Attention budget system (only real missing control surface)
Without it: ranking is post-hoc, not enforced. "Best output" is not a constrained selection problem.

### 3. Drift correction loop (closed feedback)
Have: drift monitoring (`driftmonitor.js` — passive, observational).
Missing: drift → corrective transformation → system re-weighting. Observe instability but do not systemically adapt from it.

### 4. Fracture output layer (WO-1879/1880)
System must output **coherence fractures**, not only best answer. This is epistemic honesty, not UX. Wired: §20 + WO-1879 (built). WO-1880 next.

---

## 5. §20 semantic upgrade (locked 2026-06-26)

| Old assumption | New assumption |
|---|---|
| Only explicit signals matter | Absence is a signal class |
| Outputs are truth carriers | Outputs are compressed projections |
| Uncertainty is optional | Uncertainty is structural |

> Silence ≠ absence. Silence = unmodeled structure.

---

## 6. Full architecture (collapsed form)

```
              ┌─────────────────────┐
              │ runtime signals     │
              └─────────┬───────────┘
                        ↓
            ┌────────────────────────┐
            │ epistemic classification│  ← epistemictier.js
            └─────────┬──────────────┘
                      ↓
   ┌────────────────────────────────────┐
   │ CanonicalEvent identity resolution │  ← GAP (invariant spec needed)
   └──────────────┬─────────────────────┘
                  ↓
      ┌──────────────────────────┐
      │ gravity + domain routing  │  ← domaingravity.js (WO-1879)
      └──────────┬───────────────┘
                 ↓
   ┌──────────────────────────────┐
   │ attention + ranking layer     │  ← GAP (attention budget)
   └──────────┬───────────────────┘
              ↓
   ┌──────────────────────────────┐
   │ output + fracture reporting   │  ← WO-1880 (not yet built)
   └──────────────────────────────┘
              ↓
      drift feedback loop           ← driftmonitor.js (passive only)
```

---

## 7. WO framing correction

Current WOs are acting like deployment milestones.
Structurally they are **labels over subsystems in a single feedback architecture**.

Risk: treating WO dependencies as real causal dependencies when they are documentation sequencing constraints. That mismatch is where systems silently drift.

---

## 8. What this changes about how to design

> No longer designing components.
> Now designing **constraint propagation through an existing runtime system**.

- CanonicalEvent is not a module — it is a constraint
- Attention is not a feature — it is a control surface
- Drift is not telemetry — it is a feedback signal that must produce corrective transforms

---

## 9. Priority ordering (when Founder signals "done")

1. **CanonicalEvent formalization** — identity invariant spec. Everything else depends on stable identity.
2. **Attention budget enforcement** — makes ranking deterministic, stabilizes Happy Path selection.
3. **Drift → correction loop** — closes the system. Currently observes but does not act.
4. **Fracture output layer** — WO-1880. Prevents false coherence. Depends on WO-1879 (complete).

---

## 10. Bottom line

> From "designing a system" → to "reconciling a real system."
> WOs are no longer building blocks. They are interpretation overlays on an existing runtime graph.

Next meaningful step (when ready):
> Extract a single unified state model (CanonicalEvent + attention + drift + interpretation)
> and define strict invariants over it.

That is the point where "no bogus payload" becomes enforceable rather than aspirational.
