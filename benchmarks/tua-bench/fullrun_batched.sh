#!/usr/bin/env bash
# Full comparison on a small host with a shared model proxy: tasks run in
# batches so task images fit on disk, both harnesses run side by side one
# trial each so they see the same conditions, and every batch waits for the
# proxy pool to have headroom. Resumable: finished batches are skipped.
# Usage: fullrun_batched.sh <config.env>
# Stop cleanly before the next batch: touch <evidence>/<RUN_PREFIX>.STOP
set -uo pipefail

CONFIG=$1
# shellcheck disable=SC1090
source "$CONFIG"
HERE=$(cd "$(dirname "$0")" && pwd)
WORKTREE=$(cd "$HERE/../.." && pwd)
export NEUROLINK_CLI=${NEUROLINK_CLI:-$WORKTREE/dist/cli/index.js}
: "${TUA:?}" "${RUN_PREFIX:?}" "${MODEL:?}" "${NEUROLINK_TGZ:?}" "${NEUROLINK_BUNDLE:?}" "${CLAUDE_CODE_BUNDLE:?}"
K=${K:-5}
BATCH_SIZE=${BATCH_SIZE:-5}
REPAIR_ROUNDS=${REPAIR_ROUNDS:-2}
BUDGET_USD=${BUDGET_USD:-1500}
MIN_ACTIVE_ACCOUNTS=${MIN_ACTIVE_ACCOUNTS:-2}
MIN_FREE_GB=${MIN_FREE_GB:-15}
# Concurrent trials per harness; both harnesses always run side by side.
TRIALS_PER_HARNESS=${TRIALS_PER_HARNESS:-1}
# Spend already made by runs that were set aside (see RUNBOOK.md); it still
# counts against the budget.
PRIOR_SPEND_USD=${PRIOR_SPEND_USD:-0}
EVID=${EVIDENCE_ROOT:-$HOME/Developer/tua-evidence}
LOG=$EVID/$RUN_PREFIX.log
STOP=$EVID/$RUN_PREFIX.STOP
export MODEL EVIDENCE_ROOT=$EVID
export ENV_IMPORT_PATH=${ENV_IMPORT_PATH-cached_podman:CachedPodmanEnvironment}
# Each trial's container goes as soon as the trial ends; a batch's worth of
# retained containers filled the VM disk in batch 2 of the first attempt.
export KEEP_CONTAINERS=0
mkdir -p "$EVID"

log() { echo "[$(date -u +%FT%TZ)] $*" | tee -a "$LOG"; }

HOST_ARCH=$(podman info --format '{{.Host.Arch}}' 2>/dev/null)
[ -n "$HOST_ARCH" ] || { log "cannot read the podman host architecture; is the VM running?"; exit 1; }

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
      export NEUROLINK_TGZ NEUROLINK_BUNDLE NEUROLINK_MAX_TOKENS=${NEUROLINK_MAX_TOKENS:-8192}
      export NEUROLINK_EXTRA_ARGS="${NEUROLINK_ARGS:---agent-mode --tool-root /} $NEUROLINK_THINKING"
      ;;
    claudecode)
      export AGENT_IMPORT_PATH=claude_code_ledger.agent:ClaudeCodeLedger AGENT_ARGS="$CLAUDE_THINKING"
      export CLAUDE_CODE_BUNDLE
      unset NEUROLINK_BUNDLE NEUROLINK_EXTRA_ARGS
      ;;
  esac
}

# Wait until the shared pool has headroom, so this run never takes the last
# free account from other sessions.
pool_gate() {
  while true; do
    [ -e "$STOP" ] && return 1
    active=$(node "$NEUROLINK_CLI" proxy status --format json 2>/dev/null | python3 -c '
import json, sys
try:
    accounts = json.load(sys.stdin)["stats"]["accounts"]
except Exception:
    print(-1); sys.exit()
print(sum(1 for a in accounts if a.get("provider") == "anthropic" and a.get("status") == "active" and not a.get("cooling")))')
    if [ "$active" -ge "$MIN_ACTIVE_ACCOUNTS" ]; then
      return 0
    fi
    if [ "$active" -lt 0 ]; then
      # Status unreadable (e.g. the proxy mid-restart): retry soon, not in 10 min.
      log "pool gate: proxy status unreadable; retrying in 30 s"
      sleep 30
      continue
    fi
    log "pool gate: $active active Anthropic accounts (< $MIN_ACTIVE_ACCOUNTS); waiting 10 min"
    sleep 600
  done
}

# Prints: total spend including PRIOR_SPEND_USD, this run's spend, and trials.
spent_usd() {
  python3 - "$EVID" "$RUN_PREFIX" "$HERE" "$PRIOR_SPEND_USD" <<'EOF'
import glob, json, re, sys
from pathlib import Path
sys.path.insert(0, sys.argv[3])
from ledger_summary import ledger_cost_usd
total = trials = 0
for path in glob.glob(f"{sys.argv[1]}/{sys.argv[2]}-b*-*/jobs/**/result.json", recursive=True):
    if "-neurolink/" not in path and "-claudecode/" not in path:
        continue  # oracle runs spend nothing
    if not re.match(r"^\d{3}-[a-z0-9-]+__[A-Za-z0-9]+$", path.split("/")[-2]):
        continue  # the job-level result.json, not a trial
    agent = json.load(open(path)).get("agent_result") or {}
    ledger = Path(path).parent / "agent" / "model-ledger.jsonl"
    rows = [json.loads(l) for l in ledger.read_text().splitlines() if l.strip()] if ledger.exists() else []
    # The ledger prices every request, including runs that ended before the
    # harness wrote its own cost; a ledger without usage falls back to that cost.
    cost = ledger_cost_usd(rows)
    if cost is None:
        cost = agent.get("cost_usd") or 0
    if agent or rows:
        trials += 1
        total += cost
print(f"{total + float(sys.argv[4]):.2f} {total:.2f} {trials}")
EOF
}

vm_free_gb() {
  podman machine ssh df -BG --output=avail / 2>/dev/null | tail -1 | tr -dc '0-9'
}

# A stopped VM makes every podman call fail at once: the disk check reads
# nothing and passes, and every trial fails before its agent starts. Batch 24
# of the first full run was marked done that way.
podman_gate() {
  podman info > /dev/null 2>&1 && return 0
  log "podman is not reachable; stopping $1"
  exit 1
}

# Prints how many of a batch's harness trials reached their agent.
agents_started() {
  python3 - "$EVID" "$RUN_PREFIX-$1" <<'EOF'
import glob, sys
evid, prefix = sys.argv[1:3]
patterns = [f"{evid}/{prefix}-*neurolink/jobs/*/*__*/agent/runtime.txt",
            f"{evid}/{prefix}-*claudecode/jobs/*/*__*/agent/claude-code.txt"]
print(sum(len(glob.glob(p)) for p in patterns))
EOF
}

disk_gate() {
  local free
  free=$(vm_free_gb)
  if [ -n "$free" ] && [ "$free" -lt "$MIN_FREE_GB" ]; then
    log "VM disk has ${free} GB free (< $MIN_FREE_GB); stopping $1"
    exit 1
  fi
}

# A task image built for another architecture runs under emulation, where the
# harnesses' native Node runtimes cannot start: exclude it like any other task
# this host cannot run. An image that fails to build is kept, and its trials
# record the failure. Prints the tasks that stay.
keep_native_images() {
  local batch=$1 tasks=$2 task arch kept=""
  local oracle=$EVID/$RUN_PREFIX-$batch-oracle
  : > "$oracle/oracle_arch_excluded.txt"
  for task in $tasks; do
    podman image exists "localhost/hb__local-$task:latest" ||
      podman build --tag "hb__local-$task" --file "$TUA/tasks/$task/environment/Dockerfile" \
        "$TUA/tasks/$task/environment" >> "$oracle/arch-build.log" 2>&1
    arch=$(podman image inspect "localhost/hb__local-$task:latest" --format '{{.Architecture}}' 2>/dev/null)
    if [ -n "$arch" ] && [ "$arch" != "$HOST_ARCH" ]; then
      printf '%s\t%s\n' "$task" "$arch" >> "$oracle/oracle_arch_excluded.txt"
      log "$batch: excluding $task: its image is $arch and this host is $HOST_ARCH" >&2
    else
      kept="$kept $task"
    fi
  done
  echo "$kept"
}

# Neurolink's own timeout is set past the task budget, so it should never fire;
# if it does, runs are being cut short by configuration rather than by the task.
neurolink_timeout_guard() {
  local hits
  hits=$(grep -lE "(generate|stream) operation timed out" \
    "$EVID/$RUN_PREFIX-$1"-*neurolink/jobs/*/*__*/agent/neurolink.stderr.log 2>/dev/null | wc -l | tr -d ' ')
  if [ "$hits" -gt 0 ]; then
    log "$1: $hits Neurolink trials were stopped by Neurolink's own timeout; stopping"
    exit 1
  fi
}

remove_batch_containers_and_images() {
  local batch=$1 tasks=$2
  for dir in "$EVID/$RUN_PREFIX-$batch"-*/jobs/*/*__*; do
    [ -d "$dir" ] || continue
    podman rm -f "$(basename "$dir" | tr '[:upper:]' '[:lower:]')" > /dev/null 2>&1 || true
  done
  for task in $tasks; do
    podman rmi -f "localhost/hb__local-$task:latest" > /dev/null 2>&1 || true
  done
}

run_pair() {
  # Both harnesses on the same tasks at the same time.
  local name=$1 tasks=$2 attempts=$3 concurrency=${4:-$TRIALS_PER_HARNESS}
  for harness in neurolink claudecode; do
    [ -e "$EVID/$name-$harness" ] && continue
    ( harness_env "$harness"; TASK_LIST=$tasks "$HERE/run_baseline.sh" "$name-$harness" "$TUA" "$attempts" "$concurrency" \
        > "$EVID/.$name-$harness.stdout" 2>&1 ) &
    sleep 20
  done
  wait
}

missing_attempts() {
  local batch=$1 harness=$2 tasks=$3
  local jobs
  jobs=$(ls -d "$EVID/$RUN_PREFIX-$batch"-*"$harness"/jobs 2>/dev/null | paste -sd, -)
  [ -n "$jobs" ] || return
  python3 "$HERE/summarize_trials.py" "$jobs" "$TUA/tasks" "$EVID/$RUN_PREFIX-$batch-$harness/summary-all" x > /dev/null
  python3 - "$EVID/$RUN_PREFIX-$batch-$harness/summary-all/trials.jsonl" "$K" "$tasks" "$batch: $harness" <<'EOF'
import json, sys
from collections import Counter
from datetime import datetime, timezone
rows = [json.loads(l) for l in open(sys.argv[1])]
k, tasks = int(sys.argv[2]), sys.argv[3].split()
got = Counter(r["task_id"] for r in rows if r["terminal_state"] in {"full_pass", "partial", "scored_fail"})
tried = Counter(r["task_id"] for r in rows)
infra = Counter(r["task_id"] for r in rows if r["terminal_state"] == "infra_failure")
# K or more attempts that all failed before the agent could start fail for a
# reason a repair round would only repeat.
stuck = {t for t in tasks if got[t] == 0 and infra[t] >= k and infra[t] == tried[t]}
for t in sorted(stuck):
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    print(f"[{now}] {sys.argv[4]}: not repairing {t}: all {infra[t]} attempts failed before the agent started",
          file=sys.stderr)
print(" ".join(f"{t}:{k - got[t]}" for t in tasks if got[t] < k and t not in stuck))
EOF
}

cumulative_metrics() {
  for harness in neurolink claudecode; do
    jobs=$(ls -d "$EVID/$RUN_PREFIX"-b*-*"$harness"/jobs 2>/dev/null | paste -sd, -)
    [ -n "$jobs" ] && python3 "$HERE/summarize_trials.py" "$jobs" "$TUA/tasks" "$EVID/$RUN_PREFIX-all-$harness" "$harness" > /dev/null
  done
  # Tasks excluded after some trials ran (e.g. an emulated image) stay out.
  local excluded
  excluded=$(cut -f1 "$EVID/$RUN_PREFIX"-b*-oracle/oracle_arch_excluded.txt 2>/dev/null | sort -u | paste -sd' ' -)
  # shellcheck disable=SC2086
  python3 "$HERE/leaderboard_metrics.py" \
    "$EVID/$RUN_PREFIX-all-claudecode/trials.jsonl" "$EVID/$RUN_PREFIX-all-neurolink/trials.jsonl" \
    --k "$K" --exclude $excluded --labels claude-code neurolink > "$EVID/$RUN_PREFIX-metrics.txt" 2>&1
  for harness in neurolink claudecode; do
    jobs=$(ls -d "$EVID/$RUN_PREFIX"-b*-*"$harness"/jobs 2>/dev/null | paste -sd, -)
    [ -n "$jobs" ] && python3 "$HERE/integrity_scan.py" "$jobs" "$EVID/$RUN_PREFIX-integrity-$harness.jsonl" \
      >> "$EVID/$RUN_PREFIX-metrics.txt" 2>&1
  done
}

# --- Parity preflight (once) ---------------------------------------------------
PRE=$RUN_PREFIX-preflight
if [ ! -e "$EVID/$PRE.ok" ]; then
  pool_gate || exit 0
  log "parity preflight on 106"
  run_pair "$PRE" 106-create-charles-ssh-user 1 1
  if ! python3 - "$EVID/$PRE-neurolink" "$EVID/$PRE-claudecode" <<'EOF'
import json, sys
from pathlib import Path
seen = {}
for evidence in map(Path, sys.argv[1:]):
    rows = [json.loads(l) for l in open(evidence / "summary" / "trials.jsonl")]
    if not rows or not all(r["model_identity_ok"] for r in rows):
        sys.exit(f"model identity failed in {evidence.name}")
    ledgers = list(evidence.glob("jobs/*/*__*/agent/model-ledger.jsonl"))
    delivered = [json.loads(l) for p in ledgers for l in open(p) if l.strip()]
    delivered = [r for r in delivered if isinstance(r.get("status"), int) and 200 <= r["status"] < 300]
    thinking = {json.dumps(r.get("thinking")) for r in delivered}
    max_tokens = sorted({r.get("maxTokens") for r in delivered}, key=str)
    seen[evidence.name] = (thinking, max_tokens)
    print(f"{evidence.name}: thinking={sorted(thinking)} max_tokens={max_tokens}")
thinkings = [t for t, _ in seen.values()]
if any(len(t) != 1 for t in thinkings) or len({frozenset(t) for t in thinkings}) != 1:
    sys.exit("thinking settings differ between harnesses or vary within one")
# Harnesses may send small side calls with a lower limit; compare the main one.
from collections import Counter
main = {}
for evidence in map(Path, sys.argv[1:]):
    ledgers = evidence.glob("jobs/*/*__*/agent/model-ledger.jsonl")
    values = [json.loads(l).get("maxTokens") for p in ledgers for l in open(p) if l.strip()]
    main[evidence.name] = Counter(v for v in values if v is not None).most_common(1)[0][0]
if len(set(main.values())) != 1:
    sys.exit(f"max_tokens differ: {main}; set NEUROLINK_MAX_TOKENS to the reference harness's value")
EOF
  then
    log "parity preflight FAILED; see above. Set NEUROLINK_MAX_TOKENS / thinking and rerun."
    exit 1
  fi
  remove_batch_containers_and_images preflight ""
  touch "$EVID/$PRE.ok"
  log "parity preflight ok"
fi

# --- Batches -------------------------------------------------------------------
# macOS ships bash 3.2, which has no mapfile.
ALL_TASKS=()
while IFS= read -r task; do ALL_TASKS+=("$task"); done < <(ls "$TUA/tasks" | grep -E '^[0-9]{3}-' | sort)
TOTAL_TRIALS=$(( ${#ALL_TASKS[@]} * K * 2 ))
log "tasks=${#ALL_TASKS[@]} batch_size=$BATCH_SIZE k=$K trials_per_harness=$TRIALS_PER_HARNESS model=$MODEL thinking=${THINKING_BUDGET:-off}"

for ((start = 0; start < ${#ALL_TASKS[@]}; start += BATCH_SIZE)); do
  batch=$(printf 'b%03d' $((start / BATCH_SIZE + 1)))
  [ -e "$EVID/$RUN_PREFIX-$batch.done" ] && continue
  [ -e "$STOP" ] && { log "STOP file found; stopping before $batch"; exit 0; }
  tasks="${ALL_TASKS[*]:start:BATCH_SIZE}"

  read -r spent run_spent done_trials <<< "$(spent_usd)"
  if python3 -c "import sys; sys.exit(0 if float('$spent') >= float('$BUDGET_USD') else 1)"; then
    log "budget reached: \$$spent list-price estimate >= \$$BUDGET_USD; stopping before $batch"
    exit 0
  fi
  if [ "$done_trials" -gt 0 ]; then
    projected=$(python3 -c "print(f'{float(\"$run_spent\") / $done_trials * $TOTAL_TRIALS + float(\"$PRIOR_SPEND_USD\"):.0f}')")
    log "spend so far \$$spent (\$$run_spent over $done_trials trials + \$$PRIOR_SPEND_USD set aside); projected \$$projected for $TOTAL_TRIALS"
  fi
  podman_gate "before $batch"
  disk_gate "before $batch"

  log "$batch: oracle for $tasks"
  if [ ! -e "$EVID/$RUN_PREFIX-$batch-oracle/oracle_passing.txt" ]; then
    TASK_LIST=$tasks "$HERE/oracle_validate.sh" "$RUN_PREFIX-$batch-oracle" "$TUA" 2 >> "$LOG" 2>&1
  fi
  # Tasks whose oracle errored (build or environment) get one retry before
  # being recorded as infra exclusions rather than as tasks this host fails.
  errored=$(cut -f1 "$EVID/$RUN_PREFIX-$batch-oracle/oracle_errors.txt" 2>/dev/null | paste -sd' ' -)
  if [ -n "$errored" ] && [ ! -e "$EVID/$RUN_PREFIX-$batch-oracle-retry" ]; then
    log "$batch: oracle errored for $errored; retrying once"
    TASK_LIST=$errored "$HERE/oracle_validate.sh" "$RUN_PREFIX-$batch-oracle-retry" "$TUA" 2 >> "$LOG" 2>&1
    cat "$EVID/$RUN_PREFIX-$batch-oracle-retry/oracle_passing.txt" >> "$EVID/$RUN_PREFIX-$batch-oracle/oracle_passing.txt" 2>/dev/null
    cp "$EVID/$RUN_PREFIX-$batch-oracle-retry/oracle_errors.txt" "$EVID/$RUN_PREFIX-$batch-oracle/oracle_infra_excluded.txt" 2>/dev/null
    for dir in "$EVID/$RUN_PREFIX-$batch-oracle-retry"/jobs/*/*__*; do
      [ -d "$dir" ] && podman rm -f "$(basename "$dir" | tr '[:upper:]' '[:lower:]')" > /dev/null 2>&1
    done
  fi
  # An oracle that errored because podman went down is not a verdict on the task.
  podman_gate "after $batch's oracle (rerun it: move $RUN_PREFIX-$batch-oracle* aside)"
  if [ ! -f "$EVID/$RUN_PREFIX-$batch-oracle/oracle_passing.txt" ]; then
    # No verdict is not the same as no passing task; stop rather than lose the batch.
    log "$batch: oracle validation produced no verdict; stopping (see $RUN_PREFIX-$batch-oracle/harbor.log)"
    exit 1
  fi
  passing=$(tr '\n' ' ' < "$EVID/$RUN_PREFIX-$batch-oracle/oracle_passing.txt")
  for dir in "$EVID/$RUN_PREFIX-$batch-oracle"/jobs/*/*__*; do
    [ -d "$dir" ] && podman rm -f "$(basename "$dir" | tr '[:upper:]' '[:lower:]')" > /dev/null 2>&1
  done
  passing=$(keep_native_images "$batch" "$passing")
  if [ -z "${passing// }" ]; then
    log "$batch: no task passes its oracle here; skipping"
    remove_batch_containers_and_images "$batch" "$tasks"
    touch "$EVID/$RUN_PREFIX-$batch.done"
    continue
  fi

  pool_gate || { log "STOP file found; stopping in $batch"; exit 0; }
  podman_gate "before $batch's harness runs"
  disk_gate "before $batch's harness runs"
  log "$batch: both harnesses on $passing x $K"
  run_pair "$RUN_PREFIX-$batch" "$passing" "$K"
  neurolink_timeout_guard "$batch"

  for round in $(seq 1 "$REPAIR_ROUNDS"); do
    for harness in neurolink claudecode; do
      need=$(missing_attempts "$batch" "$harness" "$passing" 2>> "$LOG")
      [ -z "$need" ] && continue
      log "$batch: $harness repair round $round needs $need"
      # One repair job per missing count, since harbor applies -k to every task.
      for count in $(tr ' ' '\n' <<< "$need" | cut -d: -f2 | sort -u); do
        group=$(tr ' ' '\n' <<< "$need" | awk -F: -v c="$count" '$2 == c {print $1}' | paste -sd' ' -)
        pool_gate || exit 0
        podman_gate "before $batch repair round $round"
        disk_gate "before $batch repair round $round"
        ( harness_env "$harness"; TASK_LIST=$group "$HERE/run_baseline.sh" \
            "$RUN_PREFIX-$batch-r$round-$count-$harness" "$TUA" "$count" "$TRIALS_PER_HARNESS" >> "$LOG" 2>&1 )
      done
      [ "$harness" = neurolink ] && neurolink_timeout_guard "$batch"
    done
  done

  # A repair round is skipped when nothing needs repair, so STOP is checked
  # here too; and a batch whose trials never reached an agent is not done.
  [ -e "$STOP" ] && { log "STOP file found; stopping before marking $batch done"; exit 0; }
  podman_gate "before marking $batch done"
  if [ "$(agents_started "$batch")" -eq 0 ]; then
    log "$batch: no trial reached its agent; stopping instead of marking it done"
    exit 1
  fi
  remove_batch_containers_and_images "$batch" "$tasks"
  touch "$EVID/$RUN_PREFIX-$batch.done"
  cumulative_metrics
  log "$batch done; cumulative metrics:"
  head -4 "$EVID/$RUN_PREFIX-metrics.txt" | tee -a "$LOG"
done
log "all batches done"
