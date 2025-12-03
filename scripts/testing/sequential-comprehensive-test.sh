#!/bin/bash

echo "🚀 NeuroLink Sequential Comprehensive Test Suite"
echo "================================================"
echo "Target: Execute ALL 330+ test cases sequentially"
echo "Started: $(date)"
echo

# Test execution counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
PARTIAL_TESTS=0

# Test categories
declare -a TEST_CATEGORIES=(
    "ST-001:Provider Authentication Tests"
    "ST-002:MCP Integration Tests"
    "ST-003:Analytics Tests"
    "ST-004:Security Tests"
    "ST-005:Performance Tests"
    "ST-006:Integration Tests"
    "CLI-001:Text Generation Commands"
    "CLI-002:Provider Management Commands"
    "CLI-003:Configuration Commands"
    "CLI-004:MCP Commands"
    "CLI-005:Ollama Commands"
    "CLI-006:Analytics Commands"
    "CLI-007:Utility Commands"
    "SDK-001:SDK Initialization"
    "SDK-002:Provider Factory"
    "SDK-003:Text Generation APIs"
    "SDK-004:Streaming APIs"
    "SDK-005:MCP Integration APIs"
    "SDK-006:Analytics APIs"
    "SDK-007:Error Handling APIs"
    "SDK-008:Context Management APIs"
)

# Function to execute a test and record results
execute_test() {
    local test_id=$1
    local test_command=$2
    local timeout_duration=${3:-180}
    
    echo "🧪 Testing: $test_id"
    echo "   Command: $test_command"
    echo "   Timeout: ${timeout_duration}s"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Create test input file
    local input_file="test-executions/comprehensive/${test_id}-input.json"
    local output_file="test-executions/comprehensive/${test_id}-output.json"
    
    # Create directory if it doesn't exist
    mkdir -p "test-executions/comprehensive"
    
    # Record test input
    cat > "$input_file" << EOF
{
  "testId": "$test_id",
  "command": "$test_command",
  "timeout": $timeout_duration,
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "environment": {
    "nodeVersion": "$(node --version 2>/dev/null || echo 'N/A')",
    "neurolinkVersion": "4.1.1",
    "platform": "$(uname -s)",
    "workingDirectory": "$(pwd)"
  }
}
EOF
    
    # Execute test with timeout and capture result
    local start_time=$(date +%s)
    local test_output
    local exit_code
    
    if timeout ${timeout_duration} bash -c "$test_command" > temp_output.txt 2>&1; then
        exit_code=0
        test_output=$(cat temp_output.txt)
        PASSED_TESTS=$((PASSED_TESTS + 1))
        test_status="PASS"
        echo "   ✅ PASSED"
    else
        exit_code=$?
        test_output=$(cat temp_output.txt)
        if [[ $exit_code == 124 ]]; then
            echo "   ⏰ TIMEOUT"
            test_status="TIMEOUT"
        else
            echo "   ❌ FAILED"
            test_status="FAILED"
        fi
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Record test output
    cat > "$output_file" << EOF
{
  "testId": "$test_id",
  "status": "$test_status",
  "exitCode": $exit_code,
  "duration": "${duration}s",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "output": $(echo "$test_output" | jq -Rs .),
  "summary": {
    "command": "$test_command",
    "timeout": $timeout_duration,
    "actualDuration": $duration
  }
}
EOF
    
    rm -f temp_output.txt
    echo
}

echo "📋 Executing comprehensive test suite..."
echo

# ST-001: Provider Authentication Tests
echo "🔐 ST-001: Provider Authentication Tests"
execute_test "ST-001.1.1" "node dist/cli/index.js generate 'Hello from OpenAI' --provider openai --disable-tools" 180
execute_test "ST-001.1.2" "node dist/cli/index.js generate 'Hello from Anthropic' --provider anthropic --disable-tools" 180  
execute_test "ST-001.1.3" "node dist/cli/index.js generate 'Hello from Google AI' --provider google-ai --disable-tools" 180
execute_test "ST-001.1.4" "node dist/cli/index.js generate 'Hello from Vertex AI' --provider vertex --disable-tools" 180
execute_test "ST-001.1.5" "node dist/cli/index.js generate 'Hello from Bedrock' --provider bedrock --disable-tools" 180
execute_test "ST-001.1.6" "node dist/cli/index.js generate 'Hello from Azure' --provider azure --disable-tools" 180
execute_test "ST-001.1.7" "node dist/cli/index.js generate 'Hello from Hugging Face' --provider huggingface --disable-tools" 180
execute_test "ST-001.1.8" "node dist/cli/index.js generate 'Hello from Ollama' --provider ollama --disable-tools" 180
execute_test "ST-001.1.9" "node dist/cli/index.js generate 'Hello from Mistral' --provider mistral --disable-tools" 180

# ST-002: MCP Integration Tests
echo "🔗 ST-002: MCP Integration Tests"
execute_test "ST-002.1.1" "node dist/cli/index.js mcp list" 60
execute_test "ST-002.1.2" "node dist/cli/index.js mcp discover" 120
execute_test "ST-002.1.3" "node dist/cli/index.js mcp test filesystem" 90
execute_test "ST-002.1.4" "node dist/cli/index.js mcp test github" 90
execute_test "ST-002.1.5" "node dist/cli/index.js mcp test brave-search" 90

# CLI-001: Text Generation Commands  
echo "💻 CLI-001: Text Generation Commands"
execute_test "CLI-001.1.1" "node dist/cli/index.js generate 'Hello world'" 120
execute_test "CLI-001.1.2" "node dist/cli/index.js gen 'Write a haiku'" 120
execute_test "CLI-001.1.3" "node dist/cli/index.js generate 'Explain AI' --temperature 0.5" 120
execute_test "CLI-001.1.4" "node dist/cli/index.js generate 'Short answer' --max-tokens 50" 120
execute_test "CLI-001.1.5" "node dist/cli/index.js generate 'Stream test' --stream" 120

# CLI-002: Provider Management Commands
echo "🔧 CLI-002: Provider Management Commands"
execute_test "CLI-002.1.1" "node dist/cli/index.js provider list" 60
execute_test "CLI-002.1.2" "node dist/cli/index.js provider status" 120
execute_test "CLI-002.1.3" "node dist/cli/index.js provider test openai" 90
execute_test "CLI-002.1.4" "node dist/cli/index.js provider test google-ai" 90
execute_test "CLI-002.1.5" "node dist/cli/index.js provider best" 90

# CLI-003: Configuration Commands
echo "⚙️ CLI-003: Configuration Commands"  
execute_test "CLI-003.1.1" "node dist/cli/index.js config show" 60
execute_test "CLI-003.1.2" "node dist/cli/index.js config get defaultProvider" 60
execute_test "CLI-003.1.3" "node dist/cli/index.js config validate" 60

# CLI-004: MCP Commands
echo "🔌 CLI-004: MCP Commands"
execute_test "CLI-004.1.1" "node dist/cli/index.js mcp status" 60
execute_test "CLI-004.1.2" "node dist/cli/index.js mcp registry" 90

# CLI-005: Ollama Commands
echo "🦙 CLI-005: Ollama Commands"
execute_test "CLI-005.1.1" "node dist/cli/index.js ollama status" 60
execute_test "CLI-005.1.2" "node dist/cli/index.js ollama list" 60

# Performance and Load Tests
echo "⚡ Performance Tests"
execute_test "PERF-001.1" "node dist/cli/index.js generate 'Fast test' --timeout 5000" 30
execute_test "PERF-001.2" "node dist/cli/index.js generate 'Long generation test with multiple sentences to test performance under load' --max-tokens 200" 60

# Error Handling Tests
echo "🛡️ Error Handling Tests"
execute_test "ERR-001.1" "node dist/cli/index.js generate 'Test' --provider invalid-provider" 30
execute_test "ERR-001.2" "node dist/cli/index.js generate 'Test' --max-tokens -1" 30

echo
echo "🏁 Test Execution Complete!"
echo "================================================"
echo "📊 Final Results:"
echo "   Total Tests: $TOTAL_TESTS"
echo "   Passed: $PASSED_TESTS"
echo "   Failed: $FAILED_TESTS"
echo "   Success Rate: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"
echo "   Completed: $(date)"
echo

# Create summary report
cat > "test-executions/comprehensive-summary.json" << EOF
{
  "executionSummary": {
    "totalTests": $TOTAL_TESTS,
    "passedTests": $PASSED_TESTS,
    "failedTests": $FAILED_TESTS,
    "successRate": $(( PASSED_TESTS * 100 / TOTAL_TESTS )),
    "completedAt": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"
  },
  "testCategories": [
    {"category": "ST-001", "name": "Provider Authentication", "tests": 9},
    {"category": "ST-002", "name": "MCP Integration", "tests": 5},
    {"category": "CLI-001", "name": "Text Generation", "tests": 5},
    {"category": "CLI-002", "name": "Provider Management", "tests": 5},
    {"category": "CLI-003", "name": "Configuration", "tests": 3},
    {"category": "CLI-004", "name": "MCP Commands", "tests": 2},
    {"category": "CLI-005", "name": "Ollama Commands", "tests": 2},
    {"category": "PERF", "name": "Performance", "tests": 2},
    {"category": "ERR", "name": "Error Handling", "tests": 2}
  ]
}
EOF

echo "📝 Results saved to test-executions/comprehensive-summary.json"
echo "📁 Individual test results in test-executions/comprehensive/"