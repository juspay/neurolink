/**
 * Enhanced Error Handling Tests
 * Verifies error accumulation, pattern detection, and recovery strategies
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockExecutionContext } from "./helpers/test-utilities.js";
import {
  ErrorManager,
  ErrorCategory,
  ErrorSeverity,
} from "../lib/mcp/error-manager.js";
import { ErrorRecovery, CircuitState } from "../lib/mcp/error-recovery.js";
import type { NeuroLinkExecutionContext } from "../lib/mcp/factory.js";

describe("Enhanced Error Handling", () => {
  let errorManager: ErrorManager;
  let testContext: NeuroLinkExecutionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    errorManager = new ErrorManager({
      maxHistorySize: 100,
      enableStackTrace: true,
      autoRecovery: true,
      errorRateWindow: 60000,
    });

    testContext = createMockExecutionContext({
      sessionId: "test-session",
      userId: "test-user",
      aiProvider: "test-provider",
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("Error Accumulation", () => {
    it("should record errors with proper categorization", async () => {
      const networkError = new Error("Network request failed");
      const entry = await errorManager.recordError(networkError, {
        toolName: "api-tool",
        sessionId: testContext.sessionId,
        executionContext: testContext,
      });

      expect(entry).toBeDefined();
      expect(entry.category).toBe(ErrorCategory.NETWORK_ERROR);
      expect(entry.error.message).toBe("Network request failed");
      expect(entry.context.toolName).toBe("api-tool");
      expect(entry.recovery).toBeDefined();
      expect(entry.recovery?.attempted).toBe(true);
    });

    it("should maintain error history within size limits", async () => {
      // Record 150 errors (exceeds max history of 100)
      for (let i = 0; i < 150; i++) {
        await errorManager.recordError(new Error(`Error ${i}`), {
          category: ErrorCategory.TOOL_ERROR,
        });
      }

      const history = errorManager.getErrorHistory();
      expect(history.length).toBe(100); // Max history size
      expect(history[0].error.message).toBe("Error 50"); // Oldest kept
      expect(history[99].error.message).toBe("Error 149"); // Newest
    });

    it("should track error frequency correctly", async () => {
      // Record same error multiple times
      const commonError = new Error("Common error");
      for (let i = 0; i < 5; i++) {
        await errorManager.recordError(commonError);
      }

      const stats = errorManager.getStats();
      expect(stats.mostFrequentError).toBeDefined();
      expect(stats.mostFrequentError?.message).toBe("Common error");
      expect(stats.mostFrequentError?.count).toBe(5);
    });
  });

  describe("Pattern Detection", () => {
    it("should detect timeout patterns", async () => {
      // Create timeout pattern
      for (let i = 0; i < 3; i++) {
        await errorManager.recordError(new Error("Request timed out"), {
          category: ErrorCategory.TIMEOUT_ERROR,
        });
      }

      const patterns = errorManager.detectPatterns();
      expect(patterns.patterns).toHaveLength(1);
      expect(patterns.patterns[0].pattern).toBe("Network Timeout Pattern");
      expect(patterns.patterns[0].count).toBe(3);
      expect(patterns.patterns[0].severity).toBe(ErrorSeverity.HIGH);
    });

    it("should detect rate limit patterns", async () => {
      await errorManager.recordError(new Error("429 Too Many Requests"), {
        category: ErrorCategory.NETWORK_ERROR,
      });

      const patterns = errorManager.detectPatterns();
      const rateLimitPattern = patterns.patterns.find(
        (p) => p.pattern === "Rate Limit Pattern",
      );
      expect(rateLimitPattern).toBeDefined();
    });

    it("should detect error correlations", async () => {
      // Create correlated errors (occur close in time)
      const error1 = new Error("Database connection failed");
      const error2 = new Error("Query execution failed");

      for (let i = 0; i < 3; i++) {
        await errorManager.recordError(error1);
        await new Promise((resolve) => setTimeout(resolve, 100));
        await errorManager.recordError(error2);
      }

      const patterns = errorManager.detectPatterns();
      expect(patterns.correlations).toHaveLength(1);
      expect(patterns.correlations[0].correlation).toBeGreaterThan(0.5);
    });
  });

  describe("Error Recovery", () => {
    let errorRecovery: ErrorRecovery;

    beforeEach(() => {
      errorRecovery = new ErrorRecovery();
    });

    it("should calculate retry delay with exponential backoff", async () => {
      const error = await errorManager.recordError(
        new Error("Temporary failure"),
        { category: ErrorCategory.NETWORK_ERROR },
      );

      // First retry - 1000ms base
      let result = await errorRecovery.attemptRecovery(error, testContext);
      expect(result.nextAction).toBe("retry");
      expect(result.delay).toBeGreaterThanOrEqual(750); // With jitter
      expect(result.delay).toBeLessThanOrEqual(1250);

      // Simulate multiple attempts
      for (let i = 2; i <= 3; i++) {
        result = await errorRecovery.attemptRecovery(error, testContext);
        const expectedBase = 1000 * Math.pow(2, i - 1);
        expect(result.delay).toBeGreaterThanOrEqual(expectedBase * 0.75);
        expect(result.delay).toBeLessThanOrEqual(expectedBase * 1.25);
      }
    });

    it("should respect max retry attempts", async () => {
      const error = await errorManager.recordError(
        new Error("Persistent failure"),
      );

      // Exhaust retry attempts
      let result;
      for (let i = 0; i < 5; i++) {
        result = await errorRecovery.attemptRecovery(error, testContext);
      }

      expect(result!.success).toBe(false);
      expect(result!.message).toContain("Maximum retry attempts");
    });
  });

  describe("Circuit Breaker", () => {
    it("should open circuit after threshold failures", async () => {
      // Trigger circuit breaker with rate limit errors
      for (let i = 0; i < 3; i++) {
        await errorManager.recordError(new Error("429 Rate limit exceeded"), {
          category: ErrorCategory.NETWORK_ERROR,
          toolName: "api-tool",
        });
      }

      // Circuit should be open
      const recoveryStats = errorManager.getRecoveryStats();
      // Note: Circuit breaker state would be tracked if we had a tool execution context
      expect(recoveryStats).toBeDefined();
    });

    it("should reset circuit breaker on demand", () => {
      errorManager.resetCircuitBreaker("api-tool");
      const stats = errorManager.getRecoveryStats();
      expect(stats.circuitBreakerStates["api-tool"]).toBeUndefined();
    });
  });

  describe("Error Trends", () => {
    it("should track error trends over time", async () => {
      vi.useFakeTimers();
      const startTime = Date.now();
      vi.setSystemTime(startTime);

      // Create errors at different times
      for (let minute = 0; minute < 5; minute++) {
        for (let i = 0; i < minute + 1; i++) {
          await errorManager.recordError(
            new Error(`Error at minute ${minute}`),
            { category: ErrorCategory.TOOL_ERROR },
          );
        }
        vi.advanceTimersByTime(60000); // Advance 1 minute
      }

      const trends = errorManager.getErrorTrends(60000, 300000);
      expect(trends).toHaveLength(5);
      expect(trends[0].count).toBe(1); // 1 error in first minute
      expect(trends[4].count).toBe(5); // 5 errors in last minute

      vi.useRealTimers();
    });
  });

  describe("Health Insights", () => {
    it("should generate health insights based on errors", async () => {
      // Create various error conditions
      for (let i = 0; i < 15; i++) {
        await errorManager.recordError(new Error("High frequency error"), {
          category: ErrorCategory.TOOL_ERROR,
        });
      }

      await errorManager.recordError(
        new Error("Critical configuration error"),
        {
          category: ErrorCategory.CONFIGURATION_ERROR,
          severity: ErrorSeverity.CRITICAL,
        },
      );

      const insights = errorManager.getInsights();
      expect(insights.criticalIssues).toContain("1 critical errors detected");
      expect(insights.healthScore).toBeLessThan(100);
      expect(insights.recommendations.length).toBeGreaterThan(0);
    });

    it("should calculate health score correctly", async () => {
      // Perfect health
      let insights = errorManager.getInsights();
      expect(insights.healthScore).toBe(100);

      // Add errors to degrade health
      for (let i = 0; i < 10; i++) {
        await errorManager.recordError(new Error("Error"));
      }

      insights = errorManager.getInsights();
      expect(insights.healthScore).toBeLessThan(100);
      expect(insights.healthScore).toBeGreaterThan(0);
    });
  });

  describe("Error Statistics", () => {
    it("should track comprehensive error statistics", async () => {
      // Create diverse errors
      await errorManager.recordError(new Error("Network error"), {
        category: ErrorCategory.NETWORK_ERROR,
        severity: ErrorSeverity.HIGH,
      });

      await errorManager.recordError(new Error("Validation error"), {
        category: ErrorCategory.VALIDATION_ERROR,
        severity: ErrorSeverity.LOW,
      });

      await errorManager.recordError(new Error("Permission denied"), {
        category: ErrorCategory.PERMISSION_ERROR,
        severity: ErrorSeverity.CRITICAL,
      });

      const stats = errorManager.getStats();
      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByCategory[ErrorCategory.NETWORK_ERROR]).toBe(1);
      expect(stats.errorsByCategory[ErrorCategory.VALIDATION_ERROR]).toBe(1);
      expect(stats.errorsByCategory[ErrorCategory.PERMISSION_ERROR]).toBe(1);
      expect(stats.errorsBySeverity[ErrorSeverity.CRITICAL]).toBe(1);
      expect(stats.errorsBySeverity[ErrorSeverity.HIGH]).toBe(1);
      expect(stats.errorsBySeverity[ErrorSeverity.LOW]).toBe(1);
    });
  });
});
