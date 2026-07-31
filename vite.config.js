// vite.config.js
// WO-229 — Proxy /api to mock server (VPS: krylo.org via nginx)
// WO-1039 — Proxy /asdiff to AS-DIFF engine (VPS: krylo.org via nginx)
// Local mock server no longer required — all traffic routed to VPS.
// Location: repo root
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { execSync } from 'child_process';

// KRYL-DIAG-1 — environment fingerprint. Baked in at build time so the running app can state
// its own identity (which commit, when built) without any runtime lookup.
function gitCommitSha() {
  try { return execSync('git rev-parse --short HEAD').toString().trim(); }
  catch { return 'unknown'; }
}

export default defineConfig({
  plugins: [tailwindcss(), react()],
  define: {
    __KRYLO_COMMIT_SHA__: JSON.stringify(gitCommitSha()),
    __KRYLO_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  resolve: {
    dedupe: ['@react-three/fiber', '@react-three/drei', 'three', 'react', 'react-dom'],
  },
  server: {
    hmr: false,
    proxy: {
      // Petro Locator — dev fuel proxy runs on the local mock-server (holds the key)
      '/api/fuel': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      // Gas Go POC — free EIA regional-average floor on the local mock-server (EIA key server-side).
      // MUST precede the '/api' catch-all so it resolves locally, not to production.
      '/api/eia-fuel': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      // Gas Go — real per-station prices via Apify (johnvc/fuelprices Actor), key server-side.
      '/api/fuel-apify': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      // KRYL-1052 — NARRATIVE facet: Event Registry proxy on the local mock-server (key
      // held server-side). Must precede the '/api' catch-all so it resolves locally.
      '/api/news-doc': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      // KRYL-DIAG-1 — root cause of the six-domain coverage investigation (2026-08-05/06):
      // every one of these routes has a real, working implementation in the local
      // as-diff/engine.js (port 4000), confirmed running all session, but none of them had
      // an explicit proxy rule here — they were all silently falling through to the generic
      // '/api' -> krylo.org catch-all below, which either 404s or behaves differently than
      // the local implementation. This is why local fixes to as-diff/engine.js (e.g. the
      // ambient-source prewarm) never affected the running app: it was never reaching that
      // server for these paths at all. Must precede the '/api' catch-all — Vite proxy rules
      // match in declaration order, most specific first.
      '/api/kalshi':          { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/api/eia':             { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/api/fred':            { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/api/finnhub':         { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/api/edgar':           { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/api/github':          { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/api/arxiv':           { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/api/npm':             { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/api/pubmed':          { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/api/openalex':        { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/api/bls':             { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/api/usajobs':         { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/api/treasury':        { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/api/worldbank':       { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/api/gdelt-doc':       { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/api/reddit-search':   { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/api/fhfa':            { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/api/usgs':            { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/api/maersk':          { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/api/usaspending-entity': { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/api/usaspending':     { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/api/fda-drugs':       { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/api/fda-devices':     { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/api/fec':             { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/api/census-acs':      { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/api/wayback-cdx':     { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/api/wayback-snapshot': { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/api/edgar-document':  { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/api/companies-house-profile':         { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/api/companies-house-filing-history':  { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/api/v1/persistence/execution-plan':   { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/api/tester-telemetry': { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/v1/timing-proxy':     { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/compare':             { target: 'http://localhost:4000', changeOrigin: true, secure: false },
      '/api/stream': {
        target: 'https://krylo.org',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
      '/api/signals/stream': {
        target: 'https://krylo.org',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['cache-control']    = 'no-cache';
            proxyRes.headers['x-accel-buffering'] = 'no';
          });
        },
      },
      '/api/signals/pressure': {
        target: 'https://krylo.org',
        changeOrigin: true,
        secure: false,
      },
      '/api/stats/stream': {
        target: 'https://krylo.org',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['cache-control'] = 'no-cache';
            proxyRes.headers['x-accel-buffering'] = 'no';
          });
        },
      },
      '/api': {
        target: 'https://krylo.org',
        changeOrigin: true,
        secure: false,
      },
      '/asdiff': {
        target: 'https://krylo.org',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-three': ['three', '@react-three/fiber', '@react-three/drei'],
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});