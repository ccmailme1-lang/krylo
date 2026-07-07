# WO HARDENING — KRYL-969

## HEADER

**KRYL-969 — Identity Evolution Engine (reframed from "Strategic Narrative Evolution Engine")**
Date: 2026-07-05
Author: spec pass per Founder request, grounded against real files and live external API research (not the original secondhand draft)
Target file(s): see Phase 1 File Map below. This document also scopes Phases 2–4 at epic level only — they are NOT built or hardened in this pass.

**NUMBERING NOTE (flag, not resolved here):** `specs/KRYL-974-entity-state-ledger.md` contains a note claiming "KRYL-969... was informal shorthand... not a reserved Jira number." Live Jira (queried 2026-07-05) confirms KRYL-969 is a real, distinct, open ticket ("CONCEPT: Strategic Narrative Evolution Engine"), separate from KRYL-974 ("EntityStateLedger MVP," built, numeric signal/metric snapshots only — no narrative text). These are two different things. This spec is for KRYL-969. The stale note in the KRYL-974 file should be corrected by whoever reconciles Jira next — not done in this pass.

---

## WHY THIS IS AN EPIC, NOT ONE WO

Per §11a Bottle Test question 2 ("single dominant output"), the full concept — capture declared-identity snapshots, extract identity claims, build an identity vector, detect drift, compare against structural evidence — has **five distinct outputs**, not one. Forcing that into a single WO Hardening Template would fail its own Bottle Test. This mirrors how KRYL-975 (Perception Synergy) was filed as an epic with KRYL-976–981 as separately-hardened children. KRYL-969 follows the same discipline:

```
KRYL-969 (epic, this file)
  └─ Phase 1 — Narrative Snapshot Capture      [HARDENED BELOW, zero TBDs — the only build-ready piece]
  └─ Phase 2 — Identity Claim Extraction        [named, not hardened — depends on Phase 1 existing in production]
  └─ Phase 3 — Identity Vector + Drift           [named, not hardened — depends on Phase 2]
  └─ Phase 4 — Structural Comparison              [named, not hardened — depends on Phase 3 + existing SCI/identitykernel]
```

Only Phase 1 is hardened and build-ready in this pass. Phases 2–4 get their own Bottle Test pass each, filed as separate child tickets, once the phase before them is observed running — same sequencing discipline as WO-2004→2005A→2005B and KRYL-975→976-981.

---

# PHASE 1 — NARRATIVE SNAPSHOT CAPTURE

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Capture and append-only-store a timestamped, source-attributed text snapshot of how an entity describes itself (regulatory filing narrative, archived homepage/About text, or self-issued press release), since KRYLO has never recorded this evidence type before.

**Output:** One `NarrativeSnapshot` record per (entity, source, capture date).

---

## 2. BOUNDARY DECLARATION

**Input contract:** an `entityId` (matches `entityresolution.js`'s `buildCanonicalId()` output — same canonical ID space already used across the codebase, no new ID scheme) plus a source selector (`EDGAR | WAYBACK | COMPANIES_HOUSE` — `PRESS_RELEASE` was in the original draft but dropped, see §6/Build Log; its evidence role is now covered by EDGAR Exhibit 99.1 captures under `SOURCE.EDGAR`).

**Output contract:**
```
NarrativeSnapshot {
  entity_id:        string    // entityresolution.js canonical ID — same space as every other module
  source:           'EDGAR' | 'WAYBACK' | 'COMPANIES_HOUSE'
  source_url:       string    // exact filing URL / archive.org timestamped URL / press release URL / Companies House document URL
  captured_at:      string    // ISO-8601 UTC — when THIS ledger wrote the entry (ingestion time)
  content_date:     string    // ISO-8601 UTC — when the underlying content was actually published/filed/archived (may differ from captured_at by years — this is historical backfill, not live-only)
  raw_text:         string    // the extracted narrative text itself, unmodified, no summarization. For COMPANIES_HOUSE/SIC: a serialized code+description string, not free text (see §6 note)
  source_ref: {
    // EDGAR:            { cik, accessionNumber, formType, itemSection }
    // WAYBACK:          { timestamp, originalUrl }        // CDX API's own timestamp format
    // COMPANIES_HOUSE:  { companyNumber, filingId, sicCodes }   // sicCodes present when source content is a SIC reclassification, not a narrative document
  }
  epistemic_class:  'NARRATIVE'   // fixed — uses evidencetiers.js's EXISTING EPISTEMIC_CLASS.NARRATIVE (weight 0.3 in rkmstore.js), no new class invented
}
```

**Explicit exclusions:**
- Does NOT extract identity claims, mission/market/technology fields, or any structured meaning from `raw_text`. That is Phase 2. This ticket stores raw text only.
- Does NOT compute a vector, a drift score, or any comparison. That is Phase 3/4.
- Does NOT write to `entitystateledger.js` (KRYL-974) — that ledger's schema is `signal_snapshot`/`metric_snapshot` (numeric, observed-output-only) and its own header states nothing in the pipeline calls it yet. This is a **sibling** module (`narrativesnapshotstore.js`), following the identical append-only pattern, not a modification or extension of KRYL-974's file.
- Does NOT call `surfacerouter.js` / `dispatchBatch()`. Per §16, this never enters the 0–100 cone-pressure signal path — it is raw evidence storage, same non-goal `structuralfingerprint.js` (KRYL-976) declared for itself.
- Does NOT infer motive, pivot cause, or narrative interpretation of any kind (per Founder's explicit caution on this concept — report evidence, never assert explanation).
- Does NOT touch `identitykernel.js`, `structuralconfirmation.js`, `rkmstore.js`, or any scoring path. Those remain unaware this module exists, same relationship contract KRYL-974 locked for itself.

---

## 3. ZERO DRIFT CONFIRMATION

- [x] Detection layer touched → N/A, this is a new evidence-capture path, not a modification of any existing ingestion/routing/detection logic. No existing detection behavior changes.
- [ ] Scoring layer touched → N/A, no scoring engine is called, read, or modified.
- [ ] Inference layer touched → N/A, zero inference — raw text capture only, unlike KRYL-976/KRYL-980 which recompute inference-derived values. This module is a pure write, not even a recompute.
- [ ] UI layer touched → N/A, engine-only, no UI surface in this ticket.

**Drift notes:** None of the four flags apply — this is the cleanest boundary case in the current codebase: a brand-new evidence type (`EPISTEMIC_CLASS.NARRATIVE`, already defined, weight already set at 0.3 in `rkmstore.js`) captured through three read-only external API calls into one new append-only store. Nothing existing is read for computation, only entityId is shared as a join key.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** An entity's declared self-description (regulatory narrative, homepage/About copy, press releases) often shifts years before that shift shows up in hiring, patents, capex, or partnerships — capturing it as durable, timestamped evidence lets a later phase compare "what they say" against "what they do," surfacing repositioning before it's structurally obvious (§19 mission). This ticket only banks the raw evidence; it does not yet compute the asymmetry.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is a durable, timestamped, source-attributed record of an entity's own declared identity — evidence KRYLO has never captured before, at any point in its history."**

---

## 6. FORMULA / CONTRACT

No scoring formula in this ticket — pure capture, per §1. The contract is the schema in §2 plus these three source-specific fetch contracts:

**EDGAR (extends existing search-index proxy + ONE small net-new document-fetch proxy — correction made during build, 2026-07-05):**
```
GET /api/edgar?q={company}&forms=10-K,S-1&dateRange=custom&startdt={date}&enddt={date}   // EXISTING proxy, unmodified
GET /api/edgar-document?cik={cik}&accession={accessionNoDashes}&file={filename}          // NEW proxy → www.sec.gov/Archives/edgar/data/...
```
Existing proxy (`as-diff/engine.js`, `handleEdgarProxy`) already forwards arbitrary query string to `efts.sec.gov/LATEST/search-index` unmodified — no change needed there, and `edgar8kconnector.js`'s own 8-K-only query params (built in ITS request, not the proxy) are untouched. **Correction found during implementation:** the search-index endpoint only returns filing metadata/hits, not the filing document's actual text — fetching the real Item 1 Business narrative requires a document fetch against `www.sec.gov/Archives`, which is a different host than `efts.sec.gov` and would fail CORS from the browser. `handleEdgarDocumentProxy` (new, `as-diff/engine.js`) forwards that document fetch. Item 1 ("Business") narrative text extraction from the returned HTML is new parsing logic (mechanical tag-stripping + section-boundary regex, not NLP), scoped to `edgarnarrativeconnector.js` only.

**WAYBACK (net-new proxy route + net-new connector):**
```
GET /api/wayback-cdx?url={domain}&from={date}&to={date}&output=json   // NEW proxy → web.archive.org/cdx/search/cdx
GET /api/wayback-snapshot?timestamp={ts}&url={domain}                 // NEW proxy → web.archive.org/web/{timestamp}/{url}
```
Both are free, unauthenticated, publicly documented (archive.org/help/wayback_api.php). Follows the exact existing proxy pattern (`handleEdgarProxy`/`handleGdeltDocProxy` as templates — same cache/error-handling shape).

**PRESS_RELEASE via FMP — DROPPED 2026-07-05 (Founder decision).** `/stable/news/press-releases` (the correct symbol-scoped path, corrected from an earlier wrong guess) returned a live HTTP 402 — restricted to a paid plan the account doesn't have. Rather than leave the source blocked, dropped entirely: `SOURCE.PRESS_RELEASE` removed from the schema enum, `pressreleaseconnector.js` and its backend proxy/keys deleted from the codebase. Replaced by an EDGAR-native alternative below.

**EDGAR EXHIBIT 99.1 (Phase 1.x extension, built same session, per Founder GO) — replaces the dropped FMP source:**
```
runEdgarPressReleaseCapture({ entityName, from, to })   // src/engine/connectors/edgarnarrativeconnector.js
```
Companies routinely attach their own verbatim press release as **Exhibit 99.1** to an 8-K filing (earnings, M&A, executive changes). This reuses 100% of EDGAR infrastructure already built for Phase 1 — no new source, no new API key, no paywall. Mechanism: search 8-Ks via the existing `/api/edgar` proxy → fetch the filing's `{accession}-index.htm` via the existing `/api/edgar-document` proxy → mechanically scan the Document Format Files table for a row whose Type column is `EX-99(.N)?` (SEC's own documented filing convention, not inference) → extract that document's href → fetch and decode it the same way as the Item 1 pipeline. Still `SOURCE.EDGAR`, not a new enum value. Verified end-to-end against a real Apple 8-K: correctly extracted the verbatim "Apple reports fourth quarter results..." press release, 10,322 characters of real text.

**COMPANIES_HOUSE (net-new proxy route + net-new connector, requires API key — UK-registered entities only):**
```
GET /api/companies-house-profile?companyNumber={number}          // NEW proxy → api-sandbox.company-information.service.gov.uk/company/{number} (Test key — swap to production host once a Live key exists, see Build Log)
GET /api/companies-house-filing-history?companyNumber={number}   // NEW proxy → .../company/{number}/filing-history
```
Free, API-key-based (`COMPANIES_HOUSE_API_KEY` env var, same pattern as other keyed connectors), REST/JSON, developer.companieshouse.gov.uk. Two distinct capture modes from the same source: (1) `companyProfile`'s `sic_codes` array — a structured, already-categorical declared-identity signal (no NLP extraction needed) that changes when a company re-files its nature-of-business classification; (2) filing-history entries linking to accounts/strategic-report documents, which for medium/large companies and PLCs contain narrative business-description text (same structural role as EDGAR's Item 1) — **metadata only in Phase 1** (returned as `narrativeCandidates`, never persisted as an empty-text `NarrativeSnapshot` — see Build Log). This is the UK-registered-entity equivalent of the EDGAR source, not a duplicate — extends Phase 1 coverage beyond US filers, same connector pattern.

**COMPANIES_HOUSE (net-new proxy route + net-new connector, requires API key — UK-registered entities only):**
```
GET /api/companies-house-profile?companyNumber={number}          // NEW proxy → api.company-information.service.gov.uk/company/{number}
GET /api/companies-house-filing-history?companyNumber={number}   // NEW proxy → .../company/{number}/filing-history
```
Free, API-key-based (`COMPANIES_HOUSE_API_KEY` env var, same pattern as other keyed connectors), REST/JSON, developer.companieshouse.gov.uk. Two distinct capture modes from the same source: (1) `companyProfile`'s `sic_codes` array — a structured, already-categorical declared-identity signal (no NLP extraction needed) that changes when a company re-files its nature-of-business classification; (2) filing-history entries linking to accounts/strategic-report documents, which for medium/large companies and PLCs contain narrative business-description text (same structural role as EDGAR's Item 1). This is the UK-registered-entity equivalent of the EDGAR source, not a duplicate — extends Phase 1 coverage beyond US filers, same connector pattern.

Units: N/A (no numeric output). Normalization (§16): N/A — explicitly excluded per §2, same as `structuralfingerprint.js`'s precedent.

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| `src/engine/narrativesnapshotstore.js` | NEW — `recordNarrativeSnapshot()`, `getSnapshotsForEntity()`, append-only, mirrors `entitystateledger.js`'s write-rule pattern (§5 below) but stores the schema in §2, not KRYL-974's schema | — |
| `src/engine/connectors/edgarnarrativeconnector.js` | NEW — `runEdgarNarrativeCapture()` (10-K/S-1 Item 1 Business text) + `runEdgarPressReleaseCapture()` (8-K Exhibit 99.1 press-release text, replaces dropped FMP source), both call `recordNarrativeSnapshot()` | `edgar8kconnector.js` — untouched, remains 8-K-only (structural event classification, not narrative capture) |
| `src/engine/connectors/waybackconnector.js` | NEW — calls CDX + snapshot proxies, extracts homepage/About-page text, calls `recordNarrativeSnapshot()` | — |
| `src/engine/connectors/companieshouseconnector.js` | NEW — calls Companies House profile + filing-history proxies, extracts `sic_codes` (persisted) and flags filing-history narrative candidates (metadata only, not persisted) | — |
| `as-diff/engine.js` | ADD five new proxy handlers: `handleWaybackCdxProxy`, `handleWaybackSnapshotProxy`, `handleEdgarDocumentProxy`, `handleCompaniesHouseProfileProxy`, `handleCompaniesHouseFilingHistoryProxy` + five new route lines in the dispatch table (same shape as existing `handleEdgarProxy`/`handleGithubProxy` entries). `handleFmpPressReleaseProxy` was added then removed same session — see Build Log | every existing route/handler — untouched, purely additive |
| `src/engine/entityresolution.js` | none | read-only consumer of `buildCanonicalId()` for `entity_id` |
| `src/engine/evidencetiers.js` | none | read-only consumer of `EPISTEMIC_CLASS.NARRATIVE` |
| `src/engine/entitystateledger.js` | none | NOT touched, NOT extended — confirmed sibling relationship only (§2 exclusions) |

No UI file is in scope for Phase 1.

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES — closes the "no historical self-description evidence exists" gap identified 2026-07-05 with a locked, single schema |
| Does this have a single dominant output? | YES — one `NarrativeSnapshot` record per (entity, source, date) |
| Are all boundaries explicitly defined? | YES — §2 input/output/exclusions, §6 exact fetch contracts for all three sources, no invented numbers |
| Can this be built without touching an undefined dependency? | YES — `entityresolution.js` and `evidencetiers.js` already exist and are read-only inputs; the three external APIs are confirmed live and documented (§6) |
| Does this avoid increasing expressive flexibility in the core? | YES — this is pure evidence capture; zero scoring/routing/UI logic touched |

**Verdict:** PASS

---

## 9. FOUR-AXIS HARDENING RUBRIC (4AR)

**1. Structural Integrity (SI):** No existing invariant is touched — three new proxy routes are additive-only in `as-diff/engine.js`; no existing route, connector, or store is modified. New module has no exported mutator that any other file calls.

**2. Semantic Consistency (SC):** Reuses `entityresolution.js`'s canonical ID space and `evidencetiers.js`'s existing `EPISTEMIC_CLASS.NARRATIVE` (already weighted at 0.3 in `rkmstore.js`) rather than inventing a new identity scheme or epistemic class. `NarrativeSnapshot` is a new noun, but it maps onto the existing narrative-evidence weight already defined — no duplicate taxonomy.

**3. Execution Containment (EC):** Three new connectors + one new store + three new backend proxy handlers. Side effects fully bounded to those new files; the three new proxy routes are network calls to external, read-only public APIs (no write-back to any external system).

**4. Drift Exposure (DE):** Static — the schema in §2 is fixed at write time, same discipline as KRYL-974's §3 lock. No living definition; a future phase that wants to change the schema must version it (`vectorVersion`-style pattern already established in `structuralfingerprint.js`), not silently redefine it here.

**Outcome tag:** PASS

---

## 10. DEFINITION OF DONE

**Verification:** `grep -n "recordNarrativeSnapshot\|getSnapshotsForEntity" src/engine/narrativesnapshotstore.js` confirms both functions exist and are exported. A manual smoke test — real calls to `edgarnarrativeconnector.js` (both Item 1 and Exhibit 99.1 capture) and `waybackconnector.js` against real public companies, plus `companieshouseconnector.js` against a real sandbox test company — produces `NarrativeSnapshot` records with `raw_text` non-empty and `content_date` correctly reflecting historical (not ingestion-time) dates. All of this was actually run during the build, not left as a future check — see Build Log for exact results. `grep -rn "narrativesnapshotstore" src/` confirms zero import sites outside the three connector files (nothing wired into scoring/UI yet, per §2 exclusions).

---

## BUILD LOG — Phase 1 (2026-07-05, EDGAR + Wayback only; FMP/Companies House await API keys)

Built and verified end-to-end against live services (real backend server, real SEC/Wayback responses, not mocked):
- `src/engine/narrativesnapshotstore.js`, `src/engine/connectors/edgarnarrativeconnector.js`, `src/engine/connectors/waybackconnector.js` — all new, per File Map above.
- `as-diff/engine.js` — added `handleWaybackCdxProxy`, `handleWaybackSnapshotProxy`, `handleEdgarDocumentProxy` + 3 routes (the EDGAR document proxy was a correction found during build — see §6 EDGAR note).

Two real defects found and fixed via live smoke testing (not caught by spec review alone):
1. **SEC User-Agent rejection** — `www.sec.gov/Archives` document fetches require a "declared" User-Agent (company + contact), confirmed via SEC's own "Undeclared Automated Tool" error page. Fixed in `handleEdgarDocumentProxy`.
2. **Item 1 extraction false-positive + entity-encoding gap** — the naive "first match of /item 1 business/" heading grabbed the filing's own table-of-contents line, not the real body section, because every 10-K prints all item headings up front. Separately, the real body heading uses numeric HTML entities (`Item 1.&#160;&#160;Business`) which a `&nbsp;`-only decoder does not resolve, so the regex silently never matched the true body occurrence at all — the TOC line was genuinely the *only* match found until this was fixed. Fixed by (a) full numeric/named HTML entity decoding before whitespace collapse, (b) selecting the first Item-1-to-next-Item span exceeding `MIN_BODY_LENGTH = 1000` chars rather than the first regex match. Verified against a real Apple 10-K: correctly extracts the 15,151-character real Business narrative, TOC excluded.

`ciks` (not embedding a CIK into the `q` string) is the correct EDGAR full-text search filter param — corrected in `edgarnarrativeconnector.js` after a live 0-hit false negative.

## BUILD LOG — Phase 1 continued (2026-07-05, FMP + Companies House)

Built: `src/engine/connectors/companieshouseconnector.js`, plus `handleCompaniesHouseProfileProxy`/`handleCompaniesHouseFilingHistoryProxy` + routes in `as-diff/engine.js`. `pressreleaseconnector.js` and `handleFmpPressReleaseProxy` were also built this session, then deleted after the FMP paywall finding below — see item 2 and the EX-99.1 replacement further down.

**Design correction during build:** `companieshouseconnector.js`'s original draft recorded a `NarrativeSnapshot` with empty `raw_text` for filing-history entries whose document text isn't fetched in Phase 1 (no accounts-document-text proxy exists yet). Caught before shipping — an empty-text snapshot is a fabricated placeholder, not captured evidence, which is the §22 absence-is-signal failure mode. Fixed: filing-history candidates are returned as plain metadata (`narrativeCandidates`), never persisted to the store. Only the SIC-code capture mode (real, complete evidence) writes to `narrativesnapshotstore.js`.

**Two real endpoint-level findings, confirmed live, not guessed:**
1. **FMP path correction** — `/stable/press-releases` (originally spec'd) does not exist (404). Correct path is `/stable/news/press-releases`, confirmed via direct testing. Fixed in `handleFmpPressReleaseProxy`.
2. **FMP paywall → source dropped, replaced** — the corrected, symbol-scoped, historical press-releases endpoint returns **HTTP 402 "Restricted Endpoint... upgrade your plan"** on the free tier registered for this ticket. Founder decision: drop FMP entirely rather than leave it blocked (`pressreleaseconnector.js` deleted, `SOURCE.PRESS_RELEASE` removed from the schema). Replaced same session by `runEdgarPressReleaseCapture()` in `edgarnarrativeconnector.js` — SEC 8-K **Exhibit 99.1** filings routinely contain a company's own verbatim press release, reusing 100% of already-built EDGAR infrastructure (the existing search proxy + document proxy), no new key, no paywall. Mechanism: fetch the filing's `{accession}-index.htm`, mechanically scan its Document Format Files table for a row typed `EX-99(.N)?` (SEC's own documented convention), extract that document's href, fetch and decode it. Verified end-to-end against a real Apple 8-K: correctly extracted the verbatim "Apple reports fourth quarter results..." release, 10,322 characters.
3. **Companies House Test-key host mismatch** — `api.company-information.service.gov.uk` (production host) rejects Test-type API keys with a clean 401, even with correct Basic-Auth formatting. Test keys must call `api-sandbox.company-information.service.gov.uk` instead — confirmed via Companies House's own docs and fixed in both proxy handlers (with an inline comment flagging that this must be swapped back to the production host once a Live key exists). **Sandbox data is synthetic** — real company numbers (e.g. Tesco PLC) return 404 there; verified instead against a real synthetic test company (`69178958`) created live via Companies House's Sandbox Test Data Generator API. SIC-code capture confirmed fully working end-to-end (`raw_text: "71200"`, correct schema, retrievable via `getSnapshotsForEntity`). Filing-history endpoint returns an error in sandbox (no real filing documents exist for synthetic companies) — connector degrades gracefully (error captured, no crash, no fabricated candidates), and the code path matches Companies House's documented filing-history schema, but is only fully verifiable against a Live key + real company.

**Net Phase 1 status (final, this session):** three sources, EDGAR (Item 1 + Exhibit 99.1) and Wayback fully verified against real production data; Companies House SIC-code capture fully verified (sandbox), filing-history path built but unverified against real data (needs a Live key). FMP dropped — not part of Phase 1.

## NOTES

Phases 2–4 (Identity Claim Extraction, Identity Vector + Drift, Structural Comparison) are intentionally **not** hardened in this pass. Per the Founder's own six open questions (2026-07-05 comment on this ticket, Jira comment 10461), each of those phases has its own unresolved design questions (extraction schema, change-detection threshold, lead/lag model) that cannot honestly be filled without either inventing an answer or building Phase 1 first and observing what real snapshots actually look like. Filing them now with placeholder formulas would violate §6's explicit rule against invented numbers. They should be spec'd as separate child tickets once Phase 1 is built and has real data flowing.

## GUARDRAILS FOR PHASE 2–4 (LOCKED — read before drafting any of those specs)

These bind whoever writes and builds Phases 2–4, regardless of session or engineer. They exist so each phase's spec gets judged against the same discipline Phase 1 was held to, not re-litigated from scratch.

**REVISED 2026-07-07 (Founder doctrine refinement):** *"We don't predict. We detect"* is refined, not replaced — *"We do percept. We don't deceive. We are not in the business of Truth. We present the data as it exists. We explore the perceived value, good or bad."* This changes Guardrail #4 specifically: interpretation/inference is not banned outright — it is banned from being presented AS DETECTED FACT. The same discipline already locked elsewhere in this codebase applies here: `statecontract.js` (DEF-1863) separates `TERMINAL | TRANSITIONAL | PROJECTION`; §18's Metrics Truth Engine separates Realized (observed) from Projected (assumed) and requires both be labeled, never conflated. Phase 2–4's interpretive output follows the identical pattern — labeled as perception, never asserted as detection.

1. **No NLP/ML models without a separate, explicit Founder decision.** Phase 1's extraction (Item 1 boundaries, Exhibit 99.1 row-typing) is mechanical regex on SEC's own documented structural conventions — zero learned/probabilistic behavior. Phase 2's "claim extraction" must default to the same standard (keyword/pattern/structural rules) until a future WO explicitly authorizes a model and defines its failure mode. Summarization, paraphrase, or "understanding" text is out of bounds by default. Note this is orthogonal to Guardrail #4's revision below: #1 governs HOW claims are pulled out of raw text (mechanically, no model); #4 governs WHETHER an interpretive/causal narrative can be surfaced at all (yes, if labeled as perception). Neither guardrail licenses the other.

2. **No new evidence type or epistemic class.** Everything in this epic uses `EPISTEMIC_CLASS.NARRATIVE` (already defined, weight 0.3, `rkmstore.js`). Phase 2–4 do not invent `EPISTEMIC_CLASS.DECLARED_IDENTITY` or similar — per §23 Orthogonal Axis Integrity, a new axis needs its own audit, not a convenience add.

3. **No inference feeding back into scoring/routing.** Same rule Phase 1 locked for itself (§2 exclusions): `identitykernel.js`, `structuralconfirmation.js`, `rkmstore.js`, `surfacerouter.js` stay unaware these phases exist unless a *separate* WO explicitly wires that connection — and that WO must justify it against §21 (route-don't-aggregate) and §23 (orthogonal axes), not assume it.

4. **Motive/cause/narrative interpretation is permitted ONLY when explicitly labeled as perception, never as detected fact.** Revised 2026-07-07 (see doctrine note above) — the original 2026-07-05 rule was a flat ban; it's now a labeling requirement. Concretely: `"declared identity shifted from X to Y, N% structurally confirmed, evidence for/against"` is a **detection** — no label needed, it's directly observable. `"the company pivoted because Z"` is a **perception** — it MUST carry an explicit tag (e.g. `epistemicMode: 'PERCEIVED'` or equivalent, mirroring `statecontract.js`'s `STATE_TYPE.PROJECTION`) and must never be emitted in the same field or surface as a detection without that tag. Silently blending the two — presenting a perceived causal story with the same visual/schema authority as a detected fact — is the actual violation, not the act of interpreting itself. This applies to Phase 4's comparison output most of all, since that's where the temptation to blur the two is highest.

5. **No invented thresholds.** `MIN_BODY_LENGTH = 1000` in Phase 1 was derived by testing against a real filing, not guessed. Phase 2's claim-extraction confidence, Phase 3's drift threshold, and Phase 4's divergence-significance cutoff must each be derived the same way — pull real Phase 1 data first, observe what separates signal from noise, then lock the number with the evidence cited in the spec. A WO with `Formula: TBD` per §6 is correctly BLOCKED, not a placeholder to fill in later with a guess.

6. **Absence is not zero.** If a company has no Wayback captures, no 10-K (private/foreign filer), or no press releases in a window, Phase 2–4 must classify that per §22 (STRUCTURAL / TEMPORAL / ANOMALOUS / FILTERED absence) — never silently treat missing snapshots as "no drift" or default a comparison to neutral.

7. **Stay inside the six-domain lock.** TECHNOLOGY · CAPITAL · KNOWLEDGE · LABOR · MEDIA · OWNERSHIP remain the only domains anywhere in KRYLO (§17). Identity claims extracted in Phase 2 get mapped onto these, not a new taxonomy of "business categories."

8. **Each phase still owes its own Bottle Test + 4AR pass.** Phase 1 was hardened as one WO because it had one dominant output (`NarrativeSnapshot`). Phases 2, 3, and 4 each have their own single dominant output (`IdentityClaims`, `IdentityDrift`, `DeclaredVsObserved`) and must be hardened as three separate WOs, not bundled — bundling them would fail Bottle Test question 2 the same way treating the whole epic as one WO would have.
