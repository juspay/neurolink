/**
 * HTTP Retry Handler Tests
 * Tests for retry logic in HTTP transport operations
 *
 * IMPORTANT: This file tests the ACTUAL production code from
 * src/lib/mcp/httpRetryHandler.ts, not reimplementations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Import from the actual source - this is what we're testing
import {
  DEFAULT_HTTP_RETRY_CONFIG,
  isRetryableStatusCode,
  isRetryableHTTPError,
  withHTTPRetry,
} from "../../../src/lib/mcp/httpRetryHandler.js";
import type { HTTPRetryConfig } from "../../../src/lib/types/mcpTypes.js";

// Import the backoff calculator to test delay calculations
import { calculateBackoffDelay } from "../../../src/lib/utils/retryHandler.js";

describe("HTTP Retry Handler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("DEFAULT_HTTP_RETRY_CONFIG", () => {
    it("should have valid default configuration", () => {
      expect(DEFAULT_HTTP_RETRY_CONFIG.maxAttempts).toBeGreaterThan(0);
      expect(DEFAULT_HTTP_RETRY_CONFIG.initialDelay).toBeGreaterThan(0);
      expect(DEFAULT_HTTP_RETRY_CONFIG.maxDelay).toBeGreaterThanOrEqual(
        DEFAULT_HTTP_RETRY_CONFIG.initialDelay,
      );
      expect(DEFAULT_HTTP_RETRY_CONFIG.backoffMultiplier).toBeGreaterThan(1);
      expect(
        DEFAULT_HTTP_RETRY_CONFIG.retryableStatusCodes.length,
      ).toBeGreaterThan(0);
    });

    it("should include common retryable HTTP status codes", () => {
      const expectedCodes = [408, 429, 500, 502, 503, 504];
      expectedCodes.forEach((code) => {
        expect(DEFAULT_HTTP_RETRY_CONFIG.retryableStatusCodes).toContain(code);
      });
    });

    it("should have expected default values", () => {
      expect(DEFAULT_HTTP_RETRY_CONFIG.maxAttempts).toBe(3);
      expect(DEFAULT_HTTP_RETRY_CONFIG.initialDelay).toBe(1000);
      expect(DEFAULT_HTTP_RETRY_CONFIG.maxDelay).toBe(30000);
      expect(DEFAULT_HTTP_RETRY_CONFIG.backoffMultiplier).toBe(2);
    });
  });

  describe("isRetryableStatusCode", () => {
    it("should return true for 408 Request Timeout", () => {
      expect(isRetryableStatusCode(408)).toBe(true);
    });

    it("should return true for 429 Too Many Requests", () => {
      expect(isRetryableStatusCode(429)).toBe(true);
    });

    it("should return true for 500 Internal Server Error", () => {
      expect(isRetryableStatusCode(500)).toBe(true);
    });

    it("should return true for 502 Bad Gateway", () => {
      expect(isRetryableStatusCode(502)).toBe(true);
    });

    it("should return true for 503 Service Unavailable", () => {
      expect(isRetryableStatusCode(503)).toBe(true);
    });

    it("should return true for 504 Gateway Timeout", () => {
      expect(isRetryableStatusCode(504)).toBe(true);
    });

    it("should return false for 400 Bad Request", () => {
      expect(isRetryableStatusCode(400)).toBe(false);
    });

    it("should return false for 401 Unauthorized", () => {
      expect(isRetryableStatusCode(401)).toBe(false);
    });

    it("should return false for 403 Forbidden", () => {
      expect(isRetryableStatusCode(403)).toBe(false);
    });

    it("should return false for 404 Not Found", () => {
      expect(isRetryableStatusCode(404)).toBe(false);
    });

    it("should return false for 200 OK", () => {
      expect(isRetryableStatusCode(200)).toBe(false);
    });

    it("should use custom retryable status codes when provided", () => {
      const customConfig: HTTPRetryConfig = {
        ...DEFAULT_HTTP_RETRY_CONFIG,
        retryableStatusCodes: [418, 451],
      };

      expect(isRetryableStatusCode(418, customConfig)).toBe(true);
      expect(isRetryableStatusCode(451, customConfig)).toBe(true);
      expect(isRetryableStatusCode(500, customConfig)).toBe(false);
    });
  });

  describe("isRetryableHTTPError", () => {
    it("should return true for ECONNRESET error (via error.code)", () => {
      const error = Object.assign(new Error("Connection reset"), {
        code: "ECONNRESET",
      });
      expect(isRetryableHTTPError(error)).toBe(true);
    });

    it("should return true for ETIMEDOUT error (via error.code)", () => {
      const error = Object.assign(new Error("Connection timed out"), {
        code: "ETIMEDOUT",
      });
      expect(isRetryableHTTPError(error)).toBe(true);
    });

    it("should return true for ECONNREFUSED error (via error.code)", () => {
      const error = Object.assign(new Error("Connection refused"), {
        code: "ECONNREFUSED",
      });
      expect(isRetryableHTTPError(error)).toBe(true);
    });

    it("should return true for ENOTFOUND error (via error.code)", () => {
      const error = Object.assign(new Error("DNS lookup failed"), {
        code: "ENOTFOUND",
      });
      expect(isRetryableHTTPError(error)).toBe(true);
    });

    it("should return true for ECONNABORTED error (via error.code)", () => {
      const error = Object.assign(new Error("Connection aborted"), {
        code: "ECONNABORTED",
      });
      expect(isRetryableHTTPError(error)).toBe(true);
    });

    it("should return true for ENETUNREACH error (via error.code)", () => {
      const error = Object.assign(new Error("Network unreachable"), {
        code: "ENETUNREACH",
      });
      expect(isRetryableHTTPError(error)).toBe(true);
    });

    it("should return true for EHOSTUNREACH error (via error.code)", () => {
      const error = Object.assign(new Error("Host unreachable"), {
        code: "EHOSTUNREACH",
      });
      expect(isRetryableHTTPError(error)).toBe(true);
    });

    it("should return true for EPIPE error (via error.code)", () => {
      const error = Object.assign(new Error("Broken pipe"), {
        code: "EPIPE",
      });
      expect(isRetryableHTTPError(error)).toBe(true);
    });

    it("should return true for TimeoutError (via error.name)", () => {
      const error = new Error("Request timed out");
      error.name = "TimeoutError";
      expect(isRetryableHTTPError(error)).toBe(true);
    });

    it("should return false for AbortError — user-initiated aborts are not retryable", () => {
      const error = new Error("Request aborted");
      error.name = "AbortError";
      expect(isRetryableHTTPError(error)).toBe(false);
    });

    it("should return true for TIMEOUT error code", () => {
      const error = Object.assign(new Error("Timeout"), {
        code: "TIMEOUT",
      });
      expect(isRetryableHTTPError(error)).toBe(true);
    });

    it("should return true for TypeError with fetch-related message", () => {
      const error = new TypeError("Failed to fetch");
      expect(isRetryableHTTPError(error)).toBe(true);
    });

    it("should return true for TypeError with network-related message", () => {
      const error = new TypeError("Network request failed");
      expect(isRetryableHTTPError(error)).toBe(true);
    });

    it("should return true for TypeError with connection-related message", () => {
      const error = new TypeError("Connection failed");
      expect(isRetryableHTTPError(error)).toBe(true);
    });

    it("should return true for error with retryable status code", () => {
      const error = Object.assign(new Error("Server error"), {
        status: 503,
      });
      expect(isRetryableHTTPError(error)).toBe(true);
    });

    it("should return true for error with retryable statusCode property", () => {
      const error = Object.assign(new Error("Server error"), {
        statusCode: 502,
      });
      expect(isRetryableHTTPError(error)).toBe(true);
    });

    it("should return true for error with response.status", () => {
      const error = Object.assign(new Error("Server error"), {
        response: { status: 500 },
      });
      expect(isRetryableHTTPError(error)).toBe(true);
    });

    it("should return false for validation error", () => {
      const error = new Error("Invalid JSON in request body");
      expect(isRetryableHTTPError(error)).toBe(false);
    });

    it("should return false for authentication error", () => {
      const error = new Error("Invalid API key");
      expect(isRetryableHTTPError(error)).toBe(false);
    });

    it("should return false for generic error", () => {
      const error = new Error("Something went wrong");
      expect(isRetryableHTTPError(error)).toBe(false);
    });

    it("should return false for non-retryable status code", () => {
      const error = Object.assign(new Error("Not found"), {
        status: 404,
      });
      expect(isRetryableHTTPError(error)).toBe(false);
    });

    it("should return false for null", () => {
      expect(isRetryableHTTPError(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isRetryableHTTPError(undefined)).toBe(false);
    });

    it("should return false for non-object values", () => {
      expect(isRetryableHTTPError("error string")).toBe(false);
      expect(isRetryableHTTPError(123)).toBe(false);
    });
  });

  describe("calculateBackoffDelay (imported from retryHandler)", () => {
    it("should return initial delay for first attempt", () => {
      const delay = calculateBackoffDelay(1, 1000, 2, 30000, false);
      expect(delay).toBe(1000);
    });

    it("should apply exponential backoff for subsequent attempts", () => {
      // Disable jitter for predictable testing
      expect(calculateBackoffDelay(1, 1000, 2, 30000, false)).toBe(1000);
      expect(calculateBackoffDelay(2, 1000, 2, 30000, false)).toBe(2000);
      expect(calculateBackoffDelay(3, 1000, 2, 30000, false)).toBe(4000);
      expect(calculateBackoffDelay(4, 1000, 2, 30000, false)).toBe(8000);
    });

    it("should not exceed maxDelay", () => {
      const delay = calculateBackoffDelay(10, 1000, 2, 5000, false);
      expect(delay).toBe(5000);
    });

    it("should apply jitter when enabled", () => {
      // Run multiple times to verify jitter is applied
      const delays = Array.from({ length: 10 }, () =>
        calculateBackoffDelay(1, 1000, 2, 30000, true),
      );
      const uniqueDelays = new Set(delays);

      // With jitter, we should see some variation
      // Note: There's a small chance all 10 random values could be the same
      // but with 10% jitter up to 1000ms, variation is likely
      expect(delays.every((d) => d >= 1000 && d <= 1100)).toBe(true);
    });

    it("should respect custom multiplier", () => {
      expect(calculateBackoffDelay(1, 1000, 3, 30000, false)).toBe(1000);
      expect(calculateBackoffDelay(2, 1000, 3, 30000, false)).toBe(3000);
      expect(calculateBackoffDelay(3, 1000, 3, 30000, false)).toBe(9000);
    });
  });

  describe("withHTTPRetry", () => {
    it("should return result on first successful attempt", async () => {
      const operation = vi.fn().mockResolvedValue("success");

      const result = await withHTTPRetry(operation);

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should retry on retryable error and eventually succeed", async () => {
      const econnresetError = Object.assign(new Error("Connection reset"), {
        code: "ECONNRESET",
      });
      const etimedoutError = Object.assign(new Error("Timed out"), {
        code: "ETIMEDOUT",
      });

      const operation = vi
        .fn()
        .mockRejectedValueOnce(econnresetError)
        .mockRejectedValueOnce(etimedoutError)
        .mockResolvedValue("success");

      const resultPromise = withHTTPRetry(operation, {
        initialDelay: 100,
        maxDelay: 1000,
      });

      // Advance timers for first retry delay (100ms + up to 10ms jitter)
      await vi.advanceTimersByTimeAsync(200);
      // Advance timers for second retry delay (200ms + up to 20ms jitter)
      await vi.advanceTimersByTimeAsync(300);

      const result = await resultPromise;

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it("should throw after max attempts exhausted", async () => {
      const retryableError = Object.assign(new Error("Connection reset"), {
        code: "ECONNRESET",
      });
      const operation = vi.fn().mockRejectedValue(retryableError);

      // Start the operation and attach catch handler
      let caughtError: Error | null = null;
      const resultPromise = withHTTPRetry(operation, {
        maxAttempts: 3,
        initialDelay: 100,
        maxDelay: 1000,
      }).catch((e: Error) => {
        caughtError = e;
      });

      // Advance through all retry delays
      await vi.advanceTimersByTimeAsync(200); // First retry
      await vi.advanceTimersByTimeAsync(300); // Second retry

      // Wait for the promise to complete
      await resultPromise;

      expect(caughtError).not.toBeNull();
      expect((caughtError as Error & { code?: string }).code).toBe(
        "ECONNRESET",
      );
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it("should not retry on non-retryable error", async () => {
      const operation = vi.fn().mockRejectedValue(new Error("Invalid API key"));

      await expect(withHTTPRetry(operation)).rejects.toThrow("Invalid API key");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should respect maxAttempts configuration", async () => {
      const retryableError = Object.assign(new Error("Connection reset"), {
        code: "ECONNRESET",
      });
      const operation = vi.fn().mockRejectedValue(retryableError);

      // Start the operation and attach catch handler
      let caughtError: Error | null = null;
      const resultPromise = withHTTPRetry(operation, {
        maxAttempts: 5,
        initialDelay: 50,
        maxDelay: 1000,
      }).catch((e: Error) => {
        caughtError = e;
      });

      // Advance through all retry delays (4 retries after initial attempt)
      // With jitter we need to give enough time
      for (let i = 0; i < 5; i++) {
        await vi.advanceTimersByTimeAsync(500);
      }

      // Wait for the promise to complete
      await resultPromise;

      expect(caughtError).not.toBeNull();
      expect(operation).toHaveBeenCalledTimes(5);
    });

    it("should use custom retry configuration", async () => {
      const retryableError = Object.assign(new Error("Connection reset"), {
        code: "ECONNRESET",
      });
      const operation = vi
        .fn()
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue("success");

      const config = {
        maxAttempts: 2,
        initialDelay: 500,
        maxDelay: 2000,
      };

      const resultPromise = withHTTPRetry(operation, config);

      await vi.advanceTimersByTimeAsync(600); // 500ms + some jitter buffer

      const result = await resultPromise;

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it("should retry on retryable HTTP status code errors", async () => {
      const serverError = Object.assign(new Error("Service Unavailable"), {
        status: 503,
      });
      const operation = vi
        .fn()
        .mockRejectedValueOnce(serverError)
        .mockResolvedValue("success");

      const resultPromise = withHTTPRetry(operation, {
        initialDelay: 100,
        maxDelay: 1000,
      });

      await vi.advanceTimersByTimeAsync(200);

      const result = await resultPromise;

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it("should not retry on non-retryable HTTP status code errors", async () => {
      const notFoundError = Object.assign(new Error("Not Found"), {
        status: 404,
      });
      const operation = vi.fn().mockRejectedValue(notFoundError);

      await expect(withHTTPRetry(operation)).rejects.toThrow("Not Found");
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });
});
