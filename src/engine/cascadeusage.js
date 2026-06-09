// WO-1708 — Adaptive Cascade Intelligence
// Deterministic state machine for UI adaptation.
// Phase A: lens/floor ranking. Phase B: timestamp-gated pre-fill + decay.

const KEY          = 'krylo_cascade_usage';
const MIN_RANK     = 3;                      // executions before adaptation kicks in
const PARAM_TTL    = 30 * 24 * 60 * 60 * 1000;  // 30 days — pre-fill expires after this
const SESSION_WINDOW = 7 * 24 * 60 * 60 * 1000; // 7 days — collapse decay window

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); }
  catch { return {}; }
}

function save(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* quota */ }
}

function now() { return Date.now(); }

// ── Phase A: Lens + floor ranking ─────────────────────────────────────────────

export function trackLens(lens) {
  if (!lens) return;
  const data = load();
  data.lens = data.lens ?? {};
  data.lens[lens] = (data.lens[lens] ?? 0) + 1;
  save(data);
}

export function trackFloor(value) {
  const data = load();
  data.floor = data.floor ?? {};
  data.floor[String(value)] = (data.floor[String(value)] ?? 0) + 1;
  save(data);
}

export function sortedSituations(situations) {
  const data = load();
  const counts = data.lens ?? {};
  return [...situations].sort((a, b) => (counts[b.lens] ?? 0) - (counts[a.lens] ?? 0));
}

export function topFloor(floorRanges) {
  const data = load();
  const counts = data.floor ?? {};
  let best = null, bestCount = 0;
  for (const range of floorRanges) {
    const c = counts[String(range.value)] ?? 0;
    if (c >= MIN_RANK && c > bestCount) { best = range.value; bestCount = c; }
  }
  return best;
}

// ── Phase B: Rules + advanced open with timestamps ───────────────────────────

export function trackAdvanced(lens) {
  if (!lens) return;
  const data = load();
  data.advanced = data.advanced ?? {};
  const entry = data.advanced[lens] ?? { count: 0, lastUsedTimestamp: 0 };
  entry.count += 1;
  entry.lastUsedTimestamp = now();
  data.advanced[lens] = entry;
  save(data);
}

export function preferAdvancedOpen(lens) {
  if (!lens) return false;
  const data = load();
  const entry = data.advanced?.[lens];
  if (!entry || entry.count < MIN_RANK) return false;
  // Collapse decay: if last opened outside session window and below threshold — collapse
  const elapsed = now() - (entry.lastUsedTimestamp ?? 0);
  if (elapsed > SESSION_WINDOW && entry.count < MIN_RANK) return false;
  return true;
}

export function trackRules(lens, rules) {
  if (!lens || !rules?.length) return;
  const filled = rules.filter(r => r.value?.trim().length > 0);
  if (!filled.length) return;
  const data = load();
  data.rules = data.rules ?? {};
  const entry = data.rules[lens] ?? { count: 0, saved: [], lastUsedTimestamp: 0 };
  entry.count += 1;
  entry.lastUsedTimestamp = now();
  entry.saved = filled.map(({ key, operator, value }) => ({ key, operator, value }));
  data.rules[lens] = entry;
  save(data);
}

export function topRulesForLens(lens) {
  if (!lens) return null;
  const data = load();
  const entry = data.rules?.[lens];
  if (!entry || entry.count < MIN_RANK) return null;
  // Pre-fill expiration: stale params fall back to scaffold
  const elapsed = now() - (entry.lastUsedTimestamp ?? 0);
  if (elapsed > PARAM_TTL) return null;
  return entry.saved;
}

// ── deriveState: pure function, no side effects ───────────────────────────────
// Returns the full UI state contract for a given lens.

export function deriveState(lens) {
  if (!lens) return { shouldExpand: false, prefill: null, activeBranch: null, reasonCode: 'FALLBACK_DEFAULT' };

  const data   = load();
  const rEntry = data.rules?.[lens];
  const aEntry = data.advanced?.[lens];
  const t      = now();

  // ── Expansion decision (independent of prefill) ───────────────────────────
  // advanced open history is the expansion signal; rules history is the prefill signal.
  // They are evaluated separately — one expiring does not affect the other.
  let shouldExpand  = false;
  let expandReason  = 'FALLBACK_DEFAULT';

  if (aEntry && aEntry.count >= MIN_RANK) {
    const elapsed = t - (aEntry.lastUsedTimestamp ?? 0);
    if (elapsed <= SESSION_WINDOW) {
      shouldExpand = true;
      expandReason = 'USAGE_THRESHOLD';
    } else {
      expandReason = 'SESSION_EXPIRED';
    }
  }

  // ── Prefill decision (independent of expansion) ───────────────────────────
  let prefill      = null;
  let prefillReason = 'FALLBACK_DEFAULT';

  if (rEntry && rEntry.count >= MIN_RANK) {
    const elapsed = t - (rEntry.lastUsedTimestamp ?? 0);
    if (elapsed <= PARAM_TTL) {
      prefill      = rEntry.saved;
      prefillReason = 'USAGE_THRESHOLD';
    } else {
      prefillReason = 'SESSION_EXPIRED';
    }
  }

  return {
    shouldExpand,
    prefill,
    activeBranch: lens,
    reasonCode: prefill ? prefillReason : expandReason,
  };
}

export function clearUsage() {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}
