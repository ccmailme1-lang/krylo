// vite.config.js
// WO-229 — Proxy /api to local mock server on :3001
// WO-1039 — Proxy /asdiff to AS-DIFF engine on :4000
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
      '/api/stream': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
      '/api/signals/stream': {
        target: 'http://localhost:3001',
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
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/api/stats/stream': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        // SSE requires no buffering — keep connection open
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['cache-control'] = 'no-cache';
            proxyRes.headers['x-accel-buffering'] = 'no';
          });
        },
      },
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/asdiff': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/asdiff/, ''),
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