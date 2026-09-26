#!/usr/bin/env bash
# Comparable full run: Neurolink and a reference harness (Claude Code) on the
# same host, model, thinking budget and oracle-validated task set, K attempts
# per task. Failures the harness did not cause (infra, another model answered,
# the model service failed) are re-scheduled until every task has K scored
# attempts or the repair budget runs out. See RUNBOOK.md.
# Usage: fullrun.sh <config.env>
set -euo pipefail

CONFIG=$1
# shellcheck disable=SC1090
source "$CONFIG"
HERE=$(cd "$(dirname "$0")" && pwd)
: "${TUA:?}" "${RUN_PREFIX:?}" "${MODEL:?}" "${NEUROLINK_TGZ:?}" "${NEUROLINK_BUNDLE:?}" "${CLAUDE_CODE_BUNDLE:?}"
K=${K:-5}
CONCURRENCY=${CONCURRENCY:-8}
REPAIR_ROUNDS=${REPAIR_ROUNDS:-2}
EVID=${EVIDENCE_ROOT:-$HOME/Developer/tua-evidence}
export MODEL EVIDENCE_ROOT=$EVID
export ENV_IMPORT_PATH=${ENV_IMPORT_PATH:-}

# Thinking parity, as verified per request on 106: an explicit
# `--ak thinking=enabled` makes Claude Code send its own 31999-token budget.
if [ -n "${THINKING_BUDGET:-}" ]; then
  NEUROLINK_THINKING="--thinking --thinking-budget $THINKING_BUDGET"
  CLAUDE_THINKING="--ak max_thinking_tokens=$THINKING_BUDGET"
else
  NEUROLINK_THINKING=""
  CLAUDE_THINKING="--ak thinking=disabled"
fi

harness_env() {
  case $1 in
    neurolink)
      export AGENT_IMPORT_PATH=neurolink_agent.agent:NeurolinkCode AGENT_ARGS=""
      export NEUROLINK_TGZ NEUROLINK_BUNDLE
      export NEUROLINK_EXTRA_ARGS="${NEUROLINK_ARGS:---agent-mode --tool-root /} $NEUROLINK_THINKING"
      ;;
    claudecode)
      export AGENT_IMPORT_PATH=claude_code_ledger.agent:ClaudeCodeLedger AGENT_ARGS="$CLAUDE_THINKING"
      export CLAUDE_CODE_BUNDLE
      unset NEUROLINK_BUNDLE NEUROLINK_EXTRA_ARGS
      ;;
  esac
}

# 1. Preflight
[ "$(uname -m)" = x86_64 ] || echo "warning: not x86_64; results will not match the leaderboard host" >&2
docker info > /dev/null 2>&1 || [ -n "$ENV_IMPORT_PATH" ] || { echo "docker is not available" >&2; exit 1; }
for f in "$NEUROLINK_TGZ" "$NEUROLINK_BUNDLE" "$CLAUDE_CODE_BUNDLE"; do
  [ -f "$f" ] || { echo "missing: $f" >&2; exit 1; }
done

# 2. Oracle validation, once per host and TUA-Bench commit
ORACLE=$EVID/$RUN_PREFIX-oracle
[ -f "$ORACLE/oracle_passing.txt" ] || "$HERE/oracle_validate.sh" "$RUN_PREFIX-oracle" "$TUA" "$CONCURRENCY"
TASKS=$(tr '\n' ' ' < "$ORACLE/oracle_passing.txt")
echo "oracle-validated tasks: $(wc -w <<< "$TASKS")"

# 3. Parity preflight: one fast task per harness; stop before the full run if
#    the ledger shows another model or a different thinking setting.
for harness in neurolink claudecode; do
  run=$RUN_PREFIX-preflight-$harness
  [ -e "$EVID/$run" ] && continue
  ( harness_env "$harness"; TASK_LIST=106-create-charles-ssh-user "$HERE/run_baseline.sh" "$run" "$TUA" 1 1 )
done
python3 - "$EVID/$RUN_PREFIX-preflight-neurolink" "$EVID/$RUN_PREFIX-preflight-claudecode" <<'EOF'
import json, sys
from pathlib import Path
seen = {}
for evidence in map(Path, sys.argv[1:]):
    rows = [json.loads(l) for l in open(evidence / "summary" / "trials.jsonl")]
    if not rows or not all(r["model_identity_ok"] for r in rows):
        sys.exit(f"preflight: model identity failed in {evidence.name}")
    # No thinking field and {type: disabled} both mean thinking off.
    norm = {t if t != '{"type": "disabled", "budget": null}' else "null" for r in rows for t in r["thinking"]}
    seen[evidence.name] = norm
if len({frozenset(v) for v in seen.values()}) != 1 or any(len(v) != 1 for v in seen.values()):
    sys.exit(f"preflight: thinking settings differ or vary: {seen}")
print(f"preflight ok: {seen}")
EOF

# 4. Full runs, then repair rounds for tasks short of K scored attempts
for harness in neurolink claudecode; do
  run=$RUN_PREFIX-$harness
  if [ ! -e "$EVID/$run" ]; then
    ( harness_env "$harness"; TASK_LIST=$TASKS "$HERE/run_baseline.sh" "$run" "$TUA" "$K" "$CONCURRENCY" )
  fi
  for round in $(seq 1 "$REPAIR_ROUNDS"); do
    jobs=$(ls -d "$EVID/$run"/jobs "$EVID/$run"-repair*/jobs 2>/dev/null | paste -sd, -)
    python3 "$HERE/summarize_trials.py" "$jobs" "$TUA/tasks" "$EVID/$run/summary-all" "$run" > /dev/null
    # One repair run per missing-attempt count, since harbor applies -k to every task.
    missing=$(python3 - "$EVID/$run/summary-all/trials.jsonl" "$K" "$TASKS" <<'EOF'
import json, sys
from collections import Counter, defaultdict
rows = [json.loads(l) for l in open(sys.argv[1])]
k, tasks = int(sys.argv[2]), sys.argv[3].split()
got = Counter(r["task_id"] for r in rows if r["terminal_state"] in {"full_pass", "partial", "scored_fail"})
groups = defaultdict(list)
for t in tasks:
    if got[t] < k:
        groups[k - got[t]].append(t)
for need, ts in sorted(groups.items()):
    print(f"{need}:{' '.join(ts)}")
EOF
)
    [ -z "$missing" ] && break
    while IFS=: read -r need tasks; do
      ( harness_env "$harness"; TASK_LIST=$tasks "$HERE/run_baseline.sh" "$run-repair$round-$need" "$TUA" "$need" "$CONCURRENCY" )
    done <<< "$missing"
  done
done

# 5. Final summaries, metrics, integrity
for harness in neurolink claudecode; do
  run=$RUN_PREFIX-$harness
  jobs=$(ls -d "$EVID/$run"/jobs "$EVID/$run"-repair*/jobs 2>/dev/null | paste -sd, -)
  python3 "$HERE/summarize_trials.py" "$jobs" "$TUA/tasks" "$EVID/$run/summary-all" "$run" | head -1
  python3 "$HERE/integrity_scan.py" "$jobs" "$EVID/$run/integrity.jsonl" || echo "integrity scan: unreadable traces in $run" >&2
done
python3 "$HERE/leaderboard_metrics.py" \
  "$EVID/$RUN_PREFIX-claudecode/summary-all/trials.jsonl" "$EVID/$RUN_PREFIX-neurolink/summary-all/trials.jsonl" \
  --k "$K" --labels claude-code neurolink | tee "$EVID/$RUN_PREFIX-metrics.txt"
