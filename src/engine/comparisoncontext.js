// comparisoncontext.js — KRYL-1001 CRE: persistent Comparison Context.
//
// The Diff Engine (crediff.runComparativeDiff) compares an anchor against a peer set. Slice 1
// hardcoded that set. This module makes the PREVIOUS QUERY AN EPISTEMIC ASSET, not browser
// history: it accumulates anchor entities across the session and chooses the best comparison
// BASIS (last search, strongest prior, sector peer set) to feed the Diff Engine.
//
// §21 Route-Don't-Aggregate: choosing a comparison basis is a ROUTING decision made BEFORE the
// diff — allowed. No signals are aggregated here; we select which entities to compare against.
// §19/§22: empty context does NOT fabricate a basis — we fall back to the anchor's peer set, and
// if none exists the caller gets NO_BASIS (absence surfaced, never invented).

import { runComparativeDiff, HARDCODED_PEER_SETS } from './crediff.js';

const MAX_CONTEXT = 25;          // cap accumulated anchors per session
const STORE_KEY   = 'krylo.cre.comparisonContext.v1';

// sessionStorage-backed with in-memory fallback (node / SSR safe).
let _mem = [];
function _ss() { try { return typeof sessionStorage !== 'undefined' ? sessionStorage : null; } catch { return null; } }
function _load() {
  const ss = _ss();
  if (!ss) return _mem;
  try { return JSON.parse(ss.getItem(STORE_KEY) || '[]'); } catch { return []; }
}
function _save(list) {
  _mem = list;
  const ss = _ss();
  if (ss) { try { ss.setItem(STORE_KEY, JSON.stringify(list)); } catch { /* quota — keep memory copy */ } }
}

// Record an anchor after a search. meta may carry { domain, leverageMargin } from the diff result.
export function recordAnchor(entity, meta = {}) {
  const key = (entity ?? '').toUpperCase();
  if (!key) return _load();
  const list = _load().filter(a => a.entity !== key);          // de-dupe: newest wins
  list.push({ entity: key, ts: Date.now(), domain: meta.domain ?? null, leverageMargin: meta.leverageMargin ?? null });
  const trimmed = list.slice(-MAX_CONTEXT);
  _save(trimmed);
  return trimmed;
}

export function getContext() { return _load(); }
export function clearContext() { _save([]); }

// Select the best comparison basis for an anchor. Priority (highest first):
//   1. prior anchors in the SAME domain (structurally like-for-like)
//   2. the strongest prior anchor by recorded leverageMargin
//   3. the most recent prior anchor (the classic "vs last search")
//   4. the anchor's hardcoded sector peer set (crediff)
// Returns { basis: string[], reason } — basis excludes the anchor itself. NO_BASIS when empty.
export function selectComparisonBasis(anchor, { context, anchorDomain } = {}) {
  const key  = (anchor ?? '').toUpperCase();
  const ctx  = (context ?? getContext()).filter(a => a.entity !== key);
  const peerSet = HARDCODED_PEER_SETS[key] ?? null;

  if (ctx.length) {
    const sameDomain = anchorDomain ? ctx.filter(a => a.domain === anchorDomain) : [];
    if (sameDomain.length) return { basis: sameDomain.map(a => a.entity), reason: 'CONTEXT_SAME_DOMAIN' };
    const withMargin = ctx.filter(a => typeof a.leverageMargin === 'number');
    if (withMargin.length) {
      const strongest = withMargin.sort((a, b) => b.leverageMargin - a.leverageMargin)[0];
      return { basis: [strongest.entity], reason: 'CONTEXT_STRONGEST_PRIOR' };
    }
    const recent = ctx.sort((a, b) => b.ts - a.ts)[0];
    return { basis: [recent.entity], reason: 'CONTEXT_MOST_RECENT' };
  }
  if (peerSet && peerSet.length) return { basis: peerSet, reason: 'SECTOR_PEER_SET' };
  return { basis: [], reason: 'NO_BASIS' };   // §22 — absence surfaced, not invented
}

// Convenience: pick basis from context, run the Diff Engine against it, and enrich context with
// the anchor + its leverage margin so the NEXT search is smarter. One-call CRE comparative pass.
export function compareWithContext(anchor, { anchorDomain, record = true } = {}) {
  const sel  = selectComparisonBasis(anchor, { anchorDomain });
  const diff = runComparativeDiff(anchor, sel.basis.length ? { peers: sel.basis } : {});
  const topMargin = diff.results?.[0]?.leverageMargin ?? null;
  if (record) recordAnchor(anchor, { domain: anchorDomain, leverageMargin: topMargin });
  return { ...diff, comparisonBasis: sel.basis, basisReason: sel.reason };
}
