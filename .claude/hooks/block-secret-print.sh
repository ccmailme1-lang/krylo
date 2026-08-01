#!/bin/bash
# PreToolUse hook on Bash — blocks commands likely to print secret values into the transcript.
# Added 2026-08-01 after three real secret-print incidents in one session. See CLAUDE.md §24.
set -euo pipefail

input="$(cat)"
cmd="$(echo "$input" | jq -r '.tool_input.command // empty')"

[ -z "$cmd" ] && exit 0

# Files/patterns that are known or likely to hold secrets in this repo.
secret_pat='\.env([^A-Za-z0-9_]|$)|config[^ /]*\.cjs|credentials|jira\.md|ecosystem\.config'

deny() {
  local reason="$1"
  jq -n --arg reason "$reason" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: ($reason + " Use an existence-only check instead (e.g. grep -q PATTERN file && echo present || echo absent), per CLAUDE.md §24 Secret Exposure Guardrail. Do not attempt a workaround that still prints the value.")
    }
  }'
  exit 0
}

# Check per-segment, not whole-command — a `source jira.md` earlier in a multi-line script
# must not flag an unrelated `cat` of a different file later in the same command block.
segments="$(echo "$cmd" | tr '\n;' '\n\n' | sed -E 's/&&|\|\|/\n/g')"

while IFS= read -r seg; do
  [ -z "$seg" ] && continue

  # 1. cat/less/head/tail/more on a secret-bearing file, IN THIS SEGMENT
  if echo "$seg" | grep -qiE '\b(cat|less|head|tail|more)\b' && echo "$seg" | grep -qiE "$secret_pat"; then
    deny "Reading a secret-bearing file directly (cat/less/head/tail/more) prints its full contents to the transcript."
  fi

  # 2. grep/egrep/ack/rg over a secret-bearing file WITHOUT a -q/-c/-l/-L flag, IN THIS SEGMENT
  if echo "$seg" | grep -qiE '\b(grep|egrep|fgrep|ack|rg)\b' && echo "$seg" | grep -qiE "$secret_pat"; then
    if ! echo "$seg" | grep -qE -- '(^| )-[a-zA-Z]*[qclL][a-zA-Z]*( |$)'; then
      deny "grep/egrep/ack/rg over a secret-bearing file without -q/-c/-l/-L risks printing the matched line, including the secret value."
    fi
  fi
done <<< "$segments"

# 3. bare printenv/env with no filter (dumps every env var, including secrets)
if echo "$cmd" | grep -qiE '(^|[;&|]\s*)(printenv|env)(\s*$|\s*[;&|])'; then
  deny "Bare printenv/env with no filter dumps every environment variable, including secrets."
fi

# 4. echo/printf of a variable whose name looks like a secret
if echo "$cmd" | grep -qiE '\b(echo|printf)\b.*\$\{?[A-Za-z0-9_]*(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|API_KEY)[A-Za-z0-9_]*\}?'; then
  deny "Echoing a variable whose name looks like a secret (KEY/TOKEN/SECRET/PASSWORD/CREDENTIAL) prints its value to the transcript."
fi

exit 0
