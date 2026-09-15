import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Mobile-first, low-end-Android friendly: ES2020 target, no polyfill bloat,
// relative base so the built app can be dropped on any static host / subpath.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        // Single-file mode (Streamlit) must emit exactly ONE js chunk, or the
        // extra chunks would 404 — Streamlit cannot serve a static folder.
        // Normal builds keep react split out for better browser caching.
        manualChunks: process.env.SINGLE_FILE ? undefined : { react: ['react', 'react-dom'] },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Allow the sandboxed preview host (*.e2b.app) to load the dev server.
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
});
