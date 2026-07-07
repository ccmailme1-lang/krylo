# Dashboard Shell Concept (Entities / Signals / Events / Watchlists)

**Status: DEFERRED — back burner. Not started, not scoped as a WO, no code written.**

## What it is

A proposed new top-level navigational surface, separate from KRYLO's existing Layer 0–4 funnel (Hero → Signal Map → Oracle → Ground Level, which stays locked and untouched). Surfaced via a Context Card design mockup showing a nav bar: `Dashboard | Entities | Signals | Events | Watchlists`.

## Why deferred

Raised in passing alongside a Help Layer (Context Card / HelpMark) redesign discussion. Scope assessment (2026-07-06) found this to be a large, separate initiative — not something to fold into the Help Layer work.

## Size assessment (as of 2026-07-06)

- **Signals, Events** — real underlying data already exists (`surfacerouter.js` dispatch, `CanonicalEvent`/`rkmstore.js` records), but no browsable list/table UI exists for either today.
- **Entities** — partial: `entityregistry.json` + `entityresolution.js` exist, but no entity-profile/browser screen exists.
- **Watchlists** — does not exist anywhere in the codebase. No store, no data model, nothing to build on.
- **Dashboard** (landing tab) — would be built from scratch.

Would sit as a new, separate top-level mode alongside existing Surface/Oracle/Analysis/History modes, not nested inside any of them, and not a replacement for the funnel.

## Next step, whenever revisited

This needs its own scoping pass and Jira ticket before any build — treat as a fresh initiative, not a sub-task of the Help Layer work.
