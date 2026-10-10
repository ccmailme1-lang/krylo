// ownershiplookupstore.js -- DEF-1396. Framework-free record of the live SEC ownership lookup per subject, kept at module
// level so a reader that mounts AFTER 'krylo-rho-updated' fired still finds the outcome (the event alone was the only
// carrier, so a late-mounted Brief waited 45 s and reported "did not respond"). The record is session memory only,
// like canonical rho; it is the lookup STATUS, not the relationships' provenance (those come from latestEvidenceFor).
//   markStarted(id)        -- the lookup for this subject began (a new run resets any earlier outcome to pending)
//   markSettled(id, error) -- the lookup reported; error is the failure text or null
//   getOutcome(id)         -- null (never started or no record) | { startedAt, settledAt|null, error|null }
const _byId = new Map();

export function markStarted(id, now = Date.now()) {
  if (!id) return;
  _byId.set(id, { startedAt: now, settledAt: null, error: null });
  try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('krylo-rho-started', { detail: { canonicalId: id } })); } catch { /* no window */ }
}
export function markSettled(id, error = null, now = Date.now()) {
  if (!id) return;
  const prior = _byId.get(id);
  _byId.set(id, { startedAt: prior?.startedAt ?? now, settledAt: now, error: error ?? null });
}
export const getOutcome = (id) => _byId.get(id) ?? null;
export const _resetOwnershipLookupStore = () => _byId.clear();

// Recorded for every subject, mounted reader or not.
if (typeof window !== 'undefined') {
  window.addEventListener('krylo-rho-updated', (e) => { if (e.detail?.canonicalId) markSettled(e.detail.canonicalId, e.detail?.error ?? null); });
}
