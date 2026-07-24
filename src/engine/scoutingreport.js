// src/engine/scoutingreport.js
// THE SCOUTING REPORT — sell-layer rollup of the five reporting lenses.
// Spec: specs/sell-layer-opportunity-architecture.md §6a/§6b · specs/lens-contract.md
//
// WHAT THIS IS: the storefront assembled from the ledger. The report speaks in sell register
// (forward-leaning, salient, macro) but every takeaway is bound to a grounded lens read and
// carries its receipt in `drill` — the sell-to-proof hinge, native to the format. Nothing here
// may assert something a lens did not sense.
//
// THE ROLLUP (spec §6b): the six lenses were never peers — FIVE SENSE, ONE SYNTHESIZES.
//   SIGNAL      → how hot the domain is
//   FLOW        → which way it is moving
//   PRESSURE    → what is constraining it
//   CONVERGENCE → how strongly the signals agree
//   DRIFT       → structure pulling away from narrative (the early tell)
//   → synthesized into a composite leverage score + prose read + cited Key Takeaways.
//
// §22 ABSENCE-IS-SIGNAL: a lens with no grounded read is NEVER zeroed, averaged away, or
// silently dropped. It surfaces as an explicit absence takeaway and is excluded from the score,
// with the exclusion itself reported (coverage + withheldLenses). Absence is stated, not faked.
//
// §21 ROUTE-DON'T-AGGREGATE: reads arrive atomic and per-lens. The composite is computed AFTER
// all reads are classified — aggregation is the last step, never the input.

import { checkSellClaim, REPORTING_LENSES } from '../config/lenscontract.js';

export const SCOUTING_REPORT_VERSION = 2;

const round = n => (Number.isFinite(n) ? parseFloat(Number(n).toFixed(2)) : n);
const clamp01 = n => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : null);

// ── LENS READ CONTRACT ───────────────────────────────────────────────────────────────────────
// Every lens hands the report the SAME shape. Lens-specific normalization happens in the adapter
// that builds the read (below), never inside the rollup — so each formula stays inspectable at
// the point it is applied and the composite never invents a mapping.
//
//   { lens, withheld, value: 0..1|null, label, groundedness: 0..1, receipt }
//
//   value        — the lens's grounded reading normalized to 0..1. The score's only numeric input.
//   groundedness — how much of that read is observed vs assumed (§18 hierarchy of truth).
//   receipt      — the raw producer output the citation drills into. This IS the proof door.

export function groundedRead(lens, { value, label, groundedness = 1, receipt = {} } = {}) {
  const v = clamp01(value);
  if (v === null) throw new Error(`scoutingreport: grounded ${lens} read requires a numeric value`);
  return Object.freeze({
    lens, withheld: false, value: v, label: label ?? null,
    groundedness: clamp01(groundedness) ?? 0,
    receipt: Object.freeze({ ...receipt, lens, withheld: false }),
  });
}

// §22 — absence as a classified state. Categories: STRUCTURAL (cannot exist here), TEMPORAL
// (expected, not yet observed), ANOMALOUS (was present, now missing), FILTERED (suppressed).
export function withheldRead(lens, reason, { absence = 'TEMPORAL', invariant = null, stage = null } = {}) {
  return Object.freeze({
    lens, withheld: true, value: null, label: null, groundedness: 0,
    reason: reason ?? 'UNAVAILABLE', absence,
    receipt: Object.freeze({ lens, withheld: true, reason: reason ?? 'UNAVAILABLE', absence, invariant, stage }),
  });
}

// ── ADAPTERS — one per reporting lens. Each documents its own normalization. ──────────────────

// SIGNAL — cone pressure on the §16 0–100 scale → 0..1. Straight rescale, no reweighting.
export function signalRead({ pressure, groundedness = 1 } = {}) {
  if (!Number.isFinite(pressure)) return withheldRead('SIGNAL', 'NO_PRESSURE_READING', { absence: 'TEMPORAL' });
  return groundedRead('SIGNAL', {
    value: pressure / 100,
    label: `P${Math.round(pressure)}`,
    groundedness,
    receipt: { pressure: round(pressure), scale: '0-100 (§16)', formula: 'value = pressure / 100' },
  });
}

// PRESSURE — constraint gauge: how much of the vessel's rated ceiling is in use.
// value = 1 − slack, i.e. a fully constrained domain reads 1.0. Caller supplies the gauge from
// pressurevessel.js (computeVesselPressure / computePressureField); no ceiling is assumed here.
export function pressureRead({ gauge, groundedness = 1 } = {}) {
  if (!Number.isFinite(gauge)) return withheldRead('PRESSURE', 'NO_VESSEL_GAUGE', { absence: 'TEMPORAL' });
  return groundedRead('PRESSURE', {
    value: gauge,
    label: `${Math.round(gauge * 100)}% of ceiling`,
    groundedness,
    receipt: { gauge: round(gauge), source: 'pressurevessel.js', formula: 'value = gauge (fraction of rated ceiling)' },
  });
}

// CONVERGENCE — how strongly the signals agree. Consumes the classifier's state, not raw pressure.
// value = the classifier's normalized convergence reading; the state label is carried as the receipt.
export function convergenceRead({ convergence, stateId = null, stateLabel = null, groundedness = 1 } = {}) {
  if (!Number.isFinite(convergence)) return withheldRead('CONVERGENCE', 'NO_CLASSIFIER_STATE', { absence: 'TEMPORAL' });
  return groundedRead('CONVERGENCE', {
    value: convergence,
    label: stateLabel ?? `${Math.round(convergence * 100)}%`,
    groundedness,
    receipt: { convergence: round(convergence), stateId, stateLabel, source: 'convergenceclassifier.js' },
  });
}

// FLOW — directional read (which way the domain is moving). Requires directed edges from
// domainflow.js; with no edge set there is no direction to report (§22 absence, never a zero).
export function flowRead({ direction = null, magnitude, counterparty = null, groundedness = 1 } = {}) {
  if (!Number.isFinite(magnitude) || !direction) {
    return withheldRead('FLOW', 'NO_DIRECTED_EDGES', { absence: 'TEMPORAL' });
  }
  return groundedRead('FLOW', {
    value: magnitude,
    label: `${direction}${counterparty ? ` → ${counterparty}` : ''}`,
    groundedness,
    receipt: { direction, magnitude: round(magnitude), counterparty, source: 'domainflow.js' },
  });
}

// DRIFT — consumes a computeDivergence('DRIFT', …) result verbatim (signalfacet.js). The margin
// is already |leverage_margin| on a 0..1 leverage scale; a withheld admission stays withheld.
export function driftRead(divergence, { groundedness = 1 } = {}) {
  if (!divergence || divergence.lens !== 'DRIFT') return withheldRead('DRIFT', 'NO_DIVERGENCE_RESULT', { absence: 'TEMPORAL' });
  if (divergence.withheld) {
    return withheldRead('DRIFT', divergence.withholding_reason, {
      absence: 'FILTERED', invariant: divergence.invariant ?? null, stage: divergence.stage ?? null,
    });
  }
  return groundedRead('DRIFT', {
    value: clamp01(divergence.margin) ?? 0,
    label: divergence.direction,
    groundedness,
    receipt: {
      relationship: divergence.relationship ?? null,
      direction: divergence.direction,
      margin: round(divergence.margin),
      facetA: divergence.facetA ?? null,
      facetB: divergence.facetB ?? null,
      ontology: divergence.ontology ?? null,
    },
  });
}

// Accepts either an already-normalized LensRead or a raw producer result (drift only, which has a
// self-identifying shape). Anything else is rejected rather than guessed at.
function coerceRead(lens, raw) {
  if (raw == null) return null;
  if (typeof raw.withheld === 'boolean' && ('value' in raw || 'receipt' in raw) && raw.lens === lens) return raw;
  if (lens === 'DRIFT' && raw.lens === 'DRIFT') return driftRead(raw); // raw computeDivergence result
  return null;
}

// ── SELL-REGISTER PROSE ──────────────────────────────────────────────────────────────────────
// Forward-leaning by design (sell layer may lead — spec §2), but each line says only what its
// lens actually read. Selected by the lens's own direction/band; never by the composite.

const DRIFT_TAKEAWAY = Object.freeze({
  STRUCTURE_LEADS: 'Structure is pulling ahead of the narrative — the field is moving before the story catches up.',
  NARRATIVE_LEADS: 'Narrative is running ahead of structure — attention is outpacing the underlying field.',
  ALIGNED:         'Structure and narrative are aligned — no divergence to exploit right now.',
});

// Band edges are stated here so an outside inspector can re-derive every line from the value.
const band = v => (v >= 0.75 ? 'HIGH' : v >= 0.40 ? 'MID' : 'LOW');

const BANDED_TAKEAWAY = Object.freeze({
  SIGNAL: Object.freeze({
    HIGH: d => `${d} is running hot — signal density is in the top band of the field.`,
    MID:  d => `${d} is live but unexceptional — mid-band signal density.`,
    LOW:  d => `${d} is quiet — signal density sits at the bottom of the field.`,
  }),
  PRESSURE: Object.freeze({
    HIGH: d => `${d} is near its constraint ceiling — little slack left before something has to give.`,
    MID:  d => `${d} carries real constraint but still has room to absorb.`,
    LOW:  d => `${d} is unconstrained — capacity is not the binding factor here.`,
  }),
  CONVERGENCE: Object.freeze({
    HIGH: d => `The signals on ${d} agree strongly — the field is speaking with one voice.`,
    MID:  d => `Partial agreement across ${d}'s signals — a read is forming, not settled.`,
    LOW:  d => `${d}'s signals disagree — no coherent convergence to trade on yet.`,
  }),
  FLOW: Object.freeze({
    HIGH: d => `Heavy directional movement through ${d} — the field is repositioning fast.`,
    MID:  d => `Steady directional movement through ${d}.`,
    LOW:  d => `Little directional movement through ${d} — flows are close to flat.`,
  }),
});

function takeawayText(lens, domain, read) {
  const d = String(domain ?? '').toUpperCase();
  if (lens === 'DRIFT') return DRIFT_TAKEAWAY[read.label] ?? 'Structure and narrative diverge.';
  return BANDED_TAKEAWAY[lens]?.[band(read.value)]?.(d) ?? `${d} — ${lens.toLowerCase()} read available.`;
}

// §22 absence phrasing — the report states what it does not know, and drills to WHY.
const ABSENCE_TEXT = Object.freeze({
  SIGNAL:      (d, r) => `No signal read for ${d} — ${r}.`,
  FLOW:        (d, r) => `No flow read for ${d} — ${r}.`,
  PRESSURE:    (d, r) => `No pressure read for ${d} — ${r}.`,
  CONVERGENCE: (d, r) => `No convergence read for ${d} — ${r}.`,
  DRIFT:       (d, r) => `No drift read for ${d} — ${r}.`,
});

// ── TAKEAWAYS — every one carries a citation + drill receipt (the sell-to-proof hinge) ───────
function buildTakeaway(domain, lens, read) {
  const d = String(domain ?? '').toUpperCase();
  const claim = read.withheld
    ? Object.freeze({
        lens, state: 'WITHHELD',
        text: (ABSENCE_TEXT[lens] ?? ((x, r) => `No ${lens.toLowerCase()} read for ${x} — ${r}.`))(d, read.reason),
        citation: lens, absence: read.absence, drill: read.receipt,
      })
    : Object.freeze({
        lens, state: 'GROUNDED',
        text: takeawayText(lens, domain, read),
        citation: lens, value: read.value, label: read.label, drill: read.receipt,
      });

  // Contract enforcement (specs/lens-contract.md): a sell-layer claim without a citation or a
  // proof door is a violation, and a claim may only call itself GROUNDED when its receipt is.
  // Fail loud — this is our own construction, so a violation is a build defect, not user input.
  const check = checkSellClaim('OPPORTUNITY', claim);
  if (!check.ok) throw new Error(`scoutingreport: lens contract violation on ${lens} — ${check.violations.join(', ')}`);
  return claim;
}

// ── COMPOSITE LEVERAGE SCORE (Founder-selected 2026-07-24) ───────────────────────────────────
//   leverage = geometricMean(grounded lens values) × avgGroundedness
// MULTIPLICATIVE by construction (§18): a weak leg craters the score and cannot be masked by a
// strong one — which a weighted average would allow, and §18 forbids. Withheld lenses are
// EXCLUDED, never entered as zero (§22), and the exclusion is reported as coverage so a
// three-lens score is never read as a five-lens score. Components are always carried alongside
// the composite (§18) so the number is re-derivable by an outside inspector from this object alone.
export function computeLeverage(reads = []) {
  const grounded = reads.filter(r => r && !r.withheld && Number.isFinite(r.value));
  const withheldLenses = reads.filter(r => r && r.withheld).map(r => r.lens);

  if (!grounded.length) {
    // §22 — no grounded legs is an ABSENCE state, not a zero score.
    return Object.freeze({
      value: null, state: 'ABSENT', absence: 'STRUCTURAL',
      reason: 'NO_GROUNDED_LENS_READS',
      components: Object.freeze([]), groundedCount: 0, lensCount: REPORTING_LENSES.length,
      coverage: 0, avgGroundedness: 0,
      formula: 'geometricMean(grounded lens values) × avgGroundedness',
      withheldLenses: Object.freeze(withheldLenses),
    });
  }

  // geometric mean via log-sum (exact 0 stays 0 — a genuine zero read SHOULD crater the score).
  const anyZero = grounded.some(r => r.value === 0);
  const geo = anyZero ? 0 : Math.exp(grounded.reduce((s, r) => s + Math.log(r.value), 0) / grounded.length);
  const avgGroundedness = grounded.reduce((s, r) => s + r.groundedness, 0) / grounded.length;

  return Object.freeze({
    value: round(geo * avgGroundedness),
    state: 'GROUNDED',
    components: Object.freeze(grounded.map(r => Object.freeze({
      lens: r.lens, value: round(r.value), groundedness: round(r.groundedness), label: r.label,
    }))),
    geometricMean: round(geo),
    avgGroundedness: round(avgGroundedness),
    groundedCount: grounded.length,
    lensCount: REPORTING_LENSES.length,
    coverage: round(grounded.length / REPORTING_LENSES.length),
    formula: 'geometricMean(grounded lens values) × avgGroundedness',
    withheldLenses: Object.freeze(withheldLenses),
  });
}

// ── PROSE SUMMARY — the macro read, assembled only from grounded takeaways ───────────────────
function proseSummary(domain, takeaways, leverage) {
  const d = String(domain ?? '').toUpperCase();
  const groundedT = takeaways.filter(t => t.state === 'GROUNDED');
  if (!groundedT.length) {
    return `No grounded lens read on ${d} right now. ${takeaways.length} lens${takeaways.length === 1 ? '' : 'es'} reporting absence — nothing to scout until a facet lands.`;
  }
  const lead = groundedT[0].text;
  const cover = `Read from ${leverage.groundedCount} of ${leverage.lensCount} lenses${
    leverage.withheldLenses.length ? ` (${leverage.withheldLenses.join(', ')} withheld)` : ''}.`;
  return `${lead} ${cover}`;
}

/**
 * buildScoutingReport — assemble the sell-layer report for one domain from grounded lens reads.
 * Report FORM per spec §6a: header · provenance · vitals · score row · prose · key takeaways ·
 * expandable detail rows (the drill-down list).
 *
 * @param {string} domain — canonical domain (§17)
 * @param {{signal?:object, flow?:object, pressure?:object, convergence?:object, drift?:object}} reads
 *        — normalized LensReads (see adapters above). `drift` also accepts a raw
 *          computeDivergence('DRIFT', …) result.
 * @param {{now?:number, vitals?:object}} opts
 * @returns frozen report
 */
export function buildScoutingReport(domain, reads = {}, { now = Date.now(), vitals = null } = {}) {
  if (!domain) throw new Error('scoutingreport: domain required');

  // §21 — atomic per-lens reads first, in fixed rollup order; aggregation strictly after.
  const byLens = {
    SIGNAL:      coerceRead('SIGNAL',      reads.signal),
    FLOW:        coerceRead('FLOW',        reads.flow),
    PRESSURE:    coerceRead('PRESSURE',    reads.pressure),
    CONVERGENCE: coerceRead('CONVERGENCE', reads.convergence),
    DRIFT:       coerceRead('DRIFT',       reads.drift),
  };

  const present   = REPORTING_LENSES.map(l => byLens[l]).filter(Boolean);
  const takeaways = present.map(r => buildTakeaway(domain, r.lens, r));
  const leverage  = computeLeverage(present);

  // Lenses that supplied nothing at all are reported as unsupplied — visible, not invisible (§22).
  const unsupplied = REPORTING_LENSES.filter(l => !byLens[l]);

  return Object.freeze({
    version: SCOUTING_REPORT_VERSION,
    title: 'Scouting Report',
    domain,
    generatedAt: now,                      // Observation Law: timestamped
    generatedBy: 'scouting-report-agent',  // Observation Law: attributed
    layer: 'SELL',                         // specs/lens-contract.md — this surface is the storefront
    vitals: Object.freeze(vitals ? { ...vitals } : {}),
    leverage,
    summary: proseSummary(domain, takeaways, leverage),
    takeaways: Object.freeze(takeaways),
    // the drill-down list — one expandable row per lens that reported, receipts included
    detail: Object.freeze(present.map(r => Object.freeze({
      lens: r.lens, state: r.withheld ? 'WITHHELD' : 'GROUNDED',
      value: r.withheld ? null : round(r.value), label: r.label,
      groundedness: round(r.groundedness), receipt: r.receipt,
    }))),
    unsupplied: Object.freeze(unsupplied),
  });
}
