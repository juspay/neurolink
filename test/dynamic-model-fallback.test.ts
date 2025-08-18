import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AIProviderFactory } from "../src/lib/core/factory.js";
import { dynamicModelProvider } from "../src/lib/core/dynamicModels.js";
import { getBestProvider } from "../src/lib/utils/providerUtils.js";
import { logger } from "../src/lib/utils/logger.js";

// Mock dependencies
vi.mock("../src/lib/core/dynamicModels.js");
vi.mock("../src/lib/utils/providerUtils.js");
vi.mock("../src/lib/utils/logger.js");
vi.mock("../src/lib/factories/providerFactory.js");
vi.mock("../src/lib/factories/providerRegistry.js");

describe("AIProviderFactory Dynamic Model Fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default successful mocks
    const mockDynamicProvider = vi.mocked(dynamicModelProvider);
    mockDynamicProvider.needsRefresh.mockReturnValue(false);
    mockDynamicProvider.initialize.mockResolvedValue(undefined);
    mockDynamicProvider.resolveModel.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Dynamic Model Resolution Fallback", () => {
    it("should fallback to static model when dynamic resolution returns null", async () => {
      const mockDynamicProvider = vi.mocked(dynamicModelProvider);
      mockDynamicProvider.needsRefresh.mockReturnValue(false);
      mockDynamicProvider.resolveModel.mockReturnValue(null);

      await AIProviderFactory.createProvider("openai", "default");

      // Should continue with static model resolution
      expect(mockDynamicProvider.resolveModel).toHaveBeenCalledWith(
        "openai",
        undefined,
      );

      // Should not log any dynamic model resolution
      expect(logger.debug).not.toHaveBeenCalledWith(
        expect.stringContaining("Resolved dynamic model"),
      );
    });

    it("should use dynamic model when resolution succeeds", async () => {
      const mockDynamicProvider = vi.mocked(dynamicModelProvider);
      mockDynamicProvider.needsRefresh.mockReturnValue(false);
      mockDynamicProvider.resolveModel.mockReturnValue({
        id: "gpt-4-turbo-2024",
        displayName: "GPT-4 Turbo 2024",
        capabilities: ["functionCalling", "vision"],
        deprecated: false,
        pricing: { input: 0.01, output: 0.03 },
        contextWindow: 128000,
        releaseDate: "2024-04-09",
      });

      await AIProviderFactory.createProvider("openai");

      expect(mockDynamicProvider.resolveModel).toHaveBeenCalledWith(
        "openai",
        undefined,
      );

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Resolved dynamic model"),
        expect.objectContaining({
          provider: "openai",
          requestedModel: "default",
          resolvedModel: "gpt-4-turbo-2024",
          displayName: "GPT-4 Turbo 2024",
        }),
      );
    });

    it("should skip dynamic resolution when specific model provided", async () => {
      const mockDynamicProvider = vi.mocked(dynamicModelProvider);

      await AIProviderFactory.createProvider("openai", "gpt-3.5-turbo");

      // Should not attempt dynamic resolution for specific models
      expect(mockDynamicProvider.needsRefresh).not.toHaveBeenCalled();
      expect(mockDynamicProvider.resolveModel).not.toHaveBeenCalled();
    });

    it("should handle dynamic resolution with refresh needed", async () => {
      const mockDynamicProvider = vi.mocked(dynamicModelProvider);
      mockDynamicProvider.needsRefresh.mockReturnValue(true);
      mockDynamicProvider.initialize.mockResolvedValue(undefined);
      mockDynamicProvider.resolveModel.mockReturnValue({
        id: "claude-3-opus",
        displayName: "Claude 3 Opus",
        capabilities: ["functionCalling", "reasoning"],
        deprecated: false,
        pricing: { input: 0.015, output: 0.075 },
        contextWindow: 200000,
        releaseDate: "2024-02-20",
      });

      await AIProviderFactory.createProvider("anthropic");

      expect(mockDynamicProvider.needsRefresh).toHaveBeenCalled();
      expect(mockDynamicProvider.initialize).toHaveBeenCalled();
      expect(mockDynamicProvider.resolveModel).toHaveBeenCalledWith(
        "anthropic",
        undefined,
      );

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining(
          "Dynamic model provider initialized successfully",
        ),
      );
    });
  });

  describe("Best Provider Selection Fallback", () => {
    it("should use best provider when no specific provider requested", async () => {
      const mockGetBestProvider = vi.mocked(getBestProvider);
      mockGetBestProvider.mockResolvedValue("google-ai");

      await AIProviderFactory.createBestProvider();

      expect(mockGetBestProvider).toHaveBeenCalledWith(undefined);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Best provider selected"),
        expect.objectContaining({
          requestedProvider: "auto",
          selectedProvider: "google-ai",
        }),
      );
    });

    it("should use requested provider when specified", async () => {
      const mockGetBestProvider = vi.mocked(getBestProvider);
      mockGetBestProvider.mockResolvedValue("openai");

      await AIProviderFactory.createBestProvider("openai");

      expect(mockGetBestProvider).toHaveBeenCalledWith("openai");

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Best provider selected"),
        expect.objectContaining({
          requestedProvider: "openai",
          selectedProvider: "openai",
        }),
      );
    });

    it("should handle best provider selection failure", async () => {
      const mockGetBestProvider = vi.mocked(getBestProvider);
      mockGetBestProvider.mockRejectedValue(
        new Error("No providers available"),
      );

      await expect(
        AIProviderFactory.createBestProvider("unavailable-provider"),
      ).rejects.toThrow("No providers available");

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Best provider selection failed"),
        expect.objectContaining({
          requestedProvider: "unavailable-provider",
          error: "No providers available",
        }),
      );
    });

    it("should fallback to alternative provider when primary fails", async () => {
      const mockGetBestProvider = vi.mocked(getBestProvider);
      mockGetBestProvider
        .mockRejectedValueOnce(new Error("Primary provider unavailable"))
        .mockResolvedValueOnce("google-ai");

      // First call should fail, but we can test fallback behavior in createProviderWithFallback
      try {
        await AIProviderFactory.createBestProvider("openai");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      // Test successful fallback
      const fallbackResult =
        await AIProviderFactory.createBestProvider("google-ai");
      expect(fallbackResult).toBeDefined();
    });
  });

  describe("Provider Factory Integration Fallback", () => {
    it("should handle provider factory normalization failures", async () => {
      // This tests the normalization fallback in createProvider
      await AIProviderFactory.createProvider("Unknown-Provider-123");

      // Should attempt to normalize and use the result
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Provider creation started"),
        expect.objectContaining({
          providerName: "Unknown-Provider-123",
        }),
      );
    });

    it("should preserve original provider name when normalization fails", async () => {
      // Test that the factory handles unknown providers gracefully
      try {
        await AIProviderFactory.createProvider("completely-unknown-provider");
      } catch (error) {
        // Expected to potentially fail
      }

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Provider creation started"),
        expect.objectContaining({
          providerName: "completely-unknown-provider",
        }),
      );
    });
  });

  describe("Model Name Resolution Fallback Chain", () => {
    it("should handle complex fallback chain: dynamic -> static -> default", async () => {
      const mockDynamicProvider = vi.mocked(dynamicModelProvider);

      // Test 1: Dynamic resolution fails, should fallback to static
      mockDynamicProvider.needsRefresh.mockReturnValue(true);
      mockDynamicProvider.initialize.mockRejectedValue(
        new Error("Dynamic init failed"),
      );

      await AIProviderFactory.createProvider("openai"); // No model = default

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Dynamic model provider initialization failed"),
        expect.objectContaining({
          error: "Dynamic init failed",
          fallback: "Using static model defaults",
        }),
      );
    });

    it("should handle partial dynamic failure with successful resolution", async () => {
      const mockDynamicProvider = vi.mocked(dynamicModelProvider);

      // Init fails but model resolution works (cached data)
      mockDynamicProvider.needsRefresh.mockReturnValue(true);
      mockDynamicProvider.initialize.mockRejectedValue(
        new Error("Network timeout"),
      );
      mockDynamicProvider.resolveModel.mockReturnValue({
        id: "cached-model",
        displayName: "Cached Model",
        capabilities: ["functionCalling"],
        deprecated: false,
        pricing: { input: 0.01, output: 0.03 },
        contextWindow: 128000,
        releaseDate: "2024-01-01",
      });

      await AIProviderFactory.createProvider("openai");

      // Should warn about init failure but still use cached resolution
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Dynamic model provider initialization failed"),
      );

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Resolved dynamic model"),
        expect.objectContaining({
          resolvedModel: "cached-model",
        }),
      );
    });

    it('should handle "default" model name conversion', async () => {
      const mockDynamicProvider = vi.mocked(dynamicModelProvider);
      mockDynamicProvider.needsRefresh.mockReturnValue(false);
      mockDynamicProvider.resolveModel.mockReturnValue(null);

      await AIProviderFactory.createProvider("openai", "default");

      // "default" should be converted to undefined for dynamic resolution
      expect(mockDynamicProvider.resolveModel).toHaveBeenCalledWith(
        "openai",
        undefined,
      );
    });

    it("should handle null model name gracefully", async () => {
      const mockDynamicProvider = vi.mocked(dynamicModelProvider);
      mockDynamicProvider.needsRefresh.mockReturnValue(false);
      mockDynamicProvider.resolveModel.mockReturnValue(null);

      await AIProviderFactory.createProvider("openai", null);

      // null should be treated as default model request
      expect(mockDynamicProvider.resolveModel).toHaveBeenCalledWith(
        "openai",
        undefined,
      );
    });
  });

  describe("Error Recovery and Graceful Degradation", () => {
    it("should continue working when all dynamic features fail", async () => {
      const mockDynamicProvider = vi.mocked(dynamicModelProvider);

      // Simulate complete dynamic model failure
      mockDynamicProvider.needsRefresh.mockReturnValue(true);
      mockDynamicProvider.initialize.mockRejectedValue(
        new Error("Complete failure"),
      );
      mockDynamicProvider.resolveModel.mockImplementation(() => {
        throw new Error("Resolution also failed");
      });

      // Should still create provider with static fallback
      const provider = await AIProviderFactory.createProvider("openai");

      expect(provider).toBeDefined();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Dynamic model provider initialization failed"),
      );

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining(
          "Dynamic model resolution failed, using static fallback",
        ),
      );
    });

    it("should maintain functionality with partial dynamic features", async () => {
      const mockDynamicProvider = vi.mocked(dynamicModelProvider);

      // Init succeeds but resolution fails
      mockDynamicProvider.needsRefresh.mockReturnValue(true);
      mockDynamicProvider.initialize.mockResolvedValue(undefined);
      mockDynamicProvider.resolveModel.mockImplementation(() => {
        throw new Error("Model lookup failed");
      });

      const provider = await AIProviderFactory.createProvider("openai");

      expect(provider).toBeDefined();

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining(
          "Dynamic model provider initialized successfully",
        ),
      );

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining(
          "Dynamic model resolution failed, using static fallback",
        ),
      );
    });

    it("should handle provider creation with SDK parameter fallback", async () => {
      const customSdk = { customOption: "value" };

      const provider = await AIProviderFactory.createProvider(
        "openai",
        "gpt-4",
        true,
        customSdk,
      );

      expect(provider).toBeDefined();

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Provider creation started"),
        expect.objectContaining({
          providerName: "openai",
          modelName: "gpt-4",
          enableMCP: true,
        }),
      );
    });
  });

  describe("Logging and Monitoring Fallback Scenarios", () => {
    it("should log all fallback steps for debugging", async () => {
      const mockDynamicProvider = vi.mocked(dynamicModelProvider);

      mockDynamicProvider.needsRefresh.mockReturnValue(true);
      mockDynamicProvider.initialize.mockRejectedValue(
        new Error("Init timeout"),
      );
      mockDynamicProvider.resolveModel.mockImplementation(() => {
        throw new Error("Resolution failed");
      });

      await AIProviderFactory.createProvider("openai");

      // Should log the complete fallback chain
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Dynamic model provider initialization failed"),
        expect.objectContaining({
          error: "Init timeout",
          fallback: "Using static model defaults",
        }),
      );

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining(
          "Dynamic model resolution failed, using static fallback",
        ),
        expect.objectContaining({
          error: "Resolution failed",
        }),
      );
    });

    it("should track successful fallback recovery", async () => {
      const mockDynamicProvider = vi.mocked(dynamicModelProvider);

      // First provider fails, fallback succeeds
      await AIProviderFactory.createProviderWithFallback(
        "invalid-primary",
        "openai",
      );

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Fallback provider setup started"),
        expect.objectContaining({
          primaryProvider: "invalid-primary",
          fallbackProvider: "openai",
        }),
      );
    });

    it("should provide detailed error context for debugging", async () => {
      try {
        await AIProviderFactory.createProvider("completely-invalid");
      } catch (error) {
        // Expected to fail
      }

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Provider creation failed"),
        expect.objectContaining({
          providerName: "completely-invalid",
          modelName: "default",
        }),
      );
    });
  });
});
