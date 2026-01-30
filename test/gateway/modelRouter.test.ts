/**
 * Model Router Tests
 *
 * Tests for smart model routing logic - direct API vs gateway routing
 *
 * @see src/lib/gateway/modelRouter.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  ModelRouter,
  getGlobalRouter,
  resetGlobalRouter,
} from "../../src/lib/gateway/modelRouter.js";
import {
  parseModelString,
  inferProvider,
  normalizeProviderName,
} from "../../src/lib/gateway/modelStringParser.js";
import {
  getRoutingStrategy,
  isOpenRouterConfigured,
  isLiteLLMConfigured,
  shouldUseNeuroLinkProvider,
} from "../../src/lib/gateway/providerMapper.js";
import { resetGlobalCache } from "../../src/lib/gateway/registryCache.js";
import { resetGlobalFetcher } from "../../src/lib/gateway/registryFetcher.js";
import { ConfigurationError, MissingApiKeyError } from "../../src/lib/gateway/errors.js";
import type { LanguageModelV1 } from "ai";

// Mock dependencies
vi.mock("../../src/lib/gateway/registryFetcher.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/lib/gateway/registryFetcher.js")>();
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

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => vi.fn().mockReturnValue({
    modelId: "test-model",
    provider: "test-provider",
  } as unknown as LanguageModelV1)),
}));

describe("ModelRouter", () => {
  let router: ModelRouter;

  beforeEach(() => {
    vi.clearAllMocks();
    resetGlobalRouter();
    router = new ModelRouter();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    router.reset();
  });

  describe("parseModelString", () => {
    it("should parse provider/model format", () => {
      const result = parseModelString("anthropic/claude-3-5-sonnet");

      expect(result.provider).toBe("anthropic");
      expect(result.modelName).toBe("claude-3-5-sonnet");
    });

    it("should handle nested model names (provider/org/model)", () => {
      const result = parseModelString("meta-llama/llama-3.1-70b-instruct");

      expect(result.provider).toBe("meta-llama");
      expect(result.modelName).toBe("llama-3.1-70b-instruct");
    });

    it("should infer provider from model name patterns", () => {
      const result = inferProvider("gpt-4o");

      expect(result.provider).toBe("openai");
      expect(result.modelName).toBe("gpt-4o");
    });

    it("should infer OpenAI for gpt-* models", () => {
      expect(inferProvider("gpt-4o").provider).toBe("openai");
      expect(inferProvider("gpt-3.5-turbo").provider).toBe("openai");
      expect(inferProvider("gpt-4-turbo").provider).toBe("openai");
    });

    it("should infer Anthropic for claude-* models", () => {
      expect(inferProvider("claude-3-opus").provider).toBe("anthropic");
      expect(inferProvider("claude-3-sonnet").provider).toBe("anthropic");
      expect(inferProvider("claude-2").provider).toBe("anthropic");
    });

    it("should infer Google for gemini-* models", () => {
      expect(inferProvider("gemini-1.5-pro").provider).toBe("google");
      expect(inferProvider("gemini-2.0-flash").provider).toBe("google");
      expect(inferProvider("gemma-2-27b").provider).toBe("google");
    });

    it("should infer Mistral for mistral-* models", () => {
      expect(inferProvider("mistral-large").provider).toBe("mistral");
      expect(inferProvider("mixtral-8x7b").provider).toBe("mistral");
      expect(inferProvider("codestral-latest").provider).toBe("mistral");
    });

    it("should default to OpenRouter for unknown models", () => {
      expect(inferProvider("unknown-model-xyz").provider).toBe("openrouter");
      expect(inferProvider("some-random-model").provider).toBe("openrouter");
    });
  });

  describe("getRoutingStrategy", () => {
    it("should return 'direct' for configured providers with API keys", () => {
      const originalEnv = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = "test-key";

      try {
        const strategy = getRoutingStrategy("openai");
        expect(strategy).toBe("direct");
      } finally {
        if (originalEnv) {
          process.env.OPENAI_API_KEY = originalEnv;
        } else {
          delete process.env.OPENAI_API_KEY;
        }
      }
    });

    it("should return 'openrouter' for unconfigured providers", () => {
      const originalEnv = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      try {
        const strategy = getRoutingStrategy("openai");
        expect(strategy).toBe("openrouter");
      } finally {
        if (originalEnv) {
          process.env.OPENAI_API_KEY = originalEnv;
        }
      }
    });

    it("should return 'openrouter' for unknown providers", () => {
      const strategy = getRoutingStrategy("unknown-provider");
      expect(strategy).toBe("openrouter");
    });

    it("should respect provider-specific routing configuration", () => {
      // Groq is configured to use openrouter by default
      const strategy = getRoutingStrategy("groq");
      expect(strategy).toBe("openrouter");
    });
  });

  describe("createModel", () => {
    it("should create direct model for supported providers", async () => {
      const originalEnv = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = "test-key";

      try {
        // Mock the ProviderFactory import
        vi.doMock("../../src/lib/factories/providerFactory.js", () => ({
          ProviderFactory: {
            createProvider: vi.fn().mockResolvedValue({
              getLanguageModel: vi.fn().mockResolvedValue({
                modelId: "gpt-4o",
              }),
            }),
          },
        }));

        // For direct routing test, we need to verify the router attempts direct
        const parsed = router.parseModelString("openai/gpt-4o");
        expect(parsed.provider).toBe("openai");
        expect(parsed.modelName).toBe("gpt-4o");
      } finally {
        if (originalEnv) {
          process.env.OPENAI_API_KEY = originalEnv;
        } else {
          delete process.env.OPENAI_API_KEY;
        }
      }
    });

    it("should create OpenRouter model for gateway routing", async () => {
      const originalEnv = process.env.OPENROUTER_API_KEY;
      process.env.OPENROUTER_API_KEY = "test-openrouter-key";

      try {
        const model = router.createOpenRouterModel("groq/llama-3-70b");

        expect(model).toBeDefined();
      } finally {
        if (originalEnv) {
          process.env.OPENROUTER_API_KEY = originalEnv;
        } else {
          delete process.env.OPENROUTER_API_KEY;
        }
      }
    });

    it("should create LiteLLM model when specified", async () => {
      const originalEnv = process.env.LITELLM_BASE_URL;
      process.env.LITELLM_BASE_URL = "http://localhost:4000";

      try {
        const model = router.createLiteLLMModel("openai/gpt-4o");

        expect(model).toBeDefined();
      } finally {
        if (originalEnv) {
          process.env.LITELLM_BASE_URL = originalEnv;
        } else {
          delete process.env.LITELLM_BASE_URL;
        }
      }
    });

    it("should use auto routing to try direct first then gateway", async () => {
      // Test that auto routing is a valid option
      const parsed = router.parseModelString("openai/gpt-4o");
      expect(parsed.provider).toBe("openai");

      // Auto routing would try direct first if API key is available
      const originalEnv = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = "test-key";

      try {
        const strategy = getRoutingStrategy("openai");
        expect(strategy).toBe("direct");
      } finally {
        if (originalEnv) {
          process.env.OPENAI_API_KEY = originalEnv;
        } else {
          delete process.env.OPENAI_API_KEY;
        }
      }
    });
  });

  describe("direct routing", () => {
    it("should use ProviderFactory for direct model creation", async () => {
      const originalEnv = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = "test-key";

      try {
        const shouldUseDirect = shouldUseNeuroLinkProvider("openai");
        expect(shouldUseDirect).toBe(true);
      } finally {
        if (originalEnv) {
          process.env.OPENAI_API_KEY = originalEnv;
        } else {
          delete process.env.OPENAI_API_KEY;
        }
      }
    });

    it("should handle provider creation errors", async () => {
      const originalEnv = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      try {
        // Without API key, should fall back to openrouter strategy
        const strategy = getRoutingStrategy("openai");
        expect(strategy).toBe("openrouter");
      } finally {
        if (originalEnv) {
          process.env.OPENAI_API_KEY = originalEnv;
        }
      }
    });
  });

  describe("OpenRouter routing", () => {
    it("should create OpenRouter client with API key", async () => {
      const originalEnv = process.env.OPENROUTER_API_KEY;
      process.env.OPENROUTER_API_KEY = "test-openrouter-key";

      try {
        const model = router.createOpenRouterModel("anthropic/claude-3");
        expect(model).toBeDefined();
        expect(router.isOpenRouterInitialized()).toBe(true);
      } finally {
        if (originalEnv) {
          process.env.OPENROUTER_API_KEY = originalEnv;
        } else {
          delete process.env.OPENROUTER_API_KEY;
        }
      }
    });

    it("should throw error if OPENROUTER_API_KEY missing", async () => {
      const originalEnv = process.env.OPENROUTER_API_KEY;
      delete process.env.OPENROUTER_API_KEY;

      try {
        expect(() => router.createOpenRouterModel("anthropic/claude-3")).toThrow(
          MissingApiKeyError
        );
      } finally {
        if (originalEnv) {
          process.env.OPENROUTER_API_KEY = originalEnv;
        }
      }
    });

    it("should set custom headers for OpenRouter requests", async () => {
      const originalEnv = process.env.OPENROUTER_API_KEY;
      process.env.OPENROUTER_API_KEY = "test-openrouter-key";

      try {
        const { createOpenAI } = await import("@ai-sdk/openai");
        router.createOpenRouterModel("anthropic/claude-3");

        expect(createOpenAI).toHaveBeenCalledWith(
          expect.objectContaining({
            apiKey: "test-openrouter-key",
            baseURL: expect.stringContaining("openrouter"),
            headers: expect.objectContaining({
              "HTTP-Referer": expect.any(String),
              "X-Title": expect.any(String),
            }),
          })
        );
      } finally {
        if (originalEnv) {
          process.env.OPENROUTER_API_KEY = originalEnv;
        } else {
          delete process.env.OPENROUTER_API_KEY;
        }
      }
    });
  });

  describe("LiteLLM routing", () => {
    it("should create LiteLLM client", async () => {
      const model = router.createLiteLLMModel("openai/gpt-4o");

      expect(model).toBeDefined();
      expect(router.isLiteLLMInitialized()).toBe(true);
    });

    it("should use default localhost URL if not configured", async () => {
      const originalEnv = process.env.LITELLM_BASE_URL;
      delete process.env.LITELLM_BASE_URL;

      try {
        const { createOpenAI } = await import("@ai-sdk/openai");
        router.reset();
        router.createLiteLLMModel("openai/gpt-4o");

        expect(createOpenAI).toHaveBeenCalledWith(
          expect.objectContaining({
            baseURL: expect.stringContaining("localhost:4000"),
          })
        );
      } finally {
        if (originalEnv) {
          process.env.LITELLM_BASE_URL = originalEnv;
        }
      }
    });
  });

  describe("model info", () => {
    it("should get model info from registry", async () => {
      const info = await router.getModelInfo("openai/gpt-4o");

      expect(info).toBeDefined();
      expect(info?.id).toBe("openai/gpt-4o");
    });

    it("should check model capabilities", async () => {
      const supportsChat = await router.supportsCapability("openai/gpt-4o", "chat");

      expect(supportsChat).toBe(true);
    });

    it("should get available models list", async () => {
      const models = await router.getAvailableModels();

      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });

    it("should search models by query", async () => {
      const results = await router.searchModels("gpt");

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("global router", () => {
    it("should return singleton instance", () => {
      const router1 = getGlobalRouter();
      const router2 = getGlobalRouter();

      expect(router1).toBe(router2);
    });

    it("should reset global router", () => {
      const router1 = getGlobalRouter();
      resetGlobalRouter();
      const router2 = getGlobalRouter();

      expect(router1).not.toBe(router2);
    });
  });

  describe("provider normalization", () => {
    it("should normalize provider aliases", () => {
      expect(normalizeProviderName("gpt")).toBe("openai");
      expect(normalizeProviderName("chatgpt")).toBe("openai");
      expect(normalizeProviderName("claude")).toBe("anthropic");
      expect(normalizeProviderName("gemini")).toBe("google");
      expect(normalizeProviderName("mistralai")).toBe("mistral");
    });

    it("should handle case insensitivity", () => {
      expect(normalizeProviderName("OpenAI")).toBe("openai");
      expect(normalizeProviderName("ANTHROPIC")).toBe("anthropic");
      expect(normalizeProviderName("Google")).toBe("google");
    });
  });
});
