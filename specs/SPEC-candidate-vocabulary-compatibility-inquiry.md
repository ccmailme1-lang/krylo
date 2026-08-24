# SPEC — Candidate Vocabulary Compatibility (Inquiry)

**Status:** 𝒪 RATIFIED (Founder, 2026-08-23) — the six-entry opposition table below is now KRYLO's
authored semantic opposition knowledge for the current 7-type candidate vocabulary. Discovery
complete on this vocabulary, one named structural limitation excepted (§6). Still no implementation
authorized — ratifying 𝒪 closes the semantic-knowledge gate; the Adjudication Contract (what KRYLO
does with a κ-classified candidate set) is the next, separate, not-yet-written document. No Jira
filed yet.
**Depends on:** KRYL-1205, KRYL-1206 (implemented), the salience adjudication inquiry, and the
adjudication eligibility/claim compatibility inquiry (all discovery-complete).

## Purpose

The claim-compatibility inquiry found that `RELATIONSHIP_STATE × OPPOSITE_DIRECTION` opposition
requires an authored semantic table, not a structural rule, and left open whether that pattern
generalizes to other candidate-type pairs. This inquiry inventories the full candidate vocabulary
and tests additional type-pairs to find out.

## 1. Vocabulary inventory (7 candidate types, from `buildCandidates()`)

| Type | Asserted property | Values |
|---|---|---|
| `STABLE_GROUP` | Confirmed pattern + magnitude leadership across a group | categorical |
| `STABLE_LEADER` | Confirmed pattern, single leading domain | categorical |
| `STABLE_SOLO` | Confirmed pattern, exactly one domain | categorical |
| `RELATIONSHIP_STATE` | Directional relationship trajectory between 2 domains | `CONVERGING` / `WEAKENING` / `DIVERGING` / other |
| `VOLATILITY_STANDOUT` | Instability (variance), single domain | numeric |
| `OPPOSITE_DIRECTION` | Directional velocity opposition between 2 domains | numeric |
| `EMERGING_CLOSING_GAP` | Magnitude proximity between an emerging and a confirmed domain | numeric |

Two types assert directional/relational claims about a domain pair: `RELATIONSHIP_STATE` and
`OPPOSITE_DIRECTION` (already tested). A third, `EMERGING_CLOSING_GAP`, asserts a
convergence-flavored claim (magnitude proximity) — worth testing against both.

## 2. Structural exclusivity — found without needing more runtime tests

`OPPOSITE_DIRECTION` requires velocity spread `> 6`, where velocity `= (magnitude-50)×0.3`. For two
domains with opposite-sign velocity, spread `= 0.3×|m₁-m₂|`, so spread `>6` requires `|m₁-m₂| > 20`.
`EMERGING_CLOSING_GAP` requires magnitude gap `< 8`. **`|m₁-m₂| > 20` and `|m₁-m₂| < 8` cannot both
hold — `OPPOSITE_DIRECTION` and `EMERGING_CLOSING_GAP` can never co-occur for the same domain pair,
by construction, given current threshold constants.** Confirmed by a failed empirical construction
attempt (Test 1) before being derived algebraically. This pair needs no compatibility rule — it's
not reachable.

## 3. New conflict pair found: `RELATIONSHIP_STATE × EMERGING_CLOSING_GAP`

Tested `EMERGING_CLOSING_GAP` (fixed, same pair) against `RELATIONSHIP_STATE=CONVERGING` and
`=DIVERGING`:
- `CONVERGING` + `EMERGING_CLOSING_GAP` → **agree.** Both describe domains coming together.
- `DIVERGING` + `EMERGING_CLOSING_GAP` → **conflict.** "Have broken from each other... a real
  split" contradicts "closing in on Y's territory."

**This is the inverse polarity of the already-tested pair.** For `RELATIONSHIP_STATE ×
OPPOSITE_DIRECTION`: `CONVERGING` conflicts, `DIVERGING` agrees. For `RELATIONSHIP_STATE ×
EMERGING_CLOSING_GAP`: `CONVERGING` agrees, `DIVERGING` conflicts — exactly reversed. **Confirms
the open question from the prior inquiry: opposition tables do not generalize across type-pairs.**
A table authored for one pair (`RELATIONSHIP_STATE`×`OPPOSITE_DIRECTION`) is not reusable, and
would be actively wrong, for a different pair (`RELATIONSHIP_STATE`×`EMERGING_CLOSING_GAP`) —
each pair requires its own authored rule, not a shared convention.

## 4. Control — unrelated properties, no conflict

`STABLE_LEADER` (Capital) and `VOLATILITY_STANDOUT` (Labor), different domains, different
properties (magnitude-leadership vs. instability) — coexist without issue, as expected. Confirms
the Comparable/non-conflicting baseline still holds for genuinely unrelated claims.

## 5. Additional pairs tested (2026-08-23, round 2)

| Pair | Result |
|---|---|
| `STABLE_GROUP` × `RELATIONSHIP_STATE=DIVERGING` | **New conflict candidate.** "2 domains are moving together" directly contradicts "have broken from each other... a real split," same substrate. Not added to any live table — reported for Founder authorship, same standard as the two existing entries. |
| `STABLE_LEADER`'s `formationState` label × `VOLATILITY_STANDOUT`'s "least stable" language | **Not a κ-conflict — a terminology collision.** Data isn't contradictory (a domain can be confirmed-stable and the field's most volatile simultaneously); the word "stable" means two different things across the two narrative strings. Distinct category of problem from opposition, worth its own tracking, not folded into 𝒪. |
| `RELATIONSHIP_STATE` default branch ("clearest link") × `OPPOSITE_DIRECTION` | **Genuinely ambiguous — not resolved.** "Clearest link" doesn't assert direction the way `CONVERGING` does; could describe an adversarial-but-strong relationship. Not placed in or out of 𝒪. |
| `VOLATILITY_STANDOUT` × `OPPOSITE_DIRECTION` | No conflict — coexist without contradiction. |
| `VOLATILITY_STANDOUT` × `EMERGING_CLOSING_GAP` | No conflict — coexist without contradiction. |
| `STABLE_SOLO` × `OPPOSITE_DIRECTION` | No conflict — coexist without contradiction. |
| `STABLE_LEADER` × `EMERGING_CLOSING_GAP`, disjoint substrate | Correctly reads Insufficient — overlap gate holds, confirms H1 again on a fresh pair. |

## 5a. Round 3 (2026-08-23)

| Pair | Result |
|---|---|
| `STABLE_GROUP` × `RELATIONSHIP_STATE=CONVERGING` | Agree — "moving together" / "pulling into alignment." No conflict. |
| `STABLE_GROUP` × `RELATIONSHIP_STATE=WEAKENING` | **New conflict, same family as `DIVERGING`.** "Moving together" contradicts "were linked — now pulling apart." `STABLE_GROUP` now conflicts with both `WEAKENING` and `DIVERGING`. |
| `STABLE_GROUP` × `RELATIONSHIP_STATE` default ("clearest link") | No clear conflict. |
| `STABLE_SOLO` × `RELATIONSHIP_STATE=DIVERGING` | **No conflict — distinct from `STABLE_GROUP`.** `STABLE_SOLO`'s text makes no togetherness claim, only `STABLE_GROUP`'s does. The two STABLE variants are not interchangeable for compatibility purposes despite sharing a code branch family. |
| `STABLE_GROUP` × `VOLATILITY_STANDOUT`, overlapping substrate | Terminology collision confirmed to extend to `STABLE_GROUP`, not just `STABLE_LEADER` — same underlying label. |
| `STABLE_GROUP` × `EMERGING_CLOSING_GAP`, overlapping substrate | No conflict — group cohesion and a third party's magnitude proximity are unrelated claims. |

**Honest limitation:** `STABLE_GROUP` and `STABLE_LEADER` always co-occur in the real code (never
independently reachable), so whether `STABLE_LEADER`'s own text alone would conflict with
`WEAKENING`/`DIVERGING` is untested and unknown — isolating it would require modifying code, not
done here.

## 5b. Round 4 — closing coverage (2026-08-23)

| Pair | Result |
|---|---|
| `STABLE_SOLO` × `RELATIONSHIP_STATE` (`CONVERGING`/`WEAKENING`/default) | No conflict, all three — confirms `STABLE_SOLO` conflicts with nothing in `RELATIONSHIP_STATE`, matching the already-confirmed `DIVERGING` result. `STABLE_SOLO` makes no togetherness claim, so nothing in this type opposes it. |
| `STABLE_SOLO` × `VOLATILITY_STANDOUT`, overlapping | Terminology collision confirmed to extend to `STABLE_SOLO` too — same underlying label issue as `GROUP`/`LEADER`. |
| `STABLE_SOLO` × `EMERGING_CLOSING_GAP`, overlapping | No conflict. |
| `STABLE_GROUP` × `OPPOSITE_DIRECTION` | **New conflict — missed in round 1, caught on review.** "2 domains are moving together" directly contradicts "moving in opposite directions," same substrate (Capital, Labor). Fifth conflict candidate. |
| `RELATIONSHIP_STATE=WEAKENING` × `EMERGING_CLOSING_GAP` | **New conflict.** "Were linked — now pulling apart" contradicts "closing in on... territory." Sixth conflict candidate. |
| `RELATIONSHIP_STATE` default ("clearest link") × `EMERGING_CLOSING_GAP` | No conflict — "clearest link" doesn't contradict a closing gap. |

**`STABLE_SOLO` is now fully tested against every other type and conflicts with nothing** —
consistent with its narrower claim (no togetherness assertion). `STABLE_GROUP` now conflicts with
three separate things (`DIVERGING`, `WEAKENING`, `OPPOSITE_DIRECTION`) — all share the same
underlying reason: anything implying separation contradicts its "moving together" claim.
`EMERGING_CLOSING_GAP` conflicts with both `DIVERGING` and `WEAKENING` (not just `DIVERGING` as
first found) for the same reason in reverse — anything implying separation contradicts "closing
in."

## 6. Coverage — complete on all reachable pairs given the current 7 types, with one named exception

Tested across four rounds, every pairing of the 7 types (accounting for `STABLE_GROUP`/
`STABLE_LEADER` always co-occurring, and `OPPOSITE_DIRECTION`×`EMERGING_CLOSING_GAP` being
structurally unreachable, §2): `RELATIONSHIP_STATE`×`OPPOSITE_DIRECTION` (all 4 values),
`RELATIONSHIP_STATE`×`EMERGING_CLOSING_GAP` (all 4 values), `STABLE_GROUP`×`RELATIONSHIP_STATE`
(all 4 values), `STABLE_SOLO`×`RELATIONSHIP_STATE` (all 4 values), `STABLE_GROUP`×
`OPPOSITE_DIRECTION`, `STABLE_SOLO`×`OPPOSITE_DIRECTION`, `STABLE_*`×`VOLATILITY_STANDOUT`
(`GROUP`/`LEADER`/`SOLO`, overlapping — all terminology-collision, no logical conflict),
`STABLE_GROUP`×`EMERGING_CLOSING_GAP` (overlapping), `STABLE_SOLO`×`EMERGING_CLOSING_GAP`
(overlapping), `STABLE_LEADER`×`EMERGING_CLOSING_GAP` (disjoint), `VOLATILITY_STANDOUT`×
`OPPOSITE_DIRECTION`, `VOLATILITY_STANDOUT`×`EMERGING_CLOSING_GAP`.

**One structural limitation remains, not closeable by more testing:** whether `STABLE_LEADER`
alone (isolated from `STABLE_GROUP`) would conflict with `WEAKENING`/`DIVERGING`/
`OPPOSITE_DIRECTION` the way `STABLE_GROUP` does — untestable without code changes, since the two
always co-occur in the real generator (§5a). Named as permanently open pending a future
implementation decision, not a gap in this discovery pass.

## 7. Working conclusion

**Six real semantic conflict candidates**, confirming the same underlying pattern across three
different type families rather than six unrelated rules:
- `RELATIONSHIP_STATE(CONVERGING) × OPPOSITE_DIRECTION`
- `RELATIONSHIP_STATE(DIVERGING) × EMERGING_CLOSING_GAP`
- `RELATIONSHIP_STATE(WEAKENING) × EMERGING_CLOSING_GAP`
- `STABLE_GROUP × RELATIONSHIP_STATE(DIVERGING)`
- `STABLE_GROUP × RELATIONSHIP_STATE(WEAKENING)`
- `STABLE_GROUP × OPPOSITE_DIRECTION`

The unifying shape, visible only after full coverage: **`STABLE_GROUP` and `EMERGING_CLOSING_GAP`
both assert togetherness/convergence, and both conflict with anything asserting separation
(`DIVERGING`, `WEAKENING`, `OPPOSITE_DIRECTION`) — but `STABLE_GROUP`/`EMERGING_CLOSING_GAP` never
conflict with each other**, since they agree. `RELATIONSHIP_STATE(CONVERGING)` is the odd one out —
it agrees with `STABLE_GROUP` and `EMERGING_CLOSING_GAP` but was never tested against them
directly for conflict (no reason to expect one, and none found). This is a real structural pattern,
not a coincidence — but it is still not a general type-agnostic predicate (§8.6): it required
naming which *specific* types carry a "togetherness" vs. "separation" polarity, which is exactly
the authored semantic knowledge 𝒪 exists to hold.

One pair is structurally unreachable (`OPPOSITE_DIRECTION × EMERGING_CLOSING_GAP`, §2).
`STABLE_SOLO` is now fully tested against every other type and conflicts with nothing — confirmed
structurally distinct from `STABLE_GROUP`, which cannot share a compatibility rule with it. One
real problem exists outside 𝒪 entirely — the `STABLE` formation-state label vs. "least stable"
volatility language, a terminology collision, not a data conflict, confirmed to affect all three
`STABLE_*` variants. Discovery on the current 7-type vocabulary is complete except for the one
named structural limitation in §6.

## 8. Mathematical formalization (post-rounds 2–3)

### 8.1 Candidate signature

\[
\mathcal{C}=\bigl\{(\tau,S,v,m,E)\;\big|\;\tau\in\mathcal{T},\,S\subseteq\mathcal{D},\,v\in V_\tau,\,m\in\mathbb{R}\cup\{\bot\},\,E\in\mathcal{E}\bigr\}
\]
where \(\mathcal{T}=\{\mathsf{STABLE\_GROUP},\mathsf{STABLE\_LEADER},\mathsf{STABLE\_SOLO},\mathsf{RELATIONSHIP\_STATE},\mathsf{VOLATILITY\_STANDOUT},\mathsf{OPPOSITE\_DIRECTION},\mathsf{EMERGING\_CLOSING\_GAP}\}\) (§1), \(V_\tau\) is τ's value domain (categorical strings, or \(\{\mathsf{true}\}\) for pure numeric claims), \(\mathcal{D}\) is the finite domain set, \(\mathcal{E}\) is the evidence payload space.

### 8.2 Feasibility filter

\[
\operatorname{feasible}(c_i,c_j)\iff\{\tau_i,\tau_j\}\neq\{\mathsf{OPPOSITE\_DIRECTION},\mathsf{EMERGING\_CLOSING\_GAP}\}
\]
per §2's algebraic derivation (\(P_{\mathsf{OD}}\land P_{\mathsf{ECG}}=\bot\) for all real magnitude pairs) — not re-derived here.

### 8.3 Core predicates

\[
\begin{align*}
\operatorname{overlap}(c_i,c_j) &\iff S_i\cap S_j\neq\emptyset\\
\operatorname{claim\text{-}compat}(c_i,c_j) &\iff \text{the properties asserted by }\tau_i,\tau_j\text{ are identical or mutually exclusive}\\
\operatorname{oppose}(c_i,c_j) &\iff (\tau_i,v_i,\tau_j,v_j)\in\mathcal{O} \lor (\tau_j,v_j,\tau_i,v_i)\in\mathcal{O}
\end{align*}
\]

\(\mathcal{O}\) is finite and authored, not derived. **RATIFIED (Founder, 2026-08-23)** — the six
entries below are KRYLO's authored opposition knowledge, no longer candidates:
\[
\mathcal{O}=\Bigl\{
(\mathsf{RELATIONSHIP\_STATE},\mathsf{CONVERGING},\mathsf{OPPOSITE\_DIRECTION},\mathsf{true}),\;
(\mathsf{RELATIONSHIP\_STATE},\mathsf{DIVERGING},\mathsf{EMERGING\_CLOSING\_GAP},\mathsf{true}),
\]
\[
(\mathsf{RELATIONSHIP\_STATE},\mathsf{WEAKENING},\mathsf{EMERGING\_CLOSING\_GAP},\mathsf{true}),\;
(\mathsf{STABLE\_GROUP},\mathsf{true},\mathsf{RELATIONSHIP\_STATE},\mathsf{DIVERGING}),
\]
\[
(\mathsf{STABLE\_GROUP},\mathsf{true},\mathsf{RELATIONSHIP\_STATE},\mathsf{WEAKENING}),\;
(\mathsf{STABLE\_GROUP},\mathsf{true},\mathsf{OPPOSITE\_DIRECTION},\mathsf{true})
\Bigr\}
\]
(polarity reversal between entries 1–2 is §3's non-generalization result; the "togetherness vs.
separation" pattern across entries 2–6 is named, not generalized, in §7.)

### 8.4 Compatibility function

\[
\kappa(c_i,c_j)=\begin{cases}
\mathsf{Conflict} & \text{if }\operatorname{overlap}\land\operatorname{claim\text{-}compat}\land\operatorname{oppose}\\
\mathsf{Comparable} & \text{if }\operatorname{overlap}\land\operatorname{claim\text{-}compat}\land\neg\operatorname{oppose}\\
\mathsf{Insufficient} & \text{otherwise}
\end{cases}
\]
defined only where \(\operatorname{feasible}(c_i,c_j)\) holds.

### 8.5 Terminology collision (orthogonal to κ)

\(\operatorname{term\text{-}collision}(c_i,c_j)\) holds when two candidates' narrative strings use the
same lexical item under incompatible senses while the underlying data stay consistent. Observed:
\(\operatorname{term\text{-}collision}(\mathsf{STABLE\_*},\mathsf{VOLATILITY\_STANDOUT})\) — never
folded into 𝒪, independent of κ.

### 8.6 Non-existence of a structural opposition predicate

No \(P:\mathcal{T}\times\mathcal{T}\to\{\mathsf{true},\mathsf{false}\}\) exists such that
\(\operatorname{oppose}(c_i,c_j)\iff P(\tau_i,\tau_j)\) for all tested pairs — demonstrated on six
independent (type,value) combinations. A weaker regularity does hold post-hoc (§7's "togetherness
vs. separation" grouping across `STABLE_GROUP`/`EMERGING_CLOSING_GAP`/`RELATIONSHIP_STATE`), but
naming which types carry which polarity is itself authored semantic knowledge, not a structural
predicate over types alone — the regularity doesn't collapse 𝒪 into a formula.

### 8.7 Residual untested set

\(R=\mathcal{P}_2(\mathcal{T})\setminus\{\text{pairs tested in §6}\}\) lies outside the domain on
which the validated κ is defined. No default \(\mathsf{Comparable}\) is licensed for any member of \(R\).

## Non-goals

Does not author the semantic opposition tables themselves, does not propose a compatibility
contract data structure, does not authorize implementation. Four real rules found; the mechanism
for storing/consulting such rules is separate, later work. Terminology-collision remediation is
likewise out of scope.
