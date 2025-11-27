#!/bin/bash

# Sequential Multi-Provider Test Runner
# Runs tests for all providers one at a time to avoid parallel resource contention
# Compatible with macOS bash 3.x

set -e  # Exit on error
set -o pipefail

# Output directory for logs
LOG_DIR="/tmp/neurolink-sequential-tests"
mkdir -p "$LOG_DIR"

# Providers to test (in order) - ALL 11 PROVIDERS
PROVIDERS="openai anthropic vertex google-ai-studio bedrock azure mistral huggingface ollama litellm sagemaker"

# Results file
RESULTS_FILE="$LOG_DIR/results-summary.txt"
rm -f "$RESULTS_FILE"
touch "$RESULTS_FILE"

START_TIME=$(date +%s)

echo "============================================================"
echo "Sequential Multi-Provider Test Suite"
echo "============================================================"
echo ""
echo "Testing 11 providers sequentially with 15s delays between tests"
echo "Logs will be saved to: $LOG_DIR"
echo ""

# Function to extract pass rate from test output
extract_pass_rate() {
  local log_file=$1
  if [ -f "$log_file" ]; then
    # Extract "X/Y tests passed" from final results
    grep -o '[0-9]\+/[0-9]\+ tests passed' "$log_file" | tail -1 || echo "0/0 tests passed"
  else
    echo "0/0 tests passed"
  fi
}

# Function to extract duration from test output
extract_duration() {
  local log_file=$1
  if [ -f "$log_file" ]; then
    # Extract duration in seconds from final results
    grep -o 'in [0-9]\+s' "$log_file" | tail -1 | grep -o '[0-9]\+' || echo "0"
  else
    echo "0"
  fi
}

# Run tests for each provider sequentially
PROVIDER_NUM=1
TOTAL_PROVIDERS=11

for provider in $PROVIDERS; do
  echo "------------------------------------------------------------"
  echo "[$PROVIDER_NUM/$TOTAL_PROVIDERS] Testing provider: $provider"
  echo "------------------------------------------------------------"

  LOG_FILE="$LOG_DIR/test-$provider.log"
  PROVIDER_START=$(date +%s)

  # Run test and capture output
  if npx tsx test/continuous-test-suite.ts --provider "$provider" 2>&1 | tee "$LOG_FILE"; then
    PASS_RATE=$(extract_pass_rate "$LOG_FILE")
    DURATION=$(extract_duration "$LOG_FILE")
    echo "✅ $provider: $PASS_RATE (${DURATION}s)" | tee -a "$RESULTS_FILE"
  else
    # Test failed or errored
    PASS_RATE=$(extract_pass_rate "$LOG_FILE")
    if [ -z "$PASS_RATE" ] || [ "$PASS_RATE" = "0/0 tests passed" ]; then
      echo "❌ $provider: FAILED (error)" | tee -a "$RESULTS_FILE"
    else
      DURATION=$(extract_duration "$LOG_FILE")
      echo "⚠️ $provider: $PASS_RATE (${DURATION}s)" | tee -a "$RESULTS_FILE"
    fi
  fi

  echo ""

  # Add delay between providers (except after last one)
  if [ $PROVIDER_NUM -lt $TOTAL_PROVIDERS ]; then
    echo "⏳ Waiting 15s before next provider (cooldown)..."
    sleep 15
  fi

  PROVIDER_NUM=$((PROVIDER_NUM + 1))
done

END_TIME=$(date +%s)
TOTAL_DURATION=$((END_TIME - START_TIME))
TOTAL_MINUTES=$((TOTAL_DURATION / 60))
TOTAL_SECONDS=$((TOTAL_DURATION % 60))

# Print summary
echo "============================================================"
echo "Test Results Summary"
echo "============================================================"
echo ""
cat "$RESULTS_FILE"
echo ""
echo "------------------------------------------------------------"
echo "Total Duration: ${TOTAL_DURATION}s (${TOTAL_MINUTES}m ${TOTAL_SECONDS}s)"
echo "Logs saved to: $LOG_DIR"
echo "Results file: $RESULTS_FILE"
echo "============================================================"
