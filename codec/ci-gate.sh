#!/usr/bin/env bash
# WO-1084-F — Codec CI parity gate
# Runs full codec verification sequence. Exits non-zero on any failure.
# Run locally: bash codec/ci-gate.sh

set -euo pipefail

# Source Rust toolchain if installed via rustup
[ -f "$HOME/.cargo/env" ] && source "$HOME/.cargo/env"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CODEC_DIR="$REPO_ROOT/codec"
CORE_DIR="$REPO_ROOT/core/codec"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " KRYLO Codec CI Parity Gate — ABI v1.0"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Rust unit tests
echo ""
echo "[1/4] Rust unit tests"
(cd "$CODEC_DIR" && cargo test --quiet)
echo "      PASS"

# 2. Rust binaries (parity + verify) must build clean
echo ""
echo "[2/4] Rust binary build"
(cd "$CODEC_DIR" && cargo build --bins --quiet)
echo "      PASS"

# 3. TypeScript unit + parity tests
echo ""
echo "[3/4] TypeScript unit + cross-runtime parity"
npx --yes tsx "$CORE_DIR/codec.test.ts"
npx tsx "$CORE_DIR/parity.test.ts"

# 4. Differential fuzz suite
echo ""
echo "[4/6] Differential fuzz suite"
npx tsx "$CORE_DIR/fuzz.test.ts"

# 5. Flow control + codec correctness under pressure (WO-1093)
echo ""
echo "[5/6] Flow control — burst + backpressure correctness"
npx tsx "$CORE_DIR/flow.test.ts"

# 6. Replay parity — persisted frame corpus (WO-1084-G)
echo ""
echo "[6/6] Replay parity — historical frame corpus"
if [ -s "$REPO_ROOT/runtime/frames.ndjson" ]; then
  npx tsx "$CORE_DIR/replay-parity.test.ts"
else
  echo "      SKIP — runtime/frames.ndjson empty or absent"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " ALL CHECKS PASSED — codec parity gate satisfied"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
