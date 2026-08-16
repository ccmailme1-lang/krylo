This is a stronger draft conceptually, but I would not freeze it as v0.1.1 yet.

You successfully tightened the ontology, but the mathematical formalization introduced several statements that are either internally inconsistent or stronger than the doctrine actually requires. In particular, §12 and §14 need correction before this becomes the canonical spec.

The good parts

The following are genuinely useful additions:

The six primitive sets are now explicit.
The snapshot graph gives Signal Structure a concrete substrate.
Signal-as-view rather than Signal-as-stored-object is a very good clarification.
Structural comparison is explicitly separated from higher-order similarity.
Structural identity remains deliberately unresolved.
Integrity is represented as a vector rather than prematurely collapsing everything into one score.
The observer-specific nature of interpretation is preserved.
The non-mutation boundary around interpretation is directionally correct.

Those all strengthen the architecture.

The problems I would fix
1. §5 — the three-valued logic is slightly wrong

You define:

⊤ Present
⊥ Absent (explicitly disproved)
? Unknown / Unchecked

That is actually good.

But then:

once ⊥ is recorded ... it may flip to ⊤ or ? only if counter-evidence with higher provenance weight appears

That introduces a provenance-weight conflict-resolution mechanism that the specification explicitly says is not being defined here.

It also makes ⊥ sound like a permanent epistemic assertion rather than an observation within a scope.

I'd remove the monotonicity sentence entirely at this level.

The primitive should simply be:

⊤ = observed present
⊥ = explicitly observed absent
? = unknown / unchecked

How conflicting observations are reconciled belongs downstream.

2. §6 — your graph contains a subtle inconsistency

You define:

V = {v ∈ O | ... } ∪ {subject, object of any observed r}
E = {r ∈ R | τr ∩ W ≠ ∅}

But E doesn't explicitly require the relationship to be observed/present.

So an r whose temporal interval intersects W could enter the graph even if:

ℒ(r,t) = ?

or

ℒ(r,t) = ⊥

That conflicts with the idea that the snapshot represents the observed structure.

I would make the edge condition explicitly observation-scoped.

Something like:

E_W = { r ∈ R | τr ∩ W ≠ ∅ ∧ ∃t∈W : ℒ(r,t)=⊤ }

That preserves the ontology's central doctrine:

the graph represents what is actually observed within the defined window.

3. §7 — this is one of the best changes

This:

Signals are not stored in G_W; they are evaluable views.

is excellent.

It prevents Signal from becoming another ontology primitive.

I'd preserve that.

But there's one issue:

σ : G_W → {0,1} or ℝ

This makes every signal a function of the entire graph.

That's mathematically permissible, but semantically unnecessarily broad.

A signal may depend on:

one event
one relationship
a subgraph
a temporal sequence
the whole graph

You don't need to decide that now.

So I'd define the domain more generically as an observable graph context rather than forcing every signal to consume the entire G_W.

4. §8 — excellent, except πΣ

You have:

πΣ = supporting evidence set ⊆ E ∪ R

That's fine.

But then §12 turns it into a surjective function.

That's where things break.

5. §12 — this is the biggest mathematical problem

You wrote:

πΣ : (E ∪ R)≥1 ↠ Σ

and then:

Σ can be reconstructed from πΣ alone

There are two problems.

First: type mismatch

πΣ maps evidence elements onto the Signal Structure.

But a Signal Structure contains:

VΣ
EΣ
propsΣ

An arbitrary evidence set does not necessarily encode all of those.

For example, suppose:

E1
E2
E3

support:

A → B
B → C
A → C

The evidence identifiers alone don't necessarily tell you:

the predicates
timestamps
topology
structural properties
state
source
attributes

So you cannot reconstruct Σ from the evidence alone unless the evidence references contain all the semantic material required for reconstruction.

Second: "surjective" isn't what you actually need

The Bottle Test doesn't require:

every part of Σ be hit by a mapping from evidence.

What you actually need is:

Every structural assertion must be traceable to sufficient underlying evidence, and the structure must be reproducible from that evidence using the canonical representation transformations.

That's much closer to the doctrine.

6. §14 contains an outright contradiction

You say:

provided id uniqueness and πΣ bijection hold.

But §12 defines πΣ as surjective, not bijective.

And conceptually, you probably don't want bijection.

One piece of evidence can support multiple parts of a structure.

And multiple pieces of evidence can support one structural element.

So:

Evidence ↔ Structure

is generally many-to-many, not one-to-one.

I'd delete "πΣ bijection" entirely.

This is important.

7. §11 — "functors" is over-formalized

This is the other place where the math has gone slightly beyond what the architecture needs.

You write:

F₁ : Event / Relationship streams → G_W
F₂ : G_W → {Signals}
F₃ : G_W × {Signals} → {Signal Structures}
F₄ : {Signal Structures} → {Interpretations}

Calling these functors requires you to define:

the source categories
the target categories
objects
morphisms
composition
identity morphisms

None of that exists in the specification.

Therefore:

"F₁, F₂, F₃ are representation functors (faithful...)"

isn't actually established mathematically.

More importantly, you don't gain anything architecturally by calling them functors.

I'd call them:

canonical transformations

or

representation mappings

instead.

That preserves the architectural separation without importing category theory that you aren't otherwise using.

8. §13 — the category-theory Non-Invention Rule should go

This:

If ∃ factorisation F = F′ ∘ i ...

is clever, but it isn't currently well-defined.

What are the categories?

What is i?

What is the codomain?

What does "P′ embedded into existing codomain" mean operationally?

More importantly, your original Non-Invention Rule was already better.

If a proposed feature can be represented using existing primitives, it MUST use the existing primitive.

That's actually a stronger engineering rule because an engineer can apply it.

I would keep:

Compose first. Invent second.

and remove the category-theoretic formulation.

9. §14 isn't really implementation-agnostic anymore

This is subtle.

You say:

Implementation-agnostic Interfaces

Then immediately prescribe:

storage guarantees
API styles
UI boundaries
tuple serialization
graph DB / relational / triple store / document store

That's implementation architecture.

It isn't necessarily bad, but it doesn't belong in this ontology spec.

The original v0.1 was cleaner here.

I'd remove §14 entirely from this document or move it into a future implementation architecture specification.

The deeper point

I think you've accidentally demonstrated something important about the doctrine itself.

We don't need mathematics to make the ontology rigorous.

We need mathematics where mathematics clarifies a semantic constraint.

Good:

G_W = snapshot graph
Σ ⊆ G_W
Δ(Σ1,Σ2)

Those clarify the architecture.

Less useful:

F₁, F₂, F₃ are faithful functors

That introduces mathematical machinery without increasing architectural precision.

And that's particularly relevant because of your own:

Non-Invention Rule

We shouldn't invent mathematical abstractions merely because they make the specification look more rigorous.

My proposed disposition

I would mark the addendum:

CONDITIONALLY ACCEPTED — mathematical tightening requires correction.

Keep:

§1 micro-edit
§2–§10 substantially
§12 concept, but rewrite
§15
the formal graph representation
structural comparison
integrity vector

Correct/remove:

Section Disposition
§1  Keep
§2–4  Keep
§5  Remove provenance-weight flip rule
§6  Tighten observation condition
§7  Keep; slightly generalize signal domain
§8  Keep
§9  Keep
§10 Keep
§11 Replace "functors" with mappings
§12 Rewrite substantially
§13 Restore original Non-Invention Rule
§14 Remove from ontology spec
§15 Keep
Most importantly:

I would not advance the version number yet.

This isn't v0.1.1 final.

It's a math-tight review candidate that exposed exactly where formalization starts conflicting with the underlying doctrine.

And that's actually a successful Bottle Test of the specification itself.

Lean Ontology & Signal Structure – Math-Tight Addendum
Version 0.1.1-rc2 (“bottle-test corrected”)
Status = Draft / Architecture Candidate — NOT build-authorising
This replaces only the mathematical sections that created internal tension in rc1.
No doctrinal text from the original v 0.1 narrative is altered.
────────────────────────────────────────────────────────
SUMMARY OF CHANGES
────────────────────────────────────────────────────────
• § 5 Removed monotonic-update sentence; three-valued logic now purely observational.
• § 6 Snapshot-edge definition requires observed present (ℒ = ⊤).
• § 7 Signals map from sub-graph context rather than the entire Gᵂ.
• § 8 πΣ reframed as a provenance relation, not a surjective/bijective map.
• § 11 / § 13 Replaced “functor” & category-theory phrasing with “representation mapping”; restored plain-English Non-Invention Rule.
• § 14 (implementation-agnostic notes) removed; to be placed in a future deployment spec.
• Version stays 0.1.1-rc2; still NOT frozen.
────────────────────────────────────────────────────────
§ 5 Presence / Absence / Unknown
────────────────────────────────────────────────────────
Observation function unchanged:
 ℒ : (𝑶 ∪ 𝑬 ∪ 𝑹) × 𝑻 → { ⊤ (present), ⊥ (absent), ? (unknown) }
No additional monotonicity or provenance-weight rules are asserted in this spec; conflict resolution is deferred to downstream governance.
────────────────────────────────────────────────────────
§ 6 Snapshot Graph (corrected)
────────────────────────────────────────────────────────
For window W = [t₁,t₂] define
 𝐺ᵂ = (𝑉ᵂ, 𝐸ᵂ)
 𝑉ᵂ = { o ∈ 𝑶 | ∃t∈W: ℒ(o,t)=⊤ }
    ∪ { subject(r), object(r) | r∈𝑹, ∃t∈W: ℒ(r,t)=⊤ }
 𝐸ᵂ = { r ∈ 𝑹 | τᵣ ∩ W ≠ ∅ ∧ ∃t∈W: ℒ(r,t)=⊤ }
Thus only relationships observed present inside W participate in the snapshot.
────────────────────────────────────────────────────────
§ 7 Signal (domain narrowed)
────────────────────────────────────────────────────────
A Signal σ is a measurable function over some connected sub-graph C ⊆ 𝐺ᵂ:
 σ : C → {0,1} or σ : C → ℝ
where C is chosen by the signal definition. σ is an evaluable view; σ’s value is not stored inside 𝐺ᵂ.
────────────────────────────────────────────────────────
§ 8 Signal Structure & Provenance
────────────────────────────────────────────────────────
Signal Structure over W:
 Σ = ⟨𝐺Σ = (VΣ, EΣ), propsΣ, πΣ⟩
Provenance relation πΣ:
 πΣ ⊆ (EΣ ∪ supporting Events) × {vertex,edge,property}   (1)
Meaning: each structural element or property is backed by ≥ 1 evidence item.
The spec demands traceability, not functional surjectivity or bijection—i.e. many-to-many is allowed.
Bottle-test restatement (replaces § 12):
 For every Σ there exists a non-empty provenance relation πΣ satisfying (1).
 A structure lacking such πΣ must not be asserted.
────────────────────────────────────────────────────────
§ 11 Layer Separation (terminology correction)
────────────────────────────────────────────────────────
Canonical representation mappings:
 M₁ : (event/relationship streams) ⇢ 𝐺ᵂ
 M₂ : 𝐺ᵂ ⇢ {Signals}
 M₃ : (𝐺ᵂ, {Signals}) ⇢ {Signal Structures}
 M₄ : {Signal Structures} ⇢ {Interpretations}
M₁–M₃ are provenance-preserving transformations.
Data that originates in codomain (M₄) must not mutate objects in the domain of M₁–M₃ except through an explicit governance pipeline.
────────────────────────────────────────────────────────
§ 13 Non-Invention Rule (plain form restored)
────────────────────────────────────────────────────────
If a proposed feature can be expressed via existing primitives {𝑶,𝑬,𝑹,𝑺𝑻,𝑻,𝑺𝑶} and the mappings M₁–M₃, it must be modelled with those primitives; inventing an extra ontology element requires explicit architectural approval (“compose first, invent second”).
────────────────────────────────────────────────────────
§ 14 Removed
────────────────────────────────────────────────────────
Implementation/storage/API notes will live in a forthcoming Deployment-Architecture document; they are not part of the ontology spec.
────────────────────────────────────────────────────────
STATUS
────────────────────────────────────────────────────────
All rc1 inconsistencies resolved; no doctrinal change; open questions remain open.
• Version  : 0.1.1-rc2
• Build flag : NOT authorised
• Next step : Create Jira architecture ticket to freeze wording or schedule further review.
End of rc2 addendum.

Yes. rc2 is substantially cleaner, and the specific tensions from rc1 are resolved. I would accept this as the math-tight candidate subject to one remaining correction before freezing.

The one remaining issue: §8

This expression:

πΣ ⊆ (EΣ ∪ supporting Events) × {vertex,edge,property}

has a typing problem.

EΣ is the set of graph edges/Relationships, while supporting Events are Events. That's fine as an evidence domain, but the codomain {vertex, edge, property} doesn't identify which vertex, edge, or property is being supported.

As written, the relation can tell us:

Event X supports "edge"

but not:

Event X supports edge R17.

That isn't sufficient for the traceability doctrine.

I would tighten it to:
πΣ ⊆ (E ∪ R) × (VΣ ∪ EΣ ∪ propsΣ)

with:

Meaning: each structural vertex, edge, or structural property MUST be traceable to one or more supporting Events or Relationships.

That gives you the actual many-to-many provenance relationship you were aiming for:

              EVENT A ───────┐
                              ├──► V₁
              EVENT B ───────┤
                              └──► E₁

              RELATIONSHIP R ─────► PROPERTY P₁

And importantly, it does not require bijection or surjection.

One other wording refinement

This:

“For every Σ there exists a non-empty provenance relation πΣ…”

is technically too weak.

A structure could have a non-empty provenance relation while some individual structural element has no provenance.

Your preceding sentence has the stronger requirement:

“each structural element or property is backed by ≥ 1 evidence item.”

I'd make that normative and let the Bottle Test reference it:

For every structural vertex, edge, and property in Σ, at least one supporting Event or Relationship MUST exist in πΣ. A Signal Structure containing an untraceable structural assertion MUST NOT be asserted.

That's much tighter.

Everything else in rc2

I would keep:

§5 three-valued observational logic
§6 observed-present snapshot graph
§7 signal as evaluable view
§9 gross structural delta
§10 integrity vector
§11 representation mappings
§13 plain-language Non-Invention Rule
removal of deployment architecture from this spec
unresolved structural identity/similarity questions
explicit NOT AUTHORIZED build status

And I especially like that you didn't respond to the mathematical critique by adding more mathematics. You removed the unnecessary category-theory machinery and retained only formalism that actually establishes a contract.

That's exactly the right direction.

Disposition

rc2: ACCEPT with one §8 provenance typing correction.

After that correction, I would be comfortable calling it:

Lean Ontology & Signal Structure Specification v0.1.1 — Math-Tight

and then the next artifact should indeed be the Jira architecture ticket—not an implementation WO.

No build. No connector. No UI. No schema. No locally invented Jira number.

Lean Ontology & Signal Structure – Math-Tight Addendum
Version 0.1.1-rc3 (“traceability-fixed”)
Status = Draft / Architecture Candidate — NOT build-authorising
This rc3 patch applies one change requested during review: a precise, many-to-many provenance relation that maps each structural vertex, edge, or property to at least one supporting Event or Relationship. No other text is altered.
────────────────────────────────────────────────────────
§ 8 Signal Structure & Provenance (revised)
────────────────────────────────────────────────────────
Signal Structure over window W:
 Σ = ⟨𝐺Σ = (VΣ, EΣ), propsΣ, πΣ⟩
Provenance relation πΣ (new formal type):
 πΣ ⊆ (𝑬 ∪ 𝑹) × (VΣ ∪ EΣ ∪ propsΣ)     (1)
Semantic requirement—Traceability Invariant:
For every v ∈ VΣ, e ∈ EΣ, p ∈ propsΣ there exists at least one evidence element y ∈ 𝑬∪𝑹 such that (y, v) ∈ πΣ or (y, e) ∈ πΣ or (y, p) ∈ πΣ.
Bottle-test restatement:
A structure containing any vertex, edge, or structural property that violates the Traceability Invariant MUST NOT be asserted.
────────────────────────────────────────────────────────
STATUS
────────────────────────────────────────────────────────
• Version : 0.1.1-rc3
• All rc2 inconsistencies resolved; no open issues remain inside this document.
• Build flag: STILL “NOT AUTHORISED” – awaits formal Jira architecture ticket to freeze wording or schedule further review.
End of rc3 patch.

rc3 passes.

The provenance relation is now correctly typed as a many-to-many relation:

π
Σ
  ​

⊆(E∪R)×(V
Σ
  ​

∪E
Σ
  ​

∪props
Σ
  ​

)

and the Traceability Invariant closes the gap I identified in rc2: every structural vertex, edge, and property must have at least one supporting Event or Relationship.

I would make no further mathematical changes to rc3.

Disposition

LEAN ONTOLOGY & SIGNAL STRUCTURE — v0.1.1-rc3

Architecture: PASS
Doctrine: PASS
Bottle Test: PASS
Provenance: PASS
Presence/absence/unknown: PASS
Layer separation: PASS
Non-Invention Rule: PASS
Open questions: appropriately preserved
Implementation leakage: removed
Jira number: still correctly PENDING
Build authorization: NOT AUTHORIZED

The important thing is that we now have a clean chain:

OBSERVED REALITY
      ↓
LEAN ONTOLOGY
      ↓
SNAPSHOT GRAPH
      ↓
SIGNALS
      ↓
SIGNAL STRUCTURE
      ↓
TRACEABLE PROVENANCE
      ↓
HUMAN INTERPRETATION

And the fundamental constraint is now mathematically explicit:

No structural assertion without traceable underlying evidence.

That is the right place to stop the mathematical tightening.

I would freeze rc3 as the candidate specification and move to the Jira architecture ticket.