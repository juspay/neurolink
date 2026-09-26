#!/usr/bin/env bash
# Exercises fullrun.sh's guards without Docker, harbor or a model: the real
# driver and the real analysis scripts run against stub run_baseline.sh,
# oracle_validate.sh, docker and df, and generated trials shaped like the
# full run's (ledger rows, result.json, rewards, agent files).
# Usage: benchmarks/tua-bench/test_fullrun.sh [scenario ...]   (default: all)
#        KEEP_ROOT=1 keeps the scratch directory for inspection.
set -uo pipefail
ONLY=" $* "

HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(mktemp -d)
trap 'pkill -f -- "$ROOT/" 2>/dev/null; [ "${KEEP_ROOT:-0}" = 1 ] && echo "kept $ROOT" || rm -rf "$ROOT"' EXIT
BENCH=$ROOT/bench
mkdir -p "$BENCH" "$ROOT/bin" "$ROOT/artifacts"
cp "$HERE/fullrun.sh" "$HERE"/{summarize_trials,ledger_summary,rescore_official,leaderboard_metrics,integrity_scan}.py "$BENCH/"
touch "$ROOT/artifacts/neurolink.tgz" "$ROOT/artifacts/neurolink.tar.gz" "$ROOT/artifacts/claude.tar.gz"

# Generated trial. Each delivered request costs $0.30 at Sonnet 4.5 list price.
cat > "$BENCH/make_trial.py" <<'EOF'
import json, os, sys
from pathlib import Path
trial, harness, outcome, max_tokens, timed_out = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), sys.argv[5] == "1"
model = "claude-sonnet-4-5-20250929"
t = Path(trial)
(t / "verifier").mkdir(parents=True)
result = {"started_at": "2026-09-26T00:00:00Z", "exception_info": None, "agent_result": {"metadata": {}}}
(t / "config.json").write_text(json.dumps({"agent": {"model_name": f"anthropic/{model}"}}))
if outcome == "infra":
    # As harbor leaves it when the environment never starts: config, an empty
    # agent directory, and the exception.
    (t / "agent").mkdir()
    result["exception_info"] = {"exception_type": "EnvironmentStartTimeoutError", "exception_message": "stub"}
    (t / "result.json").write_text(json.dumps(result))
    sys.exit()
agent = t / "agent"
agent.mkdir()
row = {"status": 200, "upstream": "api.anthropic.com", "requestModel": model, "responseModel": model,
       "thinking": {"type": "enabled", "budget": 8000},
       "maxTokens": None if os.environ.get("STUB_NO_MAXTOKENS") == "1" else max_tokens,
       "usage": {"input_tokens": 100000, "output_tokens": 0}}
rows = [row]
if os.environ.get("STUB_UNPRICED") == "1":
    # A request answered by a model the price table does not know.
    rows.append(dict(row, requestModel="claude-haiku-4-5-20251001", responseModel="claude-haiku-4-5-20251001"))
if outcome == "service":
    # The model service ended the run: its last request failed.
    rows.append({"status": 502, "upstream": "api.anthropic.com", "requestModel": model, "responseModel": None})
(agent / "model-ledger.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows))
if harness == "neurolink":
    (agent / "runtime.txt").write_text("stub\n")
    (agent / "neurolink.stderr.log").write_text("generate operation timed out\n" if timed_out else "")
else:
    (agent / "claude-code.txt").write_text("stub\n")
reward = {"pass": 1.0, "fail": 0.0, "crash": None, "service": None}[outcome]
(t / "verifier" / "reward.txt").write_text("0\n" if outcome == "crash" else f"{reward}\n")
result["verifier_result"] = {"rewards": {"reward": reward}} if reward is not None else None
(t / "result.json").write_text(json.dumps(result))
EOF

# run_baseline.sh stand-in. STUB_OUTCOMES_<HARNESS>="task=outcome,...", applied
# to runs matching STUB_OUTCOME_RUNS (default all). Regexes on the run name:
# STUB_INFRA_RUNS (every trial fails before its agent), STUB_EMPTY_RUNS (no
# trial at all, as when a phase is interrupted at once) and STUB_SLOW_RUNS (the
# first attempt of each task, then a harbor stand-in that the budget watchdog
# can stop; the other attempts are written only if it was not stopped).
cat > "$BENCH/run_baseline.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
RUN=$1 TUA=$2 ATTEMPTS=$3
HERE=$(cd "$(dirname "$0")" && pwd)
EVIDENCE=$EVIDENCE_ROOT/$RUN
[ -e "$EVIDENCE" ] && { echo "evidence dir exists: $EVIDENCE" >&2; exit 1; }
harness=claudecode; [[ "$AGENT_IMPORT_PATH" == neurolink_agent.* ]] && harness=neurolink
max_tokens=32000; [ "$harness" = neurolink ] && max_tokens=${NEUROLINK_MAX_TOKENS:-8192}
outcomes_var=STUB_OUTCOMES_$(tr '[:lower:]' '[:upper:]' <<< "$harness")
jobs=$TUA/jobs/$RUN/2026-09-26__00-00-00
mkdir -p "$jobs"
n=0
write_attempts() {
  local from=$1 to=$2 task outcome
  for task in $TASK_LIST; do
    eval "outcomes=\${$outcomes_var:-}"
    outcome=""
    [[ "$RUN" =~ ${STUB_OUTCOME_RUNS:-.} ]] && outcome=$(tr ',' '\n' <<< "$outcomes" | awk -F= -v t="$task" '$1 == t {print $2}')
    [[ "$RUN" =~ ${STUB_INFRA_RUNS:-^$} ]] && outcome=infra
    for _ in $(seq "$from" "$to"); do
      n=$((n + 1))
      python3 "$HERE/make_trial.py" "$jobs/${task}__t$RANDOM$n" "$harness" "${outcome:-pass}" "$max_tokens" "${STUB_TIMEOUT:-0}"
    done
  done
}
if [[ "$RUN" =~ ${STUB_EMPTY_RUNS:-^$} ]]; then
  :
elif [[ "$RUN" =~ ${STUB_SLOW_RUNS:-^$} ]]; then
  write_attempts 1 1
  if python3 -c 'import time; time.sleep(300)' harbor run -o "jobs/$RUN" --yes; then
    [ "$ATTEMPTS" -gt 1 ] && write_attempts 2 "$ATTEMPTS"
  fi
else
  write_attempts 1 "$ATTEMPTS"
fi
mkdir -p "$EVIDENCE"
cp -R "$TUA/jobs/$RUN" "$EVIDENCE/jobs"
python3 "$HERE/summarize_trials.py" "$EVIDENCE/jobs" "$TUA/tasks" "$EVIDENCE/summary" "$RUN" > /dev/null
EOF
cat > "$BENCH/oracle_validate.sh" <<'EOF'
#!/usr/bin/env bash
mkdir -p "$EVIDENCE_ROOT/$1"
tr ' ' '\n' <<< "$STUB_ORACLE_PASSING" > "$EVIDENCE_ROOT/$1/oracle_passing.txt"
EOF
cat > "$ROOT/bin/docker" <<'EOF'
#!/usr/bin/env bash
[ "${STUB_DOCKER_DOWN:-0}" = 1 ] && exit 1
case "$*" in *DockerRootDir*) echo /var/lib/docker ;; esac
exit 0
EOF
cat > "$ROOT/bin/df" <<'EOF'
#!/usr/bin/env bash
printf 'Avail\n %sG\n' "${STUB_FREE_GB:-200}"
EOF
chmod +x "$BENCH"/*.sh "$ROOT/bin/docker" "$ROOT/bin/df"

TASKS="091-add-receipts-bookkeeping 096-first-author-table 099-professor-contact-info 106-create-charles-ssh-user"
FAILED=0
CASE=""

# A fresh evidence root, task set and config per scenario.
setup() {
  CASE=$1
  export EVIDENCE_ROOT=$ROOT/$CASE/evid TUA_DIR=$ROOT/$CASE/tua
  mkdir -p "$EVIDENCE_ROOT" "$TUA_DIR/jobs"
  for task in $TASKS; do
    mkdir -p "$TUA_DIR/tasks/$task/tests"
    # Like the real verifiers: a bare 0 when the evaluator itself crashes.
    printf 'if score=$(python3 /tests/test_outputs.py); then :; else score="0"; fi\n' > "$TUA_DIR/tasks/$task/tests/test.sh"
  done
  cat > "$ROOT/$CASE/config.env" <<EOF
TUA=$TUA_DIR
RUN_PREFIX=t
MODEL=anthropic/claude-sonnet-4-5-20250929
THINKING_BUDGET=8000
K=2
CONCURRENCY=2
BUDGET_USD=${BUDGET:-100}
BUDGET_CHECK_SECS=10
NEUROLINK_TGZ=$ROOT/artifacts/neurolink.tgz
NEUROLINK_BUNDLE=$ROOT/artifacts/neurolink.tar.gz
CLAUDE_CODE_BUNDLE=$ROOT/artifacts/claude.tar.gz
EOF
  [ -n "${EXTRA_CONFIG:-}" ] && echo "$EXTRA_CONFIG" >> "$ROOT/$CASE/config.env"
  export STUB_ORACLE_PASSING="091-add-receipts-bookkeeping 096-first-author-table 099-professor-contact-info"
}

run_driver() {
  PATH=$ROOT/bin:$PATH perl -e 'alarm shift; exec @ARGV' 180 bash "$BENCH/fullrun.sh" "$ROOT/$CASE/config.env" > "$ROOT/$CASE/out.txt" 2>&1
  echo $?
}

check() {
  if eval "$2"; then
    echo "  ok   $CASE: $1"
  else
    echo "  FAIL $CASE: $1"
    sed 's/^/       | /' "$ROOT/$CASE/out.txt" | tail -12
    FAILED=$((FAILED + 1))
  fi
}

LOGF() { echo "$EVIDENCE_ROOT/t.log"; }
want() { [ "$ONLY" = "  " ] || [[ "$ONLY" == *" $1 "* ]]; }

echo "fullrun.sh guard tests"

if want happy; then
# 1. Happy path: a crashed checker counts as 0 (no repair for 091), the
#    metrics carry all three sections, and a run that merely shares the prefix
#    is not charged to this one.
STUB_OUTCOMES_NEUROLINK="091-add-receipts-bookkeeping=crash,099-professor-contact-info=fail" setup happy
mkdir -p "$EVIDENCE_ROOT/t-neurolink-v2-calc/jobs/x"
python3 "$BENCH/make_trial.py" "$EVIDENCE_ROOT/t-neurolink-v2-calc/jobs/x/096-first-author-table__decoy" neurolink pass 32000 0
rc=$(STUB_OUTCOMES_NEUROLINK="091-add-receipts-bookkeeping=crash,099-professor-contact-info=fail" run_driver)
check "exits 0" '[ "$rc" = 0 ]'
check "preflight passes with matching max_tokens" 'grep -q "parity preflight ok" "$(LOGF)"'
check "no repair run for the crashed checker" '! ls -d "$EVIDENCE_ROOT"/t-*-repair* > /dev/null 2>&1'
check "metrics has all three sections" '[ "$(grep -c "^===" "$EVIDENCE_ROOT/t-metrics.txt")" = 3 ]'
# 2 preflight + 3 tasks x 2 attempts x 2 harnesses = 14 trials x $0.30; the decoy is not counted.
check "spend is this run's 14 trials only (\$4.20)" 'grep -q "done: \$4.20 " "$(LOGF)"'
fi

if want maxtokens; then
# 2. max_tokens parity: an adapter default of 8192 against Claude Code's 32000.
EXTRA_CONFIG="NEUROLINK_MAX_TOKENS=8192" setup maxtokens
rc=$(run_driver)
check "exits 1" '[ "$rc" = 1 ]'
check "names the max_tokens mismatch" 'grep -q "max_tokens differ" "$ROOT/$CASE/out.txt"'
check "no full run started" '[ ! -e "$EVIDENCE_ROOT/t-neurolink" ]'
fi

if want budget_between; then
# 3. Budget reached between phases: the two preflight trials ($0.60) exceed $0.50.
#    A long check interval leaves the between-phase gate to catch it; scenario 4
#    covers the check during a phase.
BUDGET=0.50 EXTRA_CONFIG="BUDGET_CHECK_SECS=3600" setup budget_between
rc=$(run_driver)
check "exits 0" '[ "$rc" = 0 ]'
check "stops before the full run" 'grep -q "budget reached: \$0.60 list price >= \$0.50; stopping before t-neurolink" "$(LOGF)"'
check "no full run started" '[ ! -e "$EVIDENCE_ROOT/t-neurolink" ]'
fi

if want budget_during; then
# 4. Budget reached during a phase: harbor is stopped with one of each task's two
#    attempts written, the evidence is still copied, and after raising the cap
#    the run resumes and a repair round backfills the missing attempts.
BUDGET=1.20 setup budget_during
start=$(date +%s)
rc=$(STUB_SLOW_RUNS='^t-neurolink$' run_driver)
check "exits 0" '[ "$rc" = 0 ]'
check "stops harbor mid-phase" 'grep -q "budget reached during t-neurolink; stopping its harbor run" "$(LOGF)"'
check "long before the 300 s phase would have ended" '[ $(( $(date +%s) - start )) -lt 250 ]'
check "evidence of the stopped phase was copied" '[ -d "$EVIDENCE_ROOT/t-neurolink/jobs" ]'
check "leaves the STOP file" '[ -e "$EVIDENCE_ROOT/t.STOP" ]'
rm "$EVIDENCE_ROOT/t.STOP"
sed -i.bak 's/^BUDGET_USD=.*/BUDGET_USD=100/' "$ROOT/$CASE/config.env"
rc=$(run_driver)
check "resumes to the end after the cap is raised" '[ "$rc" = 0 ] && [ -f "$EVIDENCE_ROOT/t-metrics.txt" ]'
  check "the resume backfills the attempts the stop cut off" '[ -d "$EVIDENCE_ROOT/t-neurolink-repair1-1" ]'
fi

if want timeout; then
# 5. Neurolink's own timeout fired.
setup timeout
rc=$(STUB_TIMEOUT=1 run_driver)
check "exits 1" '[ "$rc" = 1 ]'
check "names Neurolink's timeout" 'grep -q "stopped by Neurolink'"'"'s own timeout" "$(LOGF)"'
fi

if want no_agent; then
# 6. No trial reached its agent (runtime down after the preflight).
setup no_agent
rc=$(STUB_INFRA_RUNS='^t-neurolink$' run_driver)
check "exits 1" '[ "$rc" = 1 ]'
check "refuses to repair instead" 'grep -q "t-neurolink: no trial reached its agent" "$(LOGF)"'
check "no repair run" '! ls -d "$EVIDENCE_ROOT"/t-neurolink-repair* > /dev/null 2>&1'
fi

if want stuck; then
# 7. A task whose every attempt fails before the agent starts is not repaired.
setup stuck
rc=$(STUB_OUTCOMES_NEUROLINK="099-professor-contact-info=infra" run_driver)
check "exits 0" '[ "$rc" = 0 ]'
check "logs the skip" 'grep -q "not repairing 099-professor-contact-info: all 2 attempts failed before the agent started" "$(LOGF)"'
check "no repair run" '! ls -d "$EVIDENCE_ROOT"/t-neurolink-repair* > /dev/null 2>&1'
fi

if want repair; then
# 8. Model-service failures are repaired, and a round that fills them is the last.
setup repair
rc=$(STUB_OUTCOMES_CLAUDECODE="096-first-author-table=service" STUB_OUTCOME_RUNS='^t-claudecode$' run_driver)
check "exits 0" '[ "$rc" = 0 ]'
check "one repair run for the 2 missing attempts" '[ -d "$EVIDENCE_ROOT/t-claudecode-repair1-2" ] && ! ls -d "$EVIDENCE_ROOT"/t-claudecode-repair2* > /dev/null 2>&1'
fi

# 9. A repair run interrupted in an earlier invocation (no trial written) is
#    kept, and the rerun repairs under a suffixed name instead of failing on
#    the existing evidence directory.
if want resume_repair; then
setup resume_repair
rc=$(STUB_OUTCOMES_NEUROLINK="096-first-author-table=service" STUB_OUTCOME_RUNS='^t-neurolink$' STUB_EMPTY_RUNS='^t-neurolink-repair' run_driver)
check "first invocation ends with the attempts still missing" '[ "$rc" = 0 ] && [ -d "$EVIDENCE_ROOT/t-neurolink-repair1-2" ]'
rc=$(STUB_OUTCOMES_NEUROLINK="096-first-author-table=service" STUB_OUTCOME_RUNS='^t-neurolink$' run_driver)
check "rerun exits 0" '[ "$rc" = 0 ]'
check "rerun repairs under a suffixed name" '[ -d "$EVIDENCE_ROOT/t-neurolink-repair1-2-r2" ]'
check "the earlier repair run is kept" '[ -d "$EVIDENCE_ROOT/t-neurolink-repair1-2/jobs" ]'
fi

# 10. A request answered by a model the price table does not know stops the run.
if want unpriced_usage; then
setup unpriced_usage
rc=$(STUB_UNPRICED=1 run_driver)
check "exits 1" '[ "$rc" = 1 ]'
check "the meter refuses to price it" 'grep -q "cannot compute spend from the ledgers" "$(LOGF)" && grep -q "usage from .*claude-haiku-4-5-20251001" "$ROOT/$CASE/out.txt"'
fi

# 11. Two phases holding a trial with the same basename are two spends; only a
#     trial's live and evidence copies are one.
if want spend_keys; then
setup spend_keys
for phase in t-neurolink-repair9-1 t-claudecode-repair9-1; do
  mkdir -p "$EVIDENCE_ROOT/$phase/jobs/x"
  python3 "$BENCH/make_trial.py" "$EVIDENCE_ROOT/$phase/jobs/x/096-first-author-table__dup" neurolink pass 32000 0
done
rc=$(run_driver)
check "exits 0" '[ "$rc" = 0 ]'
# 14 trials of the run plus the two same-named trials: 16 x $0.30.
check "counts both same-named trials (\$4.80)" 'grep -q "done: \$4.80 " "$(LOGF)"'
fi

# 12. Malformed settings and a ledger with no max_tokens stop with a message.
if want bad_config || want no_max_tokens; then
EXTRA_CONFIG="BUDGET_USD=abc" setup bad_config
rc=$(run_driver)
check "a malformed BUDGET_USD refuses to start" '[ "$rc" = 1 ] && grep -q "BUDGET_USD must be a number of USD" "$ROOT/$CASE/out.txt"'
EXTRA_CONFIG="MIN_FREE_GB=ten" setup bad_config_disk
rc=$(run_driver)
check "a malformed MIN_FREE_GB refuses to start" '[ "$rc" = 1 ] && grep -q "MIN_FREE_GB must be a whole number" "$ROOT/$CASE/out.txt"'
setup no_max_tokens
rc=$(STUB_NO_MAXTOKENS=1 run_driver)
check "no max_tokens: the preflight says so instead of a traceback" '[ "$rc" = 1 ] && grep -q "no max_tokens recorded in t-preflight-neurolink" "$ROOT/$CASE/out.txt" && ! grep -q Traceback "$ROOT/$CASE/out.txt"'
fi

# 13. STOP file, docker down, low disk, a model with no prices.
if want stop_file || want docker_down || want low_disk || want unpriced; then
setup stop_file
touch "$EVIDENCE_ROOT/t.STOP"
rc=$(run_driver)
check "STOP file: exits 0 before any phase" '[ "$rc" = 0 ] && [ ! -e "$EVIDENCE_ROOT/t-preflight-neurolink" ]'
setup docker_down
rc=$(STUB_DOCKER_DOWN=1 run_driver)
check "docker down: exits 1" '[ "$rc" = 1 ] && grep -q "docker is not reachable" "$(LOGF)"'
setup low_disk
rc=$(STUB_FREE_GB=10 run_driver)
check "low disk: exits 1" '[ "$rc" = 1 ] && grep -q "has 10 GB free" "$(LOGF)"'
EXTRA_CONFIG="MODEL=anthropic/claude-opus-4-1-20250805" setup unpriced
rc=$(run_driver)
check "unpriced model: exits 1 before any phase" '[ "$rc" = 1 ] && grep -q "no list prices for claude-opus-4-1-20250805" "$ROOT/$CASE/out.txt"'

fi

echo
[ "$FAILED" = 0 ] && echo "all fullrun.sh guard tests passed" || echo "$FAILED check(s) failed"
[ "$FAILED" = 0 ]
