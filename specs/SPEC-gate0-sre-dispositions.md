# SPEC — Gate-0 Dispositions: 14 SRE RelationTypes

Date: 2026-08-20
Status: INQUIRY FINDINGS. No implementation. No producer. No WO-2049. No Formation-B changes.
Question: for each of the 14 recognized SRE RelationTypes, what Gate-0 admission disposition
(Admit / Map & Hold / Defer / Reject / Experimental) is justified under KRYL-1133 doctrine?

---

## A self-correction, recorded before the findings table, not silently fixed

The first pass at this reasoned by analogy: since KRYL-1133's *existing* Gate-0 table has
`dependsOn: enabled: true` and `causes/causedBy/enables: enabled: false`, and `DEPENDS_ON` /
`CAUSES` / `ENABLES` are the exact-equivalent SRE types found in H2, the draft disposition
inherited those settings by name-match — DEPENDS_ON → Admit, CAUSES/ENABLES → Defer.

**That is wrong, and it's wrong by the vocabulary amendment's own text.**
`specs/SPEC-krylo1133-vocabulary-amendment.md` §7, "No Automatic Mapping to RKM," explicitly
rejects the shape `SRE RelationType → RKM genealogy kind → governance` — the two vocabularies
"meet at the governance layer, not the semantic layer." Inheriting an *enabled/disabled* setting
by name-analogy is exactly that rejected shape, just applied to policy instead of semantics. A
disposition arrived at that way would be undoing, in Gate-0, the separation just established in
the amendment.

Corrected approach below: each of the 14 types is assessed independently, with no disposition
inherited from RKM genealogy's existing table.

---

## Independent Gate-0 assessment

| RelationType | InfluenceClass | Independent basis for enabling? | Disposition |
|---|---|---|---|
| CAUSES | POSITIVE | No real substrate exists to test any causal claim against (Phase 2: zero live RelationCore population). KRYL-1133's own principle — *"the system should earn causal memory, not default into it"* — applies on its own merits here, independent of RKM's table | **Defer** |
| DEPENDS_ON | STRUCTURAL | Same absence of substrate. No independent justification found to enable it ahead of any other type — its RKM analogue being enabled is not, per §7, a valid basis | **Defer** |
| ENABLES | POSITIVE | Same | **Defer** |
| COMPOSITION | (unclassified — see finding below) | Same; also structurally the weakest-evidenced specialization (H2: "weakest of the four positive entries") | **Defer** |
| CONSTRAINS | STRUCTURAL | No substrate, no equivalent, no independent basis | **Defer** |
| INHIBITS | (unclassified) | Carries negative/causal-adjacent polarity — if anything, a *heavier* claim than plain causation, per the §20 Direction Honesty doctrine's own emphasis on polarity. No basis to enable ahead of lighter claims | **Defer** |
| MEDIATES | POSITIVE | Three-party indirection claim — structurally more complex than direct causation, no basis to enable | **Defer** |
| COMPETES_WITH | STRUCTURAL | Peer-symmetric rivalry claim; no substrate | **Defer** |
| SUBSTITUTES_FOR | (unclassified) | No substrate, no basis | **Defer** |
| COUPLED_WITH | NON_DIRECTIONAL | Makes no directional/causal claim — structurally the *lightest* class of assertion among the 14 (bare co-variation). Noted as an observation for future policy-writing, not acted on here — no substrate exists to test even a light claim | **Defer** |
| RESONATES_WITH | NON_DIRECTIONAL | Same lightness observation as COUPLED_WITH, thematic rather than even co-variation | **Defer** |
| DIVERGES_FROM | (unclassified) | Structural inverse of resonance; same absence of substrate | **Defer** |
| PRECEDES | (unclassified) | Explicitly non-causal (temporal-only) — the lightest-weight claim of the causal-adjacent group, since it asserts nothing about cause. Same observation as COUPLED_WITH: noted, not acted on | **Defer** |
| REVEALS | POSITIVE | Epistemic, not structural — no existing KRYL-1133 concept for this claim shape at all | **Defer** |

## Finding: 5 types have no InfluenceClass placement

`INHIBITS`, `SUBSTITUTES_FOR`, `COUPLED_WITH`'s neighbor `RESONATES_WITH` — correction, checked
again directly against `relationontology.js`: the unclassified five are **INHIBITS,
SUBSTITUTES_FOR, DIVERGES_FROM, PRECEDES, COMPOSITION**. `InfluenceClass` covers 9 of 14 types
(`POSITIVE`: CAUSES, ENABLES, MEDIATES, REVEALS; `STRUCTURAL`: CONSTRAINS, DEPENDS_ON,
COMPETES_WITH; `NON_DIRECTIONAL`: RESONATES_WITH, COUPLED_WITH). This was not previously surfaced
in either H1 or H2 and is recorded here as a new, independent finding: **KRYLO's own ontology has
not yet classified the influence-weight of a third of its relation vocabulary.** Not a blocker for
this Gate-0 pass (disposition doesn't depend on InfluenceClass placement), but a gap worth carrying
forward separately from the Formation-B chain.

## Outcome

**All 14 SRE RelationTypes: Defer.**

Zero Admit. Zero Map & Hold. Zero Reject. Zero Experimental.

This is not a weaker finding than a mixed table would be — it is the doctrinally consistent one.
Two independent reasons converge on the same answer:

1. **No real substrate exists to test any disposition against.** Phase 2 established zero live
   `RelationCore` production. Enabling any type now would be policy written ahead of any evidence
   it could possibly be checked against.
2. **No type may inherit its disposition from RKM genealogy's existing table**, per the vocabulary
   amendment's own §7. Every type had to earn its disposition independently, and none had an
   independent basis to earn anything above Defer.

This is consistent with — and a direct application of — KRYL-1133's own stated principle:
*"the system should earn causal memory, not default into it."*

## Consequence for the sequence

Gate-0 is now closed with a real, non-trivial output (uniform Defer, for stated reasons) rather
than left open. This does not block ratification — §11 of the amendment lists Gate-0 as a
subsequent specification, not a precondition for the amendment's own content-completeness, and
this document satisfies that subsequent specification.

It does mean: **even after KRYL-1133 + the vocabulary amendment are formally ratified, and even
after a RelationCore producer exists, zero relations are admission-eligible on day one.** Every
type requires its own future policy decision, made against real observed data — which does not
exist yet and cannot exist until a producer exists. This is circular in the same way the
boundary-rule ruling already was, and is resolved the same way: provisionally, expecting revision
on contact with real data, not resolved in a vacuum.

## Standing state

Phase 3: FAILED (separation), null VALID. Phase 4: not opened. Mesh control: 33/33, untouched.
Formation-B boundary: provisional, B3 ∧ B4 ∧ B5. "Admitted": RULED — R2. DECISION-VOCAB-001: RULED
— Path A. Vocabulary amendment: content complete, ratification pending. **Gate-0: CLOSED — all 14
types Defer, zero admission-eligible today.** WO-2049: not opened. Producer: blocked. Formation-B:
blocked — and even once unblocked structurally, would have zero eligible relation types to draw
from until Gate-0 policy is revisited against real data.
