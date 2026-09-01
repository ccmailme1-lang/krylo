# SPEC — Live Ticker on the Surface View (KRYL-1251)

Status: DRAFT (Founder-directed, 2026-09-01). Blocking acceptance criterion: the
ticker's ordering must be deterministic and evidence-grounded before it ships.

## PROBLEM

The live news ticker (`LiveTicker`) exists only inside the Feeds bay. The Founder
wants it visible from the **Home** nav button (`navMode === 'surface'` — the ConeMap
map view).

But today the feed's ordering score is fabricated: real `/api/news` articles are
assigned `fs = 0.70 + Math.random() * 0.25` in `feedsbay.jsx`, and the whole feed
(and the ticker) is sorted by that. A live ticker on the hero surface visually
implies **current structural relevance**. Random ordering would **manufacture
salience** — the exact failure `FORMATION IS NOT A VERDICT` / §21 prohibits, one
layer up.

## INVARIANT (load-bearing)

> **The ticker may display observations/events, but it MUST NOT imply importance
> through an ordering mechanism that is not grounded in an authored, reproducible
> signal.**

The ticker is a **surface projection of the observable field** — not an analytical
engine. It says, in effect: *"these are current observable signals entering the
field."* The existing analytical machinery decides whether anything structurally
forms.

### Prohibited (any of these is a spec violation)

- random ordering (`Math.random`, unstable sort, insertion order as rank);
- LLM-generated importance scores;
- inferred urgency;
- sentiment-as-importance;
- fabricated relevance / a composite "intelligence" score invented to make the
  ticker look smart;
- a ticker item becoming a **relationship** because two items appear together;
- ticker activity contaminating **Formation**;
- ticker activity contaminating the **decision verdict** or any metric.

## SOLUTION

### Ordering — first implementation

```
published_at DESC, then stable deterministic tie-break (source ASC, then title ASC, then id ASC)
```

Chronological recency is **not** claimed to equal analytical significance — the
strip is explicitly labelled as current signal entering the field, nothing more. A
composite score (`freshness + source recency + domain relevance + corroboration`)
is permitted **only if every component is already authorized by the ontology/spec**
— otherwise it is a fabricated relevance score and is prohibited. Ship `published_at
DESC` now; a grounded composite is a separate, later ticket if ever.

Items with no `published_at` sort last, ordered by the tie-break only (never
promoted, never randomised).

### Data path

```
/api/news
    ↓  usenewsfeed() — one shared hook, one fetch
normalize (title, source, publishedAt, domain, url)
    ↓
deterministic order (published_at DESC + tie-break)
    ↓
LiveTicker  (surface + feeds bay both consume the same hook + component)
```

No `fs` / fidelity score is synthesised for real articles. `FidelityBar` already
renders nothing when `fs == null` — real articles simply carry no fidelity bar
(honest absence), MOCK fixtures keep their authored values for offline dev.

### Placement

`LiveTicker` mounts in `app.jsx` on the surface layer, gated to
`viewportLens === 'NAV_SURFACE'` (CLAUDE.md §8 — surface/orientation chrome must
gate at the lens level, not z-index) **and** `isSurface`. Pinned as a strip
directly under the 56px top bar. It must not overlap ConeMap HUD chrome or the
`GridOverlay`; if space is contested, the ticker yields (it is orientation chrome,
not the active view's content).

Whether the strip shows before surface activation, after, or both, and its exact
visual treatment, is a Founder call — default to **NAV_SURFACE, both states**,
matching the existing Feeds-bay ticker styling, until told otherwise.

## COMPONENTS

| File | Change |
|---|---|
| `src/hooks/usenewsfeed.js` | NEW. `/api/news` fetch + normalize + deterministic order. `{ stories, loading }`. MOCK fallback (authored order) when the endpoint is empty/unreachable. No random anything. |
| `src/components/shared/liveticker.jsx` | NEW (extracted from `feedsbay.jsx`'s `LiveTicker`, unchanged markup). Props: `{ stories, limit = 6 }`. |
| `src/app.jsx` | Mount `<LiveTicker>` in the `isSurface` block, gated `viewportLens === 'NAV_SURFACE'`, pinned under the top bar. |
| `src/components/feeds/feedsbay.jsx` | Migrate to `usenewsfeed()` + the shared `<LiveTicker>`. Remove the `fs: 0.70 + Math.random()*0.25` line. `sorted` becomes the hook's deterministic order. |

No engine changes. No new store. No connector changes.

## VALIDATION

`qa_liveticker_ordering.mjs` (NEW):

1. **Determinism** — same feed snapshot → byte-identical ticker order across 100
   runs. No `Math.random` reachable from the hook or component (grep + a seeded
   run comparison).
2. **Ordering contract** — given fixture articles with known `publishedAt`, the
   output is exactly `published_at DESC` then `source,title,id` ASC. Null
   `publishedAt` sorts last.
3. **State-change semantics**:
   - a new (newer) event prepends and shifts the strip;
   - an event that falls outside the displayed window disappears;
   - no item changes position unless its `publishedAt` or the set changed.
4. **No contamination** — grep: `liveticker.jsx` / `usenewsfeed.js` import nothing
   from `formationinference`, `metricsengine`, `querysynthesis`, `domainintelligence`,
   `adsubject`, `resolveadjudication`; export nothing consumed by them.
5. **Placement** — `app.jsx` mounts the ticker only under `viewportLens === 'NAV_SURFACE'`.

Manual: refresh the surface view with a fixed feed snapshot → identical strip. This
doubles as a **determinism smoke test for the presentation layer** (same input
state → same displayed state).

Build: `npx vite build --mode development` clean. `qa_liveticker_ordering.mjs` green.
Feeds bay renders (ordering now chronological, not random).

## ROLLBACK

Additive except the `feedsbay.jsx` migration. Revert = restore `feedsbay.jsx`'s
local fetch + `fs` line, delete `src/hooks/usenewsfeed.js`,
`src/components/shared/liveticker.jsx`, and the `app.jsx` mount. One commit.

## GUIDELINES

- The ticker is a projection, not an engine. If a change would let it rank, score,
  relate, or conclude, it is out of scope for KRYL-1251.
- The feeds-bay `fs` random-salience defect is removed here as a side effect of the
  shared hook; the broader "feeds bay should have a grounded relevance ordering"
  question is a separate ticket, not this one.
- Chronological order is honest about what it is. Do not relabel it as "importance"
  or "signal strength" anywhere in the UI copy.
