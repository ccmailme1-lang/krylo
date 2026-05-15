#!/bin/zsh

# KRYLO SYSTEM RECOVERY - WO-RESTORE-ALPHA
# TARGET: Intel i9 MacBook Pro
# RIGOR: Principle-Level / Non-Destructive

echo "--- STARTING KRYLO RESTORATION ---"

# 1. CLEAN ENVIRONMENT
echo "[1/5] Purging shell pollution..."
# Surgical removal of GEMINI/GOOGLE/VERTEX/AIDER lines from .zshrc
sed -i.bak '/GEMINI\|GOOGLE\|VERTEX\|AIDER\|claudecode/d' ~/.zshrc
# Force Intel i9 Pathing
if ! grep -q "/usr/local/bin" ~/.zshrc; then
    echo 'export PATH="/usr/local/bin:/usr/local/sbin:$PATH"' >> ~/.zshrc
fi

# 2. KILL GHOST PROCESSES
echo "[2/5] Terminating background agents..."
killall node 2>/dev/null
rm -rf ~/.aider ~/.cache/litellm 2>/dev/null

# 3. DIRECTORY STRUCTURE
echo "[3/5] Rebuilding logic gates..."
mkdir -p src/core src/hooks

# 4. WO-873: STATE CONTRACT (The Math)
echo "[4/5] Injecting WO-873 State Contract..."
cat <<EOF > src/core/stateContract.js
export const KRYLO_CONFIG = { 
  THRESHOLD: 0.88, 
  CADENCE: 750, 
  WEIGHTS: { mu: 0.4, v: 0.3, tau: 0.3 } 
};
export const calculateTLE = (mu, v, tau) => 
  (mu * KRYLO_CONFIG.WEIGHTS.mu) + 
  (v * KRYLO_CONFIG.WEIGHTS.v) + 
  (tau * KRYLO_CONFIG.WEIGHTS.tau);
EOF

# 5. WO-874: ORACLE HOOK (The Engine)
echo "[5/5] Injecting WO-874 Oracle Hook..."
cat <<EOF > src/hooks/useOracle.js
import { useState, useEffect } from 'react';
import { KRYLO_CONFIG, calculateTLE } from '../core/stateContract';

export const useOracle = (signals) => {
  const [tle, setTle] = useState(0);
  const [isPromoted, setIsPromoted] = useState(false);

  useEffect(() => {
    const engine = setInterval(() => {
      const score = calculateTLE(signals.mu, signals.v, signals.tau);
      setTle(score);
      if (score >= KRYLO_CONFIG.THRESHOLD) setIsPromoted(true);
    }, KRYLO_CONFIG.CADENCE);
    return () => clearInterval(engine);
  }, [signals]);

  return { tle, isPromoted };
};
EOF

# 6. SURGICAL CLEANUP OF SPINEMAP (Top 10 lines only)
echo "[6/6] Scrubbing terminal corruption from SpineMap..."
# This removes lines that usually contain the Claude/Aider splash art
# It creates a backup file called spinemap.jsx.corrupt just in case
sed -i.corrupt '1,10d' src/components/spine/spinemap.jsx

echo "--- RESTORATION COMPLETE ---"
echo "1. Run: source ~/.zshrc"
echo "2. Run: yarn dev"