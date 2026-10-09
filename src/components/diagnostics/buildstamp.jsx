// buildstamp.jsx -- KRYL-1390. A tiny, low-contrast build stamp in the bottom-right corner so anyone can
// verify which build a page is running, and a visible warning when the page, an iframe, or the server's
// current commit disagree. Identity comes from the dev server's /__build.json (HEAD commit, dirty flag,
// commit time), read at page load; the baked-in constants (KRYL-DIAG-1) are the fallback for a build
// without that endpoint. HUD micro-label (CLAUDE.md section 7: not a report surface); no new colors.
import { useEffect, useRef, useState } from 'react';

// One id per page load: iframe URLs carry it so a reload never reuses a cached iframe document.
export const PAGE_LOAD_ID = Date.now().toString(36);

const BAKED = {
  commit: typeof __KRYLO_COMMIT_SHA__ !== 'undefined' ? __KRYLO_COMMIT_SHA__ : 'unknown',
  dirty: typeof __KRYLO_DIRTY__ !== 'undefined' ? __KRYLO_DIRTY__ : false,
  time: typeof __KRYLO_BUILD_TIME__ !== 'undefined' ? __KRYLO_BUILD_TIME__ : null,
};

async function fetchBuild() {
  try {
    const r = await fetch('/__build.json', { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    return j && j.commit ? j : null;
  } catch { return null; }
}

const fmt = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function BuildStamp() {
  const [loaded, setLoaded] = useState(BAKED);        // identity of this page load
  const [served, setServed] = useState(null);          // the server's current HEAD
  const [frames, setFrames] = useState({});            // page name -> commit it loaded with
  const loadedRef = useRef(loaded);

  useEffect(() => {
    let alive = true;
    fetchBuild().then((b) => { if (alive && b) { setLoaded(b); loadedRef.current = b; setServed(b); } });
    const poll = () => fetchBuild().then((b) => { if (alive && b) setServed(b); });
    const t = setInterval(poll, 30000);
    window.addEventListener('focus', poll);
    return () => { alive = false; clearInterval(t); window.removeEventListener('focus', poll); };
  }, []);

  useEffect(() => {
    const onMsg = (ev) => {
      if (ev.data?.type !== 'krylo-version' || !ev.data.page || !ev.data.commit) return;
      setFrames((f) => (f[ev.data.page] === ev.data.commit ? f : { ...f, [ev.data.page]: ev.data.commit }));
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // The commit also goes in the browser tab title (the usual place for a version tag), readable without finding the corner label.
  useEffect(() => {
    const base = 'KRYLO MONOLITH';
    document.title = `${base} · ${loaded.commit}${loaded.dirty ? '-dirty' : ''}`;
  }, [loaded.commit, loaded.dirty]);

  const warnings = [];
  if (served && served.commit !== loaded.commit) warnings.push(`newer build served: ${served.commit} (this page loaded ${loaded.commit}): reload`);
  for (const [page, commit] of Object.entries(frames)) {
    if (commit !== loaded.commit) warnings.push(`${page} loaded ${commit}, page ${loaded.commit}`);
  }

  const base = `${loaded.commit}${loaded.dirty ? '-dirty' : ''}${loaded.time ? ' · ' + fmt(loaded.time) : ''}`;
  return (
    <div
      aria-hidden="true"
      title={warnings.length ? warnings.join(' | ') : `build ${base}`}
      style={{
        position: 'fixed', right: 6, bottom: 3, zIndex: 2147483000, pointerEvents: 'none', // above every full-screen layer (the Analysis panel is opaque at z-index 15)
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: '0.06em',
        color: warnings.length ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.34)', textAlign: 'right', lineHeight: 1.3,
      }}
    >
      {warnings.length ? `⚠ ${warnings[0]}` : base}
    </div>
  );
}
