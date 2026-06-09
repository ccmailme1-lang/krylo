// WO-1122 — Conversational Host Layer (CHL)
// Guarded Conversational Interface — Spec LOCKED r2
// The Host mediates access to renderer-verified states. It does not generate truth.

import { buildNormalizedPayload, normalizeForRenderer, SUPPORTED_DOMAINS } from './normalizer.js';

// Formal execution order — enforced in processHostInput. Do not reorder.
const EXECUTION_ORDER = [
  '1_INPUT_VALIDATION',      // existence + renderer state HMAC verify
  '2_WO1121_NORMALIZATION',  // deterministic schema projection
  '3_LEGALITY_FILTER',       // domain + ontology rules
  '4_CONFIDENCE_GATE',       // degrade or refuse below threshold
  '5_RENDERER_SIGN',         // HMAC-lock the renderer epoch in the response
  '6_RESPONSE_ASSEMBLY',     // template-constrained output only
];

const CONFIDENCE_BANDS = {
  FULL:     0.90,
  CAUTIOUS: 0.70,
  CLARIFY:  0.50,
};

const FORBIDDEN_PHRASES = [
  'you definitely will',
  'definitely will',
  'guaranteed',
  'the engine knows',
  'this proves',
  'we can confirm',
  'it is certain',
];

// ─── SECRET BOUNDARY ─────────────────────────────────────────────────────────
// Only getHmacKey() may call getSecret().
// No other function in this module accesses KRYLO_INTERNAL_SECRET directly.
// Never log, serialize, or pass the return value outside the crypto functions.
function getSecret() {
  return typeof process !== 'undefined'
    ? process.env.KRYLO_INTERNAL_SECRET ?? null
    : null;
}

async function getHmacKey() {
  const secret = getSecret();
  if (!secret) return null;

  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

// ─── STEP 1 — HMAC verify incoming renderer state ────────────────────────────

async function verifyRendererState(signedState) {
  if (!signedState || !signedState.signature || !signedState.epoch_id || !signedState.topography) {
    return { verified: false, reason: 'MALFORMED_SIGNED_STATE' };
  }

  const key = await getHmacKey();

  if (!key) return { verified: false, reason: 'MISSING_SECRET' };

  try {
    const enc    = new TextEncoder();
    const body   = JSON.stringify(signedState.topography) + signedState.epoch_id;
    const sigBuf = Uint8Array.from(atob(signedState.signature), c => c.charCodeAt(0));
    const valid  = await crypto.subtle.verify('HMAC', key, sigBuf, enc.encode(body));

    return { verified: valid, reason: valid ? null : 'SIGNATURE_MISMATCH' };
  } catch {
    return { verified: false, reason: 'VERIFICATION_ERROR' };
  }
}

// Used by the Renderer to sign its state before handing it to the Host.
export async function signRendererState(topography, epochId) {
  const key = await getHmacKey();
  if (!key) throw new Error('KRYLO_INTERNAL_SECRET not set');

  const enc  = new TextEncoder();
  const body = JSON.stringify(topography) + epochId;
  const sig  = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  const b64  = btoa(String.fromCharCode(...new Uint8Array(sig)));

  return { epoch_id: epochId, topography, signature: b64 };
}

// ─── STEP 3 — Legality filter ─────────────────────────────────────────────────

function applyLegalityFilter(normalized) {
  const errors = [];

  if (!SUPPORTED_DOMAINS.includes(normalized.domain)) {
    errors.push(`ILLEGAL_DOMAIN: ${normalized.domain}`);
  }

  if (!Array.isArray(normalized.signals) || normalized.signals.length === 0) {
    errors.push('NO_LEGAL_SIGNALS');
  }

  return { legal: errors.length === 0, errors };
}

// ─── STEP 4 — Confidence gating ───────────────────────────────────────────────

function resolveConfidenceMode(confidence) {
  if (confidence >= CONFIDENCE_BANDS.FULL)     return 'FULL';
  if (confidence >= CONFIDENCE_BANDS.CAUTIOUS) return 'CAUTIOUS';
  if (confidence >= CONFIDENCE_BANDS.CLARIFY)  return 'CLARIFY';
  return 'REFUSE';
}

const CONFIDENCE_PREFIX = {
  FULL:     'Renderer state currently shows',
  CAUTIOUS: 'Historical patterns indicate',
  CLARIFY:  'Signal confidence is insufficient for a reliable interpretation.',
  REFUSE:   'No verified signal is currently available.',
};

// ─── STEP 6 — Response assembly ───────────────────────────────────────────────

function guardCertaintyLanguage(text) {
  const lower = text.toLowerCase();
  const violations = FORBIDDEN_PHRASES.filter(p => lower.includes(p));
  return { clean: violations.length === 0, violations };
}

function buildTracedClaim(interpretation, normalizedPayload, signedState) {
  return {
    statement:      interpretation,
    renderer_epoch: signedState?.epoch_id ?? null,
    signal_source:  normalizedPayload?.mapping_origin ?? null,
    signal_vector:  normalizedPayload?.signals ?? [],
    traceable:      !!(signedState?.epoch_id && normalizedPayload?.mapping_origin),
  };
}

// ─── Main entry point — enforces EXECUTION_ORDER strictly ─────────────────────

export async function processHostInput(rawText, signedRendererState = null) {

  // — STEP 1: Input validation + renderer state HMAC verify —
  if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
    return { mode: 'REFUSE', response: 'No verified signal is currently available.', step: EXECUTION_ORDER[0], traceable: false };
  }

  if (!signedRendererState) {
    return { mode: 'REFUSE', response: 'No verified signal is currently available.', step: EXECUTION_ORDER[0], traceable: false };
  }

  const { verified, reason } = await verifyRendererState(signedRendererState);
  if (!verified) {
    return { mode: 'REFUSE', response: 'No verified signal is currently available.', step: EXECUTION_ORDER[0], trace_failure: reason, traceable: false };
  }

  // — STEP 2: WO-1121 normalization —
  const normalized = buildNormalizedPayload(rawText);
  if (!normalized.valid) {
    return { mode: 'CLARIFY', response: `Signal confidence is insufficient for a reliable interpretation. (${normalized.rejection_reason})`, step: EXECUTION_ORDER[1], traceable: false };
  }

  // — STEP 3: Legality filter —
  const { legal, errors: legalErrors } = applyLegalityFilter(normalized);
  if (!legal) {
    return { mode: 'REFUSE', response: 'No verified signal is currently available.', step: EXECUTION_ORDER[2], legal_errors: legalErrors, traceable: false };
  }

  // — STEP 4: Confidence gating —
  const mode   = resolveConfidenceMode(normalized.confidence);
  const prefix = CONFIDENCE_PREFIX[mode];

  if (mode === 'REFUSE' || mode === 'CLARIFY') {
    return { mode, response: prefix, step: EXECUTION_ORDER[3], confidence: normalized.confidence, traceable: false };
  }

  // — STEP 5: Lock renderer epoch into response —
  const rendererPayload = normalizeForRenderer(normalized);
  const epochLock       = signedRendererState.epoch_id;

  // — STEP 6: Template-constrained response assembly —
  const rawInterpretation = `${prefix}: ${normalized.domain} signals detected for ${normalized.entity ?? 'target entity'} — confidence ${normalized.confidence}.`;

  const { clean, violations } = guardCertaintyLanguage(rawInterpretation);
  if (!clean) {
    return { mode: 'REFUSE', response: 'No verified signal is currently available.', step: EXECUTION_ORDER[5], violations, traceable: false };
  }

  const claim = buildTracedClaim(rawInterpretation, normalized, signedRendererState);
  if (!claim.traceable) {
    return { mode: 'CLARIFY', response: 'Signal confidence is insufficient for a reliable interpretation.', step: EXECUTION_ORDER[5], traceable: false };
  }

  return {
    mode,
    response:         claim.statement,
    confidence:       normalized.confidence,
    renderer_epoch:   epochLock,
    signal_source:    claim.signal_source,
    signal_vector:    claim.signal_vector,
    renderer_payload: rendererPayload,
    execution_steps:  EXECUTION_ORDER,
    traceable:        true,
  };
}
