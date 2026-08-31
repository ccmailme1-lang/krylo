**Yes.** Below is a mathematically tightened version of the SPEC that stays strictly inside the stated contracts: same six domain values, fixed positions, radial magnitude only, no new metrics/semantics/inference, honest absence handling, and pure downstream visualization.

---

# SPEC — Structural Field Map  
**Status:** DRAFT — Build Candidate (Mathematically Enhanced)  
**Surface:** North-South Simulation Panel  
**Replacement:** 3. FORENSIC MATRIX FIELDS (SLAB INTERSECT)  
**Principle:** Same data, different perceptual model

### 1. PROBLEM
(Unchanged.) The six independent numeric values encourage scalar comparison and sever the field from the Intent × Horizon frame. The replacement is a pure visual change.

### 2. CONTRACT
(Unchanged in substance.)

- Name: **3. STRUCTURAL FIELD**  
  Optional: OBSERVABLE FIELD · SIX DOMAINS
- Existing six-domain field values remain the sole authoritative input.
- No new metrics, recommendations, formation, evidence alteration, confidence changes, or manufactured data.
- Visualization is strictly downstream of existing field state.

### 3. VISUAL MODEL (Mathematical Definition)

Let the six domains be the ordered set  
\[
D = \{\text{CAPITAL}, \text{OWNERSHIP}, \text{TECHNOLOGY}, \text{KNOWLEDGE}, \text{LABOR}, \text{MEDIA}\}
\]

Assign each domain a **fixed polar angle** \(\theta_i \in [0, 2\pi)\):

\[
\begin{align*}
\theta_{\text{CAPITAL}} &= 0, \\
\theta_{\text{OWNERSHIP}} &= \pi, \\
\theta_{\text{TECHNOLOGY}} &= \frac{\pi}{3}, \\
\theta_{\text{KNOWLEDGE}} &= \frac{2\pi}{3}, \\
\theta_{\text{LABOR}} &= \frac{5\pi}{3}, \\
\theta_{\text{MEDIA}} &= \frac{4\pi}{3}.
\end{align*}
\]

(Exact angles may be rotated by a global constant for visual balance; relative ordering and angular spacing remain invariant across all targets and sessions.)

Let \(v_i \in [0,100] \cup \{\varnothing\}\) be the existing field intensity of domain \(i\).

Define the **radial extent** function (for valid values only):

\[
r_i = R_{\min} + \alpha \cdot \frac{v_i}{100}, \qquad \alpha = R_{\max} - R_{\min}
\]

where \(R_{\min} > 0\) (inner safety radius) and \(R_{\max}\) is the outer drawing radius of the panel.  
This is an affine map; no non-linear scaling, no normalization across domains, no ranking.

The **field polygon** is the closed polygonal chain whose vertices are the Cartesian points

\[
\mathbf{p}_i = \bigl( r_i \cos\theta_i,\ r_i \sin\theta_i \bigr)
\]

ordered by increasing \(\theta_i\) (or any fixed cyclic order that respects the canonical angular placement).  
The filled region (or stroked outline) of this polygon constitutes the primary visual object “STRUCTURAL FIELD”.

Numeric values remain secondary annotations / tooltips only.

### 4. DOMAIN POSITIONS
Fixed angular assignment above is authoritative.  
No magnitude-based reordering, no dynamic sorting, no force-directed layout.

A user learns once:  
“location at angle \(\theta\) = TECHNOLOGY”  
and that identity is permanent.

### 5. MAGNITUDE
Radial extent \(r_i\) is controlled solely by the existing \(v_i\).  
The geometry therefore inherits all relative distinctions present in the input vector (e.g., LABOR = 88 produces a visibly larger radial spike than any 60-valued domain).

The field remains context-only; it is never the subject’s answer.

### 6. SEMANTIC LANGUAGE
(Unchanged.) Allowed terms: FIELD, FIELD INTENSITY, STRUCTURAL FIELD, DOMAIN SIGNAL, FIELD PRESSURE.  
Forbidden: risk, opportunity, probability, confidence, recommendation, strength, attractiveness, predicted outcome, higher = better, etc.

### 7. MISSING / ABSENT DATA (Strict Distinction)

If \(v_i = \varnothing\) (unavailable / classified absence):

- Retain the domain’s angular position \(\theta_i\).
- Render a distinct absence glyph at a fixed intermediate radius \(R_{\text{absent}}\) (or a dashed radial spoke + open marker) that is visually distinguishable from both \(r=0\) and any valid \(r_i\).
- Do **not** set \(r_i = 0\) and do **not** collapse the vertex toward the origin.
- The polygon edge that would have used \(\mathbf{p}_i\) is either omitted, drawn dashed, or replaced by an absence arc according to the existing absence representation contract.

If all six values are \(\varnothing\), the six angular positions and the central field marker remain visible, producing an unresolved six-spoke scaffold rather than an empty or broken chart.

Mathematical invariant:

\[
v_i = \varnothing \quad\not\equiv\quad v_i = 0.
\]

### 8–11. INTENT × HORIZON × SCOPE
(Unchanged.)

- Intent Strength \(\theta\) and Horizon \(t+\Delta\) are pure observation-frame parameters.
- They never scale, inflate, or interpolate the six \(v_i\).
- Horizon may replace the entire vector \(\mathbf{v}\) only when the existing simulation state already supplies horizon-specific values; otherwise the field is static and optionally annotated “not horizon-resolved”.
- Scope (LIVE / HISTORICAL / FORECAST WINDOW) selects among already-existing field states; no synthesis occurs.

### 12. INTERACTION
Read-first.  
Hover / focus on domain \(i\) surfaces the existing payload:

```
DOMAIN NAME
FIELD INTENSITY   v_i   (or “DATA UNAVAILABLE”)
SCOPE             current scope
FIELD SCOPE       Context only
```

Selection may emphasize the corresponding radial spoke / vertex.  
No vertex dragging, no editing of reality.

### 13. VISUAL HIERARCHY
(Unchanged order and relative area allocation.)  
STRUCTURAL FIELD receives substantially more vertical/horizontal real-estate than the former six-row matrix.

### 14–16. DESIGN OBJECTIVE / EPISTEMIC INVARIANT / IMPLEMENTATION BOUNDARY
(Unchanged.)  
The component answers only:

> What is the current observable field representation under this frame and scope?

It never answers investment, recommendation, or formation questions.  
Pipeline remains:

```
USER FRAME → FRAME CLASSIFICATION → FRAME ANCHORING → SUBJECT RESOLUTION → OBSERVATION → RELATIONSHIP → EVIDENCE
```

### 17. ACCEPTANCE CRITERIA
All original ACs remain.  
Additional mathematical ACs:

- **AC-13** — Angular positions are constant functions of domain identity only.  
- **AC-14** — Radial map is strictly affine in \(v_i\) for valid values and never applied to \(\varnothing\).  
- **AC-15** — Polygon vertices are exactly the set \(\{\mathbf{p}_i\}\) (or the corresponding absence glyphs).  
- **AC-16** — Changing Intent or Horizon never alters any \(v_i\) unless the upstream simulation already supplies a different vector.

### 18. PROPOSED LABEL
**3. STRUCTURAL FIELD**  
Supporting: SIX-DOMAIN OBSERVABLE FIELD

### 19. SUCCESS CONDITION
(Unchanged.)  
User perceives the shape of the field around the current projection, not six independent scores.

---

**Mathematical summary of the visual transform**

\[
\mathbf{v} = (v_1,\dots,v_6) \;\mapsto\;
\bigl\{ \mathbf{p}_i = r(v_i) \cdot (\cos\theta_i,\sin\theta_i) \bigr\}_{i=1}^6
\]

with \(\theta_i\) fixed, \(r(\cdot)\) affine for valid intensities, and a distinct non-zero treatment for \(\varnothing\).

Same data. Same epistemic boundary. Strictly geometric representation.
Yes. This is the right tightening.

The important improvement is that you've turned the visual concept into a **deterministic rendering contract**:

$$
\mathbf v \rightarrow \{\theta_i,\ r(v_i)\} \rightarrow \mathbf p_i
$$

That eliminates several ways an implementation could accidentally introduce new semantics.

I would make **one correction before handing this to the build agent**:

### Fix the pipeline statement

Your section 14–16 says:

> `USER FRAME → FRAME CLASSIFICATION → FRAME ANCHORING → SUBJECT RESOLUTION → OBSERVATION → RELATIONSHIP → EVIDENCE`

That ordering is inconsistent with the rest of the KRYLO contract we've established, because **evidence is upstream of relationship/formation**, not downstream of it.

Use:

```text
USER FRAME
→ FRAME CLASSIFICATION
→ FRAME ANCHORING
→ SUBJECT RESOLUTION
→ OBSERVATION
→ EVIDENCE
→ RELATIONSHIP ADMISSION
→ FORMATION
```

That matters because the Structural Field must remain downstream of the already-produced observation/field state. It cannot become an alternate path to evidence or formation.

### One other thing I'd explicitly lock

Your mathematical definition says:

> “ordered by increasing θ_i (or any fixed cyclic order...)”

I'd remove the alternative. **There should be exactly one canonical cyclic order.**

Otherwise an implementation can technically satisfy the spec while producing a visually different polygon.

So:

```text
The canonical polygon order is the fixed domain order defined by the
authoritative angular assignment. No alternate ordering is permitted.
```

Everything else is very tight.

In particular, I like the explicit invariant:

$$
v_i=\varnothing \not\equiv v_i=0
$$

That is exactly the kind of distinction that prevents the visual layer from quietly converting **absence of observation into a measured zero**.

At this point I would consider this **implementation-ready**, with those two edits.
