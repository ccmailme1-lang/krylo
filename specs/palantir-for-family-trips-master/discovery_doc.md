
  ┌────────────────────┬────────────────────────────────────┬───────────────────────────────────────────────────┬─────────────────────────────────┐
  │      Feature       │             What It Is             │                   Krylo Synergy                   │            Value Add            │
  ├────────────────────┼────────────────────────────────────┼───────────────────────────────────────────────────┼─────────────────────────────────┤
  │                    │ Left list → center field → right   │ Krylo's current bay + InspectionPanel is already  │                                 │
  │ Three-pane         │ inspector rail with consistent     │ this. Formalize it: Signal List rail (left) /     │ Turns the surface from a 3D     │
  │ inspector anatomy  │ fixed widths                       │ Cone Field (center) / Inspector (right). Give the │ viewer into a command station.  │
  │                    │                                    │  left rail real estate.                           │                                 │
  ├────────────────────┼────────────────────────────────────┼───────────────────────────────────────────────────┼─────────────────────────────────┤
  │                    │ Plain-English explanation of       │ Replace Oracle's convergence label with a WHY IT  │ This IS the Oracle product. The │
  │ "Why It Matters"   │ operational significance — one     │ MATTERS section. LLM generates it. Displayed      │  label BUILDING CONVERGENCE     │
  │ synthesis block    │ paragraph, bold                  │ serif, 14px, center-left, below the convergence    │  nothing without this.           │
  │                    │                                  │ state badge.                                       │                                  │
  ├────────────────────┼──────────────────────────────────┼────────────────────────────────────────────────────┼──────────────────────────────────┤
  │                    │ Full-bleed overlay on action     │ Wire to query submission moment. When user         │ Transforms a search submit into  │
  │ Mission Launch      │ trigger: large display headline, │ submits, full-screen overlay: INITIATING SIGNAL    │ a mission launch. Cinematic      │
  │ modal               │  circular counter, metadata row, │ SCAN + query as display headline + circular signal │ entry. High conviction framing.  │
  │                     │  PROCEED button                  │  count ring. Dismisses to Signal Map.              │                                  │
  ├─────────────────────┼──────────────────────────────────┼────────────────────────────────────────────────────┼──────────────────────────────────┤
  │                     │ Bottom-anchored temporal bar     │ Replace the temporal scrubber bar with a proper    │ Makes time a first-class         │
  │ Horizontal Gantt    │ with color-coded event blocks    │ signal event timeline. Each domain gets a row.     │ dimension. "When did this signal │
  │ timeline strip      │ per entity                       │ Events from the SSE stream populate blocks. Scrub  │  appear and how did it evolve"   │
  │                     │                                  │ = pan/zoom this strip.                             │ becomes visual.                  │
  ├─────────────────────┼──────────────────────────────────┼────────────────────────────────────────────────────┼──────────────────────────────────┤
  │                     │ ACTIVE / CRITICAL / COMPLETE —   │ Apply to convergence states: BUILDING (lime),      │ Consistency. Right now           │
  │ Semantic status     │ small, pill-shaped, colored,     │ TURBULENT (blue #007FFF), HIGH (purple), LOW       │ convergence state is text-only   │
  │ badges              │ sparse                           │ (muted). Render as pill badges on cone labels and  │ in multiple locations with no    │
  │                     │                                  │ inspector header.                                  │ visual hierarchy.                │
  ├─────────────────────┼──────────────────────────────────┼────────────────────────────────────────────────────┼──────────────────────────────────┤
  │                     │ Pre-action intelligence block:   │ Add a SIGNAL BRIEF section to the Inspector Panel: │ Bridges raw metadata and the     │
  │ BRIEF / PREP        │ nested LOCATION, CHALLENGE,      │  origin state, signal age, source count, last      │ Oracle answer. Users know what   │
  │ CONTEXT section     │ FALLBACK fields                  │ verified timestamp. Forensic pre-read before       │ they're looking at before they   │
  │                     │                                  │ Oracle synthesis.                                  │ interpret it.                    │
  ├─────────────────────┼──────────────────────────────────┼────────────────────────────────────────────────────┼──────────────────────────────────┤
  │ Photo/reference     │ Dark-tinted venue/location       │ ETR cards in the Analysis view could embed NewsAPI │ Grounds abstract signal data in  │
  │ evidence cards      │ thumbnails embedded directly in  │  article thumbnails as 32×32 or 48×48 dark-tinted  │ real-world provenance. Makes     │
  │                     │ the detail view                  │ evidence chips next to source citations.           │ sources feel tangible.           │
  ├─────────────────────┼──────────────────────────────────┼────────────────────────────────────────────────────┼──────────────────────────────────┤
  │                     │                                  │ Add live query breadcrumb to Krylo nav: KRYLO /    │ Users always know what they're   │
  │ Operational         │ Top nav shows: ORGANIZATION /    │ SIGNAL INTELLIGENCE / [ACTIVE QUERY]. Updates on   │ analyzing. Removes cognitive     │
  │ breadcrumb trail    │ FAMILY APP / MISSION NAME always │ submit. Clicking query re-opens Oracle.            │ overhead of "what am I looking   │
  │                     │                                  │                                                    │ at."                             │
  ├─────────────────────┼──────────────────────────────────┼────────────────────────────────────────────────────┼──────────────────────────────────┤
  │                     │ All-caps 9px label → mono value  │ Enforce this across InspectionPanel,               │ The single biggest visual        │
  │ Information density │ → unit. Every row follows the    │ MicroSignalClusters, IngestionHorizon. Label /     │ upgrade available. Right now our │
  │  discipline         │ same pattern. No exceptions.     │ value / unit. No mixed styles within a panel.      │  panels mix font sizes           │
  │                     │                                  │                                                    │ inconsistently.                  │
  ├─────────────────────┼──────────────────────────────────┼────────────────────────────────────────────────────┼──────────────────────────────────┤
  │                     │ Left rail groups missions by     │ Signal queue in the left rail: group signals by    │ Turns the left nav (currently    │
  │ Mission list with   │ day, shows status badge + 1-line │ domain, show top signal per domain with            │ icon-only) into a live signal    │
  │ day/phase grouping  │  summary                         │ convergence badge + signal age. Clicking fires     │ briefing queue — the operator's  │
  │                     │                                  │ Oracle on that signal.                             │ first screen.                    │
  ├─────────────────────┼──────────────────────────────────┼────────────────────────────────────────────────────┼──────────────────────────────────┤
  │                     │ SVG ring with large number       │ Apply to Signal Score in the Inspector: a 240×240  │ Makes the single most important  │
  │ Circular countdown  │ inside — mission counter,        │ or smaller SVG ring showing convergence score      │ number — convergence score —     │
  │ / score ring        │ progress indicator               │ (0–100), colored by state. Replaces the current    │ spatially dominant and           │
  │                     │                                  │ number-only display.                               │ immediately readable.            │
  ├─────────────────────┼──────────────────────────────────┼────────────────────────────────────────────────────┼──────────────────────────────────┤
  │                     │ Real imagery shown at ~20%       │ Contextual map / satellite imagery layer behind    │ Adds physical-world grounding to │
  │ Dark-first photo    │ opacity tinted to match          │ cone field at ~8–12% opacity. Not interactive —    │  the abstract signal field.      │
  │ embedding           │ dashboard bg — present but       │ just environmental grounding.                      │ Subtle depth.                    │
  │                     │ subordinate                      │                                                    │                                  │
  └─────────────────────┴──────────────────────────────────┴────────────────────────────────────────────────────┴──────────────────────────────────┘

  ---
  Top 3 to build immediately:
  
  1. WHY IT MATTERS synthesis block in Oracle — directly serves the product's core promise
  2. Semantic convergence badge pills — one-day build, immediate visual upgrade across all surfaces
  3. Operational breadcrumb — 30-minute build, eliminates the biggest UX confusion ("what am I analyzing")
  
✻ Brewed for 1m 50s · 2 shells still running

❯ including workflows                                                                                                                                  
  
  Read 3 files (ctrl+o to expand)

⏺ Now I have the full workflow layer — playback engine, entity selection model, mission brief structure, dependency prompts, convoy windows, live
  cursor, mission feed. Writing the complete analysis.

  ---
  Workflow Analysis — Palantir-for-Family-Trips → Krylo

  Workflows extracted from source code:

  ---
  Core Interaction Patterns
  
  Workflow: Timeline cursor + playback engine
  What It Does: Cursor maps to real time slots. PLAY/PAUSE with 1×/2×/3×/4× speed. Cursor drives map animation, inspector state, and event feed
    simultaneously. PLAYBACK_SLOT_UNITS_PER_SECOND, getSuggestedPlaybackStartCursor() finds the next meaningful event automatically.
  Krylo Synergy: Our temporal scrubber is one-dimensional. Upgrade it: cursor → cones animate to historical positions, inspector shows signal state at
    that moment, event log replays SSE frames. Add speed control.
  Value Add: Time becomes a navigable dimension, not just a slider. "Show me what signals looked like 6 hours ago" becomes a first-class operation.
  ────────────────────────────────────────
  Workflow: Entity selection → inspector rail
  What It Does: Any clickable entity (meal, activity, route, location) sets { type, id } selection state → inspector renders contextual detail for
    exactly that entity. One selection model governs everything.
  Krylo Synergy: Every surface (cone click, domain cell, signal row) should fire the same selection model → inspector updates. Currently cone click
    works but domain cell + signal row don't propagate to the inspector.
  Value Add: Turns the inspector into a universal context pane. User never wonders "where does clicking this take me."
  ────────────────────────────────────────
  Workflow: Mission Launch modal
  What It Does: On day selection: full-bleed overlay slides up (translateY 24px → 0, scale 0.97 → 1). Shows phase code, large display headline,
  circular
    counter with halo pulse, metadata row, ABORT / PROCEED. Each day gets a semantic accent color (amber, blue, red, green). Dismiss → cursor advances
    to day start.
  Krylo Synergy: Wire to query submit: overlay fires with query as headline, signal count ring animating up, convergence state color as accent. ABORT =

    clear. PROCEED = advance to Signal Map.
  Value Add: Transforms search submission from a form action into a mission commitment. High cognitive weight. Changes how the user relates to each
    query.
  ────────────────────────────────────────
  Workflow: DAY_BRIEFING_COPY structure
  What It Does: Each phase has: code (phase name), tone (semantic color), summary (plain-English paragraph), lookouts (3 bullet points of specific
    risks/watch items). This drives the "Why It Matters" synthesis block.
  Krylo Synergy: Directly maps to Oracle. code = convergence phase label. tone = state color. summary = LLM synthesis paragraph. lookouts = 3 signal
    watch factors ("TURBULENT — 3 contradictory sources detected", "BUILDING — media velocity accelerating").
  Value Add: This is the complete Oracle output schema. It already exists as a proven pattern. Just replace trip copy with signal intelligence copy.
  ────────────────────────────────────────
  Workflow: Mission feed (ephemeral log)
  What It Does: Events flash into a live feed panel. Lifetime: 3000ms. Fade: 500ms. Tick: 100ms. New events push old ones down. Events carry type
    (info/warning/critical/success) and semantic color.
  Krylo Synergy: Wire to SSE stream: each new ETR from FlowController fires a feed entry. PULSE · TECHNOLOGY, SURGE · MEDIA, ALERT · CAPITAL. Lifetime
    matches signal age threshold.
  Value Add: The field feels computationally alive. Something is always happening. "The system is watching" — constantly.
  ────────────────────────────────────────
  Workflow: Convoy windows
  What It Does: SHARED_CONVOY_WINDOWS defines time windows when multiple units move together. Timeline renders these as shared color blocks spanning
  all
    rows simultaneously.
  Krylo Synergy: When multiple domains spike in the same time window → render a CONVERGENCE WINDOW block across all domain rows in the timeline strip.
    Lime highlight. Label: CONVERGENCE ZONE.
  Value Add: Shows cross-domain signal correlation visually. The moment multiple domains move together is the highest-value intelligence event. This
    makes it unmissable.
  ────────────────────────────────────────
  Workflow: Suggested playback start
  What It Does: getSuggestedPlaybackStartCursor() scans routes and checkpoints to find the next meaningful event ahead of the current cursor. "Jump to
    signal" — don't make users scrub manually.
  Krylo Synergy: Add a JUMP TO PEAK button on the scrubber. Finds the highest-convergence moment in the last 24H replay history and jumps there.
    Computed from frame history (WO-1091 usereplay).
  Value Add: Removes the friction of finding significant moments in replay. The system tells you when something happened.
  ────────────────────────────────────────
  Workflow: Live cursor
  What It Does: getCurrentTripCursor() computes position based on real clock. Cursor always tracks to "now" in trip time. Visual "LIVE" indicator at
    cursor head. When rewound, cursor shows "T-6H" offset label.
  Krylo Synergy: Our scrubber already has LIVE ←→ T-24H. Extend: show actual timestamp at cursor head (not just offset). When streaming lags, show
    cursor falling behind the live head — "STREAM LAG 2.3s".
  Value Add: Makes the temporal relationship to live data explicit. Users see exactly when signal data was captured, not just "live."
  ────────────────────────────────────────
  Workflow: Dependency prompts
  What It Does: getDependencyPrompts() surfaces pre-conditions before action. "This entity requires X to be confirmed first." Pre-condition checklist
    shown in inspector before the primary action button becomes active.
  Krylo Synergy: Gate Oracle synthesis: if signal count < threshold, show dependency prompt: "ORACLE REQUIRES · MIN 3 DOMAIN SIGNALS · CURRENTLY 1 OF 6

    CONFIRMED." Oracle button grayed.
  Value Add: Prevents users from drawing conclusions from insufficient signal. Makes data quality a first-class concern, not a footnote.
  ────────────────────────────────────────
  Workflow: Readiness assessment
  What It Does: getFamilyReadiness() computes per-unit status across the operation. Top bar shows aggregate readiness.
  Krylo Synergy: getSignalReadiness() — per-domain signal health: how many domains have sufficient ETR depth to support Oracle synthesis. Show as 4/6 
    DOMAINS · SIGNAL READY in the lens bar.
  Value Add: Operators know confidence level before committing to an Oracle call. Prevents overconfident synthesis on thin data.
  ────────────────────────────────────────
  Workflow: Phase code + tone system
  What It Does: Each phase has a semantic tone (Amber/Blue/Red/Green) that colors the entire launch modal, accent, border, glow.
    MISSION_LAUNCH_THEME[day] generates 7 color variants from one base.
  Krylo Synergy: Apply to convergence states. Each state generates: accentSoft (background tint), accentBorder (card border), accentGlow (bloom),
    accentText (label). Currently we use flat colors — upgrade to 7-variant theme system per state.
  Value Add: Visual coherence across the entire surface. Every element that belongs to a convergence state speaks the same color language. No ad-hoc
    opacity guessing.
  ────────────────────────────────────────
  Workflow: Status pill system
  What It Does: STATUS_STYLES maps named states to bg/text color pairs. border-[color]/30 bg-[color]/10 text-[color]. Applied universally across all
    entity cards with zero variation.
  Krylo Synergy: Apply CONVERGENCE_PILL_STYLES across InspectionPanel, Oracle header, Signal Map nodes, and MicroSignalClusters domain header. One
    mapping, used everywhere.
  Value Add: Eliminates inconsistency. Right now convergence state is rendered differently in every component.
  ────────────────────────────────────────
  Workflow: Linked entity graph
  What It Does: getLinkedEntities() returns related entities for any selection. Inspector shows: "this meal → this location → this route → these
    families." Relationship graph rendered in inspector as mini-list.
  Krylo Synergy: getLinkedSignals() — for any selected cone/domain, show related signals that fired in the same time window, from different domains. "3

    RELATED SIGNALS · MEDIA / CAPITAL / LABOR" in inspector.
  Value Add: Shows signal co-occurrence. The intelligence value is not any single signal — it's when signals cluster. This makes that visible.

  ---
  Structural Workflows (Architecture Level)

  ┌────────────────┬───────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────────────┐
  │    Pattern     │                        What It Is                         │                        Krylo Application                         │
  ├────────────────┼───────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
  │ Persisted trip │ usePersistedTripState() — all user edits survive page     │ Query history, pinned signals, inspector state should persist    │
  │  state         │ refresh via localStorage. Versioned key (v4-public).      │ across sessions. User returns to find their last Oracle query    │
  │                │ Legacy keys migrated on load.                             │ still loaded.                                                    │
  ├────────────────┼───────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
  │ Published vs.  │ publishConfig.js — isLiveExternalDataEnabled() gates real │ We have this conceptually (mock-server) but no formal gate.      │
  │ live config    │  API calls. In dev, external calls are skipped and seed   │ SIGNAL_MODE = 'live' | 'mock' | 'replay' flag that governs all   │
  │                │ data is used.                                             │ data hooks. Makes switching clean.                               │
  ├────────────────┼───────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
  │ Seeded refresh │ SEEDED_PLAN_REFRESH_IDS — known entity IDs that get       │ Signal fixture IDs that always reload from mock on cold start    │
  │  IDs           │ refreshed from seed data on load. Others are user-created │ vs. user-pinned signals that persist. Prevents stale mock data   │
  │                │  and preserved.                                           │ contaminating live session.                                      │
  ├────────────────┼───────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
  │ Route          │ getRouteSimulationWindow() — computes start/end slot for  │ Per-domain SSE event windows. Each domain's cone animation only  │
  │ simulation     │ each route's animation. Playback only renders a route     │ fires when the timeline cursor is within that domain's active    │
  │ window         │ when cursor is in its window.                             │ signal window. Prevents all cones animating simultaneously at    │
  │                │                                                           │ wrong times.                                                     │
  ├────────────────┼───────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┤
  │ Compact travel │ getCompactTravelLabel() — derives 3-char IATA-style codes │ Derive 4-char signal codes from domain + event type: TECH·ADPT,  │
  │  labels        │  from entity title/status. RTB, DRV, YOS, HOP. Used in    │ MEDI·SRGE, CPTL·DRFT. Display in the Gantt timeline blocks       │
  │                │ dense timeline rows.                                      │ instead of full labels.                                          │
  └────────────────┴───────────────────────────────────────────────────────────┴──────────────────────────────────────────────────────────────────┘
  
  ---
  Three Most Buildable Workflows Right Now
  
  1. DAY_BRIEFING_COPY → Oracle schema — The structure is proven. Write the Krylo equivalent with convergence state as code, LLM output as summary, 3
  watch factors as lookouts. One afternoon.
  2. Mission feed → Live SSE event feed — Wire FlowController events to an ephemeral feed panel. 3s lifetime, fade 500ms. Shows domain + event type as
  they arrive. Makes the surface feel alive immediately.
  3. Status pill system → CONVERGENCE_PILL_STYLES — Define one mapping object, apply to InspectionPanel + Oracle + Signal Map nodes. One morning. Zero
  guessing across all surfaces.