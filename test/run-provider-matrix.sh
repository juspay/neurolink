#!/usr/bin/env bash
# Run continuous-test-suite-* against each new provider.
# bash 3.2 compatible (no associative arrays — uses case statements).
#
# Usage:
#   bash test/run-provider-matrix.sh
#
# Output:
#   test-results/<provider>/<suite>.log     -- raw per-run output
#   test-results/<provider>/<suite>.summary -- one-line PASS/FAIL/SKIP/TIMEOUT
#   test-results/MATRIX.md                  -- consolidated grid

set -o pipefail

# Pick whichever timeout binary is available (Linux ships `timeout`; macOS
# coreutils ships `gtimeout`). Bail with a clear message if neither exists.
if command -v gtimeout >/dev/null 2>&1; then
  TIMEOUT_CMD=gtimeout
elif command -v timeout >/dev/null 2>&1; then
  TIMEOUT_CMD=timeout
else
  echo "FATAL: neither 'gtimeout' nor 'timeout' is available. Install GNU coreutils (macOS: brew install coreutils)." >&2
  exit 2
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RESULTS="$ROOT/test-results"
mkdir -p "$RESULTS"

PROVIDERS="deepseek nvidia-nim lm-studio llamacpp"
SUITES="client middleware tool-reliability tracing observability workflow mcp ppt evaluation"

# Lookup helpers (bash 3.2 compatible)
model_for() {
  case "$1" in
    deepseek)    echo "deepseek-chat" ;;
    nvidia-nim)  echo "meta/llama-3.3-70b-instruct" ;;
    # Local providers default to empty — the providers themselves auto-discover
    # the loaded model from /v1/models. Set TEST_LM_STUDIO_MODEL / TEST_LLAMACPP_MODEL
    # to pin a specific model for the run.
    lm-studio)   echo "${TEST_LM_STUDIO_MODEL:-}" ;;
    llamacpp)    echo "${TEST_LLAMACPP_MODEL:-}" ;;
    *)           echo "" ;;
  esac
}

timeout_for() {
  case "$1" in
    workflow|mcp|context|tool-reliability|ppt|evaluation) echo 600 ;;
    *) echo 300 ;;
  esac
}

# Suites to skip per provider (capability gaps). Same set for all 4 currently.
should_skip() {
  case "$2" in
    media|tts|rag|auth) return 0 ;;  # capability gap (not in SUITES list anyway)
    *) return 1 ;;
  esac
}

# ============================================================
# RUN
# ============================================================

for provider in $PROVIDERS; do
  model="$(model_for "$provider")"
  pdir="$RESULTS/$provider"
  mkdir -p "$pdir"

  echo ""
  echo "=========================================================="
  echo "  PROVIDER: $provider   MODEL: ${model:-<auto-discover>}"
  echo "=========================================================="

  for suite in $SUITES; do
    log="$pdir/${suite}.log"
    summary="$pdir/${suite}.summary"

    if should_skip "$provider" "$suite"; then
      echo "SKIP    $suite   (capability gap)" | tee "$summary"
      continue
    fi

    timeout_s="$(timeout_for "$suite")"
    echo ""
    echo "----------------------------------------------------------"
    echo "  RUN: $suite (timeout ${timeout_s}s)  provider=$provider model=${model:-<auto>}"
    echo "----------------------------------------------------------"

    start=$(date +%s)

    # Set NEUROLINK_EVALUATION_PROVIDER too so the evaluation suite uses
    # the same provider as judge (otherwise it falls back to vertex which
    # is broken in this environment).
    TEST_PROVIDER="$provider" TEST_MODEL="$model" \
      NEUROLINK_EVALUATION_PROVIDER="$provider" \
      NEUROLINK_EVALUATION_MODEL="$model" \
      "$TIMEOUT_CMD" "$timeout_s" pnpm run "test:$suite" \
      > "$log" 2>&1
    rc=$?
    end=$(date +%s)
    elapsed=$((end - start))

    sed 's/\x1b\[[0-9;]*m//g' "$log" | tail -300 > "$log.clean"

    pass=$(grep -oE "Passed: *[0-9]+|Pass: *[0-9]+|TOTAL: *[0-9]+ PASS|[0-9]+ pass" "$log.clean" | grep -oE "[0-9]+" | head -1)
    fail=$(grep -oE "Failed: *[0-9]+|Fail: *[0-9]+|FAIL: *[0-9]+|[0-9]+ fail" "$log.clean" | grep -oE "[0-9]+" | head -1)
    skip=$(grep -oE "Skipped: *[0-9]+|Skip: *[0-9]+|SKIP: *[0-9]+|[0-9]+ skip" "$log.clean" | grep -oE "[0-9]+" | head -1)
    pass="${pass:-0}"; fail="${fail:-0}"; skip="${skip:-0}"

    if [ "$rc" = "124" ]; then
      status="TIMEOUT"
    elif [ "$rc" = "0" ]; then
      status="PASS"
    elif [ "$pass" -gt 0 ] && [ "$fail" = "0" ]; then
      status="PASS"
    else
      status="FAIL"
    fi

    line="$(printf "%-7s  %-20s  %ds   pass=%s fail=%s skip=%s rc=%s" \
      "$status" "$suite" "$elapsed" "$pass" "$fail" "$skip" "$rc")"
    echo "$line" | tee "$summary"
  done
done

# ============================================================
# BUILD MATRIX
# ============================================================

mfile="$RESULTS/MATRIX.md"
{
  echo "# Provider × Suite Matrix"
  echo ""
  echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo ""
  echo "Status legend: ✅ PASS · ❌ FAIL · ⏭ SKIP · ⏱ TIMEOUT · ? unknown"
  echo ""
  printf "| Suite |"
  for p in $PROVIDERS; do printf " %s |" "$p"; done
  printf "\n|---|"
  for p in $PROVIDERS; do printf "---|"; done
  printf "\n"

  for suite in $SUITES context memory; do
    printf "| %s |" "$suite"
    for p in $PROVIDERS; do
      f="$RESULTS/$p/${suite}.summary"
      if [ -f "$f" ]; then
        line=$(cat "$f")
        case "$line" in
          PASS*)    nums=$(echo "$line" | grep -oE "pass=[0-9]+ fail=[0-9]+ skip=[0-9]+")
                    printf " ✅ %s |" "$nums" ;;
          FAIL*)    nums=$(echo "$line" | grep -oE "pass=[0-9]+ fail=[0-9]+ skip=[0-9]+")
                    printf " ❌ %s |" "$nums" ;;
          SKIP*)    printf " ⏭ skip |" ;;
          TIMEOUT*) printf " ⏱ TIMEOUT |" ;;
          *)        printf " ? |" ;;
        esac
      else
        printf " — |"
      fi
    done
    printf "\n"
  done
} > "$mfile"

echo ""
echo "=========================================================="
echo "MATRIX written: $mfile"
echo "=========================================================="
cat "$mfile"
