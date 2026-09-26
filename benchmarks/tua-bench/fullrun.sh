#!/usr/bin/env bash
# Comparable full run: Neurolink and a reference harness (Claude Code) on the
# same host, model, thinking budget and oracle-validated task set, K attempts
# per task. Failures the harness did not cause (infra, another model answered,
# the model service failed) are re-scheduled until every task has K scored
# attempts or the repair budget runs out. See RUNBOOK.md.
# Usage: fullrun.sh <config.env>
# Stop cleanly between phases: touch <evidence>/<RUN_PREFIX>.STOP
set -euo pipefail

CONFIG=$1
# shellcheck disable=SC1090
source "$CONFIG"
HERE=$(cd "$(dirname "$0")" && pwd)
: "${TUA:?}" "${RUN_PREFIX:?}" "${MODEL:?}" "${NEUROLINK_TGZ:?}" "${NEUROLINK_BUNDLE:?}" "${CLAUDE_CODE_BUNDLE:?}"
: "${BUDGET_USD:?set BUDGET_USD, the list-price spend cap in USD}"
K=${K:-5}
CONCURRENCY=${CONCURRENCY:-8}
REPAIR_ROUNDS=${REPAIR_ROUNDS:-2}
MIN_FREE_GB=${MIN_FREE_GB:-50}
# Spend already made by runs that were set aside; it still counts against the cap.
PRIOR_SPEND_USD=${PRIOR_SPEND_USD:-0}
BUDGET_CHECK_SECS=${BUDGET_CHECK_SECS:-300}
# Reported separately from the rest: the 7 pilot tasks the fixes were built
# against, and 096 and 099, whose failures agent-mode prompt V2 was written from.
HELD_OUT_TASKS=${HELD_OUT_TASKS:-017 018 079 093 106 115 119 096 099}
# A malformed number would make a gate's test error out, which an `if` reads as
# a pass: the disk gate and the spend cap would stop guarding.
for name in K CONCURRENCY REPAIR_ROUNDS MIN_FREE_GB BUDGET_CHECK_SECS; do
  [[ "${!name}" =~ ^[0-9]+$ ]] || { echo "$name must be a whole number, got '${!name}'" >&2; exit 1; }
done
for name in BUDGET_USD PRIOR_SPEND_USD; do
  [[ "${!name}" =~ ^[0-9]+([.][0-9]+)?$ ]] || { echo "$name must be a number of USD, got '${!name}'" >&2; exit 1; }
done
EVID=${EVIDENCE_ROOT:-$HOME/Developer/tua-evidence}
LOG=$EVID/$RUN_PREFIX.log
STOP=$EVID/$RUN_PREFIX.STOP
export MODEL EVIDENCE_ROOT=$EVID
export ENV_IMPORT_PATH=${ENV_IMPORT_PATH:-}
# With harbor's Docker environment, deleting a trial's environment runs
# `docker compose down --rmi all`, which removes the task image as well, so
# every attempt would rebuild it; without --delete, `docker compose down` still
# removes the trial's containers. The podman cache keeps images on delete, and
# there retained containers filled the VM disk, so delete there.
if [ -z "$ENV_IMPORT_PATH" ]; then
  export KEEP_CONTAINERS=1
else
  export KEEP_CONTAINERS=${KEEP_CONTAINERS:-0}
fi
mkdir -p "$EVID"

log() { echo "[$(date -u +%FT%TZ)] $*" | tee -a "$LOG"; }

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
      # Claude Code 2.1.280 sends max_tokens 32000; the preflight stops the run
      # if the two ledgers disagree.
      export NEUROLINK_TGZ NEUROLINK_BUNDLE NEUROLINK_MAX_TOKENS=${NEUROLINK_MAX_TOKENS:-32000}
      export NEUROLINK_EXTRA_ARGS="${NEUROLINK_ARGS:---agent-mode --tool-root /} $NEUROLINK_THINKING"
      ;;
    claudecode)
      export AGENT_IMPORT_PATH=claude_code_ledger.agent:ClaudeCodeLedger AGENT_ARGS="$CLAUDE_THINKING"
      export CLAUDE_CODE_BUNDLE
      unset NEUROLINK_BUNDLE NEUROLINK_EXTRA_ARGS
      ;;
  esac
}

stop_requested() {
  [ -e "$STOP" ] || return 0
  log "STOP file found; stopping $1 (remove $STOP to resume)"
  exit 0
}

# A stopped container runtime makes every trial fail before its agent starts,
# and the free-disk check then reads nothing and passes.
container_gate() {
  if [ -z "$ENV_IMPORT_PATH" ]; then
    docker info > /dev/null 2>&1 && return 0
    log "docker is not reachable; stopping $1"
  else
    podman info > /dev/null 2>&1 && return 0
    log "podman is not reachable; stopping $1"
  fi
  exit 1
}

free_gb() {
  if [ -z "$ENV_IMPORT_PATH" ]; then
    df -BG --output=avail "$(docker info --format '{{.DockerRootDir}}' 2>/dev/null)" 2>/dev/null | tail -1 | tr -dc '0-9'
  else
    podman machine ssh df -BG --output=avail / 2>/dev/null | tail -1 | tr -dc '0-9'
  fi
}

disk_gate() {
  local free
  free=$(free_gb) || true
  if [ -z "$free" ]; then
    log "cannot read free disk for the container runtime; stopping $1"
    exit 1
  fi
  if [ "$free" -lt "$MIN_FREE_GB" ]; then
    log "container runtime disk has ${free} GB free (< $MIN_FREE_GB); stopping $1"
    exit 1
  fi
}

# Prints: spend including PRIOR_SPEND_USD, this run's spend, and trials, at
# list price from each trial's ledger. It reads finished runs' evidence and
# the jobs harbor is still writing, so a run can be stopped mid-phase.
spent_usd() {
  python3 - "$EVID" "$TUA/jobs" "$RUN_PREFIX" "$HERE" "$PRIOR_SPEND_USD" <<'EOF'
import glob, json, re, sys
from pathlib import Path
evid, live, prefix, here, prior = sys.argv[1:6]
sys.path.insert(0, here)
from ledger_summary import PRICES_PER_MTOK, ledger_cost_usd
# Only this run's phases: another run whose name merely starts with the same
# prefix must not count, and oracle runs make no model requests.
phase = re.compile(rf"^{re.escape(prefix)}-(preflight-)?(neurolink|claudecode)(-repair\d+-\d+(-r\d+)?)?$")
roots = [(Path(r).parent.name, r) for r in glob.glob(f"{evid}/{prefix}-*/jobs") if phase.match(Path(r).parent.name)]
roots += [(Path(r).name, r) for r in glob.glob(f"{live}/{prefix}-*") if phase.match(Path(r).name)]
cost_by_trial = {}
for run, root in roots:
    for trial in glob.glob(f"{root}/**/*__*/", recursive=True):
        name = Path(trial).name
        if not re.match(r"^\d{3}-[a-z0-9-]+__[A-Za-z0-9]+$", name):
            continue
        ledger = Path(trial) / "agent" / "model-ledger.jsonl"
        # No ledger means the agent never reached the model: it talks to the
        # model only through the ledger. Usage the price table cannot price
        # (another model answered) would read as free, so refuse it.
        rows = [json.loads(l) for l in ledger.read_text().splitlines() if l.strip()] if ledger.exists() else []
        unpriced = {r.get("responseModel") or r.get("requestModel") for r in rows
                    if r.get("usage") and not (PRICES_PER_MTOK.get(r.get("responseModel")) or PRICES_PER_MTOK.get(r.get("requestModel")))}
        if unpriced:
            sys.exit(f"cannot price {name}: usage from {sorted(map(str, unpriced))}")
        cost = ledger_cost_usd(rows)
        if cost is None:
            result = Path(trial) / "result.json"
            agent = (json.loads(result.read_text()).get("agent_result") or {}) if result.exists() else {}
            cost = agent.get("cost_usd") or 0
        # The same trial appears live and, once copied, in the evidence.
        cost_by_trial[(run, name)] = max(cost, cost_by_trial.get((run, name), 0))
total = sum(cost_by_trial.values())
print(f"{total + float(prior):.2f} {total:.2f} {len(cost_by_trial)}")
EOF
}

over_budget() {
  local spent
  read -r spent _ _ <<< "$(spent_usd)" || true
  # A meter that cannot price the run must not read as under budget.
  [ -n "$spent" ] || { log "cannot compute spend from the ledgers; stopping"; exit 1; }
  python3 -c "import sys; sys.exit(0 if float('$spent') >= float('$BUDGET_USD') else 1)"
}

budget_gate() {
  local spent run_spent trials
  read -r spent run_spent trials <<< "$(spent_usd)" || true
  if over_budget; then
    log "budget reached: \$$spent list price >= \$$BUDGET_USD; stopping $1"
    exit 0
  fi
  log "spend so far \$$spent (\$$run_spent over $trials trials + \$$PRIOR_SPEND_USD set aside) of \$$BUDGET_USD"
}

# Prints how many of a run's trials reached their agent.
agents_started() {
  python3 - "$EVID/$1" <<'EOF'
import glob, sys
run = sys.argv[1]
patterns = [f"{run}/jobs/*/*__*/agent/runtime.txt", f"{run}/jobs/*/*__*/agent/claude-code.txt"]
print(sum(len(glob.glob(p)) for p in patterns))
EOF
}

# Neurolink's own timeout is set past the task budget, so it should never fire;
# if it does, runs are being cut short by configuration rather than by the task.
neurolink_timeout_guard() {
  local hits
  hits=$( { grep -lE "(generate|stream) operation timed out" \
    "$EVID/$RUN_PREFIX-preflight-neurolink"/jobs/*/*__*/agent/neurolink.stderr.log \
    "$EVID/$RUN_PREFIX-neurolink"/jobs/*/*__*/agent/neurolink.stderr.log \
    "$EVID/$RUN_PREFIX-neurolink-repair"*/jobs/*/*__*/agent/neurolink.stderr.log 2>/dev/null || true; } | wc -l | tr -d ' ')
  if [ "$hits" -gt 0 ]; then
    log "$hits Neurolink trials were stopped by Neurolink's own timeout; stopping"
    exit 1
  fi
}

# One harbor run through run_baseline.sh. The spend is checked every
# BUDGET_CHECK_SECS while it runs; at the cap only harbor is stopped, so
# run_baseline.sh still copies and summarises the evidence.
run_phase() {
  local harness=$1 run=$2 tasks=$3 attempts=$4 concurrency=$5 pid waited=0 stopped=0
  stop_requested "before $run"
  container_gate "before $run"
  disk_gate "before $run"
  budget_gate "before $run"
  ( harness_env "$harness"; TASK_LIST=$tasks "$HERE/run_baseline.sh" "$run" "$TUA" "$attempts" "$concurrency" ) < /dev/null &
  pid=$!
  while kill -0 "$pid" 2> /dev/null; do
    sleep 10
    waited=$((waited + 10))
    [ "$stopped" = 1 ] || [ "$waited" -lt "$BUDGET_CHECK_SECS" ] && continue
    waited=0
    if over_budget; then
      touch "$STOP"
      # Counted as stopped only once a signalled harbor is gone; otherwise
      # checked again at the next interval until the phase ends.
      if pgrep -f -- "-o jobs/$run --yes" > /dev/null; then
        log "budget reached during $run; stopping its harbor run"
        pkill -TERM -f -- "-o jobs/$run --yes" || true
        sleep 5
        pgrep -f -- "-o jobs/$run --yes" > /dev/null || stopped=1
      else
        log "budget reached during $run, but no harbor process matched '-o jobs/$run --yes'; checking again"
      fi
    fi
  done
  if ! wait "$pid"; then
    log "$run: run_baseline.sh failed; see $EVID/$run"
    exit 1
  fi
  [ "$harness" = neurolink ] && neurolink_timeout_guard
  stop_requested "after $run"
}

# Trial summaries across a harness's full run and its repairs, rescored the
# way TUA-Bench scores: a checker that crashes on the agent's output counts as
# 0, so repairs do not give a harness extra attempts for it.
summarize_harness() {
  local run=$1 jobs
  jobs=$(ls -d "$EVID/$run"/jobs "$EVID/$run"-repair*/jobs 2>/dev/null | paste -sd, -) || true
  python3 "$HERE/summarize_trials.py" "$jobs" "$TUA/tasks" "$EVID/$run/summary-all" "$run"
  python3 "$HERE/rescore_official.py" "$EVID/$run/summary-all/trials.jsonl" "$EVID/$run/summary-all/official.jsonl" > /dev/null
}

# 1. Preflight
[ "$(uname -m)" = x86_64 ] || echo "warning: not x86_64; results will not match the leaderboard host" >&2
container_gate "at preflight"
for f in "$NEUROLINK_TGZ" "$NEUROLINK_BUNDLE" "$CLAUDE_CODE_BUNDLE"; do
  [ -f "$f" ] || { echo "missing: $f" >&2; exit 1; }
done
# The spend cap prices requests from ledger_summary.py's table; a model it has
# no prices for would leave every request unmetered and the cap ineffective.
python3 -c "import sys; sys.path.insert(0, '$HERE'); from ledger_summary import PRICES_PER_MTOK; sys.exit(0 if '${MODEL#*/}' in PRICES_PER_MTOK else 1)" ||
  { echo "no list prices for ${MODEL#*/} in ledger_summary.py PRICES_PER_MTOK; add them so BUDGET_USD can be enforced" >&2; exit 1; }
log "run=$RUN_PREFIX model=$MODEL thinking=${THINKING_BUDGET:-off} k=$K concurrency=$CONCURRENCY budget=\$$BUDGET_USD keep_containers=$KEEP_CONTAINERS"

# 2. Oracle validation, once per host and TUA-Bench commit
ORACLE=$EVID/$RUN_PREFIX-oracle
if [ ! -f "$ORACLE/oracle_passing.txt" ]; then
  stop_requested "before the oracle"
  container_gate "before the oracle"
  disk_gate "before the oracle"
  "$HERE/oracle_validate.sh" "$RUN_PREFIX-oracle" "$TUA" "$CONCURRENCY"
  # An oracle that errored because the runtime went down is not a verdict.
  container_gate "after the oracle (move $ORACLE aside and rerun)"
fi
[ -f "$ORACLE/oracle_passing.txt" ] || { log "oracle validation produced no verdict; see $ORACLE"; exit 1; }
TASKS=$(tr '\n' ' ' < "$ORACLE/oracle_passing.txt")
[ -n "${TASKS// }" ] || { log "no task passes its oracle on this host; stopping"; exit 1; }
log "oracle-validated tasks: $(wc -w <<< "$TASKS")"

# 3. Parity preflight: one fast task per harness; stop before the full run if
#    the ledger shows another model, a different thinking setting, or a
#    different max_tokens.
for harness in neurolink claudecode; do
  run=$RUN_PREFIX-preflight-$harness
  [ -e "$EVID/$run" ] && continue
  run_phase "$harness" "$run" 106-create-charles-ssh-user 1 1
done
if ! python3 - "$EVID/$RUN_PREFIX-preflight-neurolink" "$EVID/$RUN_PREFIX-preflight-claudecode" <<'EOF'
import json, sys
from collections import Counter
from pathlib import Path
thinking_by_run, main_max_tokens = {}, {}
for evidence in map(Path, sys.argv[1:]):
    rows = [json.loads(l) for l in open(evidence / "summary" / "trials.jsonl")]
    if not rows or not all(r["model_identity_ok"] for r in rows):
        sys.exit(f"model identity failed in {evidence.name}")
    ledgers = list(evidence.glob("jobs/*/*__*/agent/model-ledger.jsonl"))
    requests = [json.loads(l) for p in ledgers for l in open(p) if l.strip()]
    delivered = [r for r in requests if isinstance(r.get("status"), int) and 200 <= r["status"] < 300]
    if not delivered:
        sys.exit(f"no delivered model request in {evidence.name}")
    thinking_by_run[evidence.name] = {json.dumps(r.get("thinking")) for r in delivered}
    # Harnesses may send small side calls with a lower limit; compare the main one.
    counts = Counter(r.get("maxTokens") for r in delivered if r.get("maxTokens") is not None)
    if not counts:
        sys.exit(f"no max_tokens recorded in {evidence.name}; cannot check parity")
    main_max_tokens[evidence.name] = counts.most_common(1)[0][0]
    print(f"{evidence.name}: thinking={sorted(thinking_by_run[evidence.name])} max_tokens={main_max_tokens[evidence.name]}")
thinkings = list(thinking_by_run.values())
if any(len(t) != 1 for t in thinkings) or len({frozenset(t) for t in thinkings}) != 1:
    sys.exit("thinking settings differ between harnesses or vary within one")
if len(set(main_max_tokens.values())) != 1:
    sys.exit(f"max_tokens differ: {main_max_tokens}; set NEUROLINK_MAX_TOKENS to the reference harness's value")
EOF
then
  log "parity preflight FAILED; see above"
  exit 1
fi
log "parity preflight ok"

# 4. Full runs, then repair rounds for tasks short of K scored attempts
for harness in neurolink claudecode; do
  run=$RUN_PREFIX-$harness
  if [ ! -e "$EVID/$run" ]; then
    run_phase "$harness" "$run" "$TASKS" "$K" "$CONCURRENCY"
  fi
  started=$(agents_started "$run") || true
  if ! [[ "$started" =~ ^[0-9]+$ ]] || [ "$started" -eq 0 ]; then
    log "$run: no trial reached its agent (count: ${started:-unreadable}); stopping instead of repairing (fix the host, move $EVID/$run aside, rerun)"
    exit 1
  fi
  for round in $(seq 1 "$REPAIR_ROUNDS"); do
    summarize_harness "$run" > /dev/null
    # One repair run per missing-attempt count, since harbor applies -k to every task.
    missing=$(python3 - "$EVID/$run/summary-all/official.jsonl" "$K" "$TASKS" 2>> "$LOG" <<'EOF'
import json, sys
from collections import Counter, defaultdict
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
    print(f"[{now}] not repairing {t}: all {infra[t]} attempts failed before the agent started", file=sys.stderr)
groups = defaultdict(list)
for t in tasks:
    if got[t] < k and t not in stuck:
        groups[k - got[t]].append(t)
for need, ts in sorted(groups.items()):
    print(f"{need}:{' '.join(ts)}")
EOF
)
    [ -z "$missing" ] && break
    while IFS=: read -r need tasks; do
      name=$run-repair$round-$need
      n=2
      while [ -e "$EVID/$name" ]; do
        name=$run-repair$round-$need-r$n
        n=$((n + 1))
      done
      log "$run: repair round $round, $need more attempt(s) for $tasks"
      run_phase "$harness" "$name" "$tasks" "$need" "$CONCURRENCY"
    done <<< "$missing"
  done
done

# 5. Final summaries, metrics, integrity. The headline is TUA-Bench scoring
#    (official.jsonl); the summarised states, where a crashed checker is
#    unscorable, follow it.
for harness in neurolink claudecode; do
  run=$RUN_PREFIX-$harness
  summarize_harness "$run" > "$EVID/$run/summary-all.txt"
  head -1 "$EVID/$run/summary-all.txt"
  jobs=$(ls -d "$EVID/$run"/jobs "$EVID/$run"-repair*/jobs 2>/dev/null | paste -sd, -) || true
  python3 "$HERE/integrity_scan.py" "$jobs" "$EVID/$run/integrity.jsonl" || echo "integrity scan: unreadable traces in $run" >&2
done
held_out=()
for prefix in $HELD_OUT_TASKS; do
  for task in "$TUA/tasks/$prefix"-*; do [ -d "$task" ] && held_out+=("$(basename "$task")"); done
done
CC=$EVID/$RUN_PREFIX-claudecode/summary-all
NL=$EVID/$RUN_PREFIX-neurolink/summary-all
{
  echo "=== TUA-Bench scoring (a crashed checker counts as 0), all oracle-validated tasks"
  python3 "$HERE/leaderboard_metrics.py" "$CC/official.jsonl" "$NL/official.jsonl" --k "$K" --labels claude-code neurolink
  echo
  echo "=== TUA-Bench scoring, held out (without ${HELD_OUT_TASKS})"
  python3 "$HERE/leaderboard_metrics.py" "$CC/official.jsonl" "$NL/official.jsonl" --k "$K" --labels claude-code neurolink \
    --exclude ${held_out[@]+"${held_out[@]}"}
  echo
  echo "=== Crashed checker as unscorable, all oracle-validated tasks"
  python3 "$HERE/leaderboard_metrics.py" "$CC/trials.jsonl" "$NL/trials.jsonl" --k "$K" --labels claude-code neurolink
} | tee "$EVID/$RUN_PREFIX-metrics.txt"
read -r spent run_spent trials <<< "$(spent_usd)" || true
log "done: \$$spent list price (\$$run_spent over $trials trials + \$$PRIOR_SPEND_USD set aside); metrics in $EVID/$RUN_PREFIX-metrics.txt"
