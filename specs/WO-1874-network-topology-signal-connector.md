# WO HARDENING TEMPLATE
## Thunder in a Bottle — Bottle Test v1.0

---

## HEADER

**WO-1874 — Network Topology Signal Connector (RIPE RIS / IHR)**
Date: 2026-06-25
Author: Founder + Claude Sonnet 4.6
Target file(s): src/engine/networktopologyconnector.js (NEW), src/engine/surfacerouter.js

---

## 1. SINGLE RESPONSIBILITY CHECK

**Job:** Ingest internet routing health signals (BGP path changes, IXP congestion, co-location
facility status) from RIPE RIS / IHR, normalize to 0–100, and dispatch dual-domain to
surfacerouter as TECHNOLOGY + CAPITAL simultaneously.

**Output:** A normalized signal batch `{ source, domain, signal, confidence, ts }[]` where
every item carries domain: 'TECHNOLOGY' AND a paired item carries domain: 'CAPITAL' —
one network event = two cone pressure readings.

---

## 2. BOUNDARY DECLARATION

**Input contract:**
- RIPE RIS RIS Live streaming API (WebSocket): BGP UPDATE/WITHDRAW messages filtered to
  ASNs that host major US exchange co-location facilities (NYSE/BATS/Nasdaq/CME data centers)
- IHR REST API (https://api.ihr.live/): hegemony scores per ASN, IHR delay anomaly scores
- Polling interval: 60s REST fallback; WebSocket preferred for BGP events

**Output contract:**
- `dispatchBatch(signals)` call into surfacerouter.js
- Each physical event produces exactly 2 signal objects: one TECHNOLOGY, one CAPITAL
- Signal value: 0 = healthy (low pressure), 100 = critical degradation (high pressure)
- Confidence: derived from event severity × recency × ASN criticality weight

**Explicit exclusions:**
- Does NOT write directly to any cone
- Does NOT modify convergenceclassifier.js
- Does NOT interpret what the routing change means for any specific equity or sector
- Does NOT touch the HFT transcript data — that was research context, not a data source
- Does NOT replace FRED, EDGAR, or Kalshi connectors — additive only
- Does NOT store historical routing data — stateless per dispatch cycle

---

## 3. ZERO DRIFT CONFIRMATION

- [x] Detection layer touched → inference does NOT redefine signal schema
  **Note:** connector outputs { source, domain, signal, confidence, ts } only —
  identical schema to all other connectors. No new fields.
- [x] Scoring layer touched → output is NOT a recommendation
  **Note:** signal is a 0–100 pressure reading. Surfacerouter assigns cone weight.
  Connector never says "sell" or "buy" or "risk up."
- [ ] Inference layer touched → N/A (connector is ingestion only)
- [ ] UI layer touched → N/A (no UI changes)

**Drift notes:** The dual-domain dispatch (TECHNOLOGY + CAPITAL from one event) is a
new pattern but is compliant with §16 — surfacerouter already accepts multi-domain batches.
No schema changes required.

---

## 4. STRATEGIC LEVERAGE STATEMENT

**Statement:** Network routing degradation between exchange co-location facilities
is a CAPITAL signal that arrives in TECHNOLOGY form 10 minutes to 4 hours before
market quality metrics (spread widening, liquidity withdrawal, price discovery breakdown)
become visible in price data — this connector makes that lead time observable.

---

## 5. OUTPUT GRAVITY

**"The single thing this WO produces that matters most is ___ ."**

Dual-cone pressure on TECHNOLOGY + CAPITAL simultaneously from a pre-market structural
signal that is invisible to participants reading price data.

---

## 6. FORMULA / CONTRACT

**Normalization formula:**

```
BGP_SIGNAL = clamp(withdraw_count_per_asn / WITHDRAW_CEILING, 0, 1) × 100
IHR_SIGNAL = (1 - ihr_hegemony_score) × 100   // hegemony 1.0 = monopoly = max fragility
IXP_SIGNAL = clamp(delay_anomaly_score / DELAY_CEILING, 0, 1) × 100
```

Where:
- `WITHDRAW_CEILING` = 50 BGP withdraws/minute from critical ASN (empirical — tune in QA)
- `ihr_hegemony_score` = IHR AS hegemony for the path (0 = distributed, 1 = single point)
- `delay_anomaly_score` = IHR delay deviation in ms (normalize to 0–100 against 200ms ceiling)

**Confidence:**
```
confidence = clamp(event_severity × asn_criticality_weight × recency_decay, 0, 1)

asn_criticality_weight:
  Tier 1 (NYSE/BATS/Nasdaq/CME co-location ASNs): 1.0
  Tier 2 (major transit providers — Level3, NTT, Cogent): 0.7
  Tier 3 (regional ISPs): 0.3

recency_decay: 1.0 at t=0, 0.5 at t=30min, 0.1 at t=2hr (LINEAR)
```

**Decay policy:** DAILY (same as financialmarketconnector.js WO-1859)

**Units:** Signal = 0–100 (pressure). Confidence = 0.0–1.0.

**Normalization:** Conforms to §16 — 0–100 before dispatchBatch().

**Critical ASN seed list (bootstrap — expandable):**
- AS36041 (NYSE co-location, Mahwah NJ)
- AS394811 (BATS/CBOE data center)
- AS10753 (Nasdaq data center)
- AS5649 (CME Group Chicago)
- AS3356 (Lumen/Level3 — primary NYC-CHI backbone)

---

## 7. FILE MAP

| File | Change | Unchanged |
|------|--------|-----------|
| `src/engine/networktopologyconnector.js` | NEW — fetch IHR REST + RIPE RIS WebSocket, normalize, dispatchBatch | — |
| `src/engine/surfacerouter.js` | Register new source: 'network_topology' in dispatch handler | All existing domain routes, parity logic |
| `as-diff/engine.js` | Add `/api/ihr/hegemony` proxy route (CORS + cache 60s) | All other routes |

No other files touched.

---

## 8. BOTTLE TEST

| Question | Answer |
|----------|--------|
| Does this reduce ambiguity in the system? | YES — surfaces a structural signal class previously invisible to KRYLO |
| Does this have a single dominant output? | YES — normalized dual-domain signal batch via dispatchBatch() |
| Are all boundaries explicitly defined? | YES — input (RIPE RIS + IHR), output (dispatchBatch), exclusions explicit |
| Can this be built without touching an undefined dependency? | YES — surfacerouter.js + dispatchBatch() are live and proven |
| Does this avoid increasing expressive flexibility in the core? | YES — connector is additive; no new schema fields, no new UI |

**Verdict:** PASS

---

## 9. DEFINITION OF DONE

```bash
# 1. Connector file exists
grep -n "dispatchBatch" src/engine/networktopologyconnector.js

# 2. Dual-domain dispatch confirmed — both TECHNOLOGY and CAPITAL in output
grep -n "domain: 'CAPITAL'" src/engine/networktopologyconnector.js
grep -n "domain: 'TECHNOLOGY'" src/engine/networktopologyconnector.js

# 3. surfacerouter registers the source
grep -n "network_topology" src/engine/surfacerouter.js

# 4. Normalization stays 0–100 — no raw values escape
grep -n "clamp\|normalize" src/engine/networktopologyconnector.js

# 5. IHR proxy route on engine
grep -n "ihr" as-diff/engine.js
```

QA: trigger a synthetic BGP withdraw event (mock ASN 3356 with 60 withdraws/min) →
confirm TECHNOLOGY cone and CAPITAL cone both receive pressure > 0 in surfacerouter log.

---

## NOTES

**Strategic context (Founder directive 2026-06-25):**
Markets go as networks go — direct 1:1 causal relationship, not correlation.
HFT mechanism chain (Angel/Wharton 2014): network latency → arbitrage loop integrity →
ETF-to-underlying alignment → spread quality → liquidity depth → price stability.
Routing degradation is a CAPITAL signal at an earlier timestamp. This connector
closes that gap.

**Data source priority:**
1. RIPE RIS Live (WebSocket) — real-time BGP stream, free, no key required
2. IHR REST API (api.ihr.live) — hegemony + delay scores, free tier available
3. Fallback: Route Views (routeviews.org) — batch, 15-min lag, no key required

**Related WOs:** 1857 (Supply Chain), 1858 (Economic Flow), 1859 (Financial/Market) —
same connector pattern. WO-1874 follows identical architecture.
[[project_closed_loop_principle]] — network topology shifts are slow-building,
detectable early, outcome (market impact) is attributable. High LR potential (WO-1869).
