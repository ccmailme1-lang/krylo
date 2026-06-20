AN-2026-06-18 — Geometric Cone Gate Assessment

Status: Deferred

Finding:
Finite-cone culling math is valid and optimized but depends on a stable geometric
embedding space. KRYLO signal nodes are semantic constructs, not geometric entities.
The formula cannot become a kernel primitive until a projection layer exists.

Optimized form (for future reference):
  t = X · D̂  (D̂ must be normalized, computed once per frame)
  0 ≤ t ≤ h
  t² ≥ (X·X) · cos²(θ)
  Early exit on depth before angular test.

Current Fit:
Not suitable as a first-class Rust kernel primitive. Domain cones in KRYLO are
convergence-state visualizations, not Euclidean volumes.

Immediate Extraction:
Formalize active-set diffing and dispatch prioritization in SurfaceRouter:
  currentActiveNodes / previousActiveNodes → added / removed / modified → emit deltas only.
Currently done informally via pressure/priority shedding. Formalize inside WO-1092/1093.

Embryonic Embedding:
WO-1125 D/V/A/T position vector (dependency_density / volatility / reach / temporal)
is the nearest existing primitive to a semantic coordinate space. If a semantic
embedding layer is ever built, this is the starting point.

Relationship:
Potential future enhancement to WO-1092 (Surface Binding Layer) and WO-1093
(Streaming Backpressure + Flow Control).

Hidden connection:
Cone gate philosophy ("process only the highest-value candidate subset") is
identical to WO-1766/1767 domain ambiguity gate. Same principle, different layer.
