import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AIProviderFactory } from "../src/lib/core/factory.js";
import { dynamicModelProvider } from "../src/lib/core/dynamicModels.js";
import { logger } from "../src/lib/utils/logger.js";

// Mock dependencies
vi.mock("../src/lib/core/dynamicModels.js");
vi.mock("../src/lib/utils/logger.js");
vi.mock("../src/lib/factories/providerFactory.js");
vi.mock("../src/lib/factories/providerRegistry.js");

describe("AIProviderFactory Edge Cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Dynamic Model Provider Timeout Handling", () => {
    it("should handle initialization timeout gracefully", async () => {
      // Mock hanging initialization
      const mockInitialize = vi.mocked(dynamicModelProvider.initialize);
      mockInitialize.mockImplementation(
        () => new Promise<void>(() => {}), // Never resolves (simulates hanging)
      );

      const mockNeedsRefresh = vi.mocked(dynamicModelProvider.needsRefresh);
      mockNeedsRefresh.mockReturnValue(true);

      // Should not hang and should fallback gracefully
      const startTime = Date.now();

      try {
        await AIProviderFactory.createProvider("openai");
      } catch (error) {
        // Expected to potentially fail, but shouldn't hang
      }

      const elapsed = Date.now() - startTime;

      // Should complete within timeout window (10s + buffer)
      expect(elapsed).toBeLessThan(12000);

      // Should log warning about timeout
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Dynamic model provider initialization failed"),
        expect.objectContaining({
          fallback: "Using static model defaults",
        }),
      );
    });

    it("should continue working when dynamic models fail", async () => {
      const mockInitialize = vi.mocked(dynamicModelProvider.initialize);
      mockInitialize.mockRejectedValue(new Error("Network timeout"));

      const mockNeedsRefresh = vi.mocked(dynamicModelProvider.needsRefresh);
      mockNeedsRefresh.mockReturnValue(true);

      // Should not throw, should fallback to static models
      await expect(
        AIProviderFactory.createProvider("openai"),
      ).resolves.toBeDefined();
    });

    it("should handle dynamic model resolution errors", async () => {
      const mockResolveModel = vi.mocked(dynamicModelProvider.resolveModel);
      mockResolveModel.mockImplementation(() => {
        throw new Error("Model resolution failed");
      });

      const mockNeedsRefresh = vi.mocked(dynamicModelProvider.needsRefresh);
      mockNeedsRefresh.mockReturnValue(false);

      // Should fallback to static model name
      await expect(
        AIProviderFactory.createProvider("openai", "default"),
      ).resolves.toBeDefined();

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining(
          "Dynamic model resolution failed, using static fallback",
        ),
        expect.objectContaining({
          error: "Model resolution failed",
        }),
      );
    });
  });

  describe("Provider Normalization Edge Cases", () => {
    it("should handle invalid provider names", async () => {
      await expect(
        AIProviderFactory.createProvider("invalid-provider"),
      ).rejects.toThrow();
    });

    it("should handle empty provider names", async () => {
      await expect(AIProviderFactory.createProvider("")).rejects.toThrow();
    });

    it("should handle null provider names", async () => {
      // @ts-expect-error Testing runtime error handling
      await expect(AIProviderFactory.createProvider(null)).rejects.toThrow();
    });

    it("should handle case variations in provider names", async () => {
      // These should all be normalized to the same provider
      const providers = ["OpenAI", "OPENAI", "openai", "OpenAi"];

      for (const provider of providers) {
        await expect(
          AIProviderFactory.createProvider(provider),
        ).resolves.toBeDefined();
      }
    });
  });

  describe("Model Name Edge Cases", () => {
    it("should handle null model names", async () => {
      await expect(
        AIProviderFactory.createProvider("openai", null),
      ).resolves.toBeDefined();
    });

    it("should handle undefined model names", async () => {
      await expect(
        AIProviderFactory.createProvider("openai", undefined),
      ).resolves.toBeDefined();
    });

    it("should handle empty string model names", async () => {
      await expect(
        AIProviderFactory.createProvider("openai", ""),
      ).resolves.toBeDefined();
    });

    it("should handle very long model names", async () => {
      const longModelName = "x".repeat(1000);
      await expect(
        AIProviderFactory.createProvider("openai", longModelName),
      ).resolves.toBeDefined();
    });
  });

  describe("Fallback Provider Creation", () => {
    it("should handle primary provider failure gracefully", async () => {
      const result = await AIProviderFactory.createProviderWithFallback(
        "invalid-primary",
        "openai",
      );

      expect(result.fallback).toBeDefined();
    });

    it("should handle both providers failing", async () => {
      await expect(
        AIProviderFactory.createProviderWithFallback(
          "invalid-primary",
          "invalid-fallback",
        ),
      ).rejects.toThrow();
    });

    it("should handle same provider for both primary and fallback", async () => {
      const result = await AIProviderFactory.createProviderWithFallback(
        "openai",
        "openai",
      );

      expect(result.primary).toBeDefined();
      expect(result.fallback).toBeDefined();
    });
  });

  describe("Memory and Performance Edge Cases", () => {
    it("should handle rapid successive provider creation", async () => {
      const promises = Array.from({ length: 50 }, (_, i) =>
        AIProviderFactory.createProvider("openai", `model-${i}`),
      );

      const results = await Promise.allSettled(promises);

      // At least some should succeed
      const successful = results.filter((r) => r.status === "fulfilled");
      expect(successful.length).toBeGreaterThan(0);
    });

    it("should handle concurrent provider creation with same parameters", async () => {
      const promises = Array.from({ length: 10 }, () =>
        AIProviderFactory.createProvider("openai", "gpt-3.5-turbo"),
      );

      const results = await Promise.all(promises);

      // All should succeed and be valid providers
      results.forEach((provider) => {
        expect(provider).toBeDefined();
      });
    });
  });

  describe("Logging and Debugging", () => {
    it("should log provider creation steps", async () => {
      await AIProviderFactory.createProvider("openai");

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Provider creation started"),
        expect.objectContaining({
          providerName: "openai",
          enableMCP: true,
        }),
      );
    });

    it("should log errors with sufficient detail", async () => {
      try {
        await AIProviderFactory.createProvider("invalid-provider");
      } catch {
        // Expected to fail
      }

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Provider creation failed"),
        expect.objectContaining({
          providerName: "invalid-provider",
          error: expect.any(String),
        }),
      );
    });
  });
});
