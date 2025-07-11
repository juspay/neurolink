# NeuroLink Testing Infrastructure

## Quick Start

Run from project root directory:

```bash
# Run comprehensive parallel tests (322 test cases)
node scripts/testing/execute-all-tests-parallel.js

# Run fast subset
bash scripts/testing/fast-parallel-test-runner.sh

# Run sequential (safer for debugging)  
bash scripts/testing/sequential-comprehensive-test.sh

# Run exhaustive parallel tests
bash scripts/testing/exhaustive-parallel-test-executor.sh
```

## Test Files

- **`test-definitions.txt`** - Main test definitions (322 test cases)
- **`execute-all-tests-parallel.js`** - Main parallel test executor
- **`comprehensive-test-suite.sh`** - Full test suite runner
- **`fast-parallel-test-runner.sh`** - Quick subset tests
- **`sequential-comprehensive-test.sh`** - Sequential execution
- **`core-fixes-verification.sh`** - Core functionality verification

## Output

- **Results saved to**: `test-executions/comprehensive-parallel/`
- **Logs**: `comprehensive-test-execution-full.log`
- **Tracker**: `TEST-EXECUTION-TRACKER.md`

## Test Definition Format

File: `test-definitions.txt`
Format: `TEST-ID:command:timeout`

Example:
```
CLI-002.1.1:node dist/cli/index.js provider status:300
ST-001.1.1:node dist/cli/index.js generate "test":60
```

## Features

- ✅ **Parallel execution** (10 concurrent tests)
- ✅ **Real-time progress tracking**
- ✅ **Comprehensive logging**
- ✅ **Timeout management**
- ✅ **Error capture**
- ✅ **Results persistence**

## Requirements

- Node.js environment
- Global `neurolink` command installed
- Valid `.env` configuration with provider API keys