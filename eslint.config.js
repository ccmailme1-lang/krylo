// ESLint flat config — Phase A boundary enforcement
// Activate: npm i -D eslint then run: npx eslint src/components/analysis/targetpacket.jsx

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const noMathInGlass = require('./rules/no-math-in-glass.cjs');

export default [
  {
    files: ['src/components/analysis/targetpacket.jsx'],
    plugins: {
      'boundary': { rules: { 'no-math-in-glass': noMathInGlass } },
    },
    rules: {
      'boundary/no-math-in-glass': 'error',
    },
  },

  // WO-1714 — V/F isolation: convergenceclassifier and positioningengine must not import structuralfriction
  {
    files: ['src/engine/convergenceclassifier.js', 'src/engine/positioningengine.js'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['**/structuralfriction*'] }],
    },
  },

  // WO-1714 — F isolation: structuralfriction must not import V-side modules
  {
    files: ['src/engine/structuralfriction.js'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['**/convergenceclassifier*', '**/positioningengine*'] }],
    },
  },
];
