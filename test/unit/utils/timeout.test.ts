import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  TimeoutError,
  parseTimeout,
  composeAbortSignals,
  mergeAbortSignals,
  TimeoutManager,
  withTimeout,
  createTimeoutController,
} from "../../../src/lib/utils/timeout.js";

describe("timeout utilities", () => {
  // ── TimeoutError ──────────────────────────────────────────────────────────

  describe("TimeoutError", () => {
    it("should be an instance of Error", () => {
      const err = new TimeoutError("timed out", 5000);
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(TimeoutError);
    });

    it("should carry timeout, provider and operation metadata", () => {
      const err = new TimeoutError("op timed out", 3000, "openai", "generate");
      expect(err.name).toBe("TimeoutError");
      expect(err.message).toBe("op timed out");
      expect(err.timeout).toBe(3000);
      expect(err.provider).toBe("openai");
      expect(err.operation).toBe("generate");
    });

    it("should work without optional fields", () => {
      const err = new TimeoutError("simple", 1000);
      expect(err.provider).toBeUndefined();
      expect(err.operation).toBeUndefined();
    });
  });

  // ── parseTimeout ──────────────────────────────────────────────────────────

  describe("parseTimeout", () => {
    it("should return undefined for undefined input", () => {
      expect(parseTimeout(undefined)).toBeUndefined();
    });

    it("should return a number directly (milliseconds)", () => {
      expect(parseTimeout(5000)).toBe(5000);
    });

    it("should parse string with ms unit", () => {
      expect(parseTimeout("500ms")).toBe(500);
    });

    it("should parse string with s unit", () => {
      expect(parseTimeout("5s")).toBe(5000);
    });

    it("should parse string with m unit", () => {
      expect(parseTimeout("2m")).toBe(120000);
    });

    it("should parse string with h unit", () => {
      expect(parseTimeout("1h")).toBe(3600000);
    });

    it("should parse fractional values", () => {
      expect(parseTimeout("1.5h")).toBe(5400000);
      expect(parseTimeout("0.5s")).toBe(500);
    });

    it("should treat bare numeric strings as ms", () => {
      expect(parseTimeout("1000")).toBe(1000);
    });

    it("should throw on negative number", () => {
      expect(() => parseTimeout(-1)).toThrow("Timeout must be positive");
    });

    it("should throw on zero number", () => {
      expect(() => parseTimeout(0)).toThrow("Timeout must be positive");
    });

    it("should throw on invalid string format", () => {
      expect(() => parseTimeout("abc")).toThrow("Invalid timeout format");
    });

    it("should throw on negative string value", () => {
      // Negative values won't match the regex (no leading minus), so format error
      expect(() => parseTimeout("-5s")).toThrow("Invalid timeout format");
    });
  });

  // ── composeAbortSignals ───────────────────────────────────────────────────

  describe("composeAbortSignals", () => {
    it("should return combined signal when both signals provided", () => {
      const a = new AbortController();
      const b = new AbortController();
      const combined = composeAbortSignals(a.signal, b.signal);
      expect(combined).toBeDefined();
      expect(combined!.aborted).toBe(false);
    });

    it("should abort combined signal when external signal aborts", () => {
      const external = new AbortController();
      const timeout = new AbortController();
      const combined = composeAbortSignals(external.signal, timeout.signal);
      external.abort("user cancel");
      expect(combined!.aborted).toBe(true);
    });

    it("should abort combined signal when timeout signal aborts", () => {
      const external = new AbortController();
      const timeout = new AbortController();
      const combined = composeAbortSignals(external.signal, timeout.signal);
      timeout.abort("timeout");
      expect(combined!.aborted).toBe(true);
    });

    it("should return external signal when only external is provided", () => {
      const external = new AbortController();
      const result = composeAbortSignals(external.signal, undefined);
      expect(result).toBe(external.signal);
    });

    it("should return timeout signal when only timeout is provided", () => {
      const timeout = new AbortController();
      const result = composeAbortSignals(undefined, timeout.signal);
      expect(result).toBe(timeout.signal);
    });

    it("should return undefined when neither signal is provided", () => {
      expect(composeAbortSignals(undefined, undefined)).toBeUndefined();
    });

    it("should handle already-aborted external signal", () => {
      const external = new AbortController();
      external.abort("pre-aborted");
      const timeout = new AbortController();
      const combined = composeAbortSignals(external.signal, timeout.signal);
      expect(combined!.aborted).toBe(true);
    });
  });

  // ── mergeAbortSignals ─────────────────────────────────────────────────────

  describe("mergeAbortSignals", () => {
    it("should return a controller with a non-aborted signal for empty array", () => {
      const controller = mergeAbortSignals([]);
      expect(controller.signal.aborted).toBe(false);
    });

    it("should abort when one of the input signals aborts", () => {
      const a = new AbortController();
      const b = new AbortController();
      const merged = mergeAbortSignals([a.signal, b.signal]);

      expect(merged.signal.aborted).toBe(false);
      a.abort("reason-a");
      expect(merged.signal.aborted).toBe(true);
      expect(merged.signal.reason).toBe("reason-a");
    });

    it("should skip undefined signals", () => {
      const a = new AbortController();
      const merged = mergeAbortSignals([undefined, a.signal, undefined]);
      expect(merged.signal.aborted).toBe(false);
      a.abort();
      expect(merged.signal.aborted).toBe(true);
    });

    it("should immediately abort if an already-aborted signal is present", () => {
      const a = new AbortController();
      a.abort("already");
      const b = new AbortController();
      const merged = mergeAbortSignals([a.signal, b.signal]);
      expect(merged.signal.aborted).toBe(true);
      expect(merged.signal.reason).toBe("already");
    });

    it("should not re-abort if merged controller is already aborted", () => {
      const a = new AbortController();
      const b = new AbortController();
      const merged = mergeAbortSignals([a.signal, b.signal]);
      a.abort("first");
      b.abort("second");
      // Should keep the first reason
      expect(merged.signal.reason).toBe("first");
    });
  });

  // ── TimeoutManager ────────────────────────────────────────────────────────

  describe("TimeoutManager", () => {
    let manager: TimeoutManager;

    beforeEach(() => {
      manager = new TimeoutManager();
    });

    afterEach(() => {
      manager.gracefulShutdown();
    });

    it("should succeed for fast operations", async () => {
      const result = await manager.executeWithTimeout(
        () => Promise.resolve("ok"),
        { operation: "test", timeout: "5s" },
      );
      expect(result.success).toBe(true);
      expect(result.data).toBe("ok");
      expect(result.timedOut).toBe(false);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.retriesUsed).toBe(0);
    });

    it("should report timeout for slow operations", async () => {
      const result = await manager.executeWithTimeout(
        () => new Promise((resolve) => setTimeout(resolve, 500)),
        { operation: "test", timeout: 50 },
      );
      expect(result.success).toBe(false);
      expect(result.timedOut).toBe(true);
      expect(result.error).toBeInstanceOf(TimeoutError);
    });

    it("should succeed without timeout config", async () => {
      const result = await manager.executeWithTimeout(
        () => Promise.resolve(42),
        { operation: "no-timeout" },
      );
      expect(result.success).toBe(true);
      expect(result.data).toBe(42);
    });

    it("should report error for rejecting operations", async () => {
      const result = await manager.executeWithTimeout(
        () => Promise.reject(new Error("boom")),
        { operation: "test", timeout: "5s" },
      );
      expect(result.success).toBe(false);
      expect(result.timedOut).toBe(false);
      expect(result.error?.message).toBe("boom");
    });

    it("should abort if external signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort("user cancel");

      const result = await manager.executeWithTimeout(
        () => new Promise((resolve) => setTimeout(() => resolve("ok"), 100)),
        { operation: "test", timeout: "5s", abortSignal: controller.signal },
      );
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Operation aborted before execution");
    });

    it("should retry on timeout when configured", async () => {
      let attempts = 0;
      const result = await manager.executeWithTimeout(
        () => {
          attempts++;
          if (attempts < 2) {
            return new Promise((_resolve) =>
              setTimeout(() => _resolve("late"), 200),
            );
          }
          return Promise.resolve("ok");
        },
        {
          operation: "retry-test",
          timeout: 50,
          retryOnTimeout: true,
          maxRetries: 2,
        },
      );
      expect(result.success).toBe(true);
      expect(result.data).toBe("ok");
      expect(result.retriesUsed).toBe(1);
    });

    it("gracefulShutdown should clean up all active timeouts", () => {
      // Just verify it doesn't throw
      manager.gracefulShutdown();
    });
  });

  // ── withTimeout ───────────────────────────────────────────────────────────

  describe("withTimeout", () => {
    it("should resolve fast promises normally", async () => {
      const result = await withTimeout(
        Promise.resolve("fast"),
        "5s",
        "test-provider",
        "generate",
      );
      expect(result).toBe("fast");
    });

    it("should reject with TimeoutError for slow promises", async () => {
      await expect(
        withTimeout(
          new Promise((resolve) => setTimeout(resolve, 500)),
          50,
          "test-provider",
          "generate",
        ),
      ).rejects.toThrow(TimeoutError);
    });

    it("should pass through when timeout is undefined", async () => {
      const result = await withTimeout(
        Promise.resolve("no-timeout"),
        undefined,
        "test",
        "generate",
      );
      expect(result).toBe("no-timeout");
    });

    it("should include provider and operation in error", async () => {
      try {
        await withTimeout(
          new Promise((resolve) => setTimeout(resolve, 500)),
          50,
          "anthropic",
          "stream",
        );
        throw new Error("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(TimeoutError);
        const te = err as TimeoutError;
        expect(te.provider).toBe("anthropic");
        expect(te.operation).toBe("stream");
      }
    });
  });

  // ── createTimeoutController ───────────────────────────────────────────────

  describe("createTimeoutController", () => {
    it("should return null for undefined timeout", () => {
      expect(createTimeoutController(undefined, "test", "generate")).toBeNull();
    });

    it("should return controller, cleanup fn, and timeoutMs", () => {
      const result = createTimeoutController("5s", "test", "generate");
      expect(result).not.toBeNull();
      expect(result!.controller).toBeInstanceOf(AbortController);
      expect(typeof result!.cleanup).toBe("function");
      expect(result!.timeoutMs).toBe(5000);
      // Clean up to avoid dangling timer
      result!.cleanup();
    });

    it("should abort the controller signal after timeout", async () => {
      const result = createTimeoutController(50, "test", "generate");
      expect(result).not.toBeNull();
      expect(result!.controller.signal.aborted).toBe(false);

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(result!.controller.signal.aborted).toBe(true);
    });

    it("cleanup should prevent abort from firing", async () => {
      const result = createTimeoutController(100, "test", "generate");
      expect(result).not.toBeNull();
      result!.cleanup();

      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(result!.controller.signal.aborted).toBe(false);
    });
  });
});
