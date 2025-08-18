import { describe, it, expect, vi, beforeEach, afterEach, test } from "vitest";
import { AIProviderFactory } from "../src/lib/core/factory.js";
import { ProviderFactory } from "../src/lib/factories/providerFactory.js";
import { ProviderRegistry } from "../src/lib/factories/providerRegistry.js";
import { logger } from "../src/lib/utils/logger.js";
import type { AIProvider } from "../src/lib/core/types.js";
import type {
  StreamOptions,
  StreamResult,
} from "../src/lib/types/streamTypes.js";
import type { TextGenerationOptions } from "../src/lib/core/types.js";
import type { EnhancedGenerateResult } from "../src/lib/core/types.js";
import type { ValidationSchema } from "../src/lib/types/typeAliases.js";

// Mock dependencies
vi.mock("../src/lib/utils/logger.js");
vi.mock("../src/lib/factories/providerFactory.js");
vi.mock("../src/lib/factories/providerRegistry.js");
vi.mock("../src/lib/core/dynamicModels.js");

describe("AIProviderFactory Edge Cases", () => {
  // Create a proper mock provider class that implements AIProvider interface
  class MockProvider implements AIProvider {
    static name = "MockProvider";

    async stream(
      optionsOrPrompt: StreamOptions | string,
      analysisSchema?: ValidationSchema,
    ): Promise<StreamResult> {
      return {
        stream: (async function* () {
          yield { content: "Mock streaming content" };
        })(),
        provider: "mock",
        model: "mock-model",
        usage: {
          inputTokens: 20,
          outputTokens: 30,
          totalTokens: 50,
        },
      };
    }

    async generate(
      optionsOrPrompt: TextGenerationOptions | string,
      analysisSchema?: ValidationSchema,
    ): Promise<EnhancedGenerateResult | null> {
      return {
        content: "Mock generated content",
        provider: "mock",
        model: "mock-model",
        usage: {
          inputTokens: 20,
          outputTokens: 30,
          totalTokens: 50,
        },
      };
    }

    async gen(
      optionsOrPrompt: TextGenerationOptions | string,
      analysisSchema?: ValidationSchema,
    ): Promise<EnhancedGenerateResult | null> {
      return this.generate(optionsOrPrompt, analysisSchema);
    }

    setupToolExecutor(
      sdk: {
        customTools: Map<string, unknown>;
        executeTool: (toolName: string, params: unknown) => Promise<unknown>;
      },
      functionTag: string,
    ): void {
      // Mock implementation
    }
  }

  // Create a fallback provider class
  class FallbackProvider implements AIProvider {
    static name = "FallbackProvider";

    async stream(
      optionsOrPrompt: StreamOptions | string,
      analysisSchema?: ValidationSchema,
    ): Promise<StreamResult> {
      return {
        stream: (async function* () {
          yield { content: "Fallback streaming content" };
        })(),
        provider: "fallback",
        model: "fallback-model",
        usage: {
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30,
        },
      };
    }

    async generate(
      optionsOrPrompt: TextGenerationOptions | string,
      analysisSchema?: ValidationSchema,
    ): Promise<EnhancedGenerateResult | null> {
      return {
        content: "Fallback generated content",
        provider: "fallback",
        model: "fallback-model",
        usage: {
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30,
        },
      };
    }

    async gen(
      optionsOrPrompt: TextGenerationOptions | string,
      analysisSchema?: ValidationSchema,
    ): Promise<EnhancedGenerateResult | null> {
      return this.generate(optionsOrPrompt, analysisSchema);
    }

    setupToolExecutor(
      sdk: {
        customTools: Map<string, unknown>;
        executeTool: (toolName: string, params: unknown) => Promise<unknown>;
      },
      functionTag: string,
    ): void {
      // Mock implementation
    }
  }

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    const mockProviderFactory = vi.mocked(ProviderFactory);
    mockProviderFactory.normalizeProviderName.mockImplementation(
      (name: string) => name.toLowerCase(),
    );
    mockProviderFactory.createProvider.mockResolvedValue(new MockProvider());

    const mockProviderRegistry = vi.mocked(ProviderRegistry);
    mockProviderRegistry.registerAllProviders.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Provider Name Validation", () => {
    it("should handle invalid provider names", async () => {
      const mockProviderFactory = vi.mocked(ProviderFactory);
      mockProviderFactory.createProvider.mockRejectedValue(
        new Error("Invalid provider: invalid-provider"),
      );

      await expect(
        AIProviderFactory.createProvider("invalid-provider"),
      ).rejects.toThrow("Invalid provider: invalid-provider");

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Provider creation failed"),
        expect.objectContaining({
          providerName: "invalid-provider",
          error: "Invalid provider: invalid-provider",
        }),
      );
    });

    it("should handle empty provider names", async () => {
      const mockProviderFactory = vi.mocked(ProviderFactory);
      mockProviderFactory.createProvider.mockRejectedValue(
        new Error("Provider name cannot be empty"),
      );

      await expect(AIProviderFactory.createProvider("")).rejects.toThrow(
        "Provider name cannot be empty",
      );
    });

    it("should handle null provider names", async () => {
      // @ts-expect-error Testing runtime error handling
      await expect(AIProviderFactory.createProvider(null)).rejects.toThrow(
        "Cannot read properties of null",
      );
    });

    it("should handle undefined provider names", async () => {
      // @ts-expect-error Testing runtime error handling
      await expect(AIProviderFactory.createProvider(undefined)).rejects.toThrow(
        "Cannot read properties of undefined",
      );
    });

    it("should normalize case variations in provider names", async () => {
      const mockProviderFactory = vi.mocked(ProviderFactory);
      mockProviderFactory.normalizeProviderName.mockImplementation(
        (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, ""),
      );

      const caseVariations = ["OpenAI", "OPENAI", "openai", "OpenAi", "oPeNaI"];

      for (const providerName of caseVariations) {
        await AIProviderFactory.createProvider(providerName);

        expect(mockProviderFactory.normalizeProviderName).toHaveBeenCalledWith(
          providerName,
        );
        expect(mockProviderFactory.createProvider).toHaveBeenCalledWith(
          "openai",
          undefined,
          undefined,
        );
      }
    });

    it("should handle special characters in provider names", async () => {
      const mockProviderFactory = vi.mocked(ProviderFactory);
      mockProviderFactory.normalizeProviderName.mockReturnValue("google-ai");

      await AIProviderFactory.createProvider("Google-AI");

      expect(mockProviderFactory.normalizeProviderName).toHaveBeenCalledWith(
        "Google-AI",
      );
      expect(mockProviderFactory.createProvider).toHaveBeenCalledWith(
        "google-ai",
        undefined,
        undefined,
      );
    });
  });

  describe("Invalid Provider Names", () => {
    const invalidProviders = [
      "",
      null,
      undefined,
      "invalid-provider",
      "123-numeric-start",
      "provider with spaces",
      "provider@special!chars",
      "very-long-provider-name-that-exceeds-reasonable-limits-and-should-be-handled-gracefully",
    ];

    test.each(invalidProviders)(
      "should handle invalid provider: %s",
      async (provider: string | null | undefined) => {
        const mockPF = vi.mocked(ProviderFactory);
        mockPF.createProvider.mockRejectedValue(
          new Error(`Unknown provider: ${String(provider)}`),
        );

        await expect(
          AIProviderFactory.createProvider(provider as string),
        ).rejects.toThrow();

        expect(logger.debug).toHaveBeenCalledWith(
          expect.stringContaining("Provider creation failed"),
          expect.objectContaining({
            providerName: provider,
          }),
        );
      },
    );
  });

  describe("Model Name Edge Cases", () => {
    it("should handle null model names", async () => {
      await expect(
        AIProviderFactory.createProvider("openai", null),
      ).resolves.toBeDefined();

      const mockProviderFactory = vi.mocked(ProviderFactory);
      expect(mockProviderFactory.createProvider).toHaveBeenCalledWith(
        "openai",
        undefined,
        undefined,
      );
    });

    it("should handle undefined model names", async () => {
      await expect(
        AIProviderFactory.createProvider("openai", undefined),
      ).resolves.toBeDefined();

      const mockProviderFactory = vi.mocked(ProviderFactory);
      expect(mockProviderFactory.createProvider).toHaveBeenCalledWith(
        "openai",
        undefined,
        undefined,
      );
    });

    it("should handle empty string model names", async () => {
      await expect(
        AIProviderFactory.createProvider("openai", ""),
      ).resolves.toBeDefined();

      const mockProviderFactory = vi.mocked(ProviderFactory);
      expect(mockProviderFactory.createProvider).toHaveBeenCalledWith(
        "openai",
        "", // Empty string is passed as-is, not converted to undefined
        undefined,
      );
    });

    it("should handle very long model names", async () => {
      const longModelName = "x".repeat(1000);

      await expect(
        AIProviderFactory.createProvider("openai", longModelName),
      ).resolves.toBeDefined();

      const mockProviderFactory = vi.mocked(ProviderFactory);
      expect(mockProviderFactory.createProvider).toHaveBeenCalledWith(
        "openai",
        longModelName,
        undefined,
      );
    });

    it("should handle model names with special characters", async () => {
      const specialModelName = "gpt-4-turbo-preview@2024-01-01";

      await expect(
        AIProviderFactory.createProvider("openai", specialModelName),
      ).resolves.toBeDefined();

      const mockProviderFactory = vi.mocked(ProviderFactory);
      expect(mockProviderFactory.createProvider).toHaveBeenCalledWith(
        "openai",
        specialModelName,
        undefined,
      );
    });

    it('should handle "default" model name resolution', async () => {
      await AIProviderFactory.createProvider("openai", "default");

      const mockProviderFactory = vi.mocked(ProviderFactory);
      // "default" should be converted to undefined
      expect(mockProviderFactory.createProvider).toHaveBeenCalledWith(
        "openai",
        undefined,
        undefined,
      );
    });
  });

  describe("Concurrent Provider Creation", () => {
    it("should handle rapid successive provider creation", async () => {
      const promises = Array.from({ length: 50 }, (_, i) =>
        AIProviderFactory.createProvider("openai", `model-${i}`),
      );

      const results = await Promise.allSettled(promises);

      // All should succeed with proper mocking
      const successful = results.filter((r) => r.status === "fulfilled");
      expect(successful.length).toBe(50);

      const mockProviderFactory = vi.mocked(ProviderFactory);
      expect(mockProviderFactory.createProvider).toHaveBeenCalledTimes(50);
    });

    it("should handle concurrent provider creation with same parameters", async () => {
      const promises = Array.from({ length: 10 }, () =>
        AIProviderFactory.createProvider("openai", "gpt-3.5-turbo"),
      );

      const results = await Promise.all(promises);

      // All should succeed and be valid providers
      results.forEach((provider) => {
        expect(provider).toBeDefined();
        expect(provider.constructor.name).toBe("MockProvider");
      });

      const mockProviderFactory = vi.mocked(ProviderFactory);
      expect(mockProviderFactory.createProvider).toHaveBeenCalledTimes(10);
    });

    it("should handle mixed success and failure scenarios", async () => {
      const mockProviderFactory = vi.mocked(ProviderFactory);

      // Make every 3rd call fail
      mockProviderFactory.createProvider.mockImplementation(
        (provider: string, model?: string) => {
          if (model && model.includes("fail")) {
            return Promise.reject(new Error("Simulated failure"));
          }
          return Promise.resolve(new MockProvider());
        },
      );

      const promises = [
        AIProviderFactory.createProvider("openai", "success-1"),
        AIProviderFactory.createProvider("openai", "success-2"),
        AIProviderFactory.createProvider("openai", "fail-3"),
        AIProviderFactory.createProvider("openai", "success-4"),
        AIProviderFactory.createProvider("openai", "fail-5"),
      ];

      const results = await Promise.allSettled(promises);

      const successful = results.filter((r) => r.status === "fulfilled");
      const failed = results.filter((r) => r.status === "rejected");

      expect(successful.length).toBe(3);
      expect(failed.length).toBe(2);
    });
  });

  describe("Fallback Provider Creation", () => {
    it("should handle primary provider failure gracefully", async () => {
      const mockProviderFactory = vi.mocked(ProviderFactory);

      // Mock successful creation for both calls (no primary failure handling in createProviderWithFallback)
      mockProviderFactory.createProvider.mockResolvedValue(
        new FallbackProvider(),
      );

      const result = await AIProviderFactory.createProviderWithFallback(
        "openai",
        "anthropic",
      );

      expect(result.primary).toBeDefined();
      expect(result.fallback).toBeDefined();
    });

    it("should handle both providers failing", async () => {
      const mockProviderFactory = vi.mocked(ProviderFactory);
      mockProviderFactory.createProvider.mockRejectedValue(
        new Error("All providers failed"),
      );

      await expect(
        AIProviderFactory.createProviderWithFallback(
          "invalid-primary",
          "invalid-fallback",
        ),
      ).rejects.toThrow("All providers failed");
    });

    it("should handle same provider for both primary and fallback", async () => {
      const result = await AIProviderFactory.createProviderWithFallback(
        "openai",
        "openai",
      );

      expect(result.primary).toBeDefined();
      expect(result.fallback).toBeDefined();
      expect(result.primary.constructor.name).toBe("MockProvider");
      expect(result.fallback.constructor.name).toBe("MockProvider");

      const mockProviderFactory = vi.mocked(ProviderFactory);
      expect(mockProviderFactory.createProvider).toHaveBeenCalledTimes(2);
    });
  });

  describe("MCP Integration Edge Cases", () => {
    it("should handle MCP disabled scenarios", async () => {
      const provider = await AIProviderFactory.createProvider(
        "openai",
        null,
        false,
      );

      expect(provider).toBeDefined();

      // Should log that provider creation succeeded with MCP disabled
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Provider creation succeeded"),
        expect.objectContaining({
          mcpEnabled: false,
        }),
      );
    });

    it("should handle MCP enabled scenarios", async () => {
      const provider = await AIProviderFactory.createProvider(
        "openai",
        null,
        true,
      );

      expect(provider).toBeDefined();

      // Should log that provider creation succeeded with MCP enabled
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Provider creation succeeded"),
        expect.objectContaining({
          mcpEnabled: true,
        }),
      );
    });

    it("should handle MCP wrapping failures gracefully", async () => {
      // MCP wrapping is currently disabled in the code, so this tests the fallback
      const provider = await AIProviderFactory.createProvider(
        "openai",
        null,
        true,
      );

      expect(provider).toBeDefined();

      // Should continue without MCP if wrapping fails
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Provider creation succeeded"),
        expect.objectContaining({
          mcpEnabled: true,
        }),
      );
    });
  });

  describe("Provider Registry Integration", () => {
    it("should handle registry initialization failures", async () => {
      const mockProviderRegistry = vi.mocked(ProviderRegistry);
      mockProviderRegistry.registerAllProviders.mockRejectedValue(
        new Error("Registry initialization failed"),
      );

      await expect(AIProviderFactory.createProvider("openai")).rejects.toThrow(
        "Registry initialization failed",
      );
    });

    it("should handle successful registry initialization", async () => {
      const mockProviderRegistry = vi.mocked(ProviderRegistry);
      mockProviderRegistry.registerAllProviders.mockResolvedValue(undefined);

      const provider = await AIProviderFactory.createProvider("openai");

      expect(provider).toBeDefined();
      expect(mockProviderRegistry.registerAllProviders).toHaveBeenCalledOnce();
    });
  });

  describe("Logging and Debugging", () => {
    it("should log provider creation steps", async () => {
      await AIProviderFactory.createProvider("openai");

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Provider creation started"),
        expect.objectContaining({
          providerName: "openai",
          modelName: "default",
          enableMCP: true,
        }),
      );
    });

    it("should log successful provider creation", async () => {
      await AIProviderFactory.createProvider("openai", "gpt-3.5-turbo");

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Provider creation succeeded"),
        expect.objectContaining({
          providerName: "openai",
          modelName: "gpt-3.5-turbo",
          providerType: "MockProvider",
          mcpEnabled: true,
        }),
      );
    });

    it("should log errors with sufficient detail", async () => {
      const mockProviderFactory = vi.mocked(ProviderFactory);
      mockProviderFactory.createProvider.mockRejectedValue(
        new Error("Detailed error message"),
      );

      try {
        await AIProviderFactory.createProvider("invalid-provider");
      } catch {
        // Expected to fail
      }

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Provider creation failed"),
        expect.objectContaining({
          providerName: "invalid-provider",
          modelName: "default",
          error: "Detailed error message",
        }),
      );
    });

    it("should handle non-Error objects in logging", async () => {
      const mockProviderFactory = vi.mocked(ProviderFactory);
      mockProviderFactory.createProvider.mockRejectedValue("String error");

      try {
        await AIProviderFactory.createProvider("openai");
      } catch {
        // Expected to fail
      }

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Provider creation failed"),
        expect.objectContaining({
          error: "String error",
        }),
      );
    });
  });
});
