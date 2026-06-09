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
];
