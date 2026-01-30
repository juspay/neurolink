# NeuroLink Testing Patterns Analysis

This document provides a comprehensive analysis of testing patterns used in the NeuroLink project, serving as a reference for consistent test implementation.

## Table of Contents

1. [Test Directory Structure](#test-directory-structure)
2. [Vitest Configuration](#vitest-configuration)
3. [Test Setup and Global Configuration](#test-setup-and-global-configuration)
4. [Test Types and Categories](#test-types-and-categories)
5. [Mocking Patterns](#mocking-patterns)
6. [Provider Testing Patterns](#provider-testing-patterns)
7. [Tool and MCP Testing Patterns](#tool-and-mcp-testing-patterns)
8. [Integration Testing Patterns](#integration-testing-patterns)
9. [Test File Templates](#test-file-templates)
10. [Coverage Requirements](#coverage-requirements)
11. [Best Practices](#best-practices)

---

## Test Directory Structure

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
├── continuous-test-suite.ts    # Comprehensive E2E test suite
├── global-endpoint-tests.ts    # Provider endpoint tests
└── TESTING_SCRIPTS.md          # Testing documentation
```

### Key Organization Principles

1. **Unit tests** (`test/unit/`) - Isolated component tests with mocked dependencies
2. **Integration tests** (`test/integration/`) - Tests with real external connections
3. **SDK tests** (`test/sdk/`) - Tests for SDK programmatic API
4. **Fixtures** (`test/fixtures/`) - Shared test data files
5. **Types** (`test/types/`) - Shared type definitions for tests

---

## Vitest Configuration

**File:** `/vitest.config.ts`

```typescript
import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    // Environment setup for Node.js testing
    globals: true,
    environment: "node",
    setupFiles: ["./test/setup.ts"],

    // Performance optimization
    testTimeout: 30000, // 30s max per test
    maxConcurrency: 10, // Parallel execution
    clearMocks: true, // Clear call history between tests

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: ["src/lib/**/*", "src/cli/**/*"],
      exclude: ["src/test/**/*", "node_modules/", "dist/", "**/*.d.ts"],
      thresholds: {
        "src/lib/**/*": {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        "src/cli/**/*": {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
    },

    // File matching patterns
    include: ["src/**/*.{test,spec}.{js,ts}", "test/**/*.{test,spec}.{js,ts}"],
    exclude: [
      "node_modules/",
      "dist/",
      ".svelte-kit/",
      "test/continuous-test-suite.ts", // Legacy E2E suite
    ],
  },

  // Path resolution for imports
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@test": path.resolve(__dirname, "./test"),
      "@mocks": path.resolve(__dirname, "./test/mocks"),
    },
  },
});
```

### Key Configuration Details

- **Test Timeout:** 30 seconds per test (configurable per-test)
- **Parallel Execution:** Up to 10 concurrent tests
- **Mock Reset:** Uses `clearMocks` instead of `mockReset` to preserve mock implementations
- **Path Aliases:** `@`, `@test`, `@mocks` for clean imports

---

## Test Setup and Global Configuration

**File:** `/test/setup.ts`

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
  // Note: We use clearAllMocks() instead of resetAllMocks() because
  // resetAllMocks() also resets mock implementations to return undefined
  vi.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
  vi.restoreAllMocks();
});

// Mock AI SDK providers
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

### Global Test Types

**File:** `/test/types/global.ts`

```typescript
export type TestConfigType = {
  timeout: number;
  providers: string[];
  mockResponses: boolean;
};

declare global {
  var TestConfig: TestConfigType;
}

export {};
```

---

## Test Types and Categories

### 1. Unit Tests

Isolated tests for individual components with mocked dependencies.

**Characteristics:**

- Fast execution (< 100ms each)
- No external dependencies
- All collaborators mocked
- Focus on single function/class behavior

**Example:** `/test/unit/utils/fileDetector.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FileDetector } from "../../../src/lib/utils/fileDetector.js";
import { join } from "node:path";

// Mock the logger
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const fixturesPath = join(process.cwd(), "test", "fixtures");

describe("FileDetector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("detectAndProcess", () => {
    it("should detect and process CSV files with .csv extension", async () => {
      const csvPath = join(fixturesPath, "basic.csv");
      const result = await FileDetector.detectAndProcess(csvPath);

      expect(result.type).toBe("csv");
      expect(result.mimeType).toBe("text/csv");
      expect(result.metadata).toBeDefined();
      expect(result.metadata.rowCount).toBeGreaterThan(0);
    });
  });
});
```

### 2. Integration Tests

Tests that involve real connections to external services or servers.

**Characteristics:**

- Longer timeout (30-60 seconds)
- May use real mock servers
- Tests actual transport/network behavior
- Cleanup in `afterAll` hooks

**Example:** `/test/integration/mcp/httpTransportIntegration.test.ts`

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

describe("HTTP Transport Integration Tests", () => {
  let mockServer: Server;
  let serverUrl: string;
  let requestCount: number;
  let capturedRequests: CapturedRequest[];

  const createMockMCPServer = () => {
    return new Promise((resolve) => {
      const server = createServer((req, res) => {
        // Handle MCP JSON-RPC requests
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
    const result = await createMockMCPServer();
    mockServer = result.server;
    serverUrl = result.url;
  });

  beforeEach(() => {
    requestCount = 0;
    capturedRequests = [];
  });

  afterAll(() => {
    if (mockServer) {
      mockServer.close();
    }
  });

  // Tests...
});
```

### 3. SDK Tests

Tests for the programmatic SDK API.

**Characteristics:**

- Tests public API surface
- Validates type contracts
- Tests configuration validation

**Location:** `/test/sdk/`

### 4. E2E Tests

End-to-end tests using real providers.

**Characteristics:**

- Uses real API keys
- Longer timeouts (60-180 seconds)
- Tests complete workflows
- May skip if environment not configured

**Example:** `/test/multimodal/image-generation.test.ts`

```typescript
describe("Image Generation Test Suite", () => {
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

  it("should generate an image", async () => {
    if (!hasRequiredEnvVars()) {
      console.log("Skipping: credentials not set");
      return;
    }

    const result = await neurolink.generate({
      input: { text: "A beautiful sunset" },
      provider: "vertex",
      model: "gemini-2.5-flash-image",
      timeout: 180000,
    });

    expect(getImageFromResult(result)).toBeTruthy();
  }, 200000); // Extended timeout
});
```

---

## Mocking Patterns

### 1. Logger Mocking (Standard Pattern)

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

### 2. External SDK Mocking

```typescript
// Mock OpenRouter provider
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

### 3. File System Mocking

```typescript
vi.mock("fs", () => ({
  writeFileSync: vi.fn(),
  existsSync: vi.fn().mockReturnValue(true),
  unlinkSync: vi.fn(),
}));
```

### 4. External Service Mocking

```typescript
// Mock GitHub Actions exec
vi.mock("@actions/exec", () => ({
  exec: vi.fn(),
  getExecOutput: vi.fn(),
}));

// Mock circuit breaker
vi.mock("../../../src/lib/mcp/mcpCircuitBreaker.js", () => ({
  globalCircuitBreakerManager: {
    getBreaker: vi.fn(() => ({
      execute: vi.fn((fn) => fn()),
      getState: vi.fn(() => "closed"),
      getStats: vi.fn(() => ({
        state: "closed",
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
      })),
    })),
  },
}));
```

### 5. Fetch Mocking

```typescript
// Mock global fetch
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({
    data: [{ id: "anthropic/claude-3-5-sonnet" }, { id: "openai/gpt-4o" }],
  }),
});
```

### 6. Timer Mocking

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

### 7. Environment Variable Mocking

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

---

## Provider Testing Patterns

### Standard Provider Test Structure

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { StreamTextResult } from "ai";

// Mock provider SDK
vi.mock("@provider/ai-sdk", () => ({
  createProvider: vi.fn(() => (modelName: string) => ({
    modelName,
    provider: "provider-name",
  })),
}));

// Mock logger
vi.mock("../../src/lib/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Import AFTER mocks
import { ProviderClass } from "../../src/lib/providers/provider.js";

describe("Provider Integration Tests", () => {
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
      expect(provider).toBeDefined();
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
      expect(handled.message).toContain("network");
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
```

---

## Tool and MCP Testing Patterns

### MCP Server Configuration Tests

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ExternalServerManager } from "../../../src/lib/mcp/externalServerManager.js";
import type { MCPServerInfo } from "../../../src/lib/types/mcpTypes.js";

// Mock logger and circuit breaker
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
    it("should validate all network transports require URL", () => {
      const transports = ["http", "sse", "websocket"];

      for (const transport of transports) {
        const configWithUrl = {
          id: `${transport}-with-url`,
          transport,
          url: "https://example.com",
          // ... other required fields
        };

        const configWithoutUrl = {
          id: `${transport}-without-url`,
          transport,
          // Missing URL
        };

        expect(manager.validateConfig(configWithUrl).isValid).toBe(true);
        expect(manager.validateConfig(configWithoutUrl).isValid).toBe(false);
      }
    });
  });
});
```

---

## Integration Testing Patterns

### Mock HTTP Server Pattern

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
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      let body = "";

      req.on("data", (chunk) => {
        body += chunk.toString();
      });

      req.on("end", () => {
        const respond = () => {
          if (req.method === "POST") {
            try {
              const request = JSON.parse(body);

              // Handle MCP methods
              if (request.method === "initialize") {
                res.writeHead(200, { "Content-Type": "application/json" });
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
                      tools: [
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

---

## Test File Templates

### Unit Test Template

```typescript
/**
 * [Component Name] Unit Tests
 *
 * Tests for [description of what's being tested]:
 * - [Feature 1]
 * - [Feature 2]
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ComponentUnderTest } from "../../../src/lib/path/to/component.js";

// Mock dependencies
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

  describe("methodName", () => {
    it("should [expected behavior]", async () => {
      // Arrange
      const input = {
        /* test input */
      };

      // Act
      const result = await ComponentUnderTest.methodName(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.property).toBe("expected");
    });

    it("should handle [edge case]", async () => {
      // Test edge case
    });

    it("should throw error when [error condition]", async () => {
      await expect(ComponentUnderTest.methodName(invalidInput)).rejects.toThrow(
        /expected error pattern/,
      );
    });
  });
});
```

### Integration Test Template

```typescript
/**
 * [Feature Name] Integration Tests
 *
 * Tests [feature] with real/mock external services:
 * - Connection handling
 * - Request/response flow
 * - Error recovery
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

// Mock logger only (keep real implementations)
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("Feature Integration Tests", () => {
  let mockServer: Server;
  let serverUrl: string;

  beforeAll(async () => {
    // Setup mock server
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
      // Test connection
    });

    it("should handle connection timeout", async () => {
      // Test timeout
    }, 10000); // Extended timeout for slow operations
  });
});
```

### Provider Test Template

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

// Mocks before imports
vi.mock("@provider/sdk", () => ({
  createProvider: vi.fn(() => (model) => ({ model, provider: "name" })),
}));

vi.mock("../../src/lib/utils/logger.js", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Import after mocks
import { ProviderClass } from "../../src/lib/providers/provider.js";

describe("Provider Integration Tests", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // Test cases follow standard provider pattern...
});

/**
 * Test Coverage Summary
 * - 1. Provider initialization with valid API key
 * - 2. Provider throws error when API key missing
 * - [etc.]
 *
 * Total test cases: X tests across Y test suites
 */
```

---

## Coverage Requirements

### SDK Coverage Thresholds (90%)

```
src/lib/**/*:
  - branches: 90%
  - functions: 90%
  - lines: 90%
  - statements: 90%
```

### CLI Coverage Thresholds (85%)

```
src/cli/**/*:
  - branches: 85%
  - functions: 85%
  - lines: 85%
  - statements: 85%
```

### Running Coverage

```bash
# Generate coverage report
pnpm run test:coverage

# View HTML report
open coverage/index.html
```

---

## Best Practices

### 1. Test Organization

- **One describe block per feature/method**
- **Descriptive test names** using "should [expected behavior]" pattern
- **Group related tests** with nested describe blocks
- **Include test coverage summary** at end of file

### 2. Mock Management

- **Mock at setup level** for common dependencies (logger, AI SDKs)
- **Mock in describe blocks** for test-specific behavior
- **Use `vi.clearAllMocks()`** in beforeEach
- **Use `vi.restoreAllMocks()`** in afterEach
- **Never use `vi.resetAllMocks()`** - it breaks mock implementations

### 3. Async Testing

```typescript
// Always await async operations
it("should handle async operation", async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});

// Use proper timeout for slow operations
it("should handle slow operation", async () => {
  // Test code
}, 30000); // 30 second timeout
```

### 4. Error Testing

```typescript
// Test thrown errors
it("should throw error when invalid", async () => {
  await expect(functionThatThrows()).rejects.toThrow(/expected pattern/);
});

// Test error properties
it("should include helpful error message", async () => {
  try {
    await functionThatThrows();
    expect.fail("Should have thrown");
  } catch (error) {
    expect(error.message).toContain("helpful info");
  }
});
```

### 5. Environment Variable Handling

```typescript
describe("Environment-dependent tests", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should skip if credentials not set", () => {
    if (!process.env.REQUIRED_KEY) {
      console.log("Skipping: credentials not set");
      return;
    }
    // Test code
  });
});
```

### 6. Fixture Usage

- Store test files in `/test/fixtures/`
- Use `path.join()` with `process.cwd()` for reliable paths
- Include edge case files (extensionless, malformed, etc.)

```typescript
const fixturesPath = join(process.cwd(), "test", "fixtures");
const csvPath = join(fixturesPath, "basic.csv");
```

### 7. Test Documentation

- **JSDoc comment** at top of file describing test coverage
- **Test coverage summary** at end of large test files
- **Comments** for non-obvious test logic

```typescript
/**
 * [Component] Tests
 *
 * Tests for [description]:
 * - Feature 1 behavior
 * - Feature 2 behavior
 * - Error handling
 * - Edge cases
 */

// At end of file:
/**
 * Test Coverage Summary
 * - Feature 1: X tests
 * - Feature 2: Y tests
 * - Total: Z tests
 */
```

---

## Running Tests

### Available Commands

```bash
# Run all tests
pnpm test

# Run tests once (CI mode)
pnpm run test:run

# Run specific test file
vitest run test/unit/utils/fileDetector.test.ts

# Run with coverage
pnpm run test:coverage

# Run in watch mode
pnpm run test:watch

# Run integration tests only
pnpm run test:integration

# Smart test runner (adaptive)
pnpm run test:smart
```

### Test Naming Convention

- Unit tests: `*.test.ts` or `*.spec.ts`
- Integration tests: `*.test.ts` in `/test/integration/`
- E2E tests: Manual scripts or dedicated test files

---

## References

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles)
- [NeuroLink CLAUDE.md](/CLAUDE.md) - Development guidelines
- [Test Scripts Documentation](/test/TESTING_SCRIPTS.md) - E2E test scripts
