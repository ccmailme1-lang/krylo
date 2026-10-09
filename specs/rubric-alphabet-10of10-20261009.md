# Alphabet 10/10 acceptance rubric (DRAFT v0.2 for Founder edit)

Date: 2026-10-09 · Status: DRAFT v0.2 (GPT review applied: scoring model, absence classes, consistency gate, decision order). Editable checklist. Defines the target first; specifications and implementation are derived from it afterwards, not before.

**Test case (fixed):** "What structural relationships are forming around Alphabet across ownership and capital?"

**Scale:** the 1 to 10 payload scale (memory: project-product-quality-scale-1-to-10). A 10 means an MD could use the output to understand the situation, identify what matters, challenge assumptions and inform a decision. Current rating on this query: 6.5 (GPT) and 7 (assistant).

**Rules that apply to every item below**
- KRYLO presents substantiated structure; it does not convert it into a verdict, prediction or recommendation (CLAUDE.md section 21). A 10 is reached by more substantiated structure and clearer scope, never by adding judgment.
- Nothing is estimated or filled in. Where evidence does not exist, the result states the absence and its class (section 1, Absence-Is-Signal). An honest stated absence is allowed in a 10 only where the evidence genuinely does not exist; an absence caused by KRYLO not having looked is not.
- Every claim is attributable to a dated source the guest can open.
- Technical completeness (tests pass, spec followed) is not a score input. Only what the guest can understand or determine is.
- **Absence has four classes and each statement of absence names which one it is.** (a) The source information does not exist. (b) It exists but KRYLO has not obtained it. (c) It was obtained but is insufficient to compute the measure. (d) The measure itself is not yet defined or authored. Only (a) and (c) are facts about Alphabet; (b) and (d) are limits of KRYLO and are never worded as facts about Alphabet. `DATA UNAVAILABLE` alone does not say which.
- **Evidence must support the relationship, not merely the observations.** A financing event and an ownership disclosure are not automatically a relationship; two successive filings do not establish strengthening or weakening until the reported quantities and rights are compared; a fracture classification names the observations behind it and why they classify that way; co-presence is a lead, not a mechanism.

---

## 1. Temporal change: what is forming (KRYL-1386)

**10/10 acceptance criterion.** The guest can say, for each Alphabet relationship and each co-present domain pair, whether it is new, strengthening, weakening, reconfigured, dissolved or persisting, and since when, and can tell which of those statements were observed and which are unknown.

**Required evidence.**
- At least two dated observations or snapshots per relationship over a stated comparison window, with the snapshots and filing dates cited.
- For ownership: the successive disclosures for the same holder (for example Vanguard Group's 13G then 13G/A) with the dates, so a change or no change between them is visible.
- For capital: dated financing and capital events in order.
- A stated difference between "no change observed" and "not checked in this window".

**Failure condition (stays below 10).**
- The brief still says temporal deltas are not computed.
- A relationship absent from a later snapshot is reported as dissolved without evidence that the source was checked.
- A single snapshot is presented as a trend.

**Decision (Founder, 2026-10-09): multidimensional change model.** Existence (NEW, PERSISTING, DISSOLVED, INDETERMINATE), Magnitude (STRENGTHENING, WEAKENING, NO MATERIAL CHANGE, INDETERMINATE), Configuration (RECONFIGURED, NO MATERIAL CHANGE, INDETERMINATE), each assessed independently against dated, comparable evidence; DISSOLVED needs positive evidence of termination; NO MATERIAL CHANGE needs adequate evidence in both periods; no causation claims. Recorded on KRYL-1386.

**Still to define (Founder).** The comparison window (24 months as two adjacent 12-month periods proposed; today's entity SEC syncs look back 365 days); what counts as material for magnitude and what counts as a configuration change; the minimum evidence per dimension; the wording when history cannot support a conclusion. (Spec for KRYL-1386.)

**Superseded wording (kept for the record).** The comparison window; what counts as strengthening or weakening for an ownership disclosure versus a capital event (for example a change in stake size versus a new filing); the minimum evidence for each state; the wording when history cannot support a conclusion. (Spec for KRYL-1386.)

---

## 2. Capital: what the capital structure actually shows

**10/10 acceptance criterion.** The guest can see how much capital Alphabet raised or committed, from whom or by what instrument, and what is known about where it went, each tied to a source, and can see which capital measures are available and which are not and why.

**Required evidence.**
- The financing events with amounts, instruments, counterparties and dates from primary sources (SEC filings, the company's own releases), shown with source links (today: the $80B equity offering, with the 8-K).
- Raised, committed, allocated and deployed capital kept as four separate quantities, each shown only where a source reports it; the others are stated absent with their absence class (stated purpose versus actual deployment is already an UNRESOLVED line).
- The three subject measures (concentration, deployment velocity, capital-intensity change) each either computed from a named source or shown as unavailable with the exact source that would supply it.
- Capital observations related to the other requested domain (ownership) where a source links them (for example the Berkshire Hathaway private placement as an ownership consequence of the raise), with the link evidenced, not inferred.

**Failure condition (stays below 10).**
- All three capital measures read DATA UNAVAILABLE and no source for them is being pursued.
- Announced amounts are presented as deployed outcomes.
- Capital activity is listed as a count of 8-Ks without the events they report.

**Decision required (Founder).** Which sources are authorized to supply the three measures (13F, Form D, fund filings, financial statements for capital employed and output); who authors the remaining per-domain capital measures (currently UNAUTHORED); whether announced-but-undeployed capital is shown as a distinct class.

---

## 3. Ownership: who holds and how it is connected to capital

**10/10 acceptance criterion.** The guest can see who discloses beneficial ownership of Alphabet, how large each position is, what rights it carries where disclosed, and how those holders connect to the capital events, with each statement dated and sourced.

**Required evidence.**
- Each admitted holder with the disclosure's date, form, and the reported position (shares and percentage) where the filing states them, plus voting and economic rights where disclosed; voting versus economic position kept separate (the capital measure text already distinguishes economic share from control).
- Changes between successive filings by the same holder (links to item 1).
- Holders that appear in capital events (placement counterparties) matched to the ownership record by identifier, or stated as not matched.

**Failure condition (stays below 10).**
- Ownership is a list of disclosure links with no quantity.
- Three disclosures are presented as three forming relationships without evidence they are new.
- A counterparty in a capital event is silently omitted from the ownership view or matched by name only.

**Decision (2026-10-09): ownership record and counterparty matching.**
- **Record fields**, retained where the source states them; a missing value stays explicitly unknown, never inferred as zero; reported and calculated values are distinguishable: Identity (holder name and identifier, issuer name and identifier); Position (security class or type, shares or units, reported ownership percentage); Ownership rights (sole or shared voting power, sole or shared dispositive power, direct or indirect ownership); Timing (position effective date, reporting-period end, filing date); Provenance (source document, source date, document locator, supporting passage or table); Qualification (reported versus derived value, denominator and calculation basis, unresolved ambiguity). Beneficial-ownership disclosures (13D/13G) and Form 13F holdings are related but different evidence types and are kept distinct.
- **Counterparty match outcomes** (not a binary flag): Same entity confirmed (reliable shared identifier or authoritative documentation); Affiliation confirmed (source documents the relationship, such as fund-manager or parent-subsidiary); Transaction link confirmed (source explicitly connects the capital event to the holder or position); Candidate match (name similarity or indirect context, needs verification); Unresolved (insufficient or conflicting evidence). The outcomes are not interchangeable: confirming the same entity does not establish that a capital event created or changed the position.
- **Admission rule:** admit a relationship only at the level the evidence supports; the ownership position, the capital event and the link between them are distinct assertions, each with its own provenance and dates.

**Superseded question (kept for the record).** Whether position size and percentage become part of the admitted relationship record; which filing fields are authoritative; the rule for matching a capital counterparty to an ownership holder (identifier containment, as the subject binding rule already requires).

---

## 4. Cross-domain structure, including divergence

**10/10 acceptance criterion.** The guest can see how capital and ownership relate to technology, labor and knowledge for Alphabet, with the evidence for each pair, and can see where the domains diverge (for example KNOWLEDGE in fracture polarity) and why that is shown.

**Required evidence.**
- For each co-present pair, the dated Alphabet-bound observations supporting it (shown today for CAPITAL and LABOR), and a statement of what is not yet shown (a co-presence is a lead, not a mechanism).
- For each domain in fracture polarity, the specific observations that make it fracture, readable without opening a toggle.
- Technology, labor and knowledge shown as Alphabet-bound evidence where it exists, not only as field context.

**Failure condition (stays below 10).**
- A divergent domain is a number with no evidence behind it.
- Co-presence is worded as a cause.
- Field-level context stands in for Alphabet-specific evidence in the requested domains.

**Decision required (Founder).** Whether divergence needs its own explicit section and wording; which observation fields explain a fracture classification; the line between a lead and an established relationship for display.

---

## 5. Consistency: one analytical snapshot (separate requirement)

**10/10 acceptance criterion.** The left brief and the MAP represent the same analytical snapshot: every count, polarity, state and relationship the guest sees on one surface matches the other, or the page says the data refreshed and shows when.

**Required evidence.**
- One computed snapshot (with its capture time) feeds the brief, the MAP, the header state and the rings.
- Signal counts, per-domain polarity, pair counts, bound counts and states agree across surfaces for the same moment.
- If the guest re-reads live data, that is an explicit, labeled refresh that replaces the snapshot on both surfaces together.

**Failure condition (stays below 10).**
- Counts differ between surfaces (for example 171 and 201 signals).
- A domain is fracture on one surface and constructive on the other.
- The header state and the MAP ring colors disagree.

**Decision (Founder, 2026-10-09): freeze the analytical snapshot at query time.** One identifiable, immutable snapshot per completed query run. Every surface (brief, MAP, header state, rings, counts, polarities, relationships, evidence references) renders from that snapshot. The snapshot records its generation timestamp ("Analysis snapshot: date, time, time zone") and preserves source-level event dates and retrieval times separately (a snapshot timestamp does not imply every source was current at that moment). Refresh is an explicit user action that creates a new snapshot and replaces the displayed result on all surfaces atomically; the prior run stays identifiable. No surface refreshes independently. Acceptance test: if the pool changes after the query completes, the existing brief and MAP stay consistent; a refresh produces a new, internally consistent run.

**Still to define (Founder): what "completed" means** for the freeze point, because the subject evidence (SEC lookups) arrives seconds after submit. Options on the table: (1) complete when the subject lookups settle (success, failure or the 45-second timeout), with "Checking..." until then; (2) freeze at submit and bring subject evidence only through an explicit refresh; (3) freeze in stages (field level at submit, subject part when it settles).

---

## Scoring (replaces the earlier proposed reading)

**Two parts, scored separately.**

**A. Consistency gate (item 5).** Not a unit of analytical achievement. It decides whether the guest can trust that the surfaces show the same analysis. If the brief, MAP, header and rings contradict one another, the overall rating is **capped at 6** whatever the analysis quality.

**B. Analytical criteria (items 1 to 4).** Each is scored Met / Partly / Not met, with the absence class named wherever something is absent.

| Item | Result | Evidence in the payload | Absence class if absent |
|---|---|---|---|
| 1 Temporal change | | | a / b / c / d |
| 2 Capital structure | | | a / b / c / d |
| 3 Ownership detail | | | a / b / c / d |
| 4 Cross-domain and divergence | | | a / b / c / d |
| Gate: one snapshot | pass / fail | | |

**Three situations, never scored alike**
- Evidence exists and KRYLO establishes the change or relationship: criterion met.
- The evidence genuinely does not exist or cannot support a conclusion (classes a, c): the limitation is reported accurately and the analytical objective is still only partly met.
- The evidence exists but KRYLO has not sourced or examined it (class b), or the measure is undefined (class d): incomplete analytical coverage. This is a KRYLO limit, not an Alphabet fact.

**Proposed bands (for the Founder to edit; not final):**
- **10:** items 1 to 4 met and the gate passed.
- **8 to 9:** strong, decision-useful analysis; remaining gaps do not stop the guest from understanding the principal structural changes.
- **6 to 7:** credible structural inventory, but a material part of the requested analysis (above all temporal change) is unresolved. An honestly disclosed missing answer to "what is forming" stays here: honesty is mandatory but is not a substitute for answering the question.
- **Below 6:** material deficiencies in subject attribution, supporting evidence, cross-domain analysis or reliability.

## Open decisions, in the order that unblocks work
1. **Snapshot rule (item 5): DECIDED 2026-10-09 (frozen at query time, timestamp shown, explicit atomic refresh).** Open sub-decision: the completion point for the freeze (see item 5).
2. **Temporal change, KRYL-1386 (item 1):** the six states, evidence thresholds, comparison window, and the treatment of insufficient history. Highest analytical priority: it answers the word "forming".
3. **Ownership and counterparty matching (item 3): DECIDED 2026-10-09** (record fields, five match outcomes, admission rule; see item 3).
4. **Capital measures (item 2):** define the meaning of concentration, deployment velocity and capital-intensity change before choosing authorized sources and calculation rules.
5. **Cross-domain divergence (item 4):** the evidence shown for a fracture classification, and the boundary between a lead and an established relationship.
