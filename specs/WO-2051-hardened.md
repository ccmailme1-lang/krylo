# WO HARDENING — Grounded Signal Integration
## Thunder in a Bottle — Bottle Test v1.0

---

## HEADER

**WO-2051 — Grounded Signal Integration**
Date: 2026-06-30
Author: Mr. XS + Agent
Target file(s): src/engine/connectors/edgar8ksignal.js (NEW)

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Read processed RealityObjects from edgar8kconnector, map each event class to domain(s), normalize materiality/groundedness to the 0-100 signal scale, and dispatch via surfacerouter.dispatchBatch().

**One question answered:** "How does an EDGAR corporate event flow into cone pressure and direction honesty?"

---

## 2. BOUNDARY DECLARATION

**Input contract:**
- `edgar8kconnector.getProcessedEvents()` — session event log
- `rkmstore.getById(realityObjectId)` — fetch full RealityObject for truthStability

**Output contract:**
- Signal batch dispatched to `surfacerouter.dispatchBatch()` — one signal per (event × domain)
- `runEdgar8KSignalSync()` — callable async function, returns dispatch summary

**Explicit exclusions:**
- NO direct EDGAR fetch — that is edgar8kconnector's boundary
- NO RealityObject creation — that is edgar8kconnector + rkmstore
- NO metricsengine — no metric computation
- NO cone direct wiring — all routing via surfacerouter only

---

## 3. ZERO DRIFT CONFIRMATION

- [x] Signal is materiality (0-100 passthrough) — no new computation
- [x] Confidence is `groundedness × 100` — deterministic, no inference
- [x] Polarity is deterministic from eventClass lookup — not sentiment analysis
- [x] Domain map is a locked constant — no dynamic routing logic

**Drift notes:** WO-2051 is a translation layer only. It converts RealityObject fields into the signal schema. No intelligence lives here.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** Closes the loop from EDGAR corporate events to cone pressure fields — grounded events (groundedness 0.98) become the highest-confidence signal source on the platform, anchoring convergence to verified legal disclosures.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is the dispatch of EDGAR_8K signals with polarity into surfacerouter — making §20 Direction Honesty live for corporate events."**

---

## 6. FORMULA / CONTRACT

### Event class → Domain(s) map (locked)
| Event Class | Domains |
|-------------|---------|
| EXECUTIVE_CHANGE | capital, labor |
| BANKRUPTCY | capital, ownership |
| BANKRUPTCY_TRIGGER | capital, ownership |
| ACQUISITION | capital, ownership |
| DEBT_ISSUANCE | capital |
| EQUITY_OFFERING | capital, ownership |
| EARNINGS_ANNOUNCEMENT | capital |
| DELISTING_NOTICE | capital, ownership |
| AUDITOR_CHANGE | capital |
| FINANCIAL_RESTATEMENT | capital |
| MATERIAL_CONTRACT | capital |
| CHANGE_IN_CONTROL | ownership, capital |
| OPERATIONAL_SHUTDOWN | labor, capital |
| REGULATORY_ACTION | technology, capital |
| CONTRACT_TERMINATION | capital |
| CHARTER_AMENDMENT | ownership |
| SHAREHOLDER_VOTE | ownership |
| ASSET_IMPAIRMENT | capital |
| SECURITY_MODIFICATION | capital, ownership |
| ABS_UPDATE | capital |
| MINE_SAFETY | labor |
| UNKNOWN_MATERIAL_EVENT | capital |

### Fracture event classes (polarity = POLARITY.NEGATIVE)
BANKRUPTCY · BANKRUPTCY_TRIGGER · DELISTING_NOTICE · OPERATIONAL_SHUTDOWN ·
FINANCIAL_RESTATEMENT · AUDITOR_CHANGE · ASSET_IMPAIRMENT · CONTRACT_TERMINATION

All other classes → no polarity field (default = constructive in domaingravity)

### Signal computation (locked)
```
signal     = metadata.materiality           // 0-100, from materiality engine
confidence = metadata.groundedness × 100   // 0.98 → 98
fs         = signal / 100
decay      = DECAY.DAILY
source     = 'EDGAR_8K'
```

### Dispatch dedup
Events already dispatched in this session are not re-dispatched.
Dedup key: realityObjectId (not accession number — RO is the authority).

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| `src/engine/connectors/edgar8ksignal.js` | NEW — runEdgar8KSignalSync() + signal builder | — |
| `src/engine/connectors/edgar8kconnector.js` | READ-ONLY — getProcessedEvents() | No structural change |
| `src/engine/rkmstore.js` | READ-ONLY — getById() | No structural change |
| `src/engine/surfacerouter.js` | WRITE — dispatchBatch() consumer | No structural change |
| `src/engine/signalconstants.js` | READ-ONLY — POLARITY, DECAY | No structural change |

No other files touched.

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES — corporate events now carry polarity into §20 direction honesty |
| Does this have a single dominant output? | YES — signal batch dispatched to surfacerouter |
| Are all boundaries explicitly defined? | YES — no direct EDGAR fetch, no RO creation, no metricsengine |
| Can this be built without touching an undefined dependency? | YES — all 4 dependencies exist |
| Does this avoid increasing expressive flexibility in core? | YES — locked domain map, no inference |

**Verdict: PASS**

---

## 9. DEFINITION OF DONE

1. `grep -n "fetch\|createObject\|metricsengine" src/engine/connectors/edgar8ksignal.js` → zero results
2. EXECUTIVE_CHANGE event → two signals dispatched (capital + labor)
3. BANKRUPTCY event → polarity === POLARITY.NEGATIVE on both signals
4. ACQUISITION event → no polarity field (constructive default)
5. Same realityObjectId dispatched twice → second call returns `{ dispatched: 0, skipped: 1 }`
