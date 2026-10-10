// useanalyticalsnapshot.js -- KRYL-1398. The one way a surface learns which analytical snapshot it is rendering.
//   status 'idle'     -- no analysis has been started in this page session (surfaces behave as before)
//   status 'checking' -- a query's subject lookups have not settled: surfaces show only "Checking…"
//   status 'ready'    -- a frozen snapshot is active; every pool and rho read in the app returns its frozen copy
// snapKey is a memo-dependency string: it changes exactly when the displayed generation changes, so a surface that memoized
// a read of the pool re-reads it once, from the frozen copy.
import { useSyncExternalStore } from 'react';
import { subscribeSnapshot, getSnapshotState } from '../engine/analyticalsnapshot.js';

export function useAnalyticalSnapshot() {
  const state = useSyncExternalStore(subscribeSnapshot, getSnapshotState, getSnapshotState);
  return { ...state, snapKey: `${state.status}:${state.active?.id ?? ''}` };
}

/** "2026-10-10 11:12:03 PDT": date, time and time zone of the snapshot (spec: Analysis snapshot: date, time, time zone). */
export function formatSnapshotTime(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  const tz = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(d).find(x => x.type === 'timeZoneName')?.value ?? '';
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())} ${tz}`.trim();
}
