# KRYLO — Charter

**Document:** 000-charter
**Audience:** External / investor
**Status:** Draft — owner review required
**Last updated:** 2026-08-12

---

## 1. What KRYLO is

KRYLO is a decision intelligence system built on a single inversion: it
measures what is *not* known.

Conventional analytics surface signal. KRYLO surfaces the absence of
grounding — where confidence is unsupported, where provenance is missing,
where a number cannot be substantiated — and gates the output accordingly.
Decisions fail on absence of information, not on lack of signal.

Core pipeline: **ingestion → transformation → decision gating → emission.**

---

## 2. Origin and the crossover

KRYLO began in January 2026 as a collective recognition network — a system
for measuring what people already recognize but have not named. Two portals:
a social sensing layer and an insight interface. The founding principles were
written before any code:

- Recognition before opinion
- Metrics over messaging
- Safety precedes honesty
- **Silence is data**
- Earlier, not against

The crossover was the fourth principle. Measuring what people recognize and
measuring the absence of truth turned out to be the same measurement problem
approached from opposite ends — and the absence was the more valuable side.
Recognition data sells to media and researchers. Absence-of-grounding is a
decision-gating problem, and it sells to anyone who must act on incomplete
information and needs to know that it is incomplete.

The measurement substrate survived the shift intact. Three capabilities listed
as unbuilt in the January POC — a CALM/WATCH/ALERT state machine, multi-signal
convergence, and a HUD visualization layer — have since been built.

---

## 3. Architecture

**Two-Zone Doctrine.** Truth computation and guest perception are permanently
decoupled. The Truth Engine holds hard invariants and admits no design
latitude. The interface layer has full creative latitude and cannot influence
computation.

**Consequences, enforced structurally:**

- Zero numerical metrics in the guest view; all engine metrics are visible
  only at the Audit Desk
- Runtime telemetry fails open; the test harness fails closed
- Export is gated on field strength; below threshold, nothing emits
- No gamification, no urgency mechanics, no persuasion in any surface

The design constraint is stated in one line: decision-grade signal visibility
without persuasion, urgency, or behavioral manipulation.

---

## 4. Evidence to date

**Proof of mechanism (January 2026).** A four-day timeboxed POC validated
signal → aggregation → state change → explanation → reversion on 100%
synthetic data, tagged `source: synthetic_poc`. Acceptance criteria were
written before the build. Acceptance #3 passed. Persistence, auth, and scale
were named as intentional exclusions rather than deferred.

**First end-to-end payload (August 2026).** The first complete payload
processed through the production engine returned a refusal:

| Invariant | Observed | Result |
|---|---|---|
| Withholding gate (DEF-1864) | Confidence ungrounded | Clean withhold |
| State typing (DEF-1863) | 50% projection | Explicitly typed |
| Structural provenance | Structural absence | Refused fabrication |
| Export gate | Fs 0% vs. 70% required | Export blocked |
| Financial metrics | CAC / ROAS / LTV ungrounded | Zero hallucination |

The system was handed a payload it could not substantiate and declined to
assert anything about it. The behavior traces directly to a principle written
seven months earlier and to a pilot specification in which the system
correctly remaining silent despite noise was defined as success.

---

## 5. Testing status

- **5 external testers** to date
- **20+ user focal group** planned, coordinated to the Gas Go release

---

## 6. What KRYLO is not

- Not a sentiment or opinion engine
- Not a prediction system — no forecasting claims are made
- Not an automated actor — the system gates and withholds; it does not act
- Not an engagement product — silence is a valid and frequent output

---

## 7. Operating model

KRYLO is owner-led. Development is distributed across specialized AI agents
under a written governance protocol, with the owner as sole architect and
approval authority. There is no employed team and no external board.

Governance controls in force:

- Read-before-write; full-file changes only
- Explicit owner approval required before any code is generated
- "Code-correct ≠ done" — no work order touching a rendered asset closes
  without visual confirmation in the running application
- An anti-inflation audit gate applied to all AI output, scoring confidence at
  the lowest-confidence subsystem rather than the average, with iteration
  toward a target score prohibited

The last control is worth stating plainly: the same epistemic discipline the
product enforces on its own outputs is enforced on the tools that build it.

---

## 8. Open items

- `[TBD — owner]` Raise stage, amount, and use of funds
- `[TBD — owner]` Primary wedge market. Investor/CFO, operational risk, and
  personal strategy are three distinct buyers; the charter should lead with one
- `[TBD — owner]` Gas Go feature definition and target release date
- `[TBD — owner]` Persistence and scale posture beyond current architecture

---

## 9. Provenance note

This charter draws on primary source documents dated 2026-01-18 through
2026-08-12. Two categories of early material are deliberately excluded:
simulated advisory feedback attributed to named public figures, and an
AI-authored architecture self-assessment. Neither constitutes third-party
validation and neither is represented as such here. An early plan to blend
simulated test cycles into the coordinated testing round was withdrawn; no
simulated results are counted anywhere in this document.