# Guest Pilot — Verified Findings Report
**Date:** 2026-09-22
**Scope rule applied throughout:** nothing below is included unless it was directly confirmed by reading the actual code, running an actual command against the live system, or checking an actual deployed artifact. Anywhere the evidence is a confirmed *mechanism* but not confirmed to be *what happened in a specific instance*, that distinction is stated explicitly — it is never collapsed into a flat claim.

**UPDATE (same day, later):** the open item in Section 2 ("Still open") was resolved. See Section 5 — the actual root cause was found, fixed, and reproduced clean three times against the real guest query, across three different resolved domains (CAPITAL, LABOR, TECHNOLOGY). Section 2's original finding is left as written below for the record; Section 5 is authoritative on what the real cause and fix turned out to be.

---

## SECTION 1 — CONFIRMED DEFECTS, FIXED, VERIFIED LIVE

### 1.1 Telemetry events not attributed to a guest
- **Defect confirmed:** `src/engine/telemetry.js`'s `emitTelemetry()` never attached the active guest's profile id. Only one call site in the entire app (`src/app.jsx:926-928`, the `session_open` event) explicitly passed `profileId` — every other event type (`action_dispatched`, `projection_generated`, etc. — the majority of volume) was emitted with no profile id at all.
- **Verification method:** `grep -rn "profileId" src/` across the whole app — exactly one call site found.
- **Fix applied:** `telemetry.js` now attaches `getActiveProfile()` to every event at the single emission point, unless the caller already set one explicitly.
- **Deploy verified:** confirmed via `curl` against the live bundle (`index-BWkqvulj.js`) that the fix code is present in what krylo.org actually serves, not just in source.
- **Backfill run:** a one-time script mapped `session_id → profile_id` from every `session_open` row that had a real profile id, and applied it to other rows in the same session. Result: **108 of 5,054 rows recovered.** The remaining 4,943 rows have no recoverable signal — their own `session_open` row also had no profile id (pre-dates this fix), so there is nothing in the file to reclaim them from.
- **NOT independently confirmed:** that a brand-new session started after the fix deployed produces a `profile_id`-populated row end-to-end in a live browser. What was checked instead: 112 events in the 8 minutes after deploy still showed `profile_id:null`, and that window contained **zero `session_open` events** — meaning those rows belong to a session that began before the fix existed, not a new one. Plausible, evidence-backed, but not the same as directly observing a fresh post-fix `session_open` row. Should be re-checked next time a genuinely new session starts.

### 1.2 Guest login always failed (case-sensitivity)
- **Defect confirmed:** `src/components/surface/profilepicker.jsx` compared `code.trim().toLowerCase()` against `TEST_PROFILES` ids, which are stored uppercase (e.g. `'FHFFBAJS'`). `'fhffbajs' === 'FHFFBAJS'` is always `false` — every guest code, typed exactly as printed on their card, could never match.
- **Fix applied:** case-normalized `findProfile()` helper; `setActive()` now stores the canonical-cased id from the matched profile, not the raw input.
- **Deploy verified:** confirmed via `curl` against the live bundle that the fixed comparison is present.
- **NOT independently confirmed:** an actual successful login by a real browser after the fix (no browser automation tool available this session — verified at code/bundle level only).

### 1.3 Lime color did not match the locked spec
- **Defect confirmed:** `--lime: #c8ff00` in guest orientation/questionnaire pages and the invitation email template, vs. CLAUDE.md §6's locked `#66FF00`.
- **Fix applied and deploy-verified** via curl against both live pages.

---

## SECTION 2 — REPRESENTATION-SPLIT DEFECT (Target Packet vs. Export Brief), CORRECTED FINDING

This section was revised after the first pass named the wrong cause. The corrected finding below is the one that survived direct code verification.

### 2.1 What was ruled out
`synthGeneral()` (`src/engine/querysynthesis.js:1018`) does contain hardcoded WHO/WHAT/WHEN/WHERE text (lines 1100-1105: `"Timeline not specified"`, `"No geographic or market-specific context detected"`) that ignores signals the same function already computes (`hasDecision`, `hasTimeline`, lines 1033-1043). That is a real defect in the code as written. **But it is very unlikely to be what the guest actually saw in the "art business / UK-EU expansion" screenshots**, because:
- A query containing explicit canonical-domain vocabulary (the guest's query literally contains the words "capital" and "labor") is classified by `classifyCanonicalDomain()` (`src/engine/canonicalresolution.js:74`) as `resolved: true`.
- `detectDomain()` (`querysynthesis.js:276-287`) checks exactly this condition and, when resolved, returns `primary: 'GENERAL'` deliberately so the query routes to the **canonical resolver** (`synthCanonical()`), not to `synthGeneral()`. This routing exists specifically to prevent `synthGeneral()`'s "canned template" behavior — confirmed by the code's own comment block at `querysynthesis.js:4407-4413`.
- `synthCanonical()`'s two return shapes (`canonicalresolution.js:141-148` withheld, and `:173-188` success) were both read in full. **Neither one sets a `fiveWs` field.** Confirmed by direct read, not inference.
- The canonical-resolver code itself (`NO_LIVE_SIGNAL` / `NO_DOMAIN_EVIDENCE` strings) is confirmed present in the *current live production bundle* (`curl` count = 1) — this is not a stale-deploy situation, the feature has been live for a while (git log shows the originating commit, `d36d935`, is old, not recent).

### 2.2 What was confirmed instead — two real, independent divergence mechanisms

**Mechanism A — cached vs. fresh synthesis, with different inputs, by design.**
- `intelligencebrief.jsx:419`: `return session.tensor?.synthesis ?? synthesizeQuery(session);` — **prefers a cached copy** of the synthesis result if one exists on the session.
- `targetpacket.jsx:281`: `const synthesis = useMemo(() => synthesizeQuery(session), [session]);` — **recomputes fresh** every render, from the live session object.
- The cached copy is written exactly once, at query submission (`analysisidlefield.jsx:1206`): `synthesizeQuery({ query: seedQuery.trim(), lens: effectiveLens, domain, tensor: { domainLock: tensor.domainLock } })`. This call is a **deliberately minimal object** — the code comment directly above it (lines 1200-1204) states `structuralRefinements` are "deliberately NOT included in the object passed to synthesizeQuery() below."
- `targetpacket.jsx`'s fresh call instead passes the entire live `session` object, which does carry `session.tensor.structuralRefinements` (set one line earlier, `analysisidlefield.jsx:1205`).
- `querysynthesis.js:4367-4369` reads exactly this field (`session.tensor?.structuralRefinements`) to compute `canonicalDomainOverride`, which can change which canonical domain gets classified and therefore change the routing/result entirely.
- **Net effect, confirmed by code path, not by observing this specific guest session:** if a guest interacts with a structural-refinement chip after submitting a query, the Target Packet (fresh compute) can reflect that change while the Export Brief (cached compute) cannot, because the cached call was explicitly built to exclude that input. This is a real, reproducible-by-inspection mechanism for the two panels to diverge on the same session. **Whether this specific mechanism is what produced the exact screenshots reviewed today is not confirmed** — that would require knowing whether a refinement chip was used in that session, which is not visible from the code alone.

**Mechanism B — legitimate `WITHHELD` states read by guests as "broken."**
- A separate guest ("J") reported, independently and unprompted: *"I played around last night but didn't really have much luck, all of the questions I asked came back with no real response. Even when I used the prompt you gave."*
- This is directly consistent with `synthCanonical()`'s `NO_LIVE_SIGNAL` withhold path (`canonicalresolution.js:138-148`): when a query classifies to a real canonical domain but the live domain-pressure field has zero signal count for that domain at query time, the system correctly withholds rather than fabricating a result (per §22, confirmed by the code's own comments as intentional). **This is the system behaving as designed, not a bug** — but from a guest's perspective, a withheld/absent result and a broken product are indistinguishable. This is a real, evidence-corroborated finding, not a bug fix candidate — it is a product/data-availability observation: if the live signal field is frequently empty for the domains guests are asking about, guests will frequently see nothing, by design.

### 2.3 Still open
Whether Mechanism A, Mechanism B, or something else specifically produced the exact contradiction visible in today's two screenshots (Target Packet showing populated Frame Anchoring data; Export Brief's 02 Body showing generic/contradictory WHO/WHAT/WHEN/WHERE text) was not resolved with full certainty. Both mechanisms are independently confirmed to exist in the code and are each independently capable of producing guest-visible inconsistency. Resolving which one (or both) fired for that specific session would require either browser-level reproduction (not available this session) or adding temporary diagnostic logging to a live session, neither of which was done.

---

## SECTION 3 — ADDITIONAL PIPELINE STAGES TRACED

### 3.1 Domain detection gates (`querysynthesis.js:254-330`, `detectDomain()`)
Read in full. Confirmed gate order:
1. Philanthropic-capital gate (regex, hard lock) — `:259-261`
2. Protected-entity gate (medical/disability, hard lock) — `:265-268`
3. `resolvePrimary()` + `scoreDomains()` keyword scoring — `:270-271`
4. Intent Lock Gate (DEF-1864): zero keyword score + zero canonical-lexicon match → `AMBIGUOUS`, `resolutionEligible: false` — `:276-289`
5. Gravity tie-breaker (WO-1879): only fires on a close two-way score tie, breaks it using live domain pressure magnitude, never overrides a compound-rule result — `:301-312`
6. Returns `{ primary, weights, state, entropy, coActive, resolutionEligible }` — `:322-329`

### 3.2 Canonical domain classification (`canonicalresolution.js:74-117`, `classifyCanonicalDomain()`)
Read in full. Confirmed: pure regex-lexicon matching (`DOMAIN_LEXICON`, 6 domains, hand-authored regex lists, `:27-58`), zero hits → `abstained: true`; otherwise `primary` = domain with most hits, `confidence` = a bounded function of dominance × evidence depth (`:107-111`), `coActive` = domains within one hit of the winner (`:114`). No ML, no external call — fully deterministic and inspectable from the query text alone.

### 3.3 Canonical synthesis / live-signal gate (`canonicalresolution.js:130-189`, `synthCanonical()`)
Read in full — see Section 2.2, Mechanism B for the withhold gate. Confirmed: when signal is present, `confidence`, `direction`, and `momentum` are derived arithmetically from `getAllDomainPressures()` (a live field), never a static/mock value — matches the file's own stated "TWO HARD RULES" contract (`:11-18`).

---

## SECTION 4 — REQUESTED BUT NOT REACHED

The following stages of the full query→render pipeline were **not** traced with the same evidence standard as Sections 1-3, due to time. Listed explicitly rather than omitted or guessed at:
- `querycontext.js`'s `buildQueryContext()` internals (numbers/entities/geo/assetClass extraction) — only its existence and call signature were confirmed, not its internal gates.
- `frameclassify.js`'s `classifyFrame()` anchor-building logic beyond what was needed for Section 2 (subject resolution states, `NO_FRAME`/`PORTFOLIO_FRAME`/`MARKET_THEME` branches).
- Entity/subject resolution (`entityresolution.js`, `subjectscope.js`).
- RECONN Category A (`src/engine/reconnpayload.js`) — relationship coverage, structural coverage, temporal state gates.
- Formation admission (`formationinference.js` / the Formation contract).
- Narrative Assembly's 8 stages (`narrativeassembly.js`).
- Convergence classification (`convergenceclassifier.js`).
- All ~40 `synth*` functions in `querysynthesis.js` other than `synthGeneral` — not individually audited for the same hardcoded-fallback pattern found in `synthGeneral`.

Continuing this trace to full completion would use the same method as Sections 1-3: read the actual gate code, cite file:line, and state explicitly what is confirmed vs. not, for each remaining stage.

---

## SECTION 5 — ACTUAL ROOT CAUSE, FIX, AND CLOSURE (confirmed, same day, after Section 2)

Section 2's open question was resolved with a live runtime diagnostic (temporary, since removed) added to `synthesizeQuery`'s three return paths, surfaced directly in the rendered Export Brief. Re-running the guest's exact query with it live gave a definitive answer instead of further static-analysis guessing.

### 5.1 Confirmed root cause
`vector.primary` reached `synthesizeQuery` as a raw canonical domain name (e.g. `'TECHNOLOGY'`) via `session.tensor.domainLock`, **not** via the normal `detectDomain()` classification path. `SYNTH_MAP` (the dispatch table `synthesizerFor()` uses) only has vignette-style keys (`GENERAL`, `STARTUP_FINANCE`, `REAL_ESTATE`, etc.) — a bare canonical domain name like `'TECHNOLOGY'` is not one of them, so `synthesizerFor(vector) ?? synthGeneral` silently fell through to `synthGeneral()`, producing its hardcoded, non-live-aware WHO/WHAT/WHEN/WHERE text (confirmed by exact string match against `querysynthesis.js:1098-1105`) — while the live-signal-grounded confidence/momentum decoration (`groundSignalMetrics`, a separate seam) still ran on top of it, producing the internally-contradictory packet from the original screenshots (generic template text sitting next to a real "Live LABOR signal: X/100..." line).

`domainLock` itself traced back to `analysisidlefield.jsx`'s local `selectedDomains` state (a clicked domain pill). That state is only ever cleared by `resetSession()`, wired to the explicit "New Query" button — `historybay.jsx`'s RE-RUN button creates a new session directly (`createSession(id, 'OPEN', entry.query)`) and never called it, so a pill selected during any earlier, unrelated query silently carried into every re-run afterward. This exact failure mode was already named and partially addressed once before — `resetSession()`'s own comment cites it as "GAP-24" — but the fix was never wired into the RE-RUN entry point, only the manual "New Query" button.

### 5.2 Fixes applied (all deployed and verified live)
1. **Lifecycle fix** — `useanalysisstore.js` gained a `pendingDomainReset` flag + `requestDomainReset()`/`clearDomainResetRequest()` actions. `historybay.jsx`'s RE-RUN now calls `requestDomainReset()` before creating the new session; `analysisidlefield.jsx` watches the flag and clears its local `selectedDomains` when set. Closes the actual lifecycle gap.
2. **Engine backstop** — `querysynthesis.js`: a `domainLock` carrying one of the six canonical domain names (via `isCanonicalDomain()`) now routes through `synthCanonical()` directly, with an explicit override, instead of being excluded from that branch and falling through to `synthGeneral`. Protects against this exact failure mode even if a stale/invalid domainLock reaches the engine by some other path in the future.
3. **P4 Action Matrix subject gate** — `actionmatrix.jsx`: the gate that decides whether to show the full ranked Action Matrix (rank/risk-score/"ENGINE LEV-02 ARBITRATED") required both `subj.kind !== 'ENTITY'` AND `!synthesisIsDomainAnchored(synthesis)`. Once the engine backstop (fix 2) made domain-anchored-but-no-subject queries resolutionEligible, the second half of that AND started failing, letting a fabricated ranked action set render next to a packet that said `DECISION VERDICT: NOT PRODUCED` / `NO SUBJECT RESOLVED`. `synthesisIsDomainAnchored()` itself was correct for its actual purpose (real vs. template analysis) and was not changed; the gate now checks `subj.kind !== 'ENTITY'` alone, since ranked actions require a resolved subject regardless of domain-level signal.
4. **Brief copy reconciliation** — `intelligencebrief.jsx` only (no engine/synthesis changes): for the domain-anchored/no-subject state, BLUF and DISCUSSION previously showed contradictory language — BLUF fell back to a generic "No synthesized read is available for the X domain," while DISCUSSION showed the engine's `assessment` text ("Resolved to LABOR with 6 live signal(s)..."), whose "Resolved to" wording reads as subject resolution next to a header saying `SUBJECT: NO SUBJECT RESOLVED`. Both now derive from the same underlying synthesis fields (`queryDomain`/`signalCount`/`direction`/`confidence`/`momentum`) with consistent "frame recognized... field-level, not subject-scoped" language.

### 5.3 Verification
Reproduced against the guest's actual query ("Automation Labor Displacement") three times after all four fixes, via History's RE-RUN (the exact broken entry point), landing on three different resolved domains across runs (CAPITAL, LABOR, TECHNOLOGY — live signal field naturally varies run to run, not itself a defect). All three times: domain frame correctly recognized, `SUBJECT: NO SUBJECT RESOLVED`, `DECISION VERDICT: NOT PRODUCED`, BLUF and DISCUSSION in agreement with no "Resolved to X" contradiction, P4 showing the honest `NO DOMAIN-ANCHORED STRUCTURE` state with zero fabricated actions/scores.

**Status: Complete.**
