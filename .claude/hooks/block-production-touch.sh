#!/bin/bash
# PreToolUse hook on Bash — HARD BLOCKS any command that touches krylo.org / its production VPS /
# production infra. No bypass, no exceptions, no memory required. Deny, not ask — a permission
# prompt can be clicked through under pressure; a deny cannot.
# Added 2026-09-08 after a production incident: five-plus commands (curl, deploy.sh-equivalent
# rsync, root SSH, certbot renew) were run against krylo.org before the existing memory-only
# guardrail (feedback_no_krylo_org_touch.md) was ever checked. See CLAUDE.md §19a.
set -euo pipefail

input="$(cat)"
cmd="$(echo "$input" | jq -r '.tool_input.command // empty')"

[ -z "$cmd" ] && exit 0

# Production host/domain/infra patterns. Deliberately broad — a false positive just costs a
# manual override by the user; a false negative is the whole point of this hook failing.
# Covers: the domain itself, the VPS IP in any command position, SSH/SCP to that IP or to any
# root@ target, the production web/API roots, deploy scripts, certbot, pm2, and nginx
# reload/restart — not just the exact commands run tonight, but the whole class.
prod_pat='krylo\.org|216\.250\.119\.104|\bssh\b.*root@|\bscp\b.*root@|/opt/krylo-frontend|/opt/krylo-api|deploy\.sh|deploy-vps\.sh|\bcertbot\b|\bpm2\b|nginx\b.*(reload|restart|-s )|rsync\b.*--delete'

deny() {
  local reason="$1"
  jq -n --arg reason "$reason" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: ($reason + " BLOCKED per CLAUDE.md §19a — no command touches krylo.org or production infrastructure, including read-only checks, without the user explicitly re-authorizing THIS exact command in THIS turn. A prior go for a different action does not carry forward. If this command is genuinely authorized right now, tell the user it was blocked and ask them to run it directly, or to explicitly say so again so the block can be reconsidered — do not retry, rephrase, or find a workaround.")
    }
  }'
  exit 0
}

if echo "$cmd" | grep -qiE "$prod_pat"; then
  deny "This command touches krylo.org / production infrastructure."
fi

exit 0
