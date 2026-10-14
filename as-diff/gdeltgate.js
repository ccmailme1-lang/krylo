// gdeltgate.js -- one turnstile for every GDELT request the engine makes. GDELT answers "Please limit requests to one every 5 seconds" (its own stated limit), and the app's ambient
// GDELT poll (/api/gdelt-doc) and the media-observation lookup share that quota, so requests are spaced GAP_MS apart in arrival order instead of racing each other into the limit.
export const GAP_MS = 5500;
let _last = 0, _chain = Promise.resolve(), _waiting = 0;
/** A request that must be made (the media-observation lookup): waits its turn, in arrival order. */
export function gdeltTurn({ gapMs = GAP_MS, now = () => Date.now(), sleep = (ms) => new Promise(r => setTimeout(r, ms)) } = {}) {
  _waiting++;
  const p = _chain.then(async () => { const wait = Math.max(0, _last + gapMs - now()); if (wait) await sleep(wait); _last = now(); }).finally(() => { _waiting--; });
  _chain = p.catch(() => {});
  return p;
}
/** An ambient request (the app's background GDELT poll): goes only if the quota is free right now; it never waits and never queues, because a waiting request holds one of the browser's few
 *  connections to the engine and starves the requests that matter (seen 2026-10-14: subject admissions timed out). When it cannot go, the caller answers empty at once, as it already did when GDELT limited it. */
export function gdeltTryTurn({ gapMs = GAP_MS, now = () => Date.now() } = {}) {
  if (_waiting > 0 || now() < _last + gapMs) return false;
  _last = now(); return true;
}
export const _resetGdeltGateForTests = () => { _last = 0; _chain = Promise.resolve(); _waiting = 0; };
