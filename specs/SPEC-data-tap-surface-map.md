# SPEC — Data Tap → Surface Map

**Status:** PLANNING / DISCOVERY ONLY. No implementation, no code changes, no restoration of any
component. This document maps the 16 real Data Taps KRYL-1207 already produces to their actual
guest-facing role — nothing more.
**Depends on:** `SPEC-adjudication-contract.md` §6 (the Data Tap inventory itself, implemented and
validated).

## Method

For each tap: what it means, whether a guest needs to perceive it, and — if so — whether that's
already happening (often it is, via the hand-written headline/paragraph text) or is a real gap.
**Not every tap needs new UI.** The goal is "is KRYLO's intelligence perceptible," not "render all
16 fields."

## The map

| Tap | Meaning | Guest relevance | Currently expressed? | Gap? |
|---|---|---|---|---|
| Candidate type | Internal classification name (`STABLE_GROUP`, etc.) | Low — jargon | Yes, indirectly — already translated into plain headline text | No gap. Correctly hidden. |
| Candidate value/state | e.g. `CONVERGING` | Low — jargon | Yes, indirectly — translated into phrases like "pulling into alignment" | No gap. |
| `sourceInputs` | Which domains are involved | **High** — this is "which cones does this concern" | Partially — domain names appear in text, but the actual cone visuals aren't connected to the statement | **Real gap.** See below. |
| `measuredValue` | Raw computed number | Low directly | Feeds the plain-language magnitude phrasing already in the paragraph (e.g. "35% vs. 28% average") | No gap at headline level; real gap at inspection level (see below). |
| `threshold` | Internal calibration constant | Low | Same — feeds existing plain-language phrasing | No gap. |
| `margin` | measuredValue − threshold | Low | Same | No gap. |
| Evidence payload (`E`) | Full internal object | None directly | Not rendered, by design | Correctly audit-only. |
| Compatibility classification (κ) | Comparable / Conflict / Insufficient | **High** — this is the whole point of the feature | Yes, textually (different headline/paragraph per outcome) | **Real gap — visual, not textual.** Already found during G2 validation: Conflict/Unresolved use identical styling to a normal reading. |
| Conflict status | Same territory as κ | High | Same as above | Same gap, not a separate one. |
| Opposing claim / counterpart | The other reading, when Conflict | High | **Yes, fully** — both readings already quoted verbatim in the Conflict paragraph | No gap. |
| 𝒪 rule invoked | Which specific authored rule fired | Low directly — internal | Not shown to guest, available via `getLastAdjudication()` | No gap *unless* a "why" interaction is wanted (see below, optional). |
| `normalizationEvidence` | Always `null` (negative finding) | None currently | N/A — nothing to show | No gap; nothing exists to surface. |
| Adjudication outcome | SINGLE / CONFLICT / UNRESOLVED_NO_RANKING / NONE | High — drives which narrative shows | Yes, textually | Same visual gap as κ. |
| Basis for outcome | Technical string (e.g. "authored opposition rule matched between...") | Low — audit language | Correctly *not* guest-facing; separate hand-written paragraph exists for that | No gap. Good separation already in place. |
| Unresolved/insufficient reason | Same territory, per-pair | Low — audit language | Same correct separation | No gap. |
| Topological primitives | Explicitly `NOT PRODUCED BY THIS PATH` | None | N/A | No gap; correctly not faked. |

## What this actually reduces to

Of 16 taps, **13 are already correctly handled** — either appropriately translated into plain
guest language, or correctly kept as audit-only/inspection-only data that a guest was never meant
to see raw. That's a sign the KRYL-1207 implementation already did the "translate to plain
language" work at the right layer, not evidence of a large hidden backlog.

**Two real gaps, not sixteen:**

1. **Visual distinction for κ/adjudication outcome (the G2 finding).** Conflict and Unresolved
   currently only differ from a normal reading by their words — same lime accent, same font
   weight, same layout. This is the highest-priority gap: it's the one tap category whose entire
   purpose is "tell the guest this is a different kind of moment," and visually it doesn't yet.
2. **`sourceInputs` isn't connected to the actual cone visuals.** The headline says "Capital and
   Labor" but nothing highlights or connects those two specific cones in the 3D scene the banner
   floats over. This is an *enrichment of an existing visual* (the cones/connector lines already
   in `conemap.jsx`), not new chrome — consistent with the "existing primitive" branch of the
   Data Tap → Surface flow, not a new UI element.

**One optional, not required:** exposing the 𝒪 rule invoked as a "why" interaction (tap the
headline, see the specific rule) — genuinely optional, not load-bearing to G1/G2/G3, worth naming
as a future possibility, not a gap.

## Non-goals

Does not design the visual treatment for gap #1 (color, icon, border — a Founder design call, same
boundary honored throughout this session). Does not design the cone-connection mechanism for gap
#2. Does not restore `ObserveStoryBanner` to the render tree — that remains explicitly paused
pending the redesign direction. Does not add new UI chrome for any of the 13 already-handled taps.
