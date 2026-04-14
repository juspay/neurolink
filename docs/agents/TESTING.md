# Multi-Agent Networks Testing Guide

## Overview

This document provides comprehensive guidance for testing the Multi-Agent Networks feature in NeuroLink.

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

### Unit Tests (Vitest)

Located in `test/agents/`:

```
test/agents/
├── Agent.test.ts           # Core agent class tests
├── AgentFactory.test.ts    # Agent factory tests
├── AgentNetwork.test.ts    # Network orchestration tests
├── AgentRegistry.test.ts   # Registry pattern tests
├── RoutingAgent.test.ts    # LLM-based routing tests
├── communication/
│   ├── MessageBus.test.ts  # Pub/sub messaging tests
│   └── Protocol.test.ts    # Protocol handler tests
└── topologies/
    ├── HubSpokeTopology.test.ts
    ├── MeshTopology.test.ts
    └── HierarchicalTopology.test.ts
```

### Integration Tests

Located in `test/continuous-test-suite-agents.ts`:

- Comprehensive fixture-based testing
- Tests all components together
- Reports CLI coverage gaps

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

### Run All Unit Tests

```bash
# Run all tests
pnpm test

# Run only agent tests
pnpm test test/agents

# Run with coverage
pnpm test:coverage
```

### Run Specific Test Files

```bash
# Agent class tests
pnpm test test/agents/Agent.test.ts

# Network tests
pnpm test test/agents/AgentNetwork.test.ts

# Topology tests
pnpm test test/agents/topologies/
```

### Run Integration Test Suite

```bash
# Run the continuous integration test suite
npx tsx test/continuous-test-suite-agents.ts

# With verbose output
VERBOSE=true npx tsx test/continuous-test-suite-agents.ts

# With specific provider
TEST_PROVIDER=openai npx tsx test/continuous-test-suite-agents.ts
```

### Run Tests in Watch Mode

```bash
# Watch mode for development
pnpm test:watch

# Watch specific files
pnpm test:watch test/agents/Agent.test.ts
```

## Test Categories

### 1. Agent Class Tests

Tests for the core `Agent` class:

- Agent creation with various configurations
- Execute method with string and object input
- Streaming output
- Input/output validation with Zod schemas
- Error handling
- Status tracking

### 2. Network Topology Tests

Tests for network configurations:

- Hub-Spoke topology creation and execution
- Mesh topology peer-to-peer communication
- Hierarchical topology parent-child delegation
- Load balancing and failover

### 3. Routing Tests

Tests for the `RoutingAgent`:

- Semantic routing based on input
- Rule-based pattern matching
- Confidence scoring
- Fallback behavior

### 4. MessageBus Tests

Tests for inter-agent communication:

- Publish/subscribe patterns
- Request-response patterns
- Broadcast messages
- Priority queue ordering
- Message delivery guarantees

## Writing New Tests

### Unit Test Template

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Agent } from "../../src/lib/agents/Agent.js";

describe("Agent", () => {
  let mockSdk: ReturnType<typeof createMockSdk>;

  beforeEach(() => {
    mockSdk = createMockSdk();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create agent with basic definition", () => {
    const agent = new Agent(basicDefinition, mockSdk);
    expect(agent.id).toBe("test-agent");
  });
});
```

### Integration Test Template

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

## Mocking

### Mock SDK Creation

```typescript
function createMockSdk(options?: {
  generateResponse?: { content: string };
  streamChunks?: Array<{ content?: string }>;
  shouldFail?: boolean;
  errorMessage?: string;
}) {
  return {
    generate: vi.fn().mockImplementation(async () => {
      if (options?.shouldFail) {
        throw new Error(options.errorMessage);
      }
      return { content: options?.generateResponse?.content ?? "Mock" };
    }),
    stream: vi.fn().mockImplementation(async function* () {
      for (const chunk of options?.streamChunks ?? []) {
        yield chunk;
      }
    }),
  };
}
```

## Debugging Tests

### Enable Verbose Logging

```bash
VERBOSE=true pnpm test
```

### Run Single Test

```bash
pnpm test -t "should create agent"
```

### Debug Mode

```bash
node --inspect-brk node_modules/.bin/vitest run test/agents/Agent.test.ts
```

## Continuous Integration

The test suite is designed to run in CI environments:

```yaml
# Example GitHub Actions config
- name: Run Agent Tests
  run: |
    pnpm test test/agents/
    npx tsx test/continuous-test-suite-agents.ts
  env:
    TEST_PROVIDER: vertex
```

## Test Coverage Goals

| Component    | Target Coverage | Current Status |
| ------------ | --------------- | -------------- |
| Agent        | 90%             | ✅             |
| AgentNetwork | 85%             | ✅             |
| RoutingAgent | 85%             | ✅             |
| MessageBus   | 90%             | ✅             |
| Topologies   | 80%             | ✅             |

## Known Limitations

1. **No CLI Tests**: CLI commands for agents are not implemented (GAP)
2. **Real Provider Tests**: Require API keys and may have cost implications
3. **Streaming Tests**: May be flaky due to timing issues

## Troubleshooting

### Tests Timing Out

Increase timeout in vitest config or test:

```typescript
it("long running test", async () => {
  // test code
}, 30000); // 30 second timeout
```

### Import Errors

Ensure project is built:

```bash
pnpm run build
```

### Mock Not Working

Clear mocks between tests:

```typescript
afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});
```

## Related Documentation

- [CONFIGURATION.md](./CONFIGURATION.md) - Configuration options
- [VERIFICATION.md](./VERIFICATION.md) - Manual verification checklist
- [CLI-COVERAGE.md](./CLI-COVERAGE.md) - CLI coverage report
