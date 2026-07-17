// vite.config.js
// WO-229 — Proxy /api to mock server (VPS: krylo.org via nginx)
// WO-1039 — Proxy /asdiff to AS-DIFF engine (VPS: krylo.org via nginx)
// Local mock server no longer required — all traffic routed to VPS.
// Location: repo root
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss(), react()],
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
      // KRYL-1052 — NARRATIVE facet: Event Registry proxy on the local mock-server (key
      // held server-side). Must precede the '/api' catch-all so it resolves locally.
      '/api/news-doc': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
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