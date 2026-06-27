// WO-2015 — Phase-Lock Indicator
// Calendar-derived phase detection. No engine inputs. Display-only.
// getPhaseLock() → { phase, dotState }

const QUARTER_STARTS = [
  [0, 1],  // Q1: Jan 1
  [3, 1],  // Q2: Apr 1
  [6, 1],  // Q3: Jul 1
  [9, 1],  // Q4: Oct 1
];

export function getDayOfQuarter(date = new Date()) {
  const m = date.getMonth();   // 0-based
  const d = date.getDate();    // 1-based
  // Q start: Jan(0), Apr(3), Jul(6), Oct(9)
  const qStartMonth = Math.floor(m / 3) * 3;
  const qStart = new Date(date.getFullYear(), qStartMonth, 1);
  const diff = date - qStart;
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1; // 1-indexed
}

export function getPhase(dayOfQuarter) {
  if (dayOfQuarter <= 30)  return { phase: 'COMMITMENT', dotState: 0 };
  if (dayOfQuarter <= 60)  return { phase: 'EXECUTION',  dotState: 1 };
  return                          { phase: 'REFLECTION',  dotState: 2 };
}

export function getPhaseLock(date = new Date()) {
  const day = getDayOfQuarter(date);
  return getPhase(day);
}
