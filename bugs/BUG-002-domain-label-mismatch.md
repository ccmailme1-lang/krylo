# BUG-002 — Domain label disagrees with the content that actually rendered

STATUS: OPEN
FILED: 2026-06-16, second instance confirmed same day
WO: WO-1757
RELATED: BUG-001 (same test runs)

## Second confirmed instance

Query: "Stress-test an 18-month equity-stake entry for Adaptive Co-L..."
Header showed `Anchor: INVESTOR`, `Domain: INVESTMENTS` (per
`ingress.js` line 41: `INVESTOR: 'INVESTMENTS'` — same broker-map
mechanism as the first instance, different lens). But the brief's own
Evidence/Facts section says outright: "Domain routing: GENERAL" — the
content that actually rendered was the GENERAL/open-lens fallback, not
anything investment-shaped. Confirms this is systemic to the
lens-broker-map vs. keyword-router split, not a one-off tied to RETIREMENT
specifically — multiple lenses (RETIREMENT, INVESTOR, and per ingress.js
also TRANSITION) all map to the same `INVESTMENTS` broker domain, and any
of them can collide with whatever the keyword router independently picks.

## Repro

Same query as BUG-001. Header/footer metadata showed:

- Anchor: `RETIREMENT`
- Domain: `INVESTMENTS`
- Action Matrix footer: "— RETIREMENT LENS"

But the actual rendered brief was 100% REAL_ESTATE content (PITI, rate
locks, appraisal gap, property-tax reassessment, "Home purchase decision
analysis") — i.e. `synthRealEstate` ran, not anything investment/retirement
shaped.

## Root cause

Two independent domain-determination systems exist and disagree:

1. **Lens-based broker mapping** (`src/engine/ingress.js`, line 40):
   `RETIREMENT: 'INVESTMENTS'` inside a lens→broker-domain table. This fires
   off the "I'M FOCUSED ON → PLANNING RETIREMENT" chip selection. `Anchor`
   and `Domain` in the header are sourced from this system.
2. **Keyword-based content router** (`src/engine/querysynthesis.js`,
   `detectDomain` / `SYNTH_MAP`): matched "mortgage" in the raw query text
   and routed to `REAL_ESTATE`, which selected `synthRealEstate` as the
   content generator.

Nothing reconciles these two systems. The UI surfaces labels from system 1
and content from system 2 with no cross-check, so they can — and did —
diverge.

## Fix shape (not yet built — needs WO-1757 Go)

Needs an architecture decision, not just a patch: either (a) make the
lens-broker map and the keyword router both feed a single resolved domain
before either label or content is generated, with one taking documented
precedence, or (b) if both must coexist, surface both clearly labeled
distinctly in the UI (e.g. "Lens: RETIREMENT · Content routed: REAL_ESTATE")
rather than presenting one merged-looking Anchor/Domain pair that implies
agreement that doesn't exist. Decision belongs to whoever owns
ingress.js + querysynthesis.js's routing contract — flag for Founder input
before building.
