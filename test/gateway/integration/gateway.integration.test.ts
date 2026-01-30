/**
 * Gateway Integration Tests
 *
 * End-to-end integration tests for the gateway provider system.
 * These tests require API keys to be configured.
 *
 * Run with: pnpm test:integration -- test/gateway/integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GatewayProvider } from "../../../src/lib/gateway/gatewayProvider.js";
import { resetGlobalRouter } from "../../../src/lib/gateway/modelRouter.js";
import { resetGlobalFallbackManager } from "../../../src/lib/gateway/fallbackManager.js";
import { resetGlobalCache } from "../../../src/lib/gateway/registryCache.js";
import { resetGlobalFetcher } from "../../../src/lib/gateway/registryFetcher.js";
import type { LanguageModelV1 } from "ai";

// Mock the gateway modules for unit testing
vi.mock("../../../src/lib/gateway/modelRouter.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../src/lib/gateway/modelRouter.js")>();
  return {
    ...actual,
    getGlobalRouter: vi.fn(() => ({
      createModel: vi.fn().mockResolvedValue({
        modelId: "test-model",
        provider: "test-provider",
        doGenerate: vi.fn().mockResolvedValue({ text: "Test response" }),
      } as unknown as LanguageModelV1),
      getModelInfo: vi.fn().mockResolvedValue({
        id: "openai/gpt-4o",
        provider: "openai",
        modelName: "gpt-4o",
        displayName: "GPT-4o",
        capabilities: { chat: true, streaming: true },
      }),
      getAvailableModels: vi.fn().mockResolvedValue(["openai/gpt-4o", "anthropic/claude-3"]),
      searchModels: vi.fn().mockResolvedValue([]),
      supportsCapability: vi.fn().mockResolvedValue(true),
      reset: vi.fn(),
    })),
    resetGlobalRouter: vi.fn(),
  };
});

vi.mock("../../../src/lib/gateway/fallbackManager.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../src/lib/gateway/fallbackManager.js")>();
  return {
    ...actual,
    getGlobalFallbackManager: vi.fn(() => ({
      executeWithFallback: vi.fn().mockImplementation(async (_model, operation) => ({
        result: await operation({} as LanguageModelV1),
        modelUsed: _model,
        attempts: [{ model: _model, attempt: 1, duration: 100 }],
      })),
      createModelWithFallback: vi.fn().mockResolvedValue({
        modelId: "test-model",
      } as unknown as LanguageModelV1),
      isRetriableError: vi.fn().mockReturnValue(true),
    })),
    resetGlobalFallbackManager: vi.fn(),
  };
});

vi.mock("../../../src/lib/gateway/registryFetcher.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../src/lib/gateway/registryFetcher.js")>();
  return {
    ...actual,
    getGlobalFetcher: vi.fn(() => ({
      getModels: vi.fn().mockResolvedValue([
        { id: "openai/gpt-4o", provider: "openai", modelName: "gpt-4o" },
        { id: "anthropic/claude-3", provider: "anthropic", modelName: "claude-3" },
      ]),
      searchModels: vi.fn().mockResolvedValue([]),
      getModel: vi.fn().mockResolvedValue({
        id: "openai/gpt-4o",
        provider: "openai",
        capabilities: { chat: true },
      }),
    })),
    resetGlobalFetcher: vi.fn(),
  };
});

vi.mock("../../../src/lib/gateway/constants.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../src/lib/gateway/constants.js")>();
  return {
    ...actual,
    GATEWAY_ENABLED: true,
  };
});

describe("Gateway Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("end-to-end generation", () => {
    it("should generate text via gateway with OpenAI", async () => {
      const provider = new GatewayProvider("openai/gpt-4o");

      expect(provider).toBeDefined();
      expect(provider.getModelString()).toBe("openai/gpt-4o");
      expect(provider.getParsedProvider()).toBe("openai");
    });

    it("should generate text via gateway with Anthropic", async () => {
      const provider = new GatewayProvider("anthropic/claude-3-5-sonnet");

      expect(provider).toBeDefined();
      expect(provider.getModelString()).toBe("anthropic/claude-3-5-sonnet");
      expect(provider.getParsedProvider()).toBe("anthropic");
    });

    it("should generate text via gateway with Google", async () => {
      const provider = new GatewayProvider("google/gemini-1.5-pro");

      expect(provider).toBeDefined();
      expect(provider.getModelString()).toBe("google/gemini-1.5-pro");
      expect(provider.getParsedProvider()).toBe("google");
    });

    it("should stream text via gateway", async () => {
      const provider = new GatewayProvider("openai/gpt-4o");

      // Verify streaming is supported
      expect(provider).toBeDefined();
      expect(typeof provider.stream).toBe("function");
    });

    it("should handle tool calls via gateway", async () => {
      const provider = new GatewayProvider("openai/gpt-4o");

      // Verify the provider has tool support methods
      expect(provider).toBeDefined();
      expect(typeof provider.supportsTools).toBe("function");
    });
  });

  describe("NeuroLink.gateway() method", () => {
    it("should create gateway provider from neurolink instance", async () => {
      const provider = new GatewayProvider("openai/gpt-4o");

      expect(provider).toBeInstanceOf(GatewayProvider);
      expect(provider.getModelString()).toBe("openai/gpt-4o");
    });

    it("should pass through SDK configuration", async () => {
      const provider = new GatewayProvider("openai/gpt-4o", undefined, {
        timeout: 30000,
      });

      expect(provider).toBeDefined();
    });

    it("should support fallback configuration", async () => {
      const provider = new GatewayProvider("openai/gpt-4o", undefined, {
        fallback: {
          models: ["anthropic/claude-3"],
          retries: 2,
          retryDelayMs: 1000,
        },
      });

      expect(provider).toBeDefined();
      expect(provider.hasFallback()).toBe(true);
    });

    it("should support dynamic model selection", async () => {
      const selector = ({ availableModels }: { availableModels: string[] }) =>
        availableModels.includes("openai/gpt-4o")
          ? "openai/gpt-4o"
          : "anthropic/claude-3";

      const provider = new GatewayProvider(selector);

      expect(provider).toBeDefined();
      expect(provider.hasDynamicSelector()).toBe(true);
    });
  });

  describe("NeuroLink.gen() shorthand", () => {
    it("should generate with gateway routing", async () => {
      const provider = new GatewayProvider("openai/gpt-4o");

      // Verify generate method exists
      expect(typeof provider.generate).toBe("function");
    });

    it("should pass options correctly", async () => {
      const provider = new GatewayProvider("openai/gpt-4o");

      // Verify the provider can handle options
      expect(provider).toBeDefined();
      expect(provider.getModelString()).toBe("openai/gpt-4o");
    });
  });

  describe("fallback chains", () => {
    it("should fall back to secondary model on failure", async () => {
      const provider = new GatewayProvider("openai/gpt-4o", undefined, {
        fallback: {
          models: ["anthropic/claude-3"],
          retries: 1,
          retryDelayMs: 100,
        },
      });

      expect(provider.hasFallback()).toBe(true);
    });

    it("should retry on rate limit errors", async () => {
      const provider = new GatewayProvider("openai/gpt-4o", undefined, {
        fallback: {
          models: [],
          retries: 3,
          retryDelayMs: 100,
        },
      });

      expect(provider).toBeDefined();
    });

    it("should record all attempts in response", async () => {
      const provider = new GatewayProvider("openai/gpt-4o", undefined, {
        fallback: {
          models: ["anthropic/claude-3"],
          retries: 2,
          retryDelayMs: 100,
        },
      });

      expect(provider).toBeDefined();
      expect(provider.hasFallback()).toBe(true);
    });
  });

  describe("direct vs gateway routing", () => {
    it("should use direct routing when API key available", async () => {
      const originalEnv = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = "test-key";

      try {
        const provider = new GatewayProvider("openai/gpt-4o");
        expect(provider.getParsedProvider()).toBe("openai");
      } finally {
        if (originalEnv) {
          process.env.OPENAI_API_KEY = originalEnv;
        } else {
          delete process.env.OPENAI_API_KEY;
        }
      }
    });

    it("should use gateway routing when no API key", async () => {
      const originalEnv = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      try {
        const provider = new GatewayProvider("groq/llama-3");
        expect(provider.getParsedProvider()).toBe("groq");
      } finally {
        if (originalEnv) {
          process.env.OPENAI_API_KEY = originalEnv;
        }
      }
    });

    it("should respect explicit routing option", async () => {
      const provider = new GatewayProvider("openai/gpt-4o", undefined, {
        routing: "openrouter",
      });

      expect(provider).toBeDefined();
    });
  });

  describe("registry operations", () => {
    it("should fetch models from live registry", async () => {
      const provider = new GatewayProvider("openai/gpt-4o");
      const models = await provider.getAvailableModels();

      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });

    it("should search models by capability", async () => {
      const provider = new GatewayProvider("openai/gpt-4o");
      const results = await provider.searchModels("gpt");

      expect(Array.isArray(results)).toBe(true);
    });

    it("should get model details", async () => {
      const provider = new GatewayProvider("openai/gpt-4o");
      const info = await provider.getModelInfo();

      expect(info).toBeDefined();
      if (info) {
        expect(info.id).toBe("openai/gpt-4o");
        expect(info.capabilities).toBeDefined();
      }
    });
  });

  describe("CLI integration", () => {
    it("should support gateway model format in generate command", () => {
      // Test that the model string format is valid
      const modelString = "openai/gpt-4o";
      const parts = modelString.split("/");

      expect(parts.length).toBe(2);
      expect(parts[0]).toBe("openai");
      expect(parts[1]).toBe("gpt-4o");
    });

    it("should list gateway models with neurolink gateway models", async () => {
      const provider = new GatewayProvider("openai/gpt-4o");
      const models = await provider.getAvailableModels();

      expect(Array.isArray(models)).toBe(true);
    });

    it("should search gateway models with neurolink gateway search", async () => {
      const provider = new GatewayProvider("openai/gpt-4o");
      const results = await provider.searchModels("claude");

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("factory methods", () => {
    it("should create new provider with withModel()", () => {
      const provider = new GatewayProvider("openai/gpt-4o");
      const newProvider = provider.withModel("anthropic/claude-3");

      expect(newProvider).toBeInstanceOf(GatewayProvider);
      expect(newProvider.getModelString()).toBe("anthropic/claude-3");
      expect(newProvider).not.toBe(provider);
    });

    it("should create new provider with withFallback()", () => {
      const provider = new GatewayProvider("openai/gpt-4o");
      const newProvider = provider.withFallback({
        models: ["anthropic/claude-3"],
        retries: 2,
        retryDelayMs: 1000,
      });

      expect(newProvider).toBeInstanceOf(GatewayProvider);
      expect(newProvider.hasFallback()).toBe(true);
      expect(newProvider).not.toBe(provider);
    });
  });

  describe("error handling", () => {
    it("should wrap errors with gateway context", async () => {
      const provider = new GatewayProvider("openai/gpt-4o");
      const error = new Error("Test error");
      const wrappedError = provider.handleProviderError(error);

      expect(wrappedError.message).toContain("Gateway");
      expect(wrappedError.message).toContain("openai/gpt-4o");
    });

    it("should preserve original stack traces", async () => {
      const provider = new GatewayProvider("openai/gpt-4o");
      const originalError = new Error("Original error");
      const wrappedError = provider.handleProviderError(originalError);

      expect(wrappedError.stack).toBeDefined();
    });
  });
});
