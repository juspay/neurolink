# Workflow System Test Suite - How to Run

This document describes how to run the NeuroLink Workflow System integration test suite.

## Prerequisites

1. **Node.js 18+** installed
2. **pnpm** package manager
3. **Built CLI** - Run `pnpm run build:cli` first
4. **Environment configured** - API keys set up for your provider

## Quick Start

```bash
# From the worktree root
cd /path/to/feat/workflow-system

# Build the CLI first
pnpm run build:cli

# Run the workflow test suite
npx tsx test/continuous-test-suite-workflow.ts
```

## Command Line Options

| Option              | Description                      | Default          |
| ------------------- | -------------------------------- | ---------------- |
| `--provider=<name>` | AI provider for AI-powered steps | `vertex`         |
| `--model=<name>`    | Model override                   | Provider default |

### Examples

```bash
# Run with default settings (Vertex AI)
npx tsx test/continuous-test-suite-workflow.ts

# Run with OpenAI
npx tsx test/continuous-test-suite-workflow.ts --provider=openai

# Run with specific model
npx tsx test/continuous-test-suite-workflow.ts --provider=anthropic --model=claude-sonnet-4-20250514
```

## Test Categories

The test suite covers these categories:

### 1. CLI Tests

- `workflow list` - List registered workflows
- `workflow run <id>` - Execute a workflow
- `workflow status <runId>` - Check execution status
- `workflow checkpoints` - List checkpoints
- `workflow visualize <id>` - ASCII visualization
- `workflow info <id>` - Detailed workflow info
- `workflow cancel <runId>` - Cancel running workflow
- `workflow history <id>` - Execution history
- `workflow resume <checkpointId>` - Resume from checkpoint

### 2. SDK Tests

- WorkflowBuilder API
- WorkflowExecutor execution
- Parallel step execution
- Conditional branching
- Checkpoint creation and restoration
- HITL suspend/resume patterns
- WorkflowRegistry operations
- Event streaming

## Environment Variables

| Variable               | Description                               |
| ---------------------- | ----------------------------------------- |
| `TEST_PROVIDER`        | Default provider if not specified via CLI |
| `TEST_MODEL`           | Default model if not specified via CLI    |
| `GOOGLE_CLOUD_PROJECT` | Required for Vertex AI                    |
| `OPENAI_API_KEY`       | Required for OpenAI                       |
| `ANTHROPIC_API_KEY`    | Required for Anthropic                    |

## Test Output

Tests output colored results:

- ✅ **PASS** (green) - Test passed
- ❌ **FAIL** (red) - Test failed
- ⏭️ **SKIP** (blue) - Test skipped
- ⚠️ **TESTING** (yellow) - Test in progress

## Running Individual Test Categories

The test suite runs all tests by default. To run specific categories, modify the `runAllTests()` function in the test file.

## Troubleshooting

### Common Issues

1. **"CLI not found"** - Run `pnpm run build:cli` first
2. **"Workflow not found"** - Ensure `setupTestWorkflows()` runs before tests
3. **Timeout errors** - Increase `TEST_CONFIG.timeout` or check network
4. **Provider errors** - Verify API keys are set correctly

### Debug Mode

Set `DEBUG=neurolink:*` for verbose logging:

```bash
DEBUG=neurolink:* npx tsx test/continuous-test-suite-workflow.ts
```

## CI/CD Integration

For CI environments:

```yaml
# Example GitHub Actions step
- name: Run Workflow Tests
  run: |
    pnpm run build:cli
    npx tsx test/continuous-test-suite-workflow.ts --provider=openai
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

## Test Results Summary

At the end of execution, you'll see a summary:

```
============================================================
Test Results Summary
============================================================
Total tests:  24
Passed:       22
Failed:       1
Skipped:      1
Duration:     45.2s
============================================================
```

## Related Documentation

- [CONFIGURATION.md](./CONFIGURATION.md) - Test configuration options
- [VERIFICATION.md](./VERIFICATION.md) - What each test verifies
- [CLI-COVERAGE.md](./CLI-COVERAGE.md) - CLI command coverage matrix
