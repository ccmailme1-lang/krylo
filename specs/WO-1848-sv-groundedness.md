# WO-1848 — SV Groundedness (True Vector Decomposition)

**Status:** PENDING  
**Replaces:** G proxy in WO-1851 (SV_cluster_count_proxy)  
**Interface contract:** FROZEN — external semantics of G unchanged; only internal derivation upgrades

---

## 1. Single Responsibility

Replace the `SV_cluster_count_proxy` stub with a structurally valid groundedness count
derived from true SV vector decomposition.

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

## 3. SV Effective Uniqueness Invariant

Each SV contributing to G must satisfy:

```
SV_i is only valid if it contributes non-redundant structural information
```

Redundancy constraint:

```
SV_overlap(SV_i, SV_j) > θ  →  only one counts toward G
```

Where:
- `θ` = structural similarity threshold (feature vector overlap, NOT label/semantic similarity)
- Two SVs that span the same feature space count as one
- Comparison basis: feature vector geometry, not source name or domain label

---

## 4. Saturation Rule (prevents runaway G inflation)

```
G_effective = min(G_raw, G_max_capacity)
```

Where:
- `G_raw` = raw count of non-redundant SVs
- `G_max_capacity` = structural ceiling per hypothesis (TBD at implementation — derive from feature dimensionality of the SV space)

**Why this matters:** Without a ceiling, G becomes a volume metric. High-SV hypotheses with redundant sources would inflate G, silently reintroducing ranking pressure that WO-1851/1852 explicitly excluded.

---

## 5. What WO-1848 must NOT do

- Must NOT normalize G into a 0–100 scale
- Must NOT derive a confidence score from G
- Must NOT produce `f(W, G) → score` anywhere in the pipeline
- Must NOT change the W (WINDOW) axis — W remains untouched
- Must NOT alter external display semantics of G (UI label stays `G:{n}`)

---

## 6. Upgrade boundary (interface stability)

External contract (frozen):
```
G displayed as: G:{integer} PROXY_UNTIL_WO1848  →  G:{integer}
```

Only change: remove `PROXY_UNTIL_WO1848` label once WO-1848 is verified clean.
Internal derivation changes; downstream consumers see identical schema.

---

## 7. What WO-1848 does NOT resolve

**SV cluster boundary definition** — what constitutes a cluster boundary without
introducing semantic clustering bias. This is a separate architectural question.
Do not attempt to define cluster boundaries inside WO-1848. Mark as deferred.

---

## 8. Bottle Test

1. Reduces ambiguity? — YES (replaces labeled proxy with defined derivation)
2. Single dominant output? — YES (G_effective: integer)
3. All boundaries defined? — PARTIAL (G_max_capacity TBD at implementation)
4. No undefined dependencies? — BLOCKED until SV vector source is specified
5. Does not increase expressive flexibility in core? — YES (constrains, does not expand)

**Build gate:** BLOCKED pending SV vector source specification.
Do not build until source is named and G_max_capacity derivation is defined.

---

## 9. Definition of Done

- `G_effective` computed from non-redundant SV clusters
- Redundancy threshold `θ` defined and documented
- `G_max_capacity` ceiling defined and enforced
- `PROXY_UNTIL_WO1848` label removed from all UI surfaces
- grep confirms no `PROXY_UNTIL_WO1848` remains in codebase
- W axis unchanged
- No scalar score derivable from G
