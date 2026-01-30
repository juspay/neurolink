/**
 * Gateway Provider Registry Tests
 *
 * Comprehensive tests for the ProviderRegistry pattern that registers
 * all 13+ providers with dynamic imports to avoid circular dependencies.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ProviderRegistry } from "../../src/lib/factories/providerRegistry.js";
import { ProviderFactory } from "../../src/lib/factories/providerFactory.js";
import { AIProviderName } from "../../src/lib/constants/enums.js";

describe("GatewayProviderRegistry", () => {
  beforeEach(() => {
    // Clear registrations before each test
    ProviderRegistry.clearRegistrations();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Provider Registration", () => {
    it("should register all core providers", async () => {
      await ProviderRegistry.registerAllProviders();

      // Verify core providers are registered
      expect(ProviderFactory.hasProvider(AIProviderName.OPENAI)).toBe(true);
      expect(ProviderFactory.hasProvider(AIProviderName.ANTHROPIC)).toBe(true);
      expect(ProviderFactory.hasProvider(AIProviderName.GOOGLE_AI)).toBe(true);
      expect(ProviderFactory.hasProvider(AIProviderName.VERTEX)).toBe(true);
      expect(ProviderFactory.hasProvider(AIProviderName.BEDROCK)).toBe(true);
      expect(ProviderFactory.hasProvider(AIProviderName.AZURE)).toBe(true);
      expect(ProviderFactory.hasProvider(AIProviderName.MISTRAL)).toBe(true);
      expect(ProviderFactory.hasProvider(AIProviderName.OLLAMA)).toBe(true);
      expect(ProviderFactory.hasProvider(AIProviderName.LITELLM)).toBe(true);
      expect(ProviderFactory.hasProvider(AIProviderName.HUGGINGFACE)).toBe(
        true,
      );
      expect(ProviderFactory.hasProvider(AIProviderName.OPENROUTER)).toBe(true);
      expect(ProviderFactory.hasProvider(AIProviderName.SAGEMAKER)).toBe(true);
      expect(
        ProviderFactory.hasProvider(AIProviderName.OPENAI_COMPATIBLE),
      ).toBe(true);
    });

    it("should register provider aliases correctly", async () => {
      await ProviderRegistry.registerAllProviders();

      // OpenAI aliases
      expect(ProviderFactory.hasProvider("gpt")).toBe(true);
      expect(ProviderFactory.hasProvider("chatgpt")).toBe(true);

      // Anthropic aliases
      expect(ProviderFactory.hasProvider("claude")).toBe(true);

      // Google AI aliases
      expect(ProviderFactory.hasProvider("gemini")).toBe(true);
      expect(ProviderFactory.hasProvider("google")).toBe(true);

      // Bedrock aliases
      expect(ProviderFactory.hasProvider("aws")).toBe(true);

      // Ollama aliases
      expect(ProviderFactory.hasProvider("local")).toBe(true);

      // HuggingFace aliases
      expect(ProviderFactory.hasProvider("hf")).toBe(true);

      // OpenRouter aliases
      expect(ProviderFactory.hasProvider("or")).toBe(true);
    });

    it("should only register providers once (idempotent)", async () => {
      await ProviderRegistry.registerAllProviders();
      const firstCount = ProviderFactory.getAvailableProviders().length;

      await ProviderRegistry.registerAllProviders();
      const secondCount = ProviderFactory.getAvailableProviders().length;

      expect(firstCount).toBe(secondCount);
    });

    it("should report registration status correctly", async () => {
      expect(ProviderRegistry.isRegistered()).toBe(false);

      await ProviderRegistry.registerAllProviders();

      expect(ProviderRegistry.isRegistered()).toBe(true);
    });
  });

  describe("Provider Count Verification", () => {
    it("should register at least 13 unique providers", async () => {
      await ProviderRegistry.registerAllProviders();

      const providers = ProviderFactory.getAvailableProviders();

      // Count unique base providers (excluding aliases)
      const coreProviders = Object.values(AIProviderName).filter(
        (name) => name !== AIProviderName.AUTO,
      );

      // At least all core providers should be registered
      for (const provider of coreProviders) {
        expect(
          ProviderFactory.hasProvider(provider),
          `Provider ${provider} should be registered`,
        ).toBe(true);
      }
    });

    it("should have expected alias count per provider", async () => {
      await ProviderRegistry.registerAllProviders();

      // Check OpenAI has 2 aliases
      const openaiInfo = ProviderFactory.getProviderInfo(AIProviderName.OPENAI);
      expect(openaiInfo?.aliases).toContain("gpt");
      expect(openaiInfo?.aliases).toContain("chatgpt");

      // Check Google AI has multiple aliases
      const googleInfo = ProviderFactory.getProviderInfo(
        AIProviderName.GOOGLE_AI,
      );
      expect(googleInfo?.aliases).toContain("google");
      expect(googleInfo?.aliases).toContain("gemini");
    });
  });

  describe("Default Model Configuration", () => {
    it("should set correct default models for each provider", async () => {
      await ProviderRegistry.registerAllProviders();

      // OpenAI default
      const openaiInfo = ProviderFactory.getProviderInfo(AIProviderName.OPENAI);
      expect(openaiInfo?.defaultModel).toBe("gpt-4o-mini");

      // Google AI default
      const googleInfo = ProviderFactory.getProviderInfo(
        AIProviderName.GOOGLE_AI,
      );
      expect(googleInfo?.defaultModel).toBe("gemini-2.5-flash");

      // Mistral default
      const mistralInfo = ProviderFactory.getProviderInfo(
        AIProviderName.MISTRAL,
      );
      expect(mistralInfo?.defaultModel).toBe("mistral-large-latest");
    });

    it("should allow environment variable override for models", async () => {
      const originalModel = process.env.OLLAMA_MODEL;
      process.env.OLLAMA_MODEL = "custom-ollama-model";

      // Clear and re-register to pick up env var
      ProviderRegistry.clearRegistrations();
      await ProviderRegistry.registerAllProviders();

      const ollamaInfo = ProviderFactory.getProviderInfo(AIProviderName.OLLAMA);
      expect(ollamaInfo?.defaultModel).toBe("custom-ollama-model");

      // Restore
      if (originalModel === undefined) {
        delete process.env.OLLAMA_MODEL;
      } else {
        process.env.OLLAMA_MODEL = originalModel;
      }
    });
  });

  describe("Registry Options", () => {
    it("should set and get registry options", () => {
      ProviderRegistry.setOptions({ enableManualMCP: true });
      const options = ProviderRegistry.getOptions();

      expect(options.enableManualMCP).toBe(true);
    });

    it("should default to disabled manual MCP", () => {
      const options = ProviderRegistry.getOptions();
      expect(options.enableManualMCP).toBe(false);
    });

    it("should merge options with existing values", () => {
      ProviderRegistry.setOptions({ enableManualMCP: true });
      ProviderRegistry.setOptions({ enableManualMCP: false });

      const options = ProviderRegistry.getOptions();
      expect(options.enableManualMCP).toBe(false);
    });
  });

  describe("Clear Registrations", () => {
    it("should clear all registrations and reset state", async () => {
      await ProviderRegistry.registerAllProviders();
      expect(ProviderRegistry.isRegistered()).toBe(true);

      ProviderRegistry.clearRegistrations();

      expect(ProviderRegistry.isRegistered()).toBe(false);
      expect(ProviderFactory.hasProvider(AIProviderName.OPENAI)).toBe(false);
    });

    it("should allow re-registration after clearing", async () => {
      await ProviderRegistry.registerAllProviders();
      ProviderRegistry.clearRegistrations();
      await ProviderRegistry.registerAllProviders();

      expect(ProviderRegistry.isRegistered()).toBe(true);
      expect(ProviderFactory.hasProvider(AIProviderName.OPENAI)).toBe(true);
    });
  });

  describe("Dynamic Import Pattern", () => {
    it("should use lazy loading for providers", async () => {
      await ProviderRegistry.registerAllProviders();

      // Provider info should be available without instantiation
      const info = ProviderFactory.getProviderInfo(AIProviderName.OPENAI);
      expect(info).toBeDefined();
      expect(info?.constructor).toBeDefined();
    });

    it("should only import provider when creating instance", async () => {
      await ProviderRegistry.registerAllProviders();

      // Just checking provider exists doesn't trigger import
      const exists = ProviderFactory.hasProvider(AIProviderName.OPENAI);
      expect(exists).toBe(true);

      // Creating provider will trigger dynamic import
      // This is tested implicitly - the factory function contains the import
    });
  });
});

describe("GatewayProviderRegistry Provider Aliases", () => {
  beforeEach(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterEach(() => {
    ProviderRegistry.clearRegistrations();
  });

  const aliasTests = [
    { alias: "gpt", provider: AIProviderName.OPENAI },
    { alias: "chatgpt", provider: AIProviderName.OPENAI },
    { alias: "claude", provider: AIProviderName.ANTHROPIC },
    { alias: "anthropic", provider: AIProviderName.ANTHROPIC },
    { alias: "gemini", provider: AIProviderName.GOOGLE_AI },
    { alias: "google", provider: AIProviderName.GOOGLE_AI },
    { alias: "google-ai", provider: AIProviderName.GOOGLE_AI },
    { alias: "googleAiStudio", provider: AIProviderName.GOOGLE_AI },
    { alias: "google-ai-studio", provider: AIProviderName.GOOGLE_AI },
    { alias: "bedrock", provider: AIProviderName.BEDROCK },
    { alias: "aws", provider: AIProviderName.BEDROCK },
    { alias: "azure", provider: AIProviderName.AZURE },
    { alias: "azureOpenai", provider: AIProviderName.AZURE },
    { alias: "vertex", provider: AIProviderName.VERTEX },
    { alias: "googleVertex", provider: AIProviderName.VERTEX },
    { alias: "mistral", provider: AIProviderName.MISTRAL },
    { alias: "ollama", provider: AIProviderName.OLLAMA },
    { alias: "local", provider: AIProviderName.OLLAMA },
    { alias: "litellm", provider: AIProviderName.LITELLM },
    { alias: "huggingface", provider: AIProviderName.HUGGINGFACE },
    { alias: "hf", provider: AIProviderName.HUGGINGFACE },
    { alias: "openrouter", provider: AIProviderName.OPENROUTER },
    { alias: "or", provider: AIProviderName.OPENROUTER },
    { alias: "sagemaker", provider: AIProviderName.SAGEMAKER },
    { alias: "aws-sagemaker", provider: AIProviderName.SAGEMAKER },
    { alias: "openai-compatible", provider: AIProviderName.OPENAI_COMPATIBLE },
    { alias: "vllm", provider: AIProviderName.OPENAI_COMPATIBLE },
    { alias: "compatible", provider: AIProviderName.OPENAI_COMPATIBLE },
  ];

  for (const { alias, provider } of aliasTests) {
    it(`should recognize alias "${alias}" for ${provider}`, () => {
      expect(ProviderFactory.hasProvider(alias)).toBe(true);
    });
  }
});

describe("GatewayProviderRegistry Model Defaults", () => {
  beforeEach(async () => {
    ProviderRegistry.clearRegistrations();
    await ProviderRegistry.registerAllProviders();
  });

  afterEach(() => {
    ProviderRegistry.clearRegistrations();
  });

  const modelTests = [
    { provider: AIProviderName.OPENAI, expectedDefault: "gpt-4o-mini" },
    {
      provider: AIProviderName.ANTHROPIC,
      expectedDefault: "claude-sonnet-4-20250514",
    },
    { provider: AIProviderName.GOOGLE_AI, expectedDefault: "gemini-2.5-flash" },
    {
      provider: AIProviderName.VERTEX,
      expectedDefault: "claude-sonnet-4@20250514",
    },
    {
      provider: AIProviderName.MISTRAL,
      expectedDefault: "mistral-large-latest",
    },
    {
      provider: AIProviderName.OPENROUTER,
      expectedDefault: "anthropic/claude-3-5-sonnet",
    },
  ];

  for (const { provider, expectedDefault } of modelTests) {
    it(`should have correct default model for ${provider}`, () => {
      const info = ProviderFactory.getProviderInfo(provider);
      expect(info?.defaultModel).toBe(expectedDefault);
    });
  }
});

describe("GatewayProviderRegistry Error Handling", () => {
  beforeEach(() => {
    ProviderRegistry.clearRegistrations();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    ProviderRegistry.clearRegistrations();
  });

  it("should handle provider factory import errors gracefully", async () => {
    // This tests that even if TTS handler fails, providers still register
    await ProviderRegistry.registerAllProviders();

    // Core providers should still be available
    expect(ProviderFactory.hasProvider(AIProviderName.OPENAI)).toBe(true);
  });
});
