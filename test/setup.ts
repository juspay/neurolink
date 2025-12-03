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
  // Reset all mocks before each test
  vi.clearAllMocks();
  vi.resetAllMocks();

  // Reset modules to ensure clean state
  vi.resetModules();
});

afterEach(() => {
  // Cleanup after each test
  vi.restoreAllMocks();
});

// Mock AI SDK providers (from implementation document)
vi.mock("ai", () => ({
  stream: vi.fn(),
  generate: vi.fn(),
  Output: { object: vi.fn() },
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
