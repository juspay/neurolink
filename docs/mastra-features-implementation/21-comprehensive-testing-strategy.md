# Comprehensive Testing Strategy for NeuroLink

## Executive Summary

This document defines the comprehensive testing strategy for NeuroLink, synthesizing lessons learned from the project's testing evolution, established testing patterns, and modern LLM evaluation research. It provides actionable guidance for maintaining high-quality, reliable AI-powered software through systematic testing practices.

---

## Table of Contents

1. [Testing Philosophy](#1-testing-philosophy)
2. [Test Organization](#2-test-organization)
3. [Mocking Strategies](#3-mocking-strategies)
4. [LLM Testing Patterns](#4-llm-testing-patterns)
5. [Integration Test Patterns](#5-integration-test-patterns)
6. [CI/CD Integration](#6-cicd-integration)
7. [Coverage Requirements](#7-coverage-requirements)
8. [Test Templates](#8-test-templates)
9. [Appendix: Quick Reference](#9-appendix-quick-reference)

---

## 1. Testing Philosophy

### 1.1 Core Principles

NeuroLink's testing philosophy has evolved through multiple phases, from no formal testing to a comprehensive Vitest-based framework. The following principles guide our approach:

#### Principle 1: Test-Driven Quality

- Tests document expected behavior
- Tests catch regressions before production
- Tests enable confident refactoring

#### Principle 2: Isolation with Integration

- Unit tests isolate components with mocked dependencies
- Integration tests validate real interactions
- E2E tests confirm complete workflows

#### Principle 3: Practical Coverage

- Focus on business-critical paths
- Balance thoroughness with maintenance burden
- Differentiate SDK (90%) vs CLI (85%) coverage targets

#### Principle 4: Sustainable Testing

- Tests should be fast and reliable
- Flaky tests are worse than no tests
- Test code requires the same quality as production code

### 1.2 Lessons from NeuroLink History

| Lesson                | Problem Encountered                                      | Solution Adopted                                        |
| --------------------- | -------------------------------------------------------- | ------------------------------------------------------- |
| Mock Reset Pitfall    | `vi.resetAllMocks()` resets implementations to undefined | Use `vi.clearAllMocks()` to only clear call history     |
| Module Reset Issues   | `vi.resetModules()` breaks dynamic imports               | Remove from global setup; use selectively               |
| Test Proliferation    | 65+ test files became unmanageable                       | Clean slate approach with clear structure               |
| Protected Methods     | Protected methods prevented testing                      | Change visibility to public for testable components     |
| Environment Pollution | Tests polluting global environment                       | Save/restore environment in beforeEach/afterEach        |
| CI Flakiness          | Tests failing randomly in CI                             | FFmpeg installation, proper timeouts, continue-on-error |

### 1.3 The vi.clearAllMocks vs vi.resetAllMocks Decision

**Critical Insight**: This is the most important mock management decision in Vitest.

```typescript
// WRONG - This breaks mock implementations
beforeEach(() => {
  vi.resetAllMocks(); // Resets implementations to return undefined!
  vi.resetModules(); // Breaks dynamic imports!
});

// CORRECT - Preserves implementations, clears call history
beforeEach(() => {
  // Clear mock call history before each test
  // Note: We use clearAllMocks() instead of resetAllMocks() because
  // resetAllMocks() also resets mock implementations to return undefined,
  // which would break mocks defined via vi.mock() that have custom implementations.
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks(); // Restore original implementations after test
});
```

**Behavior Comparison**:

| Method                 | Call History | Mock Implementation  | Module Cache                     |
| ---------------------- | ------------ | -------------------- | -------------------------------- |
| `vi.clearAllMocks()`   | Cleared      | Preserved            | Preserved                        |
| `vi.resetAllMocks()`   | Cleared      | Reset to undefined   | Preserved                        |
| `vi.restoreAllMocks()` | Cleared      | Restored to original | Preserved                        |
| `vi.resetModules()`    | N/A          | N/A                  | Cleared (breaks dynamic imports) |

---

## 2. Test Organization

### 2.1 Directory Structure

```
test/
├── setup.ts                    # Global test setup and mock configuration
├── types/
│   ├── global.ts              # Global type definitions for tests
│   └── mcp.ts                 # MCP-specific test types
├── fixtures/                   # Test data and fixtures
│   ├── basic.csv
│   ├── large.csv
│   ├── valid-sample.pdf
│   ├── extensionless-csv-1    # Extension-less files for edge case testing
│   ├── extensionless-json-1
│   └── zod-sample.ts          # Complex Zod schemas for testing
├── unit/                       # Unit tests organized by feature
│   ├── action/                # GitHub Action executor tests
│   ├── cache/                 # Prompt caching tests
│   ├── cli/                   # CLI command tests
│   ├── mcp/                   # MCP-related unit tests
│   ├── models/                # Model-specific tests
│   ├── multimodal/            # Image/PDF/CSV processing tests
│   ├── providers/             # Provider factory tests
│   ├── stream/                # Streaming tests
│   ├── thinking/              # Extended thinking configuration tests
│   ├── types/                 # Type validation tests
│   └── utils/                 # Utility function tests
├── integration/                # Integration tests with real servers
│   ├── mcp/
│   │   ├── httpTransportIntegration.test.ts
│   │   └── realHttpServers.test.ts
│   └── openrouter.test.ts
├── sdk/                        # SDK-specific tests
│   └── mcp/
│       └── httpTransportSdk.test.ts
├── multimodal/                 # Full multimodal pipeline tests
│   └── image-generation.test.ts
├── continuous-test-suite.ts    # Comprehensive E2E test suite (legacy)
├── global-endpoint-tests.ts    # Provider endpoint tests
└── TESTING_SCRIPTS.md          # Testing documentation
```

### 2.2 Test Categories

| Category        | Location            | Purpose                  | Timeout  | Dependencies  |
| --------------- | ------------------- | ------------------------ | -------- | ------------- |
| **Unit**        | `test/unit/`        | Isolated component tests | < 100ms  | All mocked    |
| **Integration** | `test/integration/` | Real connection tests    | 30-60s   | Mock servers  |
| **SDK**         | `test/sdk/`         | Programmatic API tests   | Variable | Partial mocks |
| **E2E**         | `test/multimodal/`  | Complete workflows       | 60-180s  | Real APIs     |

### 2.3 File Naming Conventions

```
# Unit tests
*.test.ts           # Standard test file
*.spec.ts           # Alternative (equivalent)

# Integration tests
*.integration.test.ts  # Clear integration marker

# E2E tests
*.e2e.test.ts       # End-to-end marker
```

### 2.4 Test Documentation Standards

Every test file should include:

```typescript
/**
 * [Component Name] Tests
 *
 * Tests for [description of what's being tested]:
 * - Feature 1 behavior
 * - Feature 2 behavior
 * - Error handling
 * - Edge cases
 *
 * @coverage Target: 90%
 * @dependencies [list mocked dependencies]
 */

// At end of file:
/**
 * Test Coverage Summary
 * - Feature 1: X tests
 * - Feature 2: Y tests
 * - Error cases: Z tests
 * - Total: N tests
 */
```

---

## 3. Mocking Strategies

### 3.1 Global Mock Setup

**File:** `test/setup.ts`

```typescript
import { vi, beforeEach, afterEach } from "vitest";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import "./types/global";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env.test") });

// Global test setup
beforeEach(() => {
  // Clear mock call history before each test
  // IMPORTANT: Use clearAllMocks(), NOT resetAllMocks()
  vi.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
  vi.restoreAllMocks();
});

// Mock AI SDK providers (global)
vi.mock("ai", () => ({
  stream: vi.fn(),
  generate: vi.fn(),
  tool: vi.fn((config) => ({
    description: config.description || "",
    parameters: config.parameters || {},
    execute: config.execute || vi.fn(),
  })),
  jsonSchema: vi.fn((schema) => schema),
  wrapLanguageModel: vi.fn((model) => model),
  Output: { object: vi.fn() },
  NoObjectGeneratedError: class NoObjectGeneratedError extends Error {
    constructor(message?: string) {
      super(message || "No object generated");
      this.name = "NoObjectGeneratedError";
    }
  },
}));

// Mock all AI providers
vi.mock("@ai-sdk/openai", () => ({ openai: vi.fn() }));
vi.mock("@ai-sdk/anthropic", () => ({ anthropic: vi.fn() }));
vi.mock("@ai-sdk/google", () => ({ google: vi.fn() }));
vi.mock("@ai-sdk/google-vertex", () => ({ vertex: vi.fn() }));
vi.mock("@ai-sdk/azure", () => ({ azure: vi.fn() }));
vi.mock("@ai-sdk/mistral", () => ({ mistral: vi.fn() }));

// Mock AWS Bedrock SDK
vi.mock("@aws-sdk/client-bedrock-runtime", () => ({
  BedrockRuntimeClient: vi.fn(),
  InvokeModelCommand: vi.fn(),
}));

// Mock external services
vi.mock("redis", () => ({
  createClient: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
  })),
}));

// Global test utilities
global.TestConfig = {
  timeout: 30000,
  providers: ["openai", "anthropic", "google-ai", "bedrock"],
  mockResponses: true,
};
```

### 3.2 Mock Patterns by Type

#### Logger Mocking (Standard Pattern)

```typescript
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));
```

#### External SDK Mocking with Partial Implementation

```typescript
// Mock with partial implementation preservation
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual, // Keep original implementations
    streamText: vi.fn(), // Override specific functions
    Output: {
      object: vi.fn((config) => config),
    },
  };
});
```

#### Provider SDK Mocking

```typescript
vi.mock("@openrouter/ai-sdk-provider", () => ({
  createOpenRouter: (_config) => {
    return (modelName: string) => ({
      modelName,
      provider: "openrouter",
      doStream: () => Promise.resolve({}),
      doGenerate: () => Promise.resolve({}),
    });
  },
}));
```

#### File System Mocking

```typescript
vi.mock("fs", () => ({
  writeFileSync: vi.fn(),
  existsSync: vi.fn().mockReturnValue(true),
  unlinkSync: vi.fn(),
  readFileSync: vi.fn().mockReturnValue("mock content"),
}));
```

#### Timer Mocking (for Rate Limiters)

```typescript
describe("Rate Limiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should refill tokens over time", () => {
    const limiter = new TokenBucketRateLimiter({
      maxTokens: 10,
      refillRate: 1,
      refillIntervalMs: 1000,
      initialTokens: 5,
    });

    vi.advanceTimersByTime(3000);
    expect(limiter.getAvailableTokens()).toBe(8);
  });
});
```

#### Environment Variable Mocking

```typescript
describe("Provider Initialization", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should initialize with API key", () => {
    process.env.OPENROUTER_API_KEY = "test-api-key-123";
    const provider = new OpenRouterProvider();
    expect(provider).toBeDefined();
  });

  it("should throw without API key", () => {
    delete process.env.OPENROUTER_API_KEY;
    expect(() => new OpenRouterProvider()).toThrow(/API_KEY.*required/);
  });
});
```

### 3.3 Mock Anti-Patterns

| Anti-Pattern                        | Problem                     | Solution                        |
| ----------------------------------- | --------------------------- | ------------------------------- |
| Using `vi.resetAllMocks()` globally | Breaks mock implementations | Use `vi.clearAllMocks()`        |
| Using `vi.resetModules()` globally  | Breaks dynamic imports      | Remove or use selectively       |
| Over-mocking                        | Tests don't reflect reality | Mock only external dependencies |
| Under-mocking                       | Tests are slow/flaky        | Mock network calls and timers   |
| Shared mutable mock state           | Tests interfere             | Reset state in beforeEach       |

---

## 4. LLM Testing Patterns

### 4.1 LLM Evaluation Metrics Integration

Based on research into RAGAS, DeepEval, and production evaluation pipelines, NeuroLink should implement the following evaluation capabilities:

#### Core Evaluation Metrics

| Metric                  | Description                 | Use Case          | Implementation      |
| ----------------------- | --------------------------- | ----------------- | ------------------- |
| **Faithfulness**        | Output grounded in context  | RAG pipelines     | QAG or LLM-as-judge |
| **Answer Relevancy**    | Response addresses question | All generation    | LLM-as-judge        |
| **Toxicity**            | Content safety              | All outputs       | Classifier or API   |
| **Factual Correctness** | Accuracy of claims          | Knowledge tasks   | Fact verification   |
| **Coherence**           | Logical flow                | Long-form content | G-Eval custom       |

#### Evaluation Test Pattern

```typescript
import { describe, it, expect } from "vitest";
import { EvaluationPipeline } from "../../../src/lib/evaluation/pipeline.js";

describe("LLM Output Evaluation", () => {
  const evaluator = new EvaluationPipeline();

  describe("Faithfulness Evaluation", () => {
    it("should score high for grounded responses", async () => {
      const context = "Paris is the capital of France.";
      const response = "The capital of France is Paris.";

      const score = await evaluator.evaluateFaithfulness(response, context);

      expect(score.value).toBeGreaterThan(0.8);
      expect(score.reasoning).toBeDefined();
    });

    it("should score low for hallucinated responses", async () => {
      const context = "Paris is the capital of France.";
      const response = "The capital of France is London.";

      const score = await evaluator.evaluateFaithfulness(response, context);

      expect(score.value).toBeLessThan(0.5);
    });
  });

  describe("Toxicity Detection", () => {
    it("should flag toxic content", async () => {
      const toxicResponse = "You are an idiot!";

      const score = await evaluator.evaluateToxicity(toxicResponse);

      expect(score.isToxic).toBe(true);
      expect(score.confidence).toBeGreaterThan(0.7);
    });

    it("should pass clean content", async () => {
      const cleanResponse = "Thank you for your question.";

      const score = await evaluator.evaluateToxicity(cleanResponse);

      expect(score.isToxic).toBe(false);
    });
  });
});
```

### 4.2 LLM-as-Judge Testing Pattern

```typescript
import { describe, it, expect, vi } from "vitest";

// Mock the evaluation LLM
vi.mock("../../../src/lib/evaluation/llmJudge.js", () => ({
  LLMJudge: {
    evaluate: vi.fn().mockResolvedValue({
      score: 0.85,
      reasoning: "Response is relevant and accurate",
      criteria: {
        relevancy: 0.9,
        accuracy: 0.8,
        completeness: 0.85,
      },
    }),
  },
}));

describe("LLM-as-Judge Evaluation", () => {
  it("should evaluate response quality", async () => {
    const { LLMJudge } = await import(
      "../../../src/lib/evaluation/llmJudge.js"
    );

    const result = await LLMJudge.evaluate({
      question: "What is machine learning?",
      response: "Machine learning is a subset of AI...",
      criteria: ["relevancy", "accuracy", "completeness"],
    });

    expect(result.score).toBeGreaterThan(0.7);
    expect(result.criteria.relevancy).toBeDefined();
  });
});
```

### 4.3 Hallucination Detection Testing

```typescript
describe("Hallucination Detection", () => {
  describe("Semantic Entropy Method", () => {
    it("should detect high uncertainty responses", async () => {
      const responses = [
        "The answer is 42",
        "The answer is 24",
        "The answer could be many things",
      ];

      const entropy = calculateSemanticEntropy(responses);

      expect(entropy).toBeGreaterThan(0.5); // High entropy = uncertainty
    });
  });

  describe("Fact Verification Method", () => {
    it("should verify factual claims against knowledge base", async () => {
      const response = "Albert Einstein was born in 1879 in Germany.";
      const knowledgeBase = loadKnowledgeBase();

      const verification = await verifyFacts(response, knowledgeBase);

      expect(verification.claims).toHaveLength(2);
      expect(verification.verified).toBe(2);
      expect(verification.hallucinated).toBe(0);
    });
  });
});
```

### 4.4 RAG Pipeline Testing

```typescript
describe("RAG Pipeline Evaluation", () => {
  describe("Context Precision", () => {
    it("should rank relevant chunks higher", async () => {
      const query = "What is the capital of France?";
      const retrievedChunks = [
        { content: "Paris is the capital of France", relevance: 0.95 },
        { content: "France is in Europe", relevance: 0.6 },
        { content: "Paris has the Eiffel Tower", relevance: 0.7 },
      ];

      const precision = evaluateContextPrecision(retrievedChunks, query);

      expect(precision).toBeGreaterThan(0.8);
    });
  });

  describe("Context Recall", () => {
    it("should retrieve all relevant information", async () => {
      const groundTruth = ["Paris is the capital", "France is in Europe"];
      const retrieved = ["Paris is the capital of France"];

      const recall = evaluateContextRecall(retrieved, groundTruth);

      expect(recall).toBe(0.5); // Only 1 of 2 facts retrieved
    });
  });
});
```

---

## 5. Integration Test Patterns

### 5.1 Mock HTTP Server Pattern

```typescript
import { createServer, IncomingMessage, ServerResponse } from "http";
import type { Server } from "http";

type MockServerConfig = {
  port: number;
  responseDelay?: number;
  statusCode?: number;
  customResponse?: Record<string, unknown>;
  failCount?: number;
};

const createMockMCPServer = (
  config: Partial<MockServerConfig> = {},
): Promise<{ server: Server; url: string }> => {
  return new Promise((resolve) => {
    let failureCount = 0;

    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      let body = "";

      req.on("data", (chunk) => {
        body += chunk.toString();
      });

      req.on("end", () => {
        const respond = () => {
          // Simulate failures
          if (config.failCount && failureCount < config.failCount) {
            failureCount++;
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Simulated failure" }));
            return;
          }

          if (req.method === "POST") {
            try {
              const request = JSON.parse(body);

              // Handle MCP methods
              if (request.method === "initialize") {
                res.writeHead(config.statusCode || 200, {
                  "Content-Type": "application/json",
                });
                res.end(
                  JSON.stringify({
                    jsonrpc: "2.0",
                    id: request.id,
                    result: {
                      protocolVersion: "2024-11-05",
                      capabilities: { tools: {}, resources: {} },
                      serverInfo: { name: "mock-server", version: "1.0.0" },
                    },
                  }),
                );
              } else if (request.method === "tools/list") {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    jsonrpc: "2.0",
                    id: request.id,
                    result: {
                      tools: config.customResponse?.tools || [
                        {
                          name: "test_tool",
                          description: "Test tool",
                          inputSchema: {
                            type: "object",
                            properties: { input: { type: "string" } },
                          },
                        },
                      ],
                    },
                  }),
                );
              }
            } catch {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  jsonrpc: "2.0",
                  error: { code: -32700, message: "Parse error" },
                }),
              );
            }
          }
        };

        if (config.responseDelay) {
          setTimeout(respond, config.responseDelay);
        } else {
          respond();
        }
      });
    });

    server.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === "object") {
        resolve({ server, url: `http://localhost:${addr.port}` });
      }
    });
  });
};
```

### 5.2 Provider Integration Test Pattern

```typescript
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";

// Mock logger only (keep real implementations for integration)
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("Provider Integration Tests", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    // Setup that runs once for all tests
  });

  afterAll(() => {
    // Cleanup that runs once after all tests
  });

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // 1. Initialization Tests
  describe("Provider Initialization", () => {
    it("should initialize with valid API key", () => {
      process.env.PROVIDER_API_KEY = "test-key";
      const provider = new ProviderClass();
      expect(provider).toBeDefined();
    });

    it("should throw without API key", () => {
      delete process.env.PROVIDER_API_KEY;
      expect(() => new ProviderClass()).toThrow(/API_KEY.*required/);
    });
  });

  // 2. Capability Tests
  describe("Provider Capabilities", () => {
    it("should report tool support correctly", () => {
      process.env.PROVIDER_API_KEY = "test-key";
      const provider = new ProviderClass();
      expect(provider.supportsTools()).toBe(true);
    });
  });

  // 3. Error Handling Tests
  describe("Error Handling", () => {
    it("should handle rate limit error", () => {
      process.env.PROVIDER_API_KEY = "test-key";
      const provider = new ProviderClass();
      const error = new Error("rate limit exceeded");
      const handled = provider.handleProviderError(error);
      expect(handled.message).toContain("rate limit");
    });
  });
});
```

### 5.3 MCP Transport Integration Pattern

```typescript
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import { createServer } from "http";
import type { Server } from "http";

vi.mock("../../../src/lib/utils/logger.js", () => ({
  mcpLogger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("MCP HTTP Transport Integration", () => {
  let mockServer: Server;
  let serverUrl: string;
  let requestCount: number;
  let capturedRequests: Array<{ method: string; body: string }>;

  beforeAll(async () => {
    const result = await createMockMCPServer();
    mockServer = result.server;
    serverUrl = result.url;
  });

  beforeEach(() => {
    requestCount = 0;
    capturedRequests = [];
    vi.clearAllMocks();
  });

  afterAll(() => {
    if (mockServer) {
      mockServer.close();
    }
  });

  describe("Connection Handling", () => {
    it("should connect successfully to HTTP server", async () => {
      const client = await MCPClientFactory.createClient({
        transport: "http",
        url: serverUrl,
      });

      expect(client).toBeDefined();
      expect(client.isConnected()).toBe(true);
    });

    it("should handle connection timeout", async () => {
      await expect(
        MCPClientFactory.createClient({
          transport: "http",
          url: "http://localhost:1", // Non-existent server
          timeout: 1000,
        }),
      ).rejects.toThrow(/timeout|ECONNREFUSED/i);
    }, 10000);
  });

  describe("Retry Behavior", () => {
    it("should retry on transient failures", async () => {
      const { server: failServer, url: failUrl } = await createMockMCPServer({
        failCount: 2, // Fail twice, then succeed
      });

      try {
        const client = await MCPClientFactory.createClient({
          transport: "http",
          url: failUrl,
          retries: 3,
        });

        expect(client).toBeDefined();
      } finally {
        failServer.close();
      }
    });
  });
});
```

---

## 6. CI/CD Integration

### 6.1 GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, release]
  pull_request:
    branches: [main, release]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup PNPM
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: "pnpm"

      - name: Install ffmpeg (for video tests)
        uses: AnimMouse/setup-ffmpeg@v1

      - name: Install dependencies
        run: pnpm install

      - name: SvelteKit Sync
        run: pnpm exec svelte-kit sync

      - name: Check code formatting
        run: pnpm run format:check

      - name: Run linting
        run: |
          npx eslint src/ --max-warnings=300
          npx eslint test/ --max-warnings=10

      - name: Build package
        run: pnpm run build

      - name: Run unit tests
        run: pnpm run test:run

      - name: Run integration tests
        run: pnpm run test:integration
        continue-on-error: true

  coverage:
    runs-on: ubuntu-latest
    needs: test

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup PNPM
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install

      - name: Run coverage
        run: pnpm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: false
```

### 6.2 Package.json Test Scripts

```json
{
  "scripts": {
    "// Testing (Enhanced Vitest Framework)": "",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:providers": "vitest run test/unit/providers",
    "test:cli": "vitest run test/unit/cli",
    "test:sdk": "vitest run test/sdk",
    "test:integration": "vitest run test/integration",
    "test:e2e": "vitest run test/multimodal",
    "test:ci": "vitest run --coverage --reporter=junit --reporter=verbose",
    "test:debug": "vitest --inspect-brk",
    "test:smart": "vitest run --changed",
    "// Legacy Testing Support": "",
    "test:legacy": "npx tsx test/continuous-test-suite.ts"
  }
}
```

### 6.3 Pre-commit Hooks

```yaml
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run type checking
pnpm run check

# Run linting
pnpm run lint

# Run unit tests for changed files
pnpm run test:smart
```

### 6.4 CI/CD Best Practices

| Practice            | Implementation       | Benefit             |
| ------------------- | -------------------- | ------------------- |
| Parallel execution  | `maxConcurrency: 10` | Faster CI runs      |
| Cache dependencies  | `cache: "pnpm"`      | Faster installs     |
| System dependencies | `setup-ffmpeg`       | Video test support  |
| Coverage gating     | Thresholds in config | Quality enforcement |
| Fail-fast disabled  | `continue-on-error`  | See all failures    |
| Test isolation      | Fresh env per test   | Reliable results    |

---

## 7. Coverage Requirements

### 7.1 Coverage Thresholds

```typescript
// vitest.config.ts
coverage: {
  provider: "v8",
  reporter: ["text", "json", "html", "lcov"],
  include: ["src/lib/**/*", "src/cli/**/*"],
  exclude: ["src/test/**/*", "node_modules/", "dist/", "**/*.d.ts"],
  thresholds: {
    // SDK core: highest standard
    "src/lib/**/*": {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    // CLI: slightly lower (more edge cases)
    "src/cli/**/*": {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    // Global minimum
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
}
```

### 7.2 Coverage by Feature Area

| Feature Area        | Target | Priority | Rationale                     |
| ------------------- | ------ | -------- | ----------------------------- |
| **Core SDK**        | 90%    | Critical | Business logic, API contracts |
| **Providers**       | 90%    | Critical | Provider interactions         |
| **MCP Integration** | 85%    | High     | Tool ecosystem                |
| **CLI Commands**    | 85%    | Medium   | User-facing interface         |
| **Utilities**       | 90%    | High     | Shared functionality          |
| **Type Validation** | 95%    | Critical | Type safety                   |
| **Error Handling**  | 90%    | High     | Failure scenarios             |

### 7.3 Coverage Exclusions

```typescript
// Files that don't need full coverage:
exclude: [
  "src/test/**/*", // Test helpers
  "node_modules/", // Dependencies
  "dist/", // Build output
  "**/*.d.ts", // Type declarations
  "**/index.ts", // Re-exports only
  "**/*.config.ts", // Configuration files
  "test/continuous-test-suite.ts", // Legacy E2E
];
```

### 7.4 Running Coverage Analysis

```bash
# Generate coverage report
pnpm run test:coverage

# View HTML report
open coverage/index.html

# Check thresholds only
pnpm run test:coverage -- --passWithNoTests
```

---

## 8. Test Templates

### 8.1 Unit Test Template

```typescript
/**
 * [Component Name] Unit Tests
 *
 * Tests for [description of what's being tested]:
 * - [Feature 1]
 * - [Feature 2]
 * - Error handling
 * - Edge cases
 *
 * @coverage Target: 90%
 * @dependencies logger, [other mocked deps]
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ComponentUnderTest } from "../../../src/lib/path/to/component.js";

// Mock dependencies BEFORE imports
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ComponentUnderTest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("methodName", () => {
    it("should [expected behavior]", async () => {
      // Arrange
      const input = { key: "value" };

      // Act
      const result = await ComponentUnderTest.methodName(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.property).toBe("expected");
    });

    it("should handle [edge case]", async () => {
      // Test edge case
      const edgeInput = { key: null };

      const result = await ComponentUnderTest.methodName(edgeInput);

      expect(result.property).toBe("default");
    });

    it("should throw error when [error condition]", async () => {
      const invalidInput = { key: "invalid" };

      await expect(ComponentUnderTest.methodName(invalidInput)).rejects.toThrow(
        /expected error pattern/,
      );
    });
  });
});

/**
 * Test Coverage Summary
 * - methodName: 3 tests (happy path, edge case, error)
 * - Total: 3 tests
 */
```

### 8.2 Provider Test Template

```typescript
/**
 * [Provider Name] Provider Integration Tests
 *
 * Tests:
 * 1. Provider initialization with valid API key
 * 2. Provider throws error when API key missing
 * 3. Basic text generation
 * 4. Streaming response
 * 5. Tool calling support check
 * 6. Error handling for invalid API key
 * 7. Model discovery returns models
 * 8. getProviderName returns correct value
 * 9. Default model configuration
 * 10. Provider configuration and metadata
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mocks MUST be before imports
vi.mock("@provider/sdk", () => ({
  createProvider: vi.fn(() => (model: string) => ({
    model,
    provider: "provider-name",
  })),
}));

vi.mock("../../src/lib/utils/logger.js", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Import AFTER mocks are defined
import { ProviderClass } from "../../src/lib/providers/provider.js";

describe("ProviderClass Integration Tests", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // 1. Initialization Tests
  describe("Provider Initialization", () => {
    it("should initialize with valid API key", () => {
      process.env.PROVIDER_API_KEY = "test-key";
      const provider = new ProviderClass();
      expect(provider).toBeDefined();
    });

    it("should throw without API key", () => {
      delete process.env.PROVIDER_API_KEY;
      expect(() => new ProviderClass()).toThrow(/API_KEY.*required/);
    });

    it("should initialize with custom model", () => {
      process.env.PROVIDER_API_KEY = "test-key";
      const provider = new ProviderClass("custom-model");
      expect(provider.getDefaultModel()).toBe("custom-model");
    });
  });

  // 2. Capability Tests
  describe("Provider Capabilities", () => {
    it("should report tool support correctly", () => {
      process.env.PROVIDER_API_KEY = "test-key";
      const provider = new ProviderClass();
      expect(provider.supportsTools()).toBe(true);
    });

    it("should return available models", async () => {
      process.env.PROVIDER_API_KEY = "test-key";
      const provider = new ProviderClass();
      const models = await provider.getAvailableModels();
      expect(models).toBeDefined();
      expect(Array.isArray(models)).toBe(true);
    });
  });

  // 3. Error Handling Tests
  describe("Error Handling", () => {
    it("should handle invalid API key error", () => {
      process.env.PROVIDER_API_KEY = "test-key";
      const provider = new ProviderClass();
      const error = new Error("Invalid API key");
      const handled = provider.handleProviderError(error);
      expect(handled.message).toContain("Invalid");
    });

    it("should handle rate limit error", () => {
      process.env.PROVIDER_API_KEY = "test-key";
      const provider = new ProviderClass();
      const error = new Error("rate limit exceeded");
      const handled = provider.handleProviderError(error);
      expect(handled.message).toContain("rate limit");
    });

    it("should handle network errors", () => {
      process.env.PROVIDER_API_KEY = "test-key";
      const provider = new ProviderClass();
      const error = new Error("ECONNREFUSED");
      const handled = provider.handleProviderError(error);
      expect(handled.message).toMatch(/network|connection/i);
    });
  });

  // 4. Configuration Tests
  describe("Configuration", () => {
    it("should use environment variable for model", () => {
      process.env.PROVIDER_API_KEY = "test-key";
      process.env.PROVIDER_MODEL = "specific-model";
      const provider = new ProviderClass();
      expect(provider.getDefaultModel()).toBe("specific-model");
    });

    it("should return correct provider name", () => {
      process.env.PROVIDER_API_KEY = "test-key";
      const provider = new ProviderClass();
      expect(provider.getProviderName()).toBe("provider-name");
    });
  });
});

/**
 * Test Coverage Summary
 * - Provider Initialization: 3 tests
 * - Provider Capabilities: 2 tests
 * - Error Handling: 3 tests
 * - Configuration: 2 tests
 * - Total: 10 tests across 4 test suites
 */
```

### 8.3 Integration Test Template

```typescript
/**
 * [Feature Name] Integration Tests
 *
 * Tests [feature] with real/mock external services:
 * - Connection handling
 * - Request/response flow
 * - Error recovery
 * - Retry behavior
 *
 * @timeout 30000
 * @dependencies Mock HTTP server
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import { createServer } from "http";
import type { Server } from "http";

// Mock logger only (keep real implementations for integration)
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("Feature Integration Tests", () => {
  let mockServer: Server;
  let serverUrl: string;

  // Server setup helper
  const createMockServer = (): Promise<{ server: Server; url: string }> => {
    return new Promise((resolve) => {
      const server = createServer((req, res) => {
        // Handle requests
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      });

      server.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === "object") {
          resolve({ server, url: `http://localhost:${addr.port}` });
        }
      });
    });
  };

  beforeAll(async () => {
    const result = await createMockServer();
    mockServer = result.server;
    serverUrl = result.url;
  });

  afterAll(() => {
    if (mockServer) {
      mockServer.close();
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Connection Handling", () => {
    it("should connect successfully", async () => {
      const client = await createClient({ url: serverUrl });
      expect(client.isConnected()).toBe(true);
    });

    it("should handle connection timeout", async () => {
      await expect(
        createClient({ url: "http://localhost:1", timeout: 1000 }),
      ).rejects.toThrow(/timeout|ECONNREFUSED/i);
    }, 10000); // Extended timeout for slow operations
  });

  describe("Request/Response Flow", () => {
    it("should send and receive data", async () => {
      const client = await createClient({ url: serverUrl });
      const response = await client.request({ data: "test" });
      expect(response.success).toBe(true);
    });
  });

  describe("Error Recovery", () => {
    it("should retry on transient failures", async () => {
      // Test retry logic
    });

    it("should give up after max retries", async () => {
      // Test failure after retries exhausted
    });
  });
});

/**
 * Test Coverage Summary
 * - Connection Handling: 2 tests
 * - Request/Response Flow: 1 test
 * - Error Recovery: 2 tests
 * - Total: 5 tests
 */
```

### 8.4 MCP Tool Test Template

```typescript
/**
 * MCP Server Configuration Tests
 *
 * Tests:
 * - Transport configuration validation
 * - HTTP/stdio/SSE/WebSocket transports
 * - Header and authentication handling
 * - Error scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ExternalServerManager } from "../../../src/lib/mcp/externalServerManager.js";
import type { MCPServerInfo } from "../../../src/lib/types/mcpTypes.js";

// Mock dependencies
vi.mock("../../../src/lib/utils/logger.js", () => ({
  mcpLogger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../../../src/lib/mcp/mcpCircuitBreaker.js", () => ({
  globalCircuitBreakerManager: {
    getBreaker: vi.fn(() => ({
      execute: vi.fn((fn) => fn()),
      getState: vi.fn(() => "closed"),
    })),
  },
}));

describe("MCP Server Configuration Tests", () => {
  let manager: ExternalServerManager;

  beforeEach(() => {
    manager = new ExternalServerManager({
      maxServers: 10,
      defaultTimeout: 5000,
    });
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await manager.shutdown();
  });

  describe("HTTP Transport Configuration", () => {
    it("should validate HTTP config with URL", () => {
      const config: MCPServerInfo = {
        id: "http-server",
        name: "http-server",
        description: "HTTP MCP Server",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "https://api.example.com/mcp",
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should reject HTTP transport without URL", () => {
      const config: MCPServerInfo = {
        id: "http-no-url",
        name: "http-no-url",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        // Missing URL
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("URL is required for http transport");
    });

    it("should accept HTTP config with headers", () => {
      const config: MCPServerInfo = {
        id: "github-copilot",
        name: "github-copilot",
        transport: "http",
        status: "initializing",
        tools: [],
        command: "",
        url: "https://api.githubcopilot.com/mcp",
        headers: {
          Authorization: "Bearer token",
          "X-API-Version": "2024-11-01",
        },
      };

      const validation = manager.validateConfig(config);
      expect(validation.isValid).toBe(true);
    });
  });

  describe("Transport Comparison", () => {
    it.each(["http", "sse", "websocket"])(
      "should require URL for %s transport",
      (transport) => {
        const configWithUrl: Partial<MCPServerInfo> = {
          id: `${transport}-with-url`,
          transport: transport as MCPServerInfo["transport"],
          url: "https://example.com",
        };

        const configWithoutUrl: Partial<MCPServerInfo> = {
          id: `${transport}-without-url`,
          transport: transport as MCPServerInfo["transport"],
        };

        expect(
          manager.validateConfig(configWithUrl as MCPServerInfo).isValid,
        ).toBe(true);
        expect(
          manager.validateConfig(configWithoutUrl as MCPServerInfo).isValid,
        ).toBe(false);
      },
    );
  });
});

/**
 * Test Coverage Summary
 * - HTTP Transport Configuration: 3 tests
 * - Transport Comparison: 3 parameterized tests
 * - Total: 6 tests
 */
```

### 8.5 E2E Test Template

```typescript
/**
 * [Feature Name] E2E Tests
 *
 * End-to-end tests using real providers:
 * - Complete workflow validation
 * - Real API interactions
 * - Output verification
 *
 * @timeout 180000
 * @skipIf No API credentials configured
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { NeuroLink } from "../../src/lib/neurolink.js";

const OUTPUT_DIR = path.join(process.cwd(), "test", "output");

const hasRequiredEnvVars = () => {
  return !!(
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.GOOGLE_API_KEY
  );
};

describe("Feature E2E Test Suite", () => {
  let neurolink: NeuroLink;

  beforeAll(async () => {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    neurolink = new NeuroLink();
  });

  afterAll(async () => {
    if (neurolink) {
      await neurolink.dispose();
    }
  });

  it("should complete full workflow", async () => {
    if (!hasRequiredEnvVars()) {
      console.log("Skipping E2E test: API credentials not configured");
      return;
    }

    const result = await neurolink.generate({
      input: { text: "Hello, world!" },
      provider: "openai",
      model: "gpt-4",
      timeout: 60000,
    });

    expect(result).toBeDefined();
    expect(result.text).toBeTruthy();
  }, 120000); // 2 minute timeout

  it("should handle multimodal input", async () => {
    if (!hasRequiredEnvVars()) {
      console.log("Skipping E2E test: API credentials not configured");
      return;
    }

    const imagePath = path.join(
      process.cwd(),
      "test",
      "fixtures",
      "test-image.png",
    );

    if (!fs.existsSync(imagePath)) {
      console.log("Skipping: test image not found");
      return;
    }

    const result = await neurolink.generate({
      input: {
        text: "Describe this image",
        images: [imagePath],
      },
      provider: "openai",
      model: "gpt-4-vision-preview",
      timeout: 90000,
    });

    expect(result).toBeDefined();
    expect(result.text).toContain("image");
  }, 180000); // 3 minute timeout
});

/**
 * Test Coverage Summary
 * - Full Workflow: 1 test
 * - Multimodal Input: 1 test
 * - Total: 2 E2E tests
 *
 * Note: These tests require API credentials and may incur costs
 */
```

### 8.6 LLM Evaluation Test Template

```typescript
/**
 * LLM Evaluation Tests
 *
 * Tests for LLM output quality evaluation:
 * - Faithfulness scoring
 * - Relevancy evaluation
 * - Toxicity detection
 * - Custom metric evaluation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the evaluation LLM
vi.mock("../../../src/lib/evaluation/llmJudge.js", () => ({
  LLMJudge: {
    evaluate: vi.fn(),
  },
}));

import { LLMJudge } from "../../../src/lib/evaluation/llmJudge.js";
import { EvaluationPipeline } from "../../../src/lib/evaluation/pipeline.js";

describe("LLM Evaluation Tests", () => {
  let pipeline: EvaluationPipeline;

  beforeEach(() => {
    pipeline = new EvaluationPipeline();
    vi.clearAllMocks();
  });

  describe("Faithfulness Evaluation", () => {
    it("should score high for grounded responses", async () => {
      vi.mocked(LLMJudge.evaluate).mockResolvedValue({
        score: 0.95,
        reasoning: "All claims are supported by context",
      });

      const context = "Paris is the capital of France.";
      const response = "The capital of France is Paris.";

      const score = await pipeline.evaluateFaithfulness(response, context);

      expect(score.value).toBeGreaterThan(0.8);
      expect(score.reasoning).toBeDefined();
    });

    it("should score low for hallucinated responses", async () => {
      vi.mocked(LLMJudge.evaluate).mockResolvedValue({
        score: 0.2,
        reasoning: "Response contains unsupported claims",
      });

      const context = "Paris is the capital of France.";
      const response = "The capital of France is London.";

      const score = await pipeline.evaluateFaithfulness(response, context);

      expect(score.value).toBeLessThan(0.5);
    });
  });

  describe("Toxicity Detection", () => {
    it("should flag toxic content", async () => {
      const toxicResponse = "You are terrible!";

      const score = await pipeline.evaluateToxicity(toxicResponse);

      expect(score.isToxic).toBe(true);
      expect(score.confidence).toBeGreaterThan(0.7);
    });

    it("should pass clean content", async () => {
      const cleanResponse = "Thank you for your question.";

      const score = await pipeline.evaluateToxicity(cleanResponse);

      expect(score.isToxic).toBe(false);
    });
  });

  describe("Custom G-Eval Metrics", () => {
    it("should evaluate custom criteria", async () => {
      vi.mocked(LLMJudge.evaluate).mockResolvedValue({
        score: 0.85,
        reasoning: "Response demonstrates good coherence",
        chainOfThought: [
          "Checking logical flow",
          "Verifying sentence connections",
          "Assessing overall coherence",
        ],
      });

      const response =
        "First, we prepare the data. Then, we train the model. Finally, we evaluate results.";

      const score = await pipeline.evaluateCustom(response, {
        name: "Coherence",
        criteria: "Evaluate the logical flow and coherence of the response",
      });

      expect(score.value).toBeGreaterThan(0.7);
      expect(score.chainOfThought).toHaveLength(3);
    });
  });
});

/**
 * Test Coverage Summary
 * - Faithfulness Evaluation: 2 tests
 * - Toxicity Detection: 2 tests
 * - Custom G-Eval Metrics: 1 test
 * - Total: 5 tests
 */
```

---

## 9. Appendix: Quick Reference

### 9.1 Test Commands Cheat Sheet

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run specific test file
vitest run test/unit/utils/fileDetector.test.ts

# Run tests matching pattern
vitest run -t "should initialize"

# Run with coverage
pnpm run test:coverage

# Run only changed tests
pnpm run test:smart

# Run integration tests
pnpm run test:integration

# Debug tests
pnpm run test:debug
```

### 9.2 Mock Methods Quick Reference

| Method                 | Clears History | Resets Implementation | Use Case                    |
| ---------------------- | -------------- | --------------------- | --------------------------- |
| `vi.clearAllMocks()`   | Yes            | No                    | Between tests (recommended) |
| `vi.resetAllMocks()`   | Yes            | Yes (to undefined)    | Fresh slate (use carefully) |
| `vi.restoreAllMocks()` | Yes            | Yes (to original)     | Cleanup in afterEach        |
| `vi.resetModules()`    | N/A            | N/A                   | Module cache reset (avoid)  |

### 9.3 Assertion Patterns

```typescript
// Equality
expect(result).toBe(expected); // Strict equality
expect(result).toEqual(expected); // Deep equality
expect(result).toStrictEqual(expected); // Deep + type equality

// Truthiness
expect(result).toBeTruthy();
expect(result).toBeFalsy();
expect(result).toBeDefined();
expect(result).toBeNull();

// Numbers
expect(result).toBeGreaterThan(5);
expect(result).toBeLessThan(10);
expect(result).toBeCloseTo(0.3, 5); // Floating point

// Strings
expect(result).toContain("substring");
expect(result).toMatch(/pattern/);

// Arrays
expect(array).toContain(item);
expect(array).toHaveLength(3);

// Objects
expect(obj).toHaveProperty("key");
expect(obj).toMatchObject({ partial: true });

// Errors
expect(() => fn()).toThrow();
expect(() => fn()).toThrow(/pattern/);
await expect(asyncFn()).rejects.toThrow();

// Mocks
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith(arg1, arg2);
expect(mockFn).toHaveBeenCalledTimes(3);
```

### 9.4 Coverage Threshold Reference

| Area             | Lines | Branches | Functions | Statements |
| ---------------- | ----- | -------- | --------- | ---------- |
| SDK (`src/lib/`) | 90%   | 90%      | 90%       | 90%        |
| CLI (`src/cli/`) | 85%   | 85%      | 85%       | 85%        |
| Global           | 85%   | 85%      | 85%       | 85%        |

### 9.5 Timeout Guidelines

| Test Type      | Default Timeout | Extended Timeout | When to Use Extended |
| -------------- | --------------- | ---------------- | -------------------- |
| Unit           | 5s              | 10s              | Complex calculations |
| Integration    | 30s             | 60s              | Network operations   |
| E2E            | 60s             | 180s             | Full workflows       |
| LLM Evaluation | 30s             | 120s             | Real API calls       |

### 9.6 File Path Patterns

```typescript
// Fixtures
const fixturesPath = join(process.cwd(), "test", "fixtures");
const csvPath = join(fixturesPath, "basic.csv");

// Output directory for E2E tests
const OUTPUT_DIR = path.join(process.cwd(), "test", "output");

// Source imports (use .js extension for ESM)
import { Component } from "../../../src/lib/path/to/component.js";
```

---

## Document Information

| Property     | Value          |
| ------------ | -------------- |
| Created      | January 2026   |
| Last Updated | January 2026   |
| Version      | 1.0            |
| Status       | Active         |
| Maintainer   | NeuroLink Team |

---

_This document synthesizes lessons from NeuroLink's testing evolution, established patterns, and modern LLM evaluation research to provide a comprehensive testing strategy for the project._
