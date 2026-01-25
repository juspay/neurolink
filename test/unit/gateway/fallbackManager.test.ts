import type { LanguageModelV1 } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Create mock model factory
const createMockModel = (modelId: string): LanguageModelV1 =>
  ({
    modelId,
    provider: "mock",
    specificationVersion: "v1",
    doGenerate: vi.fn(),
    doStream: vi.fn(),
  }) as unknown as LanguageModelV1;

// Create a controllable mock router
const mockCreateModel = vi.fn();

// Mock the model router module BEFORE importing anything else
vi.mock("../../../src/lib/gateway/modelRouter.js", () => ({
  getGlobalRouter: () => ({
    createModel: mockCreateModel,
  }),
  resetGlobalRouter: vi.fn(),
}));

import { FallbackExhaustedError } from "../../../src/lib/gateway/errors.js";
// Now import the module under test
import {
  FallbackManager,
  getGlobalFallbackManager,
  resetGlobalFallbackManager,
} from "../../../src/lib/gateway/fallbackManager.js";

describe("FallbackManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetGlobalFallbackManager();
    // Reset mock to successful behavior by default
    mockCreateModel.mockImplementation((modelString: string) =>
      Promise.resolve(createMockModel(modelString)),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with default config", () => {
      const manager = new FallbackManager();
      expect(manager).toBeDefined();
    });

    it("should accept custom config", () => {
      const manager = new FallbackManager({
        models: ["openai/gpt-4o", "anthropic/claude-3-5-sonnet"],
        retries: 3,
        retryDelayMs: 2000,
      });
      expect(manager).toBeDefined();
    });

    it("should merge config with defaults", () => {
      const manager = new FallbackManager({
        retries: 5,
      });
      expect(manager).toBeDefined();
    });
  });

  describe("executeWithFallback", () => {
    it("should return result on first success", async () => {
      const manager = new FallbackManager({
        models: [],
        retries: 1,
      });

      const operation = vi.fn().mockResolvedValue("success result");
      const result = await manager.executeWithFallback(
        "openai/gpt-4o",
        operation,
      );

      expect(result.result).toBe("success result");
      expect(result.modelUsed).toBe("openai/gpt-4o");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should record attempt details on success", async () => {
      const manager = new FallbackManager({
        models: [],
        retries: 1,
      });

      const operation = vi.fn().mockResolvedValue({ data: "test" });
      const result = await manager.executeWithFallback(
        "openai/gpt-4o",
        operation,
      );

      expect(result.attempts).toHaveLength(1);
      expect(result.attempts[0].model).toBe("openai/gpt-4o");
      expect(result.attempts[0].attempt).toBe(1);
      expect(result.attempts[0].duration).toBeGreaterThanOrEqual(0);
      expect(result.attempts[0].error).toBeUndefined();
    });

    it("should try fallback models on failure", async () => {
      const manager = new FallbackManager({
        models: ["model2"],
        retries: 1,
        retryDelayMs: 10, // Short delay for tests
      });

      // Use non-retriable error to force move to fallback instead of retry
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("invalid api key"))
        .mockResolvedValue({ success: true });

      const result = await manager.executeWithFallback("model1", operation);

      expect(result.result).toEqual({ success: true });
      expect(result.modelUsed).toBe("model2");
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it("should record failed attempts", async () => {
      const manager = new FallbackManager({
        models: ["model2"],
        retries: 1,
        retryDelayMs: 10,
      });

      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("First failed"))
        .mockResolvedValue({ success: true });

      const result = await manager.executeWithFallback("model1", operation);

      expect(result.attempts).toHaveLength(2);
      expect(result.attempts[0].error).toBeDefined();
      expect(result.attempts[0].error?.message).toBe("First failed");
      expect(result.attempts[1].error).toBeUndefined();
    });

    it("should retry on retriable errors", async () => {
      const manager = new FallbackManager({
        models: [],
        retries: 2,
        retryDelayMs: 10,
      });

      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("rate limit exceeded"))
        .mockRejectedValueOnce(new Error("503 service unavailable"))
        .mockResolvedValue({ success: true });

      const result = await manager.executeWithFallback("model1", operation);

      expect(result.result).toEqual({ success: true });
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it("should not retry on non-retriable errors", async () => {
      const manager = new FallbackManager({
        models: ["model2"],
        retries: 2,
        retryDelayMs: 10,
      });

      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("invalid api key"))
        .mockResolvedValue({ success: true });

      const result = await manager.executeWithFallback("model1", operation);

      // Should skip retries and move to fallback model
      expect(result.result).toEqual({ success: true });
      expect(result.modelUsed).toBe("model2");
    });

    it("should throw FallbackExhaustedError after all retries exhausted", async () => {
      const manager = new FallbackManager({
        models: [],
        retries: 2,
        retryDelayMs: 10,
      });

      const operation = vi.fn().mockRejectedValue(new Error("Always fails"));

      await expect(
        manager.executeWithFallback("model1", operation),
      ).rejects.toThrow(FallbackExhaustedError);
    });

    it("should include all attempted models in FallbackExhaustedError", async () => {
      const manager = new FallbackManager({
        models: ["model2", "model3"],
        retries: 1,
        retryDelayMs: 10,
      });

      const operation = vi.fn().mockRejectedValue(new Error("Always fails"));

      try {
        await manager.executeWithFallback("model1", operation);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(FallbackExhaustedError);
        const fbError = error as FallbackExhaustedError;
        expect(fbError.attemptedModels).toContain("model1");
        expect(fbError.attemptedModels).toContain("model2");
        expect(fbError.attemptedModels).toContain("model3");
      }
    });

    it("should handle timeout configuration", async () => {
      const manager = new FallbackManager({
        models: [],
        retries: 1,
        timeout: 50, // 50ms timeout
        retryDelayMs: 10,
      });

      // Create a slow operation that takes longer than timeout
      const operation = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ success: true }), 200);
          }),
      );

      await expect(
        manager.executeWithFallback("model1", operation),
      ).rejects.toThrow(/timed out/);
    });
  });

  describe("createModelWithFallback", () => {
    it("should return model on first success", async () => {
      mockCreateModel.mockResolvedValue(createMockModel("openai/gpt-4o"));

      const manager = new FallbackManager();
      const model = await manager.createModelWithFallback("openai/gpt-4o", [
        "anthropic/claude-3-5-sonnet",
      ]);

      expect(model).toBeDefined();
      expect(model.modelId).toBe("openai/gpt-4o");
    });

    it("should try fallback models on failure", async () => {
      // Make first model fail, second succeed
      mockCreateModel
        .mockRejectedValueOnce(new Error("Model unavailable"))
        .mockResolvedValueOnce(createMockModel("anthropic/claude-3-5-sonnet"));

      const manager = new FallbackManager();
      const model = await manager.createModelWithFallback("openai/gpt-4o", [
        "anthropic/claude-3-5-sonnet",
      ]);

      expect(model).toBeDefined();
      expect(model.modelId).toBe("anthropic/claude-3-5-sonnet");
    });

    it("should throw FallbackExhaustedError when all models fail", async () => {
      mockCreateModel.mockRejectedValue(new Error("All models unavailable"));

      const manager = new FallbackManager();

      await expect(
        manager.createModelWithFallback("openai/gpt-4o", [
          "anthropic/claude-3-5-sonnet",
        ]),
      ).rejects.toThrow(FallbackExhaustedError);
    });
  });

  describe("isRetriableError", () => {
    it("should return true for rate limit errors", () => {
      const manager = new FallbackManager();

      expect(manager.isRetriableError(new Error("rate limit exceeded"))).toBe(
        true,
      );
      expect(
        manager.isRetriableError(new Error("Error 429: Too many requests")),
      ).toBe(true);
    });

    it("should return true for timeout errors", () => {
      const manager = new FallbackManager();

      expect(manager.isRetriableError(new Error("timeout"))).toBe(true);
      expect(manager.isRetriableError(new Error("Request timed out"))).toBe(
        true,
      );
    });

    it("should return true for server errors", () => {
      const manager = new FallbackManager();

      expect(
        manager.isRetriableError(new Error("500 internal server error")),
      ).toBe(true);
      expect(manager.isRetriableError(new Error("502 bad gateway"))).toBe(true);
      expect(
        manager.isRetriableError(new Error("503 service unavailable")),
      ).toBe(true);
    });

    it("should return true for network errors", () => {
      const manager = new FallbackManager();

      expect(manager.isRetriableError(new Error("ECONNRESET"))).toBe(true);
      expect(manager.isRetriableError(new Error("ECONNREFUSED"))).toBe(true);
      expect(manager.isRetriableError(new Error("ETIMEDOUT"))).toBe(true);
      expect(manager.isRetriableError(new Error("network error"))).toBe(true);
    });

    it("should return false for authentication errors", () => {
      const manager = new FallbackManager();

      expect(manager.isRetriableError(new Error("invalid api key"))).toBe(
        false,
      );
      expect(manager.isRetriableError(new Error("unauthorized"))).toBe(false);
      expect(
        manager.isRetriableError(new Error("401 authentication failed")),
      ).toBe(false);
      expect(manager.isRetriableError(new Error("403 forbidden"))).toBe(false);
    });

    it("should return false for client errors", () => {
      const manager = new FallbackManager();

      expect(manager.isRetriableError(new Error("400 bad request"))).toBe(
        false,
      );
      expect(manager.isRetriableError(new Error("invalid request"))).toBe(
        false,
      );
      expect(manager.isRetriableError(new Error("model not found"))).toBe(
        false,
      );
    });

    it("should return true for unknown errors by default", () => {
      const manager = new FallbackManager();

      expect(manager.isRetriableError(new Error("some random error"))).toBe(
        true,
      );
    });
  });

  describe("global manager", () => {
    it("should return singleton instance", () => {
      resetGlobalFallbackManager();
      const manager1 = getGlobalFallbackManager();
      const manager2 = getGlobalFallbackManager();

      expect(manager1).toBe(manager2);
    });

    it("should reset singleton correctly", () => {
      const manager1 = getGlobalFallbackManager();
      resetGlobalFallbackManager();
      const manager2 = getGlobalFallbackManager();

      expect(manager1).not.toBe(manager2);
    });
  });
});
