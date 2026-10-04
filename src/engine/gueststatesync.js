// gueststatesync.js — Guest State Durability (2026-10-02). Server mirror for guest work-product
// that previously lived only in browser localStorage (saved projects, evidence, DNA cards, path
// memory, etc.) -- confirmed via repo-wide grep that only telemetry.js had a server copy.
//
// Same fire-and-forget, best-effort pattern telemetry.js already uses: POST to the server,
// never blocks or throws on failure, localStorage stays the primary synchronous read/write path
// for the app itself. This is a backup mirror, not a new source of truth.

import { getActiveProfile } from '../store/useprofilestore.js';

export function syncGuestState(storeKey, data) {
  if (typeof window === 'undefined') return;
  const profileId = getActiveProfile();
  if (!profileId) return; // no signed-in tester -- nothing to attribute this save to
  fetch('/api/guest-state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileId, storeKey, data }),
  }).catch(() => {
    // Offline or API down -- localStorage already has it; this mirror attempt is best-effort only.
  });
}
