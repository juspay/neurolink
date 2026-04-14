# Multi-Agent Networks Testing Guide

## Overview

This document provides comprehensive guidance for testing the Multi-Agent
Networks feature in NeuroLink.

## Prerequisites

### Environment Setup

1. **Node.js**: Ensure Node.js 18+ is installed
2. **pnpm**: Install pnpm package manager
3. **Dependencies**: Install project dependencies

```bash
# Install dependencies
pnpm install

# Build the project
pnpm run build
```

### Required Environment Variables

For integration tests with real providers, set the following:

```bash
# Provider API Keys (at least one required for integration tests)
export OPENAI_API_KEY="your-openai-key"
export ANTHROPIC_API_KEY="your-anthropic-key"
export GOOGLE_AI_STUDIO_API_KEY="your-google-ai-key"

# Test configuration
export TEST_PROVIDER="vertex"  # or openai, anthropic, etc.
export TEST_MODEL="gemini-2.0-flash"  # optional model override
export VERBOSE="true"  # enable debug logging
```

## Test Structure

The agent feature uses a single continuous test suite rather than individual
vitest unit test files.

### Continuous Test Suite

Located at `test/continuous-test-suite-agents.ts`:

- Self-contained TypeScript script run directly with `tsx`
- Covers all components: Agent, AgentNetwork, MessageBus, topologies
- Uses fixture files from `test/fixtures/agents/`
- Reports pass/fail per test case with timing

### Test Fixtures

Located in `test/fixtures/agents/`:

```
test/fixtures/agents/
├── agent-definitions.json   # Agent configurations
├── network-topologies.json  # Network topology configs
├── routing-rules.json       # Routing decision test cases
└── messages.json            # MessageBus test payloads
```

## Running Tests

### Run the Agent Test Suite

```bash
# Run the continuous integration test suite
npx tsx test/continuous-test-suite-agents.ts

# With verbose output
VERBOSE=true npx tsx test/continuous-test-suite-agents.ts

# With a specific provider
TEST_PROVIDER=openai npx tsx test/continuous-test-suite-agents.ts
```

### Run All NeuroLink Tests (includes agent suite)

```bash
pnpm test

# With coverage
pnpm run test:coverage
```

### Run in CI

```yaml
# Example GitHub Actions config
- name: Run Agent Tests
  run: npx tsx test/continuous-test-suite-agents.ts
  env:
    TEST_PROVIDER: vertex
    GOOGLE_CLOUD_PROJECT: ${{ secrets.GOOGLE_CLOUD_PROJECT }}
```

## Test Categories

### 1. Agent Class Tests

Tests for the core `Agent` class in `src/lib/agent/agent.ts`:

- Agent creation with various configurations
- `execute()` with string and object input
- `stream()` output
- Input/output validation with Zod schemas
- Error handling and status tracking
- Tool filtering (the `toolFilter` mechanism)

### 2. Network Topology Tests

Tests for network configurations:

- Hub-Spoke topology creation and execution
- Mesh topology peer-to-peer communication
- Hierarchical topology parent-child delegation
- `AgentCoordinator` strategies: `executeWithDependencies`, `roundRobin`,
  `leastBusy`

### 3. Routing Tests

Routing is performed by the AI SDK's generate loop (agents-as-tools pattern).
The router is a system prompt, not a separate class. Tests verify:

- Correct agent tool is selected for given input
- Routing completes with `finishReason: stop`
- `RouterConfig` fields (`provider`, `model`, `instructions`, `maxAttempts`,
  `confidenceThreshold`) take effect

### 4. MessageBus Tests

Tests for inter-agent communication:

- Publish/subscribe patterns
- Request-response patterns
- Broadcast messages
- Priority queue ordering
- Message delivery guarantees

## Writing New Tests

### Integration Test Pattern

All agent tests follow the continuous test suite pattern — not vitest `describe`
blocks. Add new tests by pushing results to the suite's result array:

```typescript
results.push(
  await runTest("Test name here", async () => {
    // Setup
    const fixture = loadFixture("agent-definitions.json");

    // Execute
    const result = await someOperation();

    // Assert
    assertEqual(result.status, "success", "Should succeed");
    assertDefined(result.data, "Should have data");
  }),
);
```

### Importing Agent in Tests

Use the correct import path — the module is singular and lowercase:

```typescript
import { Agent } from "../../src/lib/agent/agent.js";
import { NeuroLink } from "../../dist/index.js";
```

Do not use `../../src/lib/agents/Agent.js` (plural directory, capitalized file)
— that path does not exist.

### Mock SDK Creation

```typescript
function createMockSdk(options?: {
  generateResponse?: { content: string };
  streamChunks?: Array<{ content?: string }>;
  shouldFail?: boolean;
  errorMessage?: string;
}) {
  return {
    generate: async () => {
      if (options?.shouldFail) {
        throw new Error(options.errorMessage);
      }
      return { content: options?.generateResponse?.content ?? "Mock response" };
    },
    stream: async function* () {
      for (const chunk of options?.streamChunks ?? []) {
        yield chunk;
      }
    },
  };
}
```

## Debugging Tests

### Enable Verbose Logging

```bash
VERBOSE=true npx tsx test/continuous-test-suite-agents.ts
```

### Isolate a Single Test

Because the suite is a plain script, wrap the test in a standalone file or add
a name filter variable and short-circuit other tests:

```typescript
// Quick one-off in a scratch file
import { Agent } from "../src/lib/agent/agent.js";

const agent = new Agent(
  {
    id: "test",
    name: "Test",
    description: "Test agent",
    instructions: "You are a test agent.",
  },
  mockSdk as unknown as NeuroLink,
);

console.log(await agent.execute("hello"));
```

## Test Coverage Goals

| Component    | Target Coverage |
| ------------ | --------------- |
| Agent        | 90%             |
| AgentNetwork | 85%             |
| MessageBus   | 90%             |
| Topologies   | 80%             |

## Known Limitations

1. **Real Provider Tests**: Require API keys and may incur costs
2. **Streaming Tests**: May be sensitive to timing

## Troubleshooting

### Import Errors

Ensure the project is built before running the suite:

```bash
pnpm run build
npx tsx test/continuous-test-suite-agents.ts
```

### Tests Timing Out

Set a longer timeout via the environment, or check provider rate limits:

```bash
TEST_PROVIDER=openai OPENAI_API_KEY=sk-... npx tsx test/continuous-test-suite-agents.ts
```

## Related Documentation

- [CONFIGURATION.md](./CONFIGURATION.md) - Configuration options
- [VERIFICATION.md](./VERIFICATION.md) - Manual verification checklist
- [CLI-COVERAGE.md](./CLI-COVERAGE.md) - CLI coverage report
