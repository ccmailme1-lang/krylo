// KRYL-1010 — Search Environment State (SES), slice 1.
//
// Pre-search epistemic PRECONDITION layer: establishes the observation conditions
// AROUND a query BEFORE evidence interpretation begins. It does NOT produce conclusions
// and does NOT mutate any grounded score — it ANNOTATES and (later) conditions retrieval.
//
// Guardrails from the ticket (non-negotiable — keep SES from becoming the contamination
// it prevents):
//   (1) DECOMPOSE, never bundle. The fields stay orthogonal. observationHealth is a
//       transparent, decomposed LABEL (min-of grounded health fields), never a hidden
//       composite that gates grounded scores (§18/§23).
//   (2) No silent score multipliers. Slice 1 performs ZERO score adjustment.
//   (3) SES CARRIES ITS OWN GROUNDEDNESS per field. A read with no grounded source is
//       ESTIMATED or ABSENT, never presented as measured (§22). SES is not exempt from
//       the truth discipline it enforces.

const GROUNDED = 'GROUNDED', ESTIMATED = 'ESTIMATED', ABSENT = 'ABSENT';
const FRESH_HALF_LIFE_MS = 6 * 60 * 60 * 1000; // evidence freshness decays to 50 by 6h old

function clampN(v) { return v == null ? null : Math.max(0, Math.min(100, Math.round(v))); }
function field(value, status, groundedness) { return { value: clampN(value), status, groundedness }; }
const grounded  = (v, g = 1) => field(v, GROUNDED, g);
const estimated = (v)        => field(v, ESTIMATED, 0);
const absent    = ()         => field(null, ABSENT, 0);

/**
 * computeSES({ observations, query, domains }) -> SearchEnvironmentState
 * Pure. Reads a snapshot (from runtimeobservablestore.getObservations()) and context.
 * Returns the primitive with per-field groundedness + its own overall groundedness.
 */
export function computeSES({ observations = {}, query = '', domains = [] } = {}) {
  const o = observations || {};

  // ── Grounded observable fields (real reads or ABSENT) ──────────────────────
  const signalDensity = (o.signalDensity?.value != null)
    ? grounded(o.signalDensity.value) : absent();

  const sourceIntegrity = (() => {
    const s = o.sourceIntegrity;
    if (!s || s.activeSources == null) return absent();
    const total = (s.activeSources ?? 0) + (s.erroredSources ?? 0);
    return total > 0 ? grounded((s.activeSources / total) * 100) : absent();
  })();

  const evidenceFreshness = (o.evidenceTs != null)
    ? grounded(100 * Math.pow(0.5, Math.max(0, Date.now() - o.evidenceTs) / FRESH_HALF_LIFE_MS))
    : absent();

  // narrativeVolatility: interpretive, but grounded WHEN derived from real snapshots.
  const narrativeVolatility = (o.narrative?.volatility != null)
    ? grounded(o.narrative.volatility) : absent();

  // ── Interpretive fields — no grounded source in slice 1 → ESTIMATED (§22) ──
  const causalVisibility     = estimated(null);
  const dependencyComplexity = estimated(null);

  // ── observationHealth — transparent, decomposed LABEL (min-of grounded health) ──
  // NOT a gate: never multiplies a grounded score. Worst grounded health field wins,
  // so one bad condition can't be averaged away.
  const healthInputs = [
    evidenceFreshness,
    sourceIntegrity,
    narrativeVolatility.status === GROUNDED ? grounded(100 - narrativeVolatility.value, narrativeVolatility.groundedness) : narrativeVolatility,
  ].filter(f => f.status === GROUNDED);
  const observationHealth = healthInputs.length
    ? grounded(Math.min(...healthInputs.map(f => f.value)), Math.min(...healthInputs.map(f => f.groundedness)))
    : absent();

  // ── Warnings + conditions (the actual value of SES) ────────────────────────
  const environmentalWarnings = [];
  const activeConditions = [];

  if (narrativeVolatility.status === GROUNDED && narrativeVolatility.value > 60) {
    environmentalWarnings.push('Environment noisy — discount commentary; prioritize structural/primary evidence.');
    activeConditions.push('HIGH_NARRATIVE_VOLATILITY');
  }
  if (sourceIntegrity.status === GROUNDED && sourceIntegrity.value < 40) {
    environmentalWarnings.push('Thin source coverage — treat single-source reads as tentative.');
    activeConditions.push('THIN_SOURCES');
  }
  if (evidenceFreshness.status === GROUNDED && evidenceFreshness.value < 40) {
    environmentalWarnings.push('Evidence is stale — current state may be unobserved (temporal absence).');
    activeConditions.push('STALE_EVIDENCE');
  }

  // ── SES's own groundedness (guardrail #3): mean of the 7 fields' groundedness ──
  const allFields = [
    observationHealth, evidenceFreshness, signalDensity, narrativeVolatility,
    sourceIntegrity, causalVisibility, dependencyComplexity,
  ];
  const groundedCount = allFields.filter(f => f.status === GROUNDED).length;
  const sesGroundedness = allFields.reduce((s, f) => s + f.groundedness, 0) / allFields.length;

  // Cold start: nothing grounded yet → say so, do not present as measured (§22).
  if (groundedCount === 0) {
    environmentalWarnings.unshift('Observation environment not yet established — SES ungrounded; no environmental conditioning applied.');
    activeConditions.push('ENVIRONMENT_UNOBSERVED');
  }

  return {
    observationHealth, evidenceFreshness, signalDensity, narrativeVolatility,
    sourceIntegrity, causalVisibility, dependencyComplexity,
    environmentalWarnings,
    activeConditions,
    affectedDomains: Array.isArray(domains) ? domains : [],
    groundedness: parseFloat(sesGroundedness.toFixed(2)),
    ts: Date.now(),
  };
}
