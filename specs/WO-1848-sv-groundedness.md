# WO-1848 — SV Groundedness (True Vector Decomposition)

**Status:** PENDING — BLOCKED (see §8)
**Replaces:** G proxy in WO-1851 (SV_cluster_count_proxy)
**Interface contract:** FROZEN — external semantics of G unchanged; only internal derivation upgrades

---

## 1. Single Responsibility

Replace the `SV_cluster_count_proxy` stub with a structurally valid groundedness count
derived from true SV vector decomposition, while preserving the integer, non-normalized
G interface contract established in WO-1851.

---

## 2. What G means (definition locked)

> G = count of **independent structural perspectives** contributing to a hypothesis

NOT:
- number of signals
- number of features
- number of supporting data points
- source volume

G is an **evidence diversity metric**, not a volume metric.

---

## LAYER 1 — SV IDENTITY (definition layer)

*What an SV is. Immutable once emitted.*

### 1.1 Definition

An SV (Signal Vector) is a raw structural signal unit:
- origin: tensor or arbitration engine
- immutable once emitted (no post-hoc mutation)
- carries a feature vector describing its structural properties

### 1.2 Properties

- identity is stable across evaluation passes
- two SVs with identical origin + feature vector = same SV (deduplication only, not weighting)
- no SV carries authority or priority at identity level

### 1.3 What SV identity is NOT

- not a confidence score
- not a ranked signal
- not a semantic label

---

## LAYER 2 — SV CONTRIBUTION (filtration layer)

*Whether a given SV counts toward G. Subject to redundancy filter and cluster rules.*

### 2.1 Effective uniqueness invariant

Each SV contributing to G must satisfy:

```
SV_i is only valid if it contributes non-redundant structural information
```

### 2.2 Redundancy constraint

```
SV_overlap(SV_i, SV_j) > θ  →  only one counts toward G
```

Where:
- `θ` = structural similarity threshold
- comparison basis: **feature vector overlap only** — NOT label similarity, NOT semantic similarity, NOT domain name
- Two SVs that span the same feature space count as one regardless of source label

### 2.3 Cluster collapse rule

SVs that fall within the same structural cluster (feature overlap > θ) collapse to a single
contribution unit. The cluster itself is the atomic contribution — not the member count.

### 2.4 What contribution filtration is NOT

- not semantic clustering
- not ranking by signal strength
- not weighting by source authority

---

## LAYER 3 — SV AGGREGATION (counting layer)

*How filtered contributions become G. Integer accumulation only.*

### 3.1 Accumulation rule

```
G_raw = count of distinct non-redundant SV contributions (post-filtration)
```

Integer only. No fractional accumulation. No weighted sum.

### 3.2 Saturation cap

```
G_effective = min(G_raw, G_max_capacity)
```

Where:
- `G_raw` = raw count of non-redundant contributions from Layer 2
- `G_max_capacity` = structural ceiling per hypothesis (TBD at implementation — derive from feature dimensionality of the SV space; must be defined before build)

**Why this matters:** Without a ceiling, G becomes a volume metric. Redundant-source hypotheses would inflate G, silently reintroducing ranking pressure excluded by WO-1851/1852.

### 3.3 What aggregation is NOT

- no normalization step (G is never divided by G_max_capacity)
- no 0–100 scaling
- no confidence score derivable from G
- no `f(W, G) → score` anywhere in pipeline

---

## 4. Layer separation invariant (critical)

These three layers must never collapse into one implementation block:

| Layer | Owns | Does NOT own |
|---|---|---|
| Identity | what SVs exist | whether they count |
| Contribution | whether each SV is valid | how they accumulate |
| Aggregation | integer count output | SV definition or filtration |

If any two layers share logic, the boundary is broken. Stop and re-separate before proceeding.

---

## 5. What WO-1848 must NOT do

- Must NOT normalize G
- Must NOT derive a confidence score from G
- Must NOT produce `f(W, G) → score`
- Must NOT change the W (WINDOW) axis
- Must NOT alter external display semantics of G (UI label stays `G:{n}`)
- Must NOT define SV cluster boundary semantics (deferred — separate WO)

---

## 6. Upgrade boundary (interface stability)

External contract (frozen):
```
G displayed as: G:{integer} PROXY_UNTIL_WO1848  →  G:{integer}
```

Only change at completion: remove `PROXY_UNTIL_WO1848` label after grep confirms zero remaining instances.
Internal derivation changes; downstream consumers (Assemblance, AT) see identical schema.

---

## 7. What WO-1848 does NOT resolve

**SV cluster boundary definition** — what constitutes a cluster boundary without
introducing semantic clustering bias. This is a separate architectural question.
Do not attempt to define cluster boundaries inside WO-1848. Defer explicitly.

---

## 8. Bottle Test

1. Reduces ambiguity? — YES (proxy replaced with three-layer defined derivation)
2. Single dominant output? — YES (`G_effective`: integer)
3. All boundaries defined? — PARTIAL (`G_max_capacity` TBD; `θ` TBD)
4. No undefined dependencies? — **BLOCKED** until SV vector source is specified
5. Does not increase expressive flexibility in core? — YES (constrains, does not expand)

**Build gate: BLOCKED**
Do not build until:
- SV vector source named
- `G_max_capacity` derivation defined
- `θ` threshold defined

---

## 9. Definition of Done

- Three layers implemented as separate, non-overlapping code units
- `G_effective` computed from non-redundant SV clusters (Layer 2 → Layer 3)
- Redundancy threshold `θ` defined, documented, and enforced
- `G_max_capacity` ceiling defined and enforced
- `PROXY_UNTIL_WO1848` label removed from all UI surfaces
- grep confirms zero `PROXY_UNTIL_WO1848` in codebase
- W axis unchanged
- No scalar score derivable from G
- Layer separation invariant (§4) passes code review
