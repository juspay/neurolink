import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AIProviderFactory } from "../src/lib/core/factory.js";
import { dynamicModelProvider } from "../src/lib/core/dynamicModels.js";
import { logger } from "../src/lib/utils/logger.js";
import { ProviderFactory } from "../src/lib/factories/providerFactory.js";
import type { AIProvider } from "../src/lib/core/types.js";

// Mock dependencies
vi.mock("../src/lib/core/dynamicModels.js");
vi.mock("../src/lib/utils/logger.js");
vi.mock("../src/lib/factories/providerFactory.js");
vi.mock("../src/lib/factories/providerRegistry.js");

describe("AIProviderFactory Timeout Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Add default stub for ProviderFactory.createProvider so tests don't return undefined
    const mockPF = vi.mocked(ProviderFactory);
    mockPF.createProvider.mockResolvedValue({
      provider: "mock-provider",
      model: "mock-model",
      generate: vi.fn(),
      stream: vi.fn(),
      setupToolExecutor: vi.fn(),
    } as AIProvider);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Dynamic Model Provider Timeout Protection", () => {
    it("should handle initialization timeout gracefully within 10 seconds", async () => {
      vi.useFakeTimers();
      // Mock hanging initialization with controllable timeout
      const mockInitialize = vi.mocked(dynamicModelProvider.initialize);
      mockInitialize.mockImplementation(
        () => new Promise<void>((resolve) => setTimeout(resolve, 15000)), // Resolves after 15s (simulates hanging, but always completes)
      );

      const mockNeedsRefresh = vi.mocked(dynamicModelProvider.needsRefresh);
      mockNeedsRefresh.mockReturnValue(true);

      // Start and then advance timers to trigger timeout path
      const promise = AIProviderFactory.createProvider("openai");
      await vi.advanceTimersByTimeAsync(11000);
      await promise.catch(() => {});
      vi.useRealTimers();

      // Should log warning about timeout and graceful fallback
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Dynamic model provider initialization failed"),
        expect.objectContaining({
          fallback: "Using static model defaults",
        }),
      );
    });

    it("should continue working when dynamic model initialization fails", async () => {
      const mockInitialize = vi.mocked(dynamicModelProvider.initialize);
      mockInitialize.mockRejectedValue(new Error("Network timeout"));

      const mockNeedsRefresh = vi.mocked(dynamicModelProvider.needsRefresh);
      mockNeedsRefresh.mockReturnValue(true);

      // Should not throw, should fallback to static models
      await expect(
        AIProviderFactory.createProvider("openai"),
      ).resolves.toBeDefined();

      // Should log the failure but continue
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Dynamic model provider initialization failed"),
        expect.objectContaining({
          error: "Network timeout",
          fallback: "Using static model defaults",
        }),
      );
    });

    it("should handle dynamic model resolution errors gracefully", async () => {
      const mockResolveModel = vi.mocked(dynamicModelProvider.resolveModel);
      mockResolveModel.mockImplementation(() => {
        throw new Error("Model resolution failed");
      });

      const mockNeedsRefresh = vi.mocked(dynamicModelProvider.needsRefresh);
      mockNeedsRefresh.mockReturnValue(false);

      // Should fallback to static model name
      await expect(
        AIProviderFactory.createProvider("openai", "gpt-3.5-turbo"),
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

    it("should skip initialization when refresh not needed", async () => {
      const mockInitialize = vi.mocked(dynamicModelProvider.initialize);
      const mockNeedsRefresh = vi.mocked(dynamicModelProvider.needsRefresh);
      mockNeedsRefresh.mockReturnValue(false);

      await AIProviderFactory.createProvider("openai");

      // Should not call initialize when refresh is not needed
      expect(mockInitialize).not.toHaveBeenCalled();
    });

    it("should handle successful dynamic model resolution", async () => {
      const mockInitialize = vi.mocked(dynamicModelProvider.initialize);
      mockInitialize.mockResolvedValue(undefined);

      const mockNeedsRefresh = vi.mocked(dynamicModelProvider.needsRefresh);
      mockNeedsRefresh.mockReturnValue(true);

      const mockResolveModel = vi.mocked(dynamicModelProvider.resolveModel);
      mockResolveModel.mockReturnValue({
        id: "gpt-4-turbo",
        displayName: "GPT-4 Turbo",
        capabilities: ["functionCalling", "vision"],
        deprecated: false,
        pricing: { input: 0.01, output: 0.03 },
        contextWindow: 128000,
        releaseDate: "2024-04-09",
      });

      await AIProviderFactory.createProvider("openai");

      expect(mockInitialize).toHaveBeenCalledOnce();
      expect(mockResolveModel).toHaveBeenCalledWith("openai", undefined);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Resolved dynamic model"),
        expect.objectContaining({
          provider: "openai",
          requestedModel: "default",
          resolvedModel: "gpt-4-turbo",
          displayName: "GPT-4 Turbo",
        }),
      );
    });
  });

  describe("Timeout Race Condition Handling", () => {
    it("should win race when initialization completes quickly", async () => {
      vi.useFakeTimers();
      const mockInitialize = vi.mocked(dynamicModelProvider.initialize);
      mockInitialize.mockImplementation(
        () => new Promise<void>((resolve) => setTimeout(resolve, 100)), // Quick completion
      );

      const mockNeedsRefresh = vi.mocked(dynamicModelProvider.needsRefresh);
      mockNeedsRefresh.mockReturnValue(true);

      // Start provider creation and advance timers to simulate quick completion
      const promise = AIProviderFactory.createProvider("openai");
      await vi.advanceTimersByTimeAsync(200); // Advance past the 100ms timeout
      await promise;
      vi.useRealTimers();

      // Should complete without timeout
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining(
          "Dynamic model provider initialized successfully",
        ),
      );
    });

    it("should timeout when initialization takes too long", async () => {
      vi.useFakeTimers();
      const mockInitialize = vi.mocked(dynamicModelProvider.initialize);
      mockInitialize.mockImplementation(
        () => new Promise<void>((resolve) => setTimeout(resolve, 15000)), // 15 seconds - too long
      );

      const mockNeedsRefresh = vi.mocked(dynamicModelProvider.needsRefresh);
      mockNeedsRefresh.mockReturnValue(true);

      // Start and then advance timers to trigger timeout
      const promise = AIProviderFactory.createProvider("openai");
      await vi.advanceTimersByTimeAsync(11000);
      await promise.catch(() => {});
      vi.useRealTimers();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Dynamic model provider initialization failed"),
        expect.objectContaining({
          error: expect.stringContaining("timeout"),
          fallback: "Using static model defaults",
        }),
      );
    });
  });

  describe("Error Message Handling", () => {
    it("should handle Error objects properly", async () => {
      const mockInitialize = vi.mocked(dynamicModelProvider.initialize);
      mockInitialize.mockRejectedValue(new Error("Specific error message"));

      const mockNeedsRefresh = vi.mocked(dynamicModelProvider.needsRefresh);
      mockNeedsRefresh.mockReturnValue(true);

      await AIProviderFactory.createProvider("openai");

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Dynamic model provider initialization failed"),
        expect.objectContaining({
          error: "Specific error message",
        }),
      );
    });

    it("should handle non-Error objects properly", async () => {
      const mockInitialize = vi.mocked(dynamicModelProvider.initialize);
      mockInitialize.mockRejectedValue("String error");

      const mockNeedsRefresh = vi.mocked(dynamicModelProvider.needsRefresh);
      mockNeedsRefresh.mockReturnValue(true);

      await AIProviderFactory.createProvider("openai");

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Dynamic model provider initialization failed"),
        expect.objectContaining({
          error: "String error",
        }),
      );
    });

    it("should handle undefined/null errors gracefully", async () => {
      const mockInitialize = vi.mocked(dynamicModelProvider.initialize);
      mockInitialize.mockRejectedValue(null);

      const mockNeedsRefresh = vi.mocked(dynamicModelProvider.needsRefresh);
      mockNeedsRefresh.mockReturnValue(true);

      await AIProviderFactory.createProvider("openai");

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Dynamic model provider initialization failed"),
        expect.objectContaining({
          error: "null",
        }),
      );
    });
  });

  describe("Integration with Provider Creation", () => {
    it("should continue provider creation after timeout failure", async () => {
      vi.useFakeTimers();
      const mockInitialize = vi.mocked(dynamicModelProvider.initialize);
      mockInitialize.mockImplementation(
        () => new Promise<void>((resolve) => setTimeout(resolve, 15000)), // Resolves after 15s (simulates hanging, but always completes)
      );

      const mockNeedsRefresh = vi.mocked(dynamicModelProvider.needsRefresh);
      mockNeedsRefresh.mockReturnValue(true);

      // Should still create provider despite dynamic model timeout
      const promise = AIProviderFactory.createProvider(
        "openai",
        "gpt-3.5-turbo",
      );
      await vi.advanceTimersByTimeAsync(11000); // Trigger timeout before 15s completion
      const provider = await promise;
      vi.useRealTimers();

      expect(provider).toBeDefined();
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Provider creation succeeded"),
        expect.objectContaining({
          providerName: "openai",
          modelName: "gpt-3.5-turbo",
        }),
      );
    });

    it("should work normally when dynamic models succeed", async () => {
      const mockInitialize = vi.mocked(dynamicModelProvider.initialize);
      mockInitialize.mockResolvedValue(undefined);

      const mockNeedsRefresh = vi.mocked(dynamicModelProvider.needsRefresh);
      mockNeedsRefresh.mockReturnValue(true);

      const mockResolveModel = vi.mocked(dynamicModelProvider.resolveModel);
      mockResolveModel.mockReturnValue({
        id: "gpt-4-turbo-preview",
        displayName: "GPT-4 Turbo Preview",
        capabilities: ["functionCalling", "vision"],
        deprecated: false,
        pricing: { input: 0.01, output: 0.03 },
        contextWindow: 128000,
        releaseDate: "2024-04-09",
      });

      const provider = await AIProviderFactory.createProvider("openai");

      expect(provider).toBeDefined();
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining(
          "Dynamic model provider initialized successfully",
        ),
      );
    });
  });
});
