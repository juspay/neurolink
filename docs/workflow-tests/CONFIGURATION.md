# Workflow Test Suite Configuration

This document details all configuration options for the workflow system test suite.

## Test Configuration Object

The test suite uses a central configuration object:

```typescript
const TEST_CONFIG = {
  provider: "vertex", // AI provider for AI-powered steps
  model: undefined, // Model override (uses provider default)
  timeout: 60000, // Test timeout in milliseconds
};
```

## Configuration Methods

### 1. CLI Arguments

Pass configuration via command line:

```bash
npx tsx test/continuous-test-suite-workflow.ts --provider=openai --model=gpt-4o
```

| Argument     | Format              | Description         |
| ------------ | ------------------- | ------------------- |
| `--provider` | `--provider=<name>` | AI provider name    |
| `--model`    | `--model=<name>`    | Model name override |

### 2. Environment Variables

Set before running tests:

```bash
export TEST_PROVIDER=anthropic
export TEST_MODEL=claude-sonnet-4-20250514
npx tsx test/continuous-test-suite-workflow.ts
```

| Variable        | Description      | Priority       |
| --------------- | ---------------- | -------------- |
| `TEST_PROVIDER` | Default provider | Lower than CLI |
| `TEST_MODEL`    | Default model    | Lower than CLI |

### 3. Code Modification

Edit `TEST_CONFIG` in the test file directly:

```typescript
const TEST_CONFIG = {
  provider: "openai",
  model: "gpt-4o-mini",
  timeout: 120000, // 2 minutes
};
```

## Provider Configuration

### Supported Providers

| Provider         | Value            | Required Env Vars      |
| ---------------- | ---------------- | ---------------------- |
| Google Vertex AI | `vertex`         | `GOOGLE_CLOUD_PROJECT` |
| Google AI Studio | `googleAiStudio` | `GOOGLE_AI_API_KEY`    |
| OpenAI           | `openai`         | `OPENAI_API_KEY`       |
| Anthropic        | `anthropic`      | `ANTHROPIC_API_KEY`    |
| Azure OpenAI     | `azure`          | `AZURE_OPENAI_*`       |
| AWS Bedrock      | `bedrock`        | AWS credentials        |
| Mistral          | `mistral`        | `MISTRAL_API_KEY`      |
| Ollama           | `ollama`         | Local Ollama server    |

### Provider-Specific Notes

#### Vertex AI (Default)

```bash
# Required
export GOOGLE_CLOUD_PROJECT=your-project-id
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json

# Or use gcloud auth
gcloud auth application-default login
```

#### OpenAI

```bash
export OPENAI_API_KEY=sk-...
export OPENAI_ORG_ID=org-...  # Optional
```

#### Anthropic

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

## Timeout Configuration

### Default Timeouts

| Component           | Default  | Environment Variable |
| ------------------- | -------- | -------------------- |
| Test timeout        | 60000ms  | N/A (code only)      |
| Workflow timeout    | 300000ms | N/A (code only)      |
| CLI command timeout | 60000ms  | N/A (code only)      |

### Adjusting Timeouts

For slow networks or complex workflows:

```typescript
const TEST_CONFIG = {
  provider: "vertex",
  model: undefined,
  timeout: 120000, // 2 minutes per test
};
```

## Workflow Fixtures

Test workflows are registered programmatically in `setupTestWorkflows()`:

| Workflow ID          | Description                    | Tags                |
| -------------------- | ------------------------------ | ------------------- |
| `simple-workflow`    | Linear workflow (double → add) | `test`, `simple`    |
| `branching-workflow` | Conditional branching          | `test`, `branching` |
| `parallel-workflow`  | Parallel task execution        | `test`, `parallel`  |
| `hitl-workflow`      | Human-in-the-loop              | `test`, `hitl`      |
| `loop-workflow`      | forEach iteration              | `test`, `loop`      |

### Adding Custom Test Workflows

Add to `setupTestWorkflows()`:

```typescript
const myWorkflow = createWorkflow("my-custom-workflow")
  .name("My Custom Workflow")
  .describe("Custom test workflow")
  .tag("test", "custom")
  .input(z.object({ ... }))
  .step("step-1", { execute: async (input) => ... })
  .register();
```

## Checkpoint Storage Configuration

### In-Memory (Default)

```typescript
const storage = new InMemoryCheckpointStorage();
const executor = new WorkflowExecutor(neurolink);
```

### Redis (Production)

```typescript
const storage = new RedisCheckpointStorage({
  host: "localhost",
  port: 6379,
  keyPrefix: "neurolink:workflow:",
});
```

## Logging Configuration

### Log Levels

The test suite uses color-coded logging:

| Color  | Function                  | Usage           |
| ------ | ------------------------- | --------------- |
| Cyan   | `logSection()`            | Section headers |
| Green  | `logTest(..., "PASS")`    | Passed tests    |
| Red    | `logTest(..., "FAIL")`    | Failed tests    |
| Yellow | `logTest(..., "TESTING")` | In-progress     |
| Blue   | `logTest(..., "SKIP")`    | Skipped tests   |

### Verbose Logging

Enable debug output:

```bash
DEBUG=neurolink:* npx tsx test/continuous-test-suite-workflow.ts
```

## Test Selection

### Running All Tests

```bash
npx tsx test/continuous-test-suite-workflow.ts
```

### Selective Testing

Modify `runAllTests()` to enable/disable test groups:

```typescript
async function runAllTests(): Promise<void> {
  // CLI Tests
  await testCLIWorkflowList();
  await testCLIWorkflowRun();
  // await testCLIWorkflowStatus();  // Disabled

  // SDK Tests
  await testSDKWorkflowBuilder();
  await testSDKWorkflowExecutor();
}
```

## Resource Cleanup

Tests automatically clean up:

- Registered test workflows (via `WorkflowRegistry.clear()`)
- In-memory checkpoints
- Spawned CLI processes (via timeout/kill)

For persistent storage (Redis), manual cleanup may be needed:

```bash
redis-cli KEYS "neurolink:workflow:*" | xargs redis-cli DEL
```
