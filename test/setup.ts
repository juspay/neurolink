import { vi, beforeEach, afterEach } from "vitest";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import "./types/global";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load test environment variables (.env.test first, then .env as fallback)
// dotenv does NOT override by default, so test-specific vars take priority
dotenv.config({ path: path.resolve(__dirname, "../.env.test") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Global test setup
beforeEach(() => {
  // Clear mock call history before each test
  // Note: We use clearAllMocks() instead of resetAllMocks() because
  // resetAllMocks() also resets mock implementations to return undefined,
  // which would break mocks defined via vi.mock() that have custom implementations.
  vi.clearAllMocks();

  // Note: vi.resetModules() was removed because it causes issues with
  // tests that use dynamic imports (await import()) after the beforeEach runs.
  // When modules are reset, the mock factories are re-executed but dynamic
  // imports don't get the properly mocked versions. Individual test files
  // can call vi.resetModules() if they specifically need to reset module state.
});

afterEach(() => {
  // Cleanup after each test
  vi.restoreAllMocks();
});

// Mock AI SDK providers
vi.mock("ai", () => ({
  streamText: vi.fn(),
  generateText: vi.fn(),
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
