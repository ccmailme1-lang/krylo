// postcss.config.js
//
// KRYL-1332 (2026-09-28) — permanent fix for a boundary-crossing bug, not a workaround.
// This repo had NO postcss config file anywhere, and Vite's built-in CSS pipeline always
// calls postcss-load-config (cosmiconfig-based) regardless of the @tailwindcss/vite plugin
// already handling Tailwind itself. With no config found here, cosmiconfig walked UP the
// directory tree past this repo's boundary, attempting to read files outside krylo/ (observed:
// /Users/concec/package.json). Config resolution stops at the FIRST config file it finds — so
// simply having this file here, even minimal, permanently stops the upward search. autoprefixer
// is a real, already-declared dependency (package.json), not added for this fix.
export default {
  plugins: {
    autoprefixer: {},
  },
};
