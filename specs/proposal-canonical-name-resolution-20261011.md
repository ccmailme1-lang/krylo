# Proposal: canonical name resolution from the SEC listed-company file

Status: PROPOSAL for ratification. Nothing here is built. Local and unpushed. Date 2026-10-11. Follows DEF-1406 (sentence openers), which fixed subject SELECTION; this covers subject RESOLUTION.

## 1. Ticket definition (CLAUDE.md six fields, with the requested headings)

| Field | Definition |
|---|---|
| 1. Original intent / Problem | A selected subject must resolve to one canonical identity (CIK). Today a plain name whose SEC filing-index lookup is flooded by look-alike registrants ("Ford": only Ford ABS trusts in the 100-hit window) or that is misspelled ("Frod", "Tesle", "Ford Motor Compnany") never resolves, so no observation, relationship or formation is attributed to it. |
| Objective | Resolve names to a CIK from a canonical listed-company name source, deterministically and with disclosure; never bind an approximate or ambiguous name silently. |
| 2. Acceptance criteria | Section 6. |
| Scope | Name lookup + safeguards + one engine route + the unresolved-subject message. Not in scope: relationship types for TECHNOLOGY/KNOWLEDGE/LABOR/MEDIA (blocked), private companies, non-US filers without a US ticker, any change to how observations/relationships are admitted once a CIK is known. |
| Approach | Sections 2 to 5. |
| 3. Current implementation state | Verified 2026-10-11 against the live SEC index (via the local engine): "Ford Motor" verifies; "Ford", "Ford Motor Company", "Frod", "Fordd", "Frod Motor", "Tesle", "Netflx" return NO_MATCH. Static registry (59 entries) lacks Ford, Intel, Netflix; those rely on runtime admission (`secfileradmission.js`, KRYL-1380). |
| 4. Dependencies | KRYL-1380 (admission), KRYL-1372/DEF-1406 (subject selection), KRYL-1398 (snapshot: admission is a registered lookup). |
| 5. Superseded | No. Extends KRYL-1380's verification rule; does not replace it. |
| 6. Maps to product model | Yes: subject first, identity by CIK, evidence-bound. |

## 2. Canonical name source (evaluated)

`https://www.sec.gov/files/company_tickers.json` (fetched 2026-10-11, HTTP 200, 799 KB): 10,435 rows `{cik_str, ticker, title}`; one row per ticker/share class, so Ford appears 4 times (F, F-PB, F-PC, F-PD) under CIK 37996, Oracle twice. `company_tickers_exchange.json` (524 KB) adds the exchange. Properties:
- Legal name as registered ("FORD MOTOR CO", "Tesla, Inc.", "ORACLE CORP") and CIK in one place: the identity anchor the project already requires.
- Lists only registrants with a ticker, which equals existing admission criterion 3 (listed). It omits ABS trusts, so the "Ford" flooding cannot occur.
- Public SEC data, requires a descriptive User-Agent; it carries legal names only, **no aliases** ("Google" is not in it: Alphabet Inc.; "Facebook" is not Meta). Aliases stay the job of the registry and of the user's confirmation (section 4).
- Not authoritative for "is this a reporting company with annual filings": the existing filing-index check (10-K/20-F/40-F within 3 years, CIK equality) remains the verification step, now run BY CIK.

Alternative considered: `browse-edgar?company=` prefix search (covers non-listed filers, returns trusts again, HTML/Atom, extra route). Not chosen.

## 3. Resolution path (query text to snapshot)

1. `subjectScope(query)` -> `buildQueryContract` selects the subject text (DEF-1406). Registry `resolve()` is tried first (unchanged: a registered entity always wins).
2. Unresolved subject text is offered to admission (`topicconnectors.js` ~line 48, `admitPublicFiler`). **New:** before the filing-index search, `lookupListedName(text)` queries the name source (section 4 tiers). Outcome EXACT or UNIQUE_PREFIX yields one CIK; others yield no CIK.
3. With a CIK: `verifyPublicFiler` runs the existing annual-filings check restricted to that CIK (replaces the name-based search that was flooded). Verified -> `createEntity` with `identifiers.edgar = CIK`, alias = the text the user typed, `admissionEvidence` stating the source file, row, tier and as-of date. Event `krylo-entity-admitted` re-scopes the subject.
4. Entity-scoped connectors run by CIK (`fireEntityScoped`): subject-bound observations; ownership/capital-event relationships go through `admitAndProject` (single write path, unchanged); the durable store and the analytical snapshot freeze them. The snapshot's `admission` lookup records the tier and the candidate list so Analysis, MAP and History can show it.
5. Nothing in steps 3 to 5 changes: identity only; no relationship is created by name resolution.

## 4. Identity safeguards

Tiers, evaluated in order on the normalised name (existing `normalizeEntityName`, legal suffixes stripped), over distinct CIKs (share classes collapse to one):

| Tier | Rule | Behaviour |
|---|---|---|
| EXACT | normalised base equals exactly one CIK's base | binds (then verified) |
| UNIQUE_PREFIX | query (>= 4 characters) is a word-prefix of exactly one CIK's base ("Ford" -> FORD MOTOR CO) | binds, disclosed as prefix |
| AMBIGUOUS | EXACT or prefix gives 2+ CIKs ("Meta": Meta Platforms, Meta Critical Minerals) | nothing binds; candidates listed (existing AMBIGUOUS behaviour preserved) |
| NEAR | no exact/prefix; one CIK within edit distance 1 (names < 8 characters) or 2 (longer), Damerau-Levenshtein on the leading words, and legal-suffix words tolerate a misspelling ("Compnany") | **never binds.** Subject stays UNRESOLVED and the message says: "'Frod' is not a registered name. Closest listed registrant: FORD MOTOR CO (CIK 0000037996), not assumed. Re-ask with that name to analyse it." |
| NONE | otherwise | unresolved, as today |

Rules: approximate matching only ever produces a labelled suggestion; confirmation is the user re-submitting the suggested name (the typed name then resolves by EXACT). Two or more NEAR candidates are listed, none promoted. A suggestion is never written to the registry, the store or a snapshot as an identity. All tiers are recorded in the admission log.

Prototype run on the real file (read-only, 2026-10-11): Ford Motor Company EXACT; Ford UNIQUE_PREFIX; Frod, Fordd, Frod Motor, Tesle, Netflx each one NEAR candidate; Meta two prefix candidates (AMBIGUOUS); **"Ford Motor Compnany" returned NONE** because the misspelt suffix is not stripped, so the suffix tolerance above is a required part of the design, not an option.

## 5. Routing and deployment boundary

- New engine route `GET /api/sec-names?name=<text>` in `as-diff/engine.js`: the engine downloads the SEC file server-side (descriptive User-Agent, no browser CORS), caches it in memory and on disk with the SEC `as-of` date, refreshes at most daily, and answers with tier, candidates (`name`, `cik`, `tickers`), source and as-of. The browser never receives the 10k-row file. Follows the existing `/api/edgar` convention; local vite proxy entry added beside `/api/edgar`.
- **Production:** a new `/api/*` route needs its own nginx `location` block or it falls to the :3001 catch-all. Required rule (specified only): `location /api/sec-names { proxy_pass http://127.0.0.1:<krylo-api port>; }` matching the `/api/edgar` block. **Not applied, not deployed, not exposed** without the Founder's explicit approval; `deploy.sh` is not touched. Public-name data only, no secrets; read-only; rate-limited by the daily cache.
- `/v1/canonical-store` stays unexposed, unchanged.

## 6. Acceptance cases

| Input | Required outcome |
|---|---|
| Ford Motor Company | EXACT, CIK 0000037996 verified, subject-bound analysis |
| Ford Motor Compnany (original misspelling) | NEAR: suggestion FORD MOTOR CO, not bound |
| Ford | UNIQUE_PREFIX -> FORD MOTOR CO, disclosed as prefix |
| Frod, Fordd | NEAR: suggestion only, not bound |
| Tesle | NEAR: suggestion Tesla, Inc., not bound (Tesla is registered; a registry-level suggestion works without the route) |
| Meta | AMBIGUOUS, candidates listed, nothing bound |
| Across all six domains ... Oracle / Tesla (C07, C11) | unchanged: registry ENTITY |
| Existing resolved subjects (Sysco, Boeing, Intel ...) | unchanged binding and relationship counts |
| Source unreachable | falls back to today's filing-index path; outcome LOOKUP_FAILED stated |

Verification plan: a recorded fixture of the SEC file rows used (no 800 KB commit), unit suite for tiers and safeguards (no network), a live check of the cases above through the local engine, existing admission/subject suites green, C07/C11 and two registered subjects re-run once. No rescoring until the capability change is complete.

## 7. Open decisions for the Founder

1. Ratify the tiers (in particular: prefix of 4+ characters binds when unique; NEAR never binds).
2. The suggestion line is new text in the unresolved-subject message (no new control, no layout change); confirm that is acceptable, or specify the control.
3. Approve a local `/api/sec-names` route (production exposure remains a separate approval).
