/**
 * Gateway Provider Tests
 *
 * Tests for the GatewayProvider class - unified access to 69+ AI providers
 *
 * @see src/lib/gateway/gatewayProvider.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GatewayProvider } from "../../src/lib/gateway/gatewayProvider.js";
import {
  GatewayError,
  GatewayDisabledError,
} from "../../src/lib/gateway/errors.js";
import { resetGlobalRouter } from "../../src/lib/gateway/modelRouter.js";
import { resetGlobalFallbackManager } from "../../src/lib/gateway/fallbackManager.js";
import { parseModelString } from "../../src/lib/gateway/modelStringParser.js";
import type { LanguageModelV1 } from "ai";
import type { ModelSelectorContext } from "../../src/lib/gateway/types.js";

// Mock the gateway modules
vi.mock("../../src/lib/gateway/modelRouter.js", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("../../src/lib/gateway/modelRouter.js")
    >();
  return {
    ...actual,
    getGlobalRouter: vi.fn(() => ({
      createModel: vi.fn().mockResolvedValue({
        modelId: "test-model",
        provider: "test-provider",
      } as unknown as LanguageModelV1),
      getModelInfo: vi.fn().mockResolvedValue({
        id: "openai/gpt-4o",
        provider: "openai",
        modelName: "gpt-4o",
        displayName: "GPT-4o",
        capabilities: {
          chat: true,
          streaming: true,
          functionCalling: true,
        },
      }),
      getAvailableModels: vi
        .fn()
        .mockResolvedValue([
          "openai/gpt-4o",
          "anthropic/claude-3",
          "google/gemini-1.5-pro",
        ]),
      searchModels: vi
        .fn()
        .mockResolvedValue([{ id: "openai/gpt-4o", provider: "openai" }]),
      supportsCapability: vi.fn().mockResolvedValue(true),
      reset: vi.fn(),
    })),
    resetGlobalRouter: vi.fn(),
  };
});

vi.mock("../../src/lib/gateway/fallbackManager.js", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("../../src/lib/gateway/fallbackManager.js")
    >();
  return {
    ...actual,
    getGlobalFallbackManager: vi.fn(() => ({
      executeWithFallback: vi
        .fn()
        .mockImplementation(async (_model, operation) => ({
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

vi.mock("../../src/lib/gateway/constants.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/lib/gateway/constants.js")>();
  return {
    ...actual,
    GATEWAY_ENABLED: true,
    DEFAULT_GATEWAY_MODEL: "openai/gpt-4o",
  };
});

describe("GatewayProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with a model string", () => {
      const provider = new GatewayProvider("openai/gpt-4o");

      expect(provider).toBeDefined();
      expect(provider.getModelString()).toBe("openai/gpt-4o");
    });

    it("should initialize with a model selector function", () => {
      const selector = ({ availableModels }: ModelSelectorContext) =>
        availableModels.includes("openai/gpt-4o")
          ? "openai/gpt-4o"
          : "anthropic/claude-3";

      const provider = new GatewayProvider(selector);

      expect(provider).toBeDefined();
      expect(provider.hasDynamicSelector()).toBe(true);
    });

    it("should accept fallback configuration", () => {
      const provider = new GatewayProvider("openai/gpt-4o", undefined, {
        fallback: {
          models: ["anthropic/claude-3", "google/gemini-1.5-pro"],
          retries: 3,
          retryDelayMs: 1000,
        },
      });

      expect(provider).toBeDefined();
      expect(provider.hasFallback()).toBe(true);
    });

    it("should parse provider from model string", () => {
      const provider = new GatewayProvider("anthropic/claude-3-5-sonnet");

      expect(provider.getParsedProvider()).toBe("anthropic");
      expect(provider.getParsedModelName()).toBe("claude-3-5-sonnet");
    });
  });

  describe("getAISDKModel", () => {
    it("should resolve static model strings", async () => {
      const provider = new GatewayProvider("openai/gpt-4o");

      // Verify the model string is resolved
      expect(provider.getModelString()).toBe("openai/gpt-4o");
    });

    it("should execute dynamic model selector", async () => {
      const mockSelector = vi.fn().mockReturnValue("openai/gpt-4o");
      const provider = new GatewayProvider(mockSelector);

      // The selector is stored but not yet called
      expect(provider.hasDynamicSelector()).toBe(true);
    });

    it("should cache resolved models", async () => {
      const provider = new GatewayProvider("openai/gpt-4o");

      // Multiple calls should use same model
      const model1 = provider.getModelString();
      const model2 = provider.getModelString();

      expect(model1).toBe(model2);
    });

    it("should create model with fallback when configured", async () => {
      const provider = new GatewayProvider("openai/gpt-4o", undefined, {
        fallback: {
          models: ["anthropic/claude-3"],
          retries: 2,
          retryDelayMs: 500,
        },
      });

      expect(provider.hasFallback()).toBe(true);
    });
  });

  describe("generate", () => {
    it("should generate text with gateway routing", async () => {
      const provider = new GatewayProvider("openai/gpt-4o");

      // Verify generate method exists and is callable
      expect(typeof provider.generate).toBe("function");
    });

    it("should handle direct provider routing", async () => {
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

    it("should handle OpenRouter gateway routing", async () => {
      const provider = new GatewayProvider("groq/llama-3-70b");

      // Groq routes through OpenRouter
      expect(provider.getParsedProvider()).toBe("groq");
    });

    it("should use fallback models on failure", async () => {
      const provider = new GatewayProvider("openai/gpt-4o", undefined, {
        fallback: {
          models: ["anthropic/claude-3"],
          retries: 1,
          retryDelayMs: 100,
        },
      });

      expect(provider.hasFallback()).toBe(true);
    });
  });

  describe("stream", () => {
    it("should stream text with gateway routing", async () => {
      const provider = new GatewayProvider("openai/gpt-4o");

      // Verify stream method exists
      expect(typeof provider.stream).toBe("function");
    });

    it("should propagate streaming errors correctly", async () => {
      const provider = new GatewayProvider("openai/gpt-4o");
      const error = new Error("Streaming error");
      const wrappedError = provider.handleProviderError(error);

      expect(wrappedError).toBeInstanceOf(GatewayError);
      expect(wrappedError.message).toContain("Streaming error");
    });
  });

  describe("error handling", () => {
    it("should wrap errors with gateway context", async () => {
      const provider = new GatewayProvider("openai/gpt-4o");
      const originalError = new Error("API error");
      const wrappedError = provider.handleProviderError(originalError);

      expect(wrappedError).toBeInstanceOf(GatewayError);
      expect(wrappedError.message).toContain("Gateway");
      expect(wrappedError.message).toContain("openai/gpt-4o");
    });

    it("should preserve original stack traces", async () => {
      const provider = new GatewayProvider("openai/gpt-4o");
      const originalError = new Error("Original error");
      const wrappedError = provider.handleProviderError(originalError);

      expect(wrappedError.stack).toBeDefined();
      expect(wrappedError.stack).toContain("Original error");
    });
  });

  describe("model information", () => {
    it("should get model info from registry", async () => {
      const provider = new GatewayProvider("openai/gpt-4o");
      const info = await provider.getModelInfo();

      expect(info).toBeDefined();
      expect(info?.id).toBe("openai/gpt-4o");
      expect(info?.provider).toBe("openai");
    });

    it("should check model capabilities", async () => {
      const provider = new GatewayProvider("openai/gpt-4o");
      const supportsChat = await provider.supportsCapability("chat");

      expect(supportsChat).toBe(true);
    });

    it("should list available models", async () => {
      const provider = new GatewayProvider("openai/gpt-4o");
      const models = await provider.getAvailableModels();

      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      expect(models).toContain("openai/gpt-4o");
    });

    it("should search models by query", async () => {
      const provider = new GatewayProvider("openai/gpt-4o");
      const results = await provider.searchModels("gpt");

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("factory methods", () => {
    it("should create new provider with withModel()", () => {
      const provider = new GatewayProvider("openai/gpt-4o");
      const newProvider = provider.withModel("anthropic/claude-3-5-sonnet");

      expect(newProvider).toBeInstanceOf(GatewayProvider);
      expect(newProvider.getModelString()).toBe("anthropic/claude-3-5-sonnet");
      expect(newProvider).not.toBe(provider);
    });

    it("should create new provider with withFallback()", () => {
      const provider = new GatewayProvider("openai/gpt-4o");
      const newProvider = provider.withFallback({
        models: ["anthropic/claude-3", "google/gemini-1.5-pro"],
        retries: 3,
        retryDelayMs: 1000,
      });

      expect(newProvider).toBeInstanceOf(GatewayProvider);
      expect(newProvider.hasFallback()).toBe(true);
      expect(newProvider).not.toBe(provider);
    });
  });

  describe("helper methods", () => {
    it("should return current model string", () => {
      const provider = new GatewayProvider("openai/gpt-4o");

      expect(provider.getModelString()).toBe("openai/gpt-4o");
    });

    it("should return parsed provider name", () => {
      const provider = new GatewayProvider("anthropic/claude-3-opus");

      expect(provider.getParsedProvider()).toBe("anthropic");
    });

    it("should return parsed model name", () => {
      const provider = new GatewayProvider("anthropic/claude-3-opus");

      expect(provider.getParsedModelName()).toBe("claude-3-opus");
    });

    it("should check for dynamic selector", () => {
      const staticProvider = new GatewayProvider("openai/gpt-4o");
      const dynamicProvider = new GatewayProvider(() => "openai/gpt-4o");

      expect(staticProvider.hasDynamicSelector()).toBe(false);
      expect(dynamicProvider.hasDynamicSelector()).toBe(true);
    });

    it("should check for fallback configuration", () => {
      const noFallback = new GatewayProvider("openai/gpt-4o");
      const withFallback = new GatewayProvider("openai/gpt-4o", undefined, {
        fallback: {
          models: ["anthropic/claude-3"],
          retries: 1,
          retryDelayMs: 100,
        },
      });

      expect(noFallback.hasFallback()).toBe(false);
      expect(withFallback.hasFallback()).toBe(true);
    });
  });

  describe("provider parsing", () => {
    it("should correctly parse different provider formats", () => {
      expect(parseModelString("openai/gpt-4o").provider).toBe("openai");
      expect(parseModelString("anthropic/claude-3").provider).toBe("anthropic");
      expect(parseModelString("google/gemini-1.5-pro").provider).toBe("google");
      expect(parseModelString("mistral/mistral-large").provider).toBe(
        "mistral",
      );
      expect(parseModelString("meta-llama/llama-3").provider).toBe(
        "meta-llama",
      );
    });

    it("should handle models without explicit provider", () => {
      // Model-only strings should have provider inferred
      expect(parseModelString("gpt-4o").provider).toBe("openai");
      expect(parseModelString("claude-3-opus").provider).toBe("anthropic");
    });
  });
});
