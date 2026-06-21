// WO-1751 + WO-1752 — Consulting Intelligence Export Layer (Akeju Protocol)
// WO-1752: Provenance Rehydration & State Reconstruction
// Phase C (cryptographic signing / SHA-256 backend): deferred — see csss.js.

import { canonicalize, computeStateHash } from './csss.js';

export const EXPORT_FS_GATE = 0.70;

// WO-1752: Runtime state taxonomy — six-phase lifecycle
export const RUNTIME_STATE = Object.freeze({
  LIVE:              'LIVE',
  EXPORTED:          'EXPORTED',
  REHYDRATED:        'REHYDRATED',
  REPLAYING:         'REPLAYING',
  REPLAY_COMPATIBLE: 'REPLAY_COMPATIBLE',  // schema supported, engine differs
  REPLAY_VERIFIED:   'REPLAY_VERIFIED',    // 100% execution + structural + analytical parity
});

export const SCHEMA_VERSION = 'KRYLO-CONSULTING-EXPORT-v1752';
export const MODEL_VERSION  = 'WO1336.L1-L4.WO1341.v1+WO1751.v2+WO1752.v1';
export const ENGINE_VERSION = '3.7.2';
export const WO_CHAIN       = ['WO-1336', 'WO-1341', 'WO-1751', 'WO-1752'];

const FIDELITY_TIER = (fs) =>
  fs >= 0.85 ? 'VALIDATED' : fs >= 0.50 ? 'ESTIMATED' : 'LOW_FIDELITY';

const STATE_TYPE = (fs) =>
  fs >= 0.85 ? 'decision_support' : fs >= 0.70 ? 'analytical' : 'provisional';

// ── Artifact hash — CSSS-based, content-addressable ──────────────────────────
// Explicit field allowlist: excludes meta.generated, meta.time_frozen, meta.artifact_hash.
// Guarantees: Export → Import → Export → identical hash for identical content.
function contentAddressable(payload) {
  const p = payload;
  return {
    meta_schema:         p.meta?.schema,
    meta_state_type:     p.meta?.state_type,
    meta_model_version:  p.meta?.model_version,
    meta_export_gate:    p.meta?.export_gate,
    meta_runtime_state:  p.meta?.runtime_state,
    meta_classification: p.meta?.classification,
    subject:             p.subject,
    intelligence:        p.intelligence,
    courses_of_action:   p.courses_of_action,
    threats:             p.threats,
    opportunities:       p.opportunities,
    prov_source:         p.provenance?.source,
    prov_fidelity_score: p.provenance?.fidelity_score,
    prov_fidelity_tier:  p.provenance?.fidelity_tier,
    prov_causal_chain:   p.provenance?.causal_chain,
    prov_domain:         p.provenance?.domain_attribution,
    prov_acq_state:      p.provenance?.acquisition_state,
    prov_signal_sources: p.provenance?.signal_sources,
    signal_snapshot:     p.signal_snapshot,
    evidence_graph:      p.evidence_graph,
    domains:             p.domains,
    rf_engineVersion:    p.runtime_fingerprint?.engineVersion,
    rf_woChain:          p.runtime_fingerprint?.woChain,
    rf_fs:               p.runtime_fingerprint?.fs,
  };
}

export function computeArtifactHash(payload) {
  return computeStateHash(contentAddressable(payload));
}

// ── WO-1752: Schema section builders ─────────────────────────────────────────

function buildRuntimeFingerprint(fs) {
  return {
    engineVersion: ENGINE_VERSION,
    woChain:       WO_CHAIN,
    fs:            parseFloat(fs.toFixed(6)),
    // exportTimestamp omitted — ephemeral, stored in meta.generated, excluded from hash
  };
}

function buildSignalSnapshot(session, pendingAcquisition, fs) {
  const tensor  = session?.tensor ?? {};
  const sources = pendingAcquisition?.topK ?? tensor?.signalSources ?? [];

  return {
    primarySignal: (tensor?.domain ?? 'UNKNOWN').toUpperCase(),
    // fs is the authoritative export fidelity — must equal provenance.fidelity_score exactly
    confidence:    parseFloat(fs.toFixed(6)),
    convergence:   parseFloat((tensor?.convergenceScore ?? tensor?.fidelityScore ?? 0).toFixed(6)),
    signals: sources.map((s, i) => ({
      id:     s.insight
                ? s.insight.slice(0, 32).replace(/\s+/g, '_').toLowerCase()
                : `sig_${(s.domain ?? 'unk').toLowerCase()}_${i}`,
      domain: (s.domain ?? 'UNKNOWN').toUpperCase(),
      score:  typeof s.score === 'number' ? parseFloat(s.score.toFixed(6)) : 0,
      ttv:    s.ttv ?? null,
      label:  s.insight ?? '',
    })),
  };
}

function buildEvidenceGraph(session, pendingAcquisition) {
  const sources = pendingAcquisition?.topK ?? session?.tensor?.signalSources ?? [];

  const domainMap = new Map();
  sources.forEach((s, i) => {
    const d = (s.domain ?? 'UNKNOWN').toUpperCase();
    if (!domainMap.has(d)) {
      domainMap.set(d, { id: `node_${d.toLowerCase()}`, domain: d, weight: 0, sources: [] });
    }
    const node = domainMap.get(d);
    node.weight  = Math.max(node.weight, s.score ?? 0);
    node.sources = [...node.sources, s.insight ?? `signal_${i}`];
  });

  const contentNodes = Array.from(domainMap.values());
  const anchor = { id: 'node_causal_os', domain: 'CAUSAL_OS', weight: 1, sources: ['WO-1336'] };
  const nodes  = [anchor, ...contentNodes];

  const edges = contentNodes.map((n, i) => ({
    from:   i === 0 ? 'node_causal_os' : contentNodes[i - 1].id,
    to:     n.id,
    type:   i === 0 ? 'PROVENANCE' : 'CAUSAL',
    weight: 1,
  }));

  return { nodes, edges };
}

function buildDomainState(session, pendingAcquisition) {
  const tensor  = session?.tensor ?? {};
  const domain  = (tensor?.domain ?? pendingAcquisition?.domain ?? 'GENERAL').toUpperCase();
  const fs      = parseFloat((pendingAcquisition?.fidelityScore ?? tensor?.fidelityScore ?? 0).toFixed(6));
  const sources = pendingAcquisition?.topK ?? tensor?.signalSources ?? [];

  const domains = {
    [domain]: {
      active:     true,
      domain,
      fs,
      tier:       FIDELITY_TIER(fs),
      state_type: STATE_TYPE(fs),
      lens:       session?.lens ?? 'GENERAL',
      // query excluded — session context, not signal state; causes hash drift on round-trip
    },
  };

  sources.forEach(s => {
    const d = (s.domain ?? '').toUpperCase();
    if (d && !domains[d]) {
      const sigFs = parseFloat(((s.score ?? 0) / 100).toFixed(6));
      domains[d] = { active: false, domain: d, fs: sigFs, tier: FIDELITY_TIER(sigFs), source: s.insight ?? '' };
    }
  });

  return domains;
}

// ── Main export builder ───────────────────────────────────────────────────────

export function buildExportPayload(brief, session, fs, hp = null) {
  const acquisition = session?.pendingAcquisition ?? null;

  const payload = {
    meta: {
      schema:         SCHEMA_VERSION,
      generated:      new Date().toISOString(),
      classification: brief.classification,
      export_gate: {
        fs_required: EXPORT_FS_GATE,
        fs_actual:   parseFloat(fs.toFixed(6)),
        tier:        FIDELITY_TIER(fs),
        passed:      true,
      },
      state_type:    STATE_TYPE(fs),
      model_version: MODEL_VERSION,
      time_frozen:   new Date().toISOString(),
      runtime_state: RUNTIME_STATE.EXPORTED,
      // artifact_hash computed and attached below
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
      outlook:          brief.outlook.map(o => ({ probability: o.prob, label: o.label })),
    },
    courses_of_action: brief.coas ?? [],
    threats:           brief.threats ?? [],
    opportunities:     brief.opportunities?.map(o => o.label) ?? [],
    provenance: {
      source:             'KRYLO_CAUSAL_OS_WO1336',
      fidelity_score:     parseFloat(fs.toFixed(6)),
      fidelity_tier:      FIDELITY_TIER(fs),
      causal_chain:       WO_CHAIN,
      domain_attribution: brief.domain,
      acquisition_state:  acquisition?.state ?? session?.tensor?.acquisitionState ?? 'UNKNOWN',
      signal_sources:     acquisition?.topK?.map(c => ({
        insight:       c.insight,
        score:         c.score,
        domain:        c.domain,
        time_to_value: c.ttv ?? null,
      })) ?? [],
      note: 'Every claim in this document is traceable to the KRYLO Causal OS provenance DAG (WO-1336).',
    },
    runtime_fingerprint: buildRuntimeFingerprint(fs),
    signal_snapshot:     buildSignalSnapshot(session, acquisition, fs),
    evidence_graph:      buildEvidenceGraph(session, acquisition),
    domains:             buildDomainState(session, acquisition),
    ...(hp?.qualified ? {
      happy_path: {
        qualified:  true,
        domains:    hp.domains ?? [],
        peak_score: typeof hp.peakScore === 'number' ? parseFloat(hp.peakScore.toFixed(2)) : null,
        velocity:   hp.velocity ?? null,
        since:      hp.since ?? null,
      },
    } : {}),
  };

  payload.meta.artifact_hash = computeArtifactHash(payload);

  return payload;
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

export function canExport(fs) {
  return typeof fs === 'number' && fs >= EXPORT_FS_GATE;
}
