#!/bin/bash
# PreToolUse hook on Edit/Write/MultiEdit — forces an explicit approval on EVERY code change,
# no exceptions. Not risk-scoped (that would require the hook to judge "is this shared," which a
# bash script can't do reliably) -- fires every time, by design, per direct user instruction
# 2026-09-08: "i want something that fires or sticks in memory every time you go to make a
# change." Pairs with block-production-touch.sh (Bash-only) and block-secret-print.sh.
set -euo pipefail

input="$(cat)"
file="$(echo "$input" | jq -r '.tool_input.file_path // empty')"

[ -z "$file" ] && exit 0

jq -n --arg file "$file" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "ask",
    permissionDecisionReason: ("About to change: " + $file + ". Per CLAUDE.md §2 (Shared Data / Function Change Gate): before this edit, has every consumer of anything shared been traced (lexical + concept + behavioral), not just the one file being edited? State the target, authoritative source, known consumers, and the classification (A-F) before proceeding if this touches shared state.")
  }
}'
exit 0
