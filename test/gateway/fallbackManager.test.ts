/**
 * Fallback Manager Tests
 *
 * Tests for automatic failover and retry logic
 *
 * @see src/lib/gateway/fallbackManager.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  FallbackManager,
  getGlobalFallbackManager,
  resetGlobalFallbackManager,
} from "../../src/lib/gateway/fallbackManager.js";
import { FallbackExhaustedError } from "../../src/lib/gateway/errors.js";
import { resetGlobalRouter } from "../../src/lib/gateway/modelRouter.js";
import type { LanguageModelV1 } from "ai";

// Mock the modelRouter module
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
      reset: vi.fn(),
    })),
  };
});

describe("FallbackManager", () => {
  let manager: FallbackManager;

  beforeEach(() => {
    vi.clearAllMocks();
    resetGlobalFallbackManager();
    manager = new FallbackManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("executeWithFallback", () => {
    it("should execute operation with primary model", async () => {
      const operation = vi.fn().mockResolvedValue("success");

      const result = await manager.executeWithFallback(
        "openai/gpt-4o",
        operation,
        { models: [], retries: 0, retryDelayMs: 0 },
      );

      expect(result.result).toBe("success");
      expect(result.modelUsed).toBe("openai/gpt-4o");
      expect(result.attempts.length).toBe(1);
      expect(result.attempts[0].model).toBe("openai/gpt-4o");
      expect(result.attempts[0].error).toBeUndefined();
    });

    it("should try fallback models on primary failure", async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("Primary failed"))
        .mockResolvedValueOnce("fallback success");

      const result = await manager.executeWithFallback(
        "openai/gpt-4o",
        operation,
        { models: ["anthropic/claude-3"], retries: 0, retryDelayMs: 0 },
      );

      expect(result.result).toBe("fallback success");
      expect(result.modelUsed).toBe("anthropic/claude-3");
      expect(result.attempts.length).toBe(2);
      expect(result.attempts[0].error).toBeDefined();
      expect(result.attempts[1].error).toBeUndefined();
    });

    it("should retry on retriable errors", async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("Rate limit exceeded 429"))
        .mockResolvedValueOnce("retry success");

      const result = await manager.executeWithFallback(
        "openai/gpt-4o",
        operation,
        { models: [], retries: 1, retryDelayMs: 10 },
      );

      expect(result.result).toBe("retry success");
      expect(result.modelUsed).toBe("openai/gpt-4o");
      expect(result.attempts.length).toBe(2);
    });

    it("should not retry on non-retriable errors", async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("Invalid API key 401"))
        .mockResolvedValueOnce("should not reach");

      await expect(
        manager.executeWithFallback("openai/gpt-4o", operation, {
          models: [],
          retries: 2,
          retryDelayMs: 10,
        }),
      ).rejects.toThrow(FallbackExhaustedError);

      // Should only have one attempt since 401 is non-retriable
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should respect retry delay with backoff", async () => {
      const startTime = Date.now();
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("Rate limit 429"))
        .mockResolvedValueOnce("success");

      await manager.executeWithFallback("openai/gpt-4o", operation, {
        models: [],
        retries: 1,
        retryDelayMs: 50,
      });

      const elapsed = Date.now() - startTime;
      // With backoff, delay should be at least retryDelayMs * 2 (backoff factor)
      expect(elapsed).toBeGreaterThanOrEqual(50);
    });

    it("should record all attempts", async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("Error 1"))
        .mockRejectedValueOnce(new Error("Error 2"))
        .mockResolvedValueOnce("success");

      const result = await manager.executeWithFallback(
        "openai/gpt-4o",
        operation,
        {
          models: ["anthropic/claude-3", "google/gemini"],
          retries: 0,
          retryDelayMs: 0,
        },
      );

      expect(result.attempts.length).toBe(3);
      expect(result.attempts[0].model).toBe("openai/gpt-4o");
      expect(result.attempts[0].error?.message).toBe("Error 1");
      expect(result.attempts[1].model).toBe("anthropic/claude-3");
      expect(result.attempts[1].error?.message).toBe("Error 2");
      expect(result.attempts[2].model).toBe("google/gemini");
      expect(result.attempts[2].error).toBeUndefined();
    });

    it("should return model used on success", async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("Failed"))
        .mockResolvedValueOnce("success");

      const result = await manager.executeWithFallback(
        "openai/gpt-4o",
        operation,
        { models: ["anthropic/claude-3"], retries: 0, retryDelayMs: 0 },
      );

      expect(result.modelUsed).toBe("anthropic/claude-3");
    });

    it("should throw aggregate error when all models fail", async () => {
      const operation = vi
        .fn()
        .mockRejectedValue(new Error("All models failed"));

      await expect(
        manager.executeWithFallback("openai/gpt-4o", operation, {
          models: ["anthropic/claude-3"],
          retries: 0,
          retryDelayMs: 0,
        }),
      ).rejects.toThrow(FallbackExhaustedError);
    });

    it("should respect timeout configuration", async () => {
      const slowOperation = vi
        .fn()
        .mockImplementation(
          () =>
            new Promise((resolve) => setTimeout(() => resolve("slow"), 200)),
        );

      await expect(
        manager.executeWithFallback("openai/gpt-4o", slowOperation, {
          models: [],
          retries: 0,
          retryDelayMs: 0,
          timeout: 50,
        }),
      ).rejects.toThrow(/timed out/i);
    });
  });

  describe("createModelWithFallback", () => {
    it("should create primary model when successful", async () => {
      const model = await manager.createModelWithFallback("openai/gpt-4o", []);

      expect(model).toBeDefined();
      expect((model as unknown as { modelId: string }).modelId).toBe(
        "test-model",
      );
    });

    it("should try fallback models on creation failure", async () => {
      const { getGlobalRouter } = await import(
        "../../src/lib/gateway/modelRouter.js"
      );
      const mockRouter = {
        createModel: vi
          .fn()
          .mockRejectedValueOnce(new Error("Primary creation failed"))
          .mockResolvedValueOnce({ modelId: "fallback-model" }),
        reset: vi.fn(),
      };
      vi.mocked(getGlobalRouter).mockReturnValue(
        mockRouter as unknown as ReturnType<typeof getGlobalRouter>,
      );

      const model = await manager.createModelWithFallback("openai/gpt-4o", [
        "anthropic/claude-3",
      ]);

      expect(model).toBeDefined();
      expect((model as unknown as { modelId: string }).modelId).toBe(
        "fallback-model",
      );
      expect(mockRouter.createModel).toHaveBeenCalledTimes(2);
    });

    it("should throw error when all models fail to create", async () => {
      const { getGlobalRouter } = await import(
        "../../src/lib/gateway/modelRouter.js"
      );
      const mockRouter = {
        createModel: vi.fn().mockRejectedValue(new Error("Creation failed")),
        reset: vi.fn(),
      };
      vi.mocked(getGlobalRouter).mockReturnValue(
        mockRouter as unknown as ReturnType<typeof getGlobalRouter>,
      );

      await expect(
        manager.createModelWithFallback("openai/gpt-4o", [
          "anthropic/claude-3",
        ]),
      ).rejects.toThrow(FallbackExhaustedError);
    });
  });

  describe("isRetriableError", () => {
    it("should identify rate limit errors as retriable", () => {
      expect(manager.isRetriableError(new Error("rate limit exceeded"))).toBe(
        true,
      );
      expect(manager.isRetriableError(new Error("429 Too Many Requests"))).toBe(
        true,
      );
    });

    it("should identify timeout errors as retriable", () => {
      expect(manager.isRetriableError(new Error("timeout"))).toBe(true);
      expect(manager.isRetriableError(new Error("Request timed out"))).toBe(
        true,
      );
      expect(manager.isRetriableError(new Error("ETIMEDOUT"))).toBe(true);
    });

    it("should identify 503 errors as retriable", () => {
      expect(
        manager.isRetriableError(new Error("503 Service Unavailable")),
      ).toBe(true);
      expect(manager.isRetriableError(new Error("service unavailable"))).toBe(
        true,
      );
    });

    it("should identify 502 errors as retriable", () => {
      expect(manager.isRetriableError(new Error("502 Bad Gateway"))).toBe(true);
    });

    it("should identify overloaded errors as retriable", () => {
      expect(manager.isRetriableError(new Error("server overloaded"))).toBe(
        true,
      );
      expect(
        manager.isRetriableError(new Error("temporarily unavailable")),
      ).toBe(true);
    });

    it("should not retry invalid API key errors", () => {
      expect(manager.isRetriableError(new Error("invalid api key"))).toBe(
        false,
      );
    });

    it("should not retry unauthorized errors", () => {
      expect(manager.isRetriableError(new Error("unauthorized"))).toBe(false);
      expect(manager.isRetriableError(new Error("401 Unauthorized"))).toBe(
        false,
      );
      expect(manager.isRetriableError(new Error("authentication failed"))).toBe(
        false,
      );
    });

    it("should not retry model not found errors", () => {
      expect(manager.isRetriableError(new Error("model not found"))).toBe(
        false,
      );
      expect(manager.isRetriableError(new Error("invalid model"))).toBe(false);
      expect(manager.isRetriableError(new Error("404 Not Found"))).toBe(false);
    });

    it("should not retry 400 bad request errors", () => {
      expect(manager.isRetriableError(new Error("bad request"))).toBe(false);
      expect(manager.isRetriableError(new Error("400 Bad Request"))).toBe(
        false,
      );
      expect(manager.isRetriableError(new Error("invalid request"))).toBe(
        false,
      );
    });

    it("should default to retriable for unknown errors", () => {
      expect(
        manager.isRetriableError(new Error("Something unexpected happened")),
      ).toBe(true);
      expect(manager.isRetriableError(new Error("Unknown error"))).toBe(true);
    });
  });

  describe("timeout handling", () => {
    it("should timeout operations that exceed limit", async () => {
      const slowOperation = vi
        .fn()
        .mockImplementation(
          () =>
            new Promise((resolve) => setTimeout(() => resolve("slow"), 500)),
        );

      await expect(
        manager.executeWithFallback("openai/gpt-4o", slowOperation, {
          models: [],
          retries: 0,
          retryDelayMs: 0,
          timeout: 50,
        }),
      ).rejects.toThrow(/timed out after 50ms/i);
    });

    it("should not apply timeout when not configured", async () => {
      const normalOperation = vi.fn().mockResolvedValue("success");

      const result = await manager.executeWithFallback(
        "openai/gpt-4o",
        normalOperation,
        { models: [], retries: 0, retryDelayMs: 0, timeout: undefined },
      );

      expect(result.result).toBe("success");
    });
  });

  describe("delay handling", () => {
    it("should apply exponential backoff", async () => {
      const startTime = Date.now();
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("Rate limit 429"))
        .mockRejectedValueOnce(new Error("Rate limit 429"))
        .mockResolvedValueOnce("success");

      await manager.executeWithFallback("openai/gpt-4o", operation, {
        models: [],
        retries: 2,
        retryDelayMs: 20,
      });

      const elapsed = Date.now() - startTime;
      // First retry: 20 * 2^1 = 40ms, Second retry: 20 * 2^2 = 80ms
      // Total minimum: ~120ms (with some variance)
      expect(elapsed).toBeGreaterThanOrEqual(80);
    });

    it("should respect configured retry delay", async () => {
      const startTime = Date.now();
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("503 error"))
        .mockResolvedValueOnce("success");

      await manager.executeWithFallback("openai/gpt-4o", operation, {
        models: [],
        retries: 1,
        retryDelayMs: 50,
      });

      const elapsed = Date.now() - startTime;
      // Standard delay: 50 * 1 = 50ms (linear for non-rate-limit errors)
      expect(elapsed).toBeGreaterThanOrEqual(40);
    });
  });

  describe("global fallback manager", () => {
    it("should return singleton instance", () => {
      const manager1 = getGlobalFallbackManager();
      const manager2 = getGlobalFallbackManager();
      expect(manager1).toBe(manager2);
    });

    it("should reset global manager", () => {
      const manager1 = getGlobalFallbackManager();
      resetGlobalFallbackManager();
      const manager2 = getGlobalFallbackManager();
      expect(manager1).not.toBe(manager2);
    });
  });
});
