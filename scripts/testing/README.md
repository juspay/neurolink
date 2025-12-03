# NeuroLink Testing Infrastructure

## Quick Start

Run from project root directory:

```bash
# Run comprehensive parallel tests (322 test cases)
node scripts/testing/executeAllTestsParallel.js

# Run fast subset
bash scripts/testing/fast-parallel-test-runner.sh

# Run sequential (safer for debugging)  
bash scripts/testing/sequential-comprehensiveTest.sh

# Run exhaustive parallel tests
bash scripts/testing/exhaustive-parallel-test-executor.sh
```

## Test Files

- **`test-definitions.txt`** - Main test definitions (322 test cases)
- **`executeAllTestsParallel.js`** - Main parallel test executor
- **`comprehensiveTest-suite.sh`** - Full test suite runner
- **`fast-parallel-test-runner.sh`** - Quick subset tests
- **`sequential-comprehensiveTest.sh`** - Sequential execution
- **`core-fixes-verification.sh`** - Core functionality verification

## Output

- **Results saved to**: `test-executions/comprehensive-parallel/`
- **Logs**: `comprehensiveTest-execution-full.log`
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