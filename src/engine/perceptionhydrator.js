// KRYL-1158 — Hydration Engine (Component 3).
// Stateful core: merges validated evidence (from evidenceintake.js) into per-domain lifecycle
// state, producing a new immutable PerceptionFrame (perceptionframe.js) after each change.
//
// This module owns the ONLY mutable state in the whole KRYL-1158 pipeline. Everything upstream
// (intake) and downstream (frames, renderer) is pure/immutable by design — mutation is
// contained to exactly one place, on purpose.
//
// Migration Phase 1 — additive only. Nothing live imports this yet.

import {
  DOMAIN_STATE, awaitingDomainState, buildPerceptionFrame, validateTransition,
} from '../contracts/perceptionframe.js';
import { CANONICAL_DOMAINS } from './ontology.js';

// No explicit freshness window is specified anywhere in KRYL-1158/1159 — this is a
// conservative, documented default or the caller can override at creation time.
const DEFAULT_STALE_AFTER_MS = 15 * 60 * 1000; // 15 minutes

/**
 * @typedef {import('../contracts/perceptionframe.js').PerceptionFrame} PerceptionFrame
 * @typedef {{ domain: string, value: number, ts: number, source: string, confidence: number }} ValidatedEvidence
 */

/**
 * Creates one Hydration Engine instance. State is instance-scoped (not module-global) so
 * multiple independent hydrators can run in parallel — required by KRYL-1158's own Migration
 * Phase 2 ("run both systems in parallel and compare frames").
 * @param {{ staleAfterMs?: number }} [opts]
 */
export function createHydrator(opts = {}) {
  const staleAfterMs = opts.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;

  /** @type {Map<string, import('../contracts/perceptionframe.js').DomainState>} */
  let domainState = new Map(CANONICAL_DOMAINS.map(d => [d, awaitingDomainState(d)]));

  function currentFrame() {
    const { frame, violations } = buildPerceptionFrame([...domainState.values()]);
    if (!frame) {
      // Contract-level bug, not a data problem (all 6 domains are always present by
      // construction above) — fail loudly here rather than hide it in a bad frame.
      throw new Error('perceptionhydrator: internal state produced an invalid frame: ' + violations.join('; '));
    }
    return frame;
  }

  /**
   * Merges one validated evidence event into domain state. Reject-stale + duplicate-handling
   * both live here, since both require comparing against currently-held state.
   * @param {ValidatedEvidence} evidence
   * @returns {PerceptionFrame}
   */
  function applyEvidence(evidence) {
    const { domain, value, ts, source } = evidence ?? {};
    const existing = domainState.get(domain);
    if (!existing) return currentFrame(); // not a canonical domain — evidenceintake.js should never let this through; defensive no-op

    // Duplicate event — identical ts already applied to an OBSERVED/STALE domain. No-op.
    if ((existing.state === DOMAIN_STATE.OBSERVED || existing.state === DOMAIN_STATE.STALE) && existing.ts === ts) {
      return currentFrame();
    }

    // Out-of-order event — older than what's already held. Reject (keep existing), don't regress.
    if ((existing.state === DOMAIN_STATE.OBSERVED || existing.state === DOMAIN_STATE.STALE) && ts < existing.ts) {
      return currentFrame();
    }

    if (!validateTransition(existing.state, DOMAIN_STATE.OBSERVED)) {
      return currentFrame(); // illegal transition per the contract — refuse rather than force it
    }

    domainState.set(domain, Object.freeze({ domain, state: DOMAIN_STATE.OBSERVED, value, ts, source: source ?? null }));
    return currentFrame();
  }

  /**
   * Marks a domain INVALID — the hydration-side counterpart to evidenceintake.js's
   * quarantine, for when a caller determines a specific domain's data is unusable and wants
   * that reflected in the visible perception surface itself (§22: filtered absence is a
   * classified, visible state — not a silent log entry only).
   * @param {string} domain
   * @param {string} [reason]
   * @returns {PerceptionFrame}
   */
  function markInvalid(domain, reason) {
    const existing = domainState.get(domain);
    if (!existing) return currentFrame();
    if (!validateTransition(existing.state, DOMAIN_STATE.INVALID)) return currentFrame();
    domainState.set(domain, Object.freeze({ domain, state: DOMAIN_STATE.INVALID, value: null, ts: Date.now(), source: reason ?? null }));
    return currentFrame();
  }

  /**
   * Ages OBSERVED domains whose evidence has outlived the freshness window into STALE.
   * Call periodically (e.g. on a timer) — not triggered automatically by evidence arrival,
   * since aging is a function of the absence of new evidence, not a reaction to it.
   * @param {number} [now]
   * @returns {PerceptionFrame}
   */
  function tickStaleness(now = Date.now()) {
    for (const [domain, entry] of domainState) {
      if (entry.state === DOMAIN_STATE.OBSERVED && (now - entry.ts) > staleAfterMs) {
        domainState.set(domain, Object.freeze({ ...entry, state: DOMAIN_STATE.STALE }));
      }
    }
    return currentFrame();
  }

  return Object.freeze({
    applyEvidence,
    markInvalid,
    tickStaleness,
    getFrame: currentFrame,
  });
}
