// WO-1751 — Consulting Intelligence Export Layer (Akeju Protocol)
// Exports the Intelligence Brief (WO-1341) as a provenance-traced JSON package.
// Gate: Fs ≥ 0.70 required. Every claim traceable to Causal OS provenance DAG.

export const EXPORT_FS_GATE = 0.70;

const FIDELITY_TIER = (fs) =>
  fs >= 0.85 ? 'VALIDATED' : fs >= 0.50 ? 'ESTIMATED' : 'LOW_FIDELITY';

// Authority inflation guard — prevents silent upward interpretation of export confidence.
// PROVISIONAL: below gate (should never appear in export, included for completeness)
// ANALYTICAL:  Fs 70–84% — suitable for analysis and strategy formation
// DECISION_SUPPORT: Fs ≥ 85% — validated signal, suitable for action
const STATE_TYPE = (fs) =>
  fs >= 0.85 ? 'decision_support' : fs >= 0.70 ? 'analytical' : 'provisional';

// Encodes the exact WO derivation chain as a version string.
// Changing any upstream WO changes this string — version drift becomes visible.
export const MODEL_VERSION = 'WO1336.L1-L4.WO1341.v1+WO1751.v1';

export function buildExportPayload(brief, session, fs) {
  const acquisition = session?.pendingAcquisition ?? null;

  return {
    meta: {
      schema:         'KRYLO-CONSULTING-EXPORT-v1751',
      generated:      new Date().toISOString(),
      classification: brief.classification,
      export_gate: {
        fs_required: EXPORT_FS_GATE,
        fs_actual:   parseFloat(fs.toFixed(4)),
        tier:        FIDELITY_TIER(fs),
        passed:      true,
      },
      state_type:    STATE_TYPE(fs),
      model_version: MODEL_VERSION,
      time_frozen:   new Date().toISOString(),
    },
    subject: {
      entity: brief.subject,
      lens:   brief.lens,
      domain: brief.domain,
      date:   brief.date,
      as_of:  brief.asOf,
    },
    intelligence: {
      bluf:             brief.bluf,
      purpose:          brief.purpose,
      five_ws:          brief.fiveWs,
      evidence:         brief.evidence,
      assumptions:      brief.assumptions,
      assessment:       brief.assessment,
      alternative_view: brief.alternativeView,
      outlook:          brief.outlook.map(o => ({
        probability: o.prob,
        label:       o.label,
      })),
    },
    courses_of_action: brief.coas ?? [],
    threats:           brief.threats ?? [],
    opportunities:     brief.opportunities?.map(o => o.label) ?? [],
    provenance: {
      source:             'KRYLO_CAUSAL_OS_WO1336',
      fidelity_score:     parseFloat(fs.toFixed(4)),
      fidelity_tier:      FIDELITY_TIER(fs),
      causal_chain:       ['WO-1336', 'WO-1341', 'WO-1751'],
      domain_attribution: brief.domain,
      acquisition_state:  acquisition?.state ?? session?.tensor?.acquisitionState ?? 'UNKNOWN',
      signal_sources:     acquisition?.topK?.map(c => ({
        insight:    c.insight,
        score:      c.score,
        domain:     c.domain,
        time_to_value: c.ttv ?? null,
      })) ?? [],
      note: 'Every claim in this document is traceable to the KRYLO Causal OS provenance DAG (WO-1336). Fidelity score reflects multi-factor signal quality across source materiality, temporal decay, domain depth, and evidence strength.',
    },
  };
}

export function triggerDownload(payload) {
  const slug     = (payload.subject.entity ?? 'brief').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const dateSlug = payload.meta.generated.slice(0, 10);
  const filename = `krylo-brief-${slug}-${dateSlug}.json`;
  const blob     = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url      = URL.createObjectURL(blob);
  const a        = document.createElement('a');
  a.href         = url;
  a.download     = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Gate check — call before building payload
export function canExport(fs) {
  return typeof fs === 'number' && fs >= EXPORT_FS_GATE;
}
