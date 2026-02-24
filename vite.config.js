import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 'base' is critical for Render Static Sites to find assets on subdomains
  base: './', 
  build: {
    outDir: 'dist',
    // Clean the dist folder before every build
    emptyOutDir: true,
    // Terser provides smaller, faster production bundles
    minify: 'terser',
    rollupOptions: {
      output: {
        // Keeps the build organized for the "Unified Ecosystem"
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
  server: {
    port: 3000,
    strictPort: true,
  }
})