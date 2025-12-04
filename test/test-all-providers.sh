#!/bin/bash

# Quick test script to check all providers
PROVIDERS=("openai" "anthropic" "vertex" "google-ai-studio" "bedrock" "ollama")

echo "Testing all providers with a simple generate command..."
echo "========================================================"

for provider in "${PROVIDERS[@]}"; do
    echo ""
    echo "Testing provider: $provider"
    echo "----------------------------"

    # Run a simple generate command
    timeout 120s node dist/cli/index.js generate \
        --provider="$provider" \
        --max-tokens=100 \
        "Say 'Hello from $provider' in one sentence" 2>&1 | head -20

    exit_code=${PIPESTATUS[0]}

    if [ $exit_code -eq 0 ]; then
        echo "✅ $provider: PASSED"
    elif [ $exit_code -eq 124 ]; then
        echo "⏱️  $provider: TIMEOUT"
    else
        echo "❌ $provider: FAILED (exit code: $exit_code)"
    fi
    echo ""
done

echo "========================================================"
echo "Provider test summary complete"
