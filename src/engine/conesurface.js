// WO-2067 — Cone Surface Contract
// Cone is a deterministic rendering surface over finalized domain state.
// Phase 5 only — consumes adapted invariant outputs (Phase 3) or composed sets (Phase 4).
// Never accesses Domain Package semantics directly.
// Never triggers re-evaluation of any upstream phase.
// Read-only consumer of already-resolved structure.

const _renderers = new Map();

// ── Registration ──────────────────────────────────────────────────────────────

// Register a Cone renderer for a domain.
// renderer(frozenAdaptedOutput) → structured display object (shape is renderer-defined)
// renderer MUST NOT mutate input. MUST NOT call upstream engines.
export function registerConeRenderer(domain, renderer) {
  if (typeof renderer !== 'function') {
    throw new Error(`Cone renderer for ${domain} must be a function`);
  }
  _renderers.set(domain, renderer);
}

// ── Phase 5: Single-domain rendering ─────────────────────────────────────────

export function renderCone(adaptedOutput) {
  if (!adaptedOutput?.adapted) {
    throw new Error(
      `Cone Surface: input must be a fully adapted output (Phase 3 complete). Domain "${adaptedOutput?.domain}" is not ready.`
    );
  }

  // Frozen deep copy — Cone has no mutation path into upstream state
  const frozen = Object.freeze(JSON.parse(JSON.stringify(adaptedOutput)));

  const renderer = _renderers.get(adaptedOutput.domain);
  if (!renderer) {
    // No renderer registered — return passthrough structure (safe fallback)
    return {
      domain:     adaptedOutput.domain,
      subject:    adaptedOutput.subject,
      invariants: adaptedOutput.invariants,
      rendered:   false,
      renderedAt: Date.now(),
    };
  }

  const surface = renderer(frozen);

  return {
    domain:     adaptedOutput.domain,
    subject:    adaptedOutput.subject,
    surface,
    rendered:   true,
    renderedAt: Date.now(),
  };
}

// ── Phase 5: Cross-domain composed rendering ──────────────────────────────────

export function renderComposedCone(composedOutput) {
  if (!composedOutput?.composed || !composedOutput.sets || !composedOutput.domains) {
    throw new Error('Cone Surface: renderComposedCone requires a valid composed invariant set (Phase 4 complete)');
  }

  const surfaces = {};

  for (const domain of composedOutput.domains) {
    const adaptedSlice = {
      domain,
      subject:    composedOutput.subject,
      invariants: composedOutput.sets[domain],
      adapted:    true,
    };
    const frozen   = Object.freeze(JSON.parse(JSON.stringify(adaptedSlice)));
    const renderer = _renderers.get(domain);

    surfaces[domain] = renderer
      ? renderer(frozen)
      : { rendered: false, invariants: composedOutput.sets[domain] };
  }

  return {
    domains:    composedOutput.domains,
    subject:    composedOutput.subject,
    surfaces,
    composed:   true,
    renderedAt: Date.now(),
  };
}

// ── Inspection ────────────────────────────────────────────────────────────────

export function isConeRendererRegistered(domain) {
  return _renderers.has(domain);
}
