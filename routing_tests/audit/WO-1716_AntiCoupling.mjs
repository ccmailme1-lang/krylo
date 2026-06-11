// WO-1716 Anti-Coupling Regression Gate
// Verifies that Analysis search results do NOT auto-assign to bays.
// Run: node routing_tests/audit/WO-1716_AntiCoupling.mjs

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(process.cwd(), 'src');

function readSrc(rel) {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}

let pass = 0;
let fail = 0;

function check(id, description, result) {
  const status = result ? 'PASS' : 'FAIL';
  if (result) pass++; else fail++;
  console.log(`[${status}] ${id} — ${description}`);
  if (!result) console.log(`       *** INVARIANT VIOLATED ***`);
}

const idleField = readSrc('components/analysis/analysisidlefield.jsx');
const targetPacket = readSrc('components/analysis/targetpacket.jsx');

// 1. Auto-assign block must be gone from analysisidlefield
check(
  'WO-1716-A',
  'WO-1712 auto-assign block removed from analysisidlefield.jsx',
  !idleField.includes('WO-1712') && !idleField.includes('Push search query into Domain Isolation Console bays')
);

// 2. assignToBay must not be imported or called in analysisidlefield
check(
  'WO-1716-B',
  'assignToBay not present in analysisidlefield.jsx (no silent auto-assign path)',
  !idleField.includes('assignToBay')
);

// 3. useBayStore must not be imported in analysisidlefield
check(
  'WO-1716-C',
  'useBayStore not imported in analysisidlefield.jsx',
  !idleField.includes('useBayStore')
);

// 4. Domain Clamp present in targetpacket
check(
  'WO-1716-D',
  'WO-1716 Domain Clamp present in targetpacket.jsx',
  targetPacket.includes('WO-1716') && targetPacket.includes('ASSIGN TO BAY')
);

// 5. Qualified gate present — only VALIDATED/ESTIMATED may assign
check(
  'WO-1716-E',
  "Qualified gate enforced: assignment requires VALIDATED or ESTIMATED status",
  targetPacket.includes("envelope?.status === 'VALIDATED'") &&
  targetPacket.includes("envelope?.status === 'ESTIMATED'")
);

// 6. Source tag is 'user-clamp' not 'analysis-search'
check(
  'WO-1716-F',
  "Assignment source is 'user-clamp' — no analysis-search auto-trigger",
  targetPacket.includes("source: 'user-clamp'") &&
  !idleField.includes("source: 'analysis-search'")
);

console.log(`\n${pass}/${pass + fail} PASS`);
if (fail > 0) {
  console.error(`${fail} FAILURE(S) — anti-coupling regression detected`);
  process.exit(1);
}
