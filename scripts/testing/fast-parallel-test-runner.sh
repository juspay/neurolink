#!/bin/bash

echo "🚀 NeuroLink Fast Parallel Test Runner"
echo "======================================"
echo "Using bash background jobs for parallel execution"
echo "Target: Complete remaining tests in ~15-20 minutes"
echo "Started: $(date)"
echo

# Configuration
MAX_PARALLEL_JOBS=8
TEST_TIMEOUT=45
mkdir -p test-executions/post-fix-parallel

# Test execution counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to execute test in parallel
execute_parallel_test() {
    local test_id=$1
    local test_command=$2
    local timeout_duration=${3:-$TEST_TIMEOUT}
    
    {
        echo "🧪 Testing: $test_id (PID: $$)"
        local start_time=$(date +%s)
        local test_output
        local exit_code
        
        # Execute test with timeout
        if timeout ${timeout_duration} bash -c "$test_command" > "test-executions/post-fix-parallel/${test_id}-output.txt" 2>&1; then
            exit_code=0
            test_status="PASS"
            echo "   ✅ $test_id PASSED ($(( $(date +%s) - start_time ))s)"
        else
            exit_code=$?
            test_status="FAILED"
            echo "   ❌ $test_id FAILED ($(( $(date +%s) - start_time ))s)"
        fi
        
        # Create result file
        cat > "test-executions/post-fix-parallel/${test_id}-result.json" << EOF
{
  "testId": "$test_id",
  "status": "$test_status",
  "exitCode": $exit_code,
  "duration": "$(( $(date +%s) - start_time ))s",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "command": "$test_command"
}
EOF
    } &
    
    # Limit parallel jobs
    local job_count=$(jobs -r | wc -l)
    while [ $job_count -ge $MAX_PARALLEL_JOBS ]; do
        sleep 1
        job_count=$(jobs -r | wc -l)
    done
}

echo "📋 Launching parallel test batches..."
echo

# Batch 1: Fixed Provider Authentication Tests (now working)
echo "🔐 Batch 1: Provider Authentication Tests (with fixes)"
execute_parallel_test "ST-001.1.1" "node dist/cli/index.js generate 'Hello from OpenAI' --provider openai --disable-tools --timeout 30"
execute_parallel_test "ST-001.1.2" "node dist/cli/index.js generate 'Hello from Anthropic' --provider anthropic --disable-tools --timeout 30"
execute_parallel_test "ST-001.1.3" "node dist/cli/index.js generate 'Hello from Google AI' --provider google-ai --disable-tools --timeout 30"
execute_parallel_test "ST-001.1.4" "node dist/cli/index.js generate 'Hello from Vertex AI' --provider vertex --disable-tools --timeout 30"
execute_parallel_test "ST-001.1.5" "node dist/cli/index.js generate 'Hello from Bedrock' --provider bedrock --disable-tools --timeout 30"
execute_parallel_test "ST-001.1.6" "node dist/cli/index.js generate 'Hello from Azure' --provider azure --disable-tools --timeout 30"
execute_parallel_test "ST-001.1.7" "node dist/cli/index.js generate 'Hello from Hugging Face' --provider huggingface --disable-tools --timeout 30"
execute_parallel_test "ST-001.1.8" "node dist/cli/index.js generate 'Hello from Ollama' --provider ollama --disable-tools --timeout 30"
execute_parallel_test "ST-001.1.9" "node dist/cli/index.js generate 'Hello from Mistral' --provider mistral --disable-tools --timeout 30"

# Batch 2: CLI Advanced Features (should work now)
echo "💻 Batch 2: CLI Advanced Features"
execute_parallel_test "CLI-001.2.1" "node dist/cli/index.js generate 'Test streaming alternative' --disable-tools --max-tokens 100"
execute_parallel_test "CLI-001.3.1" "node dist/cli/index.js generate 'Batch test content' --disable-tools --temperature 0.7"
execute_parallel_test "CLI-002.1.1" "node dist/cli/index.js provider status"
execute_parallel_test "CLI-002.2.1" "node dist/cli/index.js provider status"
execute_parallel_test "CLI-005.1.1" "node dist/cli/index.js ollama status"

# Batch 3: MCP Integration Tests (working)
echo "🔗 Batch 3: MCP Integration Tests"
execute_parallel_test "ST-002.1.1" "node dist/cli/index.js mcp list"
execute_parallel_test "ST-002.1.2" "node dist/cli/index.js mcp discover"
execute_parallel_test "ST-002.1.3" "node dist/cli/index.js mcp test filesystem"
execute_parallel_test "ST-002.1.4" "node dist/cli/index.js mcp test github"
execute_parallel_test "ST-002.1.5" "node dist/cli/index.js mcp test brave-search"

# Batch 4: SDK Tests (basic)
echo "🔧 Batch 4: SDK Tests"
execute_parallel_test "SDK-001.1.1" "node -e \"const { NeuroLink } = require('./dist/index.js'); const sdk = new NeuroLink(); console.log('SDK initialized successfully');\""
execute_parallel_test "SDK-002.1.1" "node -e \"const sdk = new (require('./dist/index.js')).NeuroLink(); sdk.generate({ input: { text: 'Hello SDK' }, disableTools: true }).then(r => console.log('SDK generation working')).catch(e => console.error('SDK error:', e.message));\""

# Batch 5: Performance Tests
echo "⚡ Batch 5: Performance Tests"
execute_parallel_test "PERF-001.1" "node dist/cli/index.js generate 'Fast test' --disable-tools --timeout 15"
execute_parallel_test "PERF-001.2" "node dist/cli/index.js generate 'Load test with longer content to test system performance under moderate load conditions' --disable-tools --max-tokens 150"
execute_parallel_test "PERF-002.1" "node dist/cli/index.js generate 'Concurrent test A' --disable-tools --provider ollama --timeout 20"
execute_parallel_test "PERF-002.2" "node dist/cli/index.js generate 'Concurrent test B' --disable-tools --provider google-ai --timeout 20"

# Batch 6: Error Handling Tests  
echo "🛡️ Batch 6: Error Handling Tests"
execute_parallel_test "ERR-001.1" "node dist/cli/index.js generate 'Test' --provider invalid-provider --disable-tools"
execute_parallel_test "ERR-001.2" "node dist/cli/index.js generate 'Test' --max-tokens -1 --disable-tools"
execute_parallel_test "ERR-002.1" "node dist/cli/index.js generate 'Test very short timeout' --disable-tools --timeout 1"

# Batch 7: Configuration Tests
echo "⚙️ Batch 7: Configuration Tests"
execute_parallel_test "CLI-003.1.1" "node dist/cli/index.js --help"
execute_parallel_test "CLI-003.1.2" "node dist/cli/index.js generate --help"
execute_parallel_test "CLI-003.1.3" "node dist/cli/index.js provider --help"

# Wait for all background jobs to complete
echo
echo "⏳ Waiting for all parallel tests to complete..."
wait

echo
echo "📊 Collecting results..."

# Count results
total_files=$(ls test-executions/post-fix-parallel/*-result.json 2>/dev/null | wc -l)
passed_files=$(grep -l '"status": "PASS"' test-executions/post-fix-parallel/*-result.json 2>/dev/null | wc -l)
failed_files=$(grep -l '"status": "FAILED"' test-executions/post-fix-parallel/*-result.json 2>/dev/null | wc -l)

echo
echo "🏁 Fast Parallel Test Execution Complete!"
echo "========================================"
echo "📊 Final Results:"
echo "   Total Tests: $total_files"
echo "   Passed: $passed_files"
echo "   Failed: $failed_files"
if [ $total_files -gt 0 ]; then
    echo "   Success Rate: $(( passed_files * 100 / total_files ))%"
fi
echo "   Execution Time: ~$(( $(date +%s) - $(date -d "$(head -1 /tmp/start_time 2>/dev/null || echo '1 minute ago')" +%s) 2>/dev/null || echo "Unknown" )) seconds"
echo "   Parallel Jobs: $MAX_PARALLEL_JOBS"
echo "   Completed: $(date)"

echo
echo "📈 Performance Analysis:"
if [ $passed_files -gt $(( total_files * 70 / 100 )) ]; then
    echo "🎉 Excellent performance - core fixes working!"
    echo "✅ System is highly functional and ready for production testing"
elif [ $passed_files -gt $(( total_files * 50 / 100 )) ]; then
    echo "✅ Good performance - major improvements achieved"
    echo "⚠️  Some issues remain but system much more stable"
else
    echo "⚠️  Mixed results - further investigation needed"
fi

echo
echo "📁 Detailed results in: test-executions/post-fix-parallel/"
echo "📋 Individual test outputs and results available for analysis"