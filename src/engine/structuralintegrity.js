// structuralintegrity.js — Structural Integrity Layer (KRYL-RSCH-2026-07 v0.2 → implementation)
// Internal instrument-calibration layer for KRYLO's own formations/prospectuses. NOT a reasoning
// engine, NOT a universal auditor — see specs/KRYL-RSCH-2026-07-StructuralIntegrityLayer.md.
//
// CRITICAL INVARIANT (enforced structurally, not just documented): every function here may only
// preserve, reduce, or quarantine evidential authority. None of these functions write back to
// formationinference.js, raise groundedness, override a lens floor, or create an edge. Pure,
// read-only, over already-computed KRYLO outputs.
//
// β_c = (SCI, CSAT, ISI, RCC, UE) — no composite scalar (§23 orthogonality). CSAT is withheld here:
// it requires a SAT/SMT solver dependency not yet integrated — never faked as "always satisfiable."

const clamp01 = (x) => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));

/**
 * computeSCI — Structural Contradiction Index, groundedness-weighted.
 * Real proxy for E+/E-: within one formation, domains sharing CONSTRUCTIVE polarity support each
 * other (E+); a domain reading FRACTURE inside an otherwise-constructive formation contradicts it
 * (E-). Weighted by each domain's real groundedness contribution (mag, the same value every lens
 * already reports) — not an invented contradiction-rules dictionary.
 * @param {{ direction: 'constructive'|'fracture'|'mixed', mag: number }[]} domainReads
 * @returns {number|null} SCI ∈ [0,1], or null if no polarized domains exist (nothing to contradict)
 */
export function computeSCI(domainReads = []) {
  const polarized = domainReads.filter((d) => d.direction === 'constructive' || d.direction === 'fracture');
  if (!polarized.length) return null;
  const wPlus = polarized.filter((d) => d.direction === 'constructive').reduce((s, d) => s + clamp01(d.mag), 0);
  const wMinus = polarized.filter((d) => d.direction === 'fracture').reduce((s, d) => s + clamp01(d.mag), 0);
  const denom = wPlus + wMinus;
  return denom > 0 ? clamp01(wMinus / denom) : 0;
}
export function sciBand(sci) {
  if (sci == null) return null;
  return sci <= 0.15 ? 'LOW' : sci <= 0.35 ? 'MODERATE' : 'HIGH';
}

/**
 * computeISI — Interpretation Stability Index. Real L1 delta over the SAME historySeries every
 * report's History sparkline already uses. < 2 frames → withheld (§22), never fabricated.
 * @param {{ts:number, v:number}[]} historySeries
 * @returns {number|null}
 */
export function computeISI(historySeries = []) {
  if (historySeries.length < 2) return null;
  let sumDelta = 0;
  for (let i = 1; i < historySeries.length; i++) sumDelta += Math.abs(historySeries[i].v - historySeries[i - 1].v);
  const muDelta = sumDelta / (historySeries.length - 1);
  return clamp01(1 - muDelta); // d_max = 1 (single-component vector: the field value itself)
}

/**
 * computeRCC — Replay Consistency Coefficient. Runs a PURE inference function k times on the SAME
 * frozen input and compares canonical (order-independent, volatile-field-stripped) JSON hashes.
 * Proves determinism structurally rather than asserting it.
 * @param {() => object} pureComputeFn — must be side-effect-free, called k times with identical input
 * @param {number} k
 * @returns {{ rcc: number, k: number }}
 */
export function computeRCC(pureComputeFn, k = 5) {
  const canonicalize = (obj) => JSON.stringify(obj, (key, val) => {
    if (key === 'generatedAt' || key === 'observedAt' || key === 'id') return undefined; // volatile/runtime fields
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return Object.keys(val).sort().reduce((acc, k2) => { acc[k2] = val[k2]; return acc; }, {});
    }
    return val;
  });
  const hashes = Array.from({ length: k }, () => canonicalize(pureComputeFn()));
  const first = hashes[0];
  const identical = hashes.filter((h) => h === first).length;
  return { rcc: clamp01(identical / k), k };
}

/**
 * computeBeta — the aggregated Integrity Vector. NO composite scalar (locked, §23). CSAT withheld:
 * no SAT/SMT solver integrated yet — this is stated, not silently defaulted to 1.
 * @returns frozen { sci, sciBand, csat: null, csatReason, isi, rcc, ue }
 */
export function computeBeta({ domainReads, historySeries, pureComputeFn, ueResult }) {
  const sci = computeSCI(domainReads);
  const isi = computeISI(historySeries);
  const rccResult = pureComputeFn ? computeRCC(pureComputeFn) : null;
  return Object.freeze({
    sci, sciBand: sciBand(sci),
    csat: null, csatReason: 'NO_SOLVER_INTEGRATED', // §22 — withheld, never faked as satisfiable
    isi,
    rcc: rccResult?.rcc ?? null, rccK: rccResult?.k ?? null,
    ue: ueResult ?? null,
  });
}
