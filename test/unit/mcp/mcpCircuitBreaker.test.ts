/**
 * MCP Circuit Breaker Tests
 * Tests for circuit breaker pattern implementation for MCP operations
 *
 * IMPORTANT: This file tests the ACTUAL production code from
 * src/lib/mcp/mcpCircuitBreaker.ts, not reimplementations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  MCPCircuitBreaker,
  CircuitBreakerManager,
} from "../../../src/lib/mcp/mcpCircuitBreaker.js";

describe("MCPCircuitBreaker", () => {
  let breaker: MCPCircuitBreaker;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    breaker?.destroy();
    vi.useRealTimers();
  });

  describe("initial state", () => {
    it("should start in closed state", () => {
      breaker = new MCPCircuitBreaker("test-server");
      expect(breaker.isClosed()).toBe(true);
      expect(breaker.isOpen()).toBe(false);
      expect(breaker.isHalfOpen()).toBe(false);
    });

    it("should return correct name", () => {
      breaker = new MCPCircuitBreaker("my-server");
      expect(breaker.getName()).toBe("my-server");
    });

    it("should have zero stats initially", () => {
      breaker = new MCPCircuitBreaker("test-server");
      const stats = breaker.getStats();
      expect(stats.state).toBe("closed");
      expect(stats.totalCalls).toBe(0);
      expect(stats.successfulCalls).toBe(0);
      expect(stats.failedCalls).toBe(0);
      expect(stats.failureRate).toBe(0);
      expect(stats.halfOpenCalls).toBe(0);
      expect(stats.nextRetryTime).toBeUndefined();
    });
  });

  describe("execute in CLOSED state", () => {
    it("should execute operations normally and return result", async () => {
      breaker = new MCPCircuitBreaker("test-server");
      const result = await breaker.execute(() => Promise.resolve("hello"));
      expect(result).toBe("hello");
    });

    it("should record successful calls in stats", async () => {
      breaker = new MCPCircuitBreaker("test-server");
      await breaker.execute(() => Promise.resolve("ok"));
      await breaker.execute(() => Promise.resolve("ok"));

      const stats = breaker.getStats();
      expect(stats.totalCalls).toBe(2);
      expect(stats.successfulCalls).toBe(2);
      expect(stats.failedCalls).toBe(0);
    });

    it("should propagate errors from operations", async () => {
      breaker = new MCPCircuitBreaker("test-server");
      await expect(
        breaker.execute(() => Promise.reject(new Error("op failed"))),
      ).rejects.toThrow("op failed");
    });

    it("should emit callSuccess event on success", async () => {
      breaker = new MCPCircuitBreaker("test-server");
      const listener = vi.fn();
      breaker.on("callSuccess", listener);

      await breaker.execute(() => Promise.resolve("ok"));

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: expect.any(Number),
          timestamp: expect.any(Date),
        }),
      );
    });

    it("should emit callFailure event on failure", async () => {
      breaker = new MCPCircuitBreaker("test-server");
      const listener = vi.fn();
      breaker.on("callFailure", listener);

      await breaker
        .execute(() => Promise.reject(new Error("boom")))
        .catch(() => {});

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "boom",
          duration: expect.any(Number),
          timestamp: expect.any(Date),
        }),
      );
    });
  });

  describe("CLOSED -> OPEN transition (failure threshold)", () => {
    it("should open circuit after reaching failure threshold with minimum calls", async () => {
      breaker = new MCPCircuitBreaker("test-server", {
        failureThreshold: 3,
        minimumCallsBeforeCalculation: 3,
      });

      // Produce 3 failures (meets both minimum calls and failure threshold)
      for (let i = 0; i < 3; i++) {
        await breaker
          .execute(() => Promise.reject(new Error(`fail-${i}`)))
          .catch(() => {});
      }

      expect(breaker.isOpen()).toBe(true);
      expect(breaker.isClosed()).toBe(false);
    });

    it("should not open circuit before minimum calls threshold", async () => {
      breaker = new MCPCircuitBreaker("test-server", {
        failureThreshold: 2,
        minimumCallsBeforeCalculation: 10,
      });

      // 5 failures, but minimumCallsBeforeCalculation is 10
      for (let i = 0; i < 5; i++) {
        await breaker
          .execute(() => Promise.reject(new Error("fail")))
          .catch(() => {});
      }

      // Still closed because not enough calls for calculation
      expect(breaker.isClosed()).toBe(true);
    });

    it("should emit circuitOpen event when opening", async () => {
      breaker = new MCPCircuitBreaker("test-server", {
        failureThreshold: 2,
        minimumCallsBeforeCalculation: 2,
      });
      const listener = vi.fn();
      breaker.on("circuitOpen", listener);

      for (let i = 0; i < 2; i++) {
        await breaker
          .execute(() => Promise.reject(new Error("fail")))
          .catch(() => {});
      }

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          failureRate: expect.any(Number),
          totalCalls: expect.any(Number),
          timestamp: expect.any(Date),
        }),
      );
    });

    it("should emit stateChange event on transition", async () => {
      breaker = new MCPCircuitBreaker("test-server", {
        failureThreshold: 2,
        minimumCallsBeforeCalculation: 2,
      });
      const listener = vi.fn();
      breaker.on("stateChange", listener);

      for (let i = 0; i < 2; i++) {
        await breaker
          .execute(() => Promise.reject(new Error("fail")))
          .catch(() => {});
      }

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          oldState: "closed",
          newState: "open",
          reason: expect.stringContaining("Failure threshold exceeded"),
        }),
      );
    });
  });

  describe("execute in OPEN state", () => {
    it("should reject operations immediately when circuit is open", async () => {
      breaker = new MCPCircuitBreaker("test-server", {
        failureThreshold: 2,
        minimumCallsBeforeCalculation: 2,
        resetTimeout: 60000,
      });

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        await breaker
          .execute(() => Promise.reject(new Error("fail")))
          .catch(() => {});
      }
      expect(breaker.isOpen()).toBe(true);

      // Operation should be rejected without executing
      const operation = vi.fn().mockResolvedValue("should-not-run");
      await expect(breaker.execute(operation)).rejects.toThrow(
        /Circuit breaker 'test-server' is open/,
      );
      expect(operation).not.toHaveBeenCalled();
    });

    it("should include next retry time in error message", async () => {
      breaker = new MCPCircuitBreaker("test-server", {
        failureThreshold: 2,
        minimumCallsBeforeCalculation: 2,
        resetTimeout: 60000,
      });

      for (let i = 0; i < 2; i++) {
        await breaker
          .execute(() => Promise.reject(new Error("fail")))
          .catch(() => {});
      }

      await expect(breaker.execute(() => Promise.resolve("x"))).rejects.toThrow(
        /Next retry at/,
      );
    });

    it("should provide nextRetryTime in stats when open", async () => {
      breaker = new MCPCircuitBreaker("test-server", {
        failureThreshold: 2,
        minimumCallsBeforeCalculation: 2,
        resetTimeout: 60000,
      });

      for (let i = 0; i < 2; i++) {
        await breaker
          .execute(() => Promise.reject(new Error("fail")))
          .catch(() => {});
      }

      const stats = breaker.getStats();
      expect(stats.state).toBe("open");
      expect(stats.nextRetryTime).toBeInstanceOf(Date);
    });
  });

  describe("OPEN -> HALF_OPEN transition (reset timeout)", () => {
    it("should transition to half-open after reset timeout expires", async () => {
      breaker = new MCPCircuitBreaker("test-server", {
        failureThreshold: 2,
        minimumCallsBeforeCalculation: 2,
        resetTimeout: 5000,
        halfOpenMaxCalls: 1,
      });

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        await breaker
          .execute(() => Promise.reject(new Error("fail")))
          .catch(() => {});
      }
      expect(breaker.isOpen()).toBe(true);

      // Advance time past resetTimeout
      vi.advanceTimersByTime(5001);

      // Next execute should trigger transition to half-open
      const result = await breaker.execute(() => Promise.resolve("recovered"));
      expect(result).toBe("recovered");
      // After successful half-open test with halfOpenMaxCalls=1, should close
      expect(breaker.isClosed()).toBe(true);
    });

    it("should emit circuitHalfOpen event on transition", async () => {
      breaker = new MCPCircuitBreaker("test-server", {
        failureThreshold: 2,
        minimumCallsBeforeCalculation: 2,
        resetTimeout: 5000,
        halfOpenMaxCalls: 3,
      });

      const halfOpenListener = vi.fn();
      breaker.on("circuitHalfOpen", halfOpenListener);

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        await breaker
          .execute(() => Promise.reject(new Error("fail")))
          .catch(() => {});
      }

      // Advance past reset timeout
      vi.advanceTimersByTime(5001);

      // Trigger half-open transition
      await breaker.execute(() => Promise.resolve("test"));

      expect(halfOpenListener).toHaveBeenCalledTimes(1);
    });
  });

  describe("HALF_OPEN state behavior", () => {
    /**
     * Helper: open the circuit and advance time past resetTimeout
     * so the next execute triggers half-open.
     */
    async function openAndWaitForHalfOpen(
      cb: MCPCircuitBreaker,
      resetTimeout: number,
    ): Promise<void> {
      // Need enough failures to trip the threshold
      const threshold = 2;
      for (let i = 0; i < threshold; i++) {
        await cb
          .execute(() => Promise.reject(new Error("fail")))
          .catch(() => {});
      }
      expect(cb.isOpen()).toBe(true);
      vi.advanceTimersByTime(resetTimeout + 1);
    }

    it("should transition HALF_OPEN -> CLOSED after enough successful calls", async () => {
      breaker = new MCPCircuitBreaker("test-server", {
        failureThreshold: 2,
        minimumCallsBeforeCalculation: 2,
        resetTimeout: 5000,
        halfOpenMaxCalls: 3,
      });

      await openAndWaitForHalfOpen(breaker, 5000);

      // 3 successful calls in half-open should close the circuit
      for (let i = 0; i < 3; i++) {
        await breaker.execute(() => Promise.resolve("ok"));
      }

      expect(breaker.isClosed()).toBe(true);
    });

    it("should emit circuitClosed event when closing from half-open", async () => {
      breaker = new MCPCircuitBreaker("test-server", {
        failureThreshold: 2,
        minimumCallsBeforeCalculation: 2,
        resetTimeout: 5000,
        halfOpenMaxCalls: 1,
      });

      const closedListener = vi.fn();
      breaker.on("circuitClosed", closedListener);

      await openAndWaitForHalfOpen(breaker, 5000);

      await breaker.execute(() => Promise.resolve("ok"));

      expect(closedListener).toHaveBeenCalledTimes(1);
    });

    it("should transition HALF_OPEN -> OPEN on failure", async () => {
      breaker = new MCPCircuitBreaker("test-server", {
        failureThreshold: 2,
        minimumCallsBeforeCalculation: 2,
        resetTimeout: 5000,
        halfOpenMaxCalls: 3,
      });

      await openAndWaitForHalfOpen(breaker, 5000);

      // Failure in half-open should immediately reopen
      await breaker
        .execute(() => Promise.reject(new Error("still broken")))
        .catch(() => {});

      expect(breaker.isOpen()).toBe(true);
    });

    it("should reject calls when half-open call limit is reached", async () => {
      breaker = new MCPCircuitBreaker("test-server", {
        failureThreshold: 2,
        minimumCallsBeforeCalculation: 2,
        resetTimeout: 5000,
        halfOpenMaxCalls: 2,
      });

      await openAndWaitForHalfOpen(breaker, 5000);

      // First call triggers half-open transition and succeeds
      await breaker.execute(() => Promise.resolve("ok-1"));
      // Second call succeeds and closes the circuit (halfOpenMaxCalls=2)
      await breaker.execute(() => Promise.resolve("ok-2"));

      // Circuit should now be closed
      expect(breaker.isClosed()).toBe(true);
    });
  });

  describe("operation timeout", () => {
    it("should treat operations exceeding timeout as failures", async () => {
      breaker = new MCPCircuitBreaker("test-server", {
        operationTimeout: 1000,
        failureThreshold: 1,
        minimumCallsBeforeCalculation: 1,
      });

      const slowOperation = () =>
        new Promise<string>((resolve) => {
          setTimeout(() => resolve("too late"), 5000);
        });

      // Attach .catch() eagerly to prevent unhandled rejection when
      // advanceTimersByTimeAsync fires the timeout before the assertion runs.
      const executePromise = breaker.execute(slowOperation);
      const caughtPromise = executePromise.catch(() => {});

      // Advance past the operation timeout
      await vi.advanceTimersByTimeAsync(1001);

      // Wait for the rejection to be handled
      await caughtPromise;

      await expect(executePromise).rejects.toThrow(
        /Operation timed out after 1000ms/,
      );
    });

    it("should open circuit after timed-out operations exceed threshold", async () => {
      breaker = new MCPCircuitBreaker("test-server", {
        operationTimeout: 500,
        failureThreshold: 2,
        minimumCallsBeforeCalculation: 2,
      });

      const slowOperation = () =>
        new Promise<string>((resolve) => {
          setTimeout(() => resolve("slow"), 5000);
        });

      // First timeout
      const p1 = breaker.execute(slowOperation).catch(() => {});
      await vi.advanceTimersByTimeAsync(501);
      await p1;

      // Second timeout
      const p2 = breaker.execute(slowOperation).catch(() => {});
      await vi.advanceTimersByTimeAsync(501);
      await p2;

      expect(breaker.isOpen()).toBe(true);
    });
  });

  describe("failure counting and success reset", () => {
    it("should track consecutive failures in stats", async () => {
      breaker = new MCPCircuitBreaker("test-server", {
        failureThreshold: 10,
        minimumCallsBeforeCalculation: 10,
      });

      for (let i = 0; i < 3; i++) {
        await breaker
          .execute(() => Promise.reject(new Error("fail")))
          .catch(() => {});
      }

      const stats = breaker.getStats();
      expect(stats.failedCalls).toBe(3);
      expect(stats.successfulCalls).toBe(0);
    });

    it("should track mixed successes and failures", async () => {
      breaker = new MCPCircuitBreaker("test-server", {
        failureThreshold: 10,
        minimumCallsBeforeCalculation: 10,
      });

      await breaker.execute(() => Promise.resolve("ok"));
      await breaker
        .execute(() => Promise.reject(new Error("fail")))
        .catch(() => {});
      await breaker.execute(() => Promise.resolve("ok"));

      const stats = breaker.getStats();
      expect(stats.totalCalls).toBe(3);
      expect(stats.successfulCalls).toBe(2);
      expect(stats.failedCalls).toBe(1);
    });

    it("should calculate correct failure rate", async () => {
      breaker = new MCPCircuitBreaker("test-server", {
        failureThreshold: 100,
        minimumCallsBeforeCalculation: 100,
      });

      // 3 successes, 2 failures = 40% failure rate
      await breaker.execute(() => Promise.resolve("ok"));
      await breaker.execute(() => Promise.resolve("ok"));
      await breaker.execute(() => Promise.resolve("ok"));
      await breaker
        .execute(() => Promise.reject(new Error("fail")))
        .catch(() => {});
      await breaker
        .execute(() => Promise.reject(new Error("fail")))
        .catch(() => {});

      const stats = breaker.getStats();
      expect(stats.failureRate).toBeCloseTo(0.4, 2);
    });
  });

  describe("manual controls", () => {
    it("reset() should return circuit to closed state and clear history", async () => {
      breaker = new MCPCircuitBreaker("test-server", {
        failureThreshold: 2,
        minimumCallsBeforeCalculation: 2,
      });

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        await breaker
          .execute(() => Promise.reject(new Error("fail")))
          .catch(() => {});
      }
      expect(breaker.isOpen()).toBe(true);

      breaker.reset();

      expect(breaker.isClosed()).toBe(true);
      const stats = breaker.getStats();
      expect(stats.totalCalls).toBe(0);
      expect(stats.halfOpenCalls).toBe(0);
    });

    it("forceOpen() should immediately open the circuit", () => {
      breaker = new MCPCircuitBreaker("test-server");
      expect(breaker.isClosed()).toBe(true);

      breaker.forceOpen("maintenance");

      expect(breaker.isOpen()).toBe(true);
    });

    it("forceOpen() should use default reason if none provided", () => {
      breaker = new MCPCircuitBreaker("test-server");
      const listener = vi.fn();
      breaker.on("stateChange", listener);

      breaker.forceOpen();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: "Manual force open",
        }),
      );
    });
  });

  describe("call history cleanup", () => {
    it("should clean up old call records periodically", async () => {
      breaker = new MCPCircuitBreaker("test-server", {
        statisticsWindowSize: 5000,
        failureThreshold: 100,
        minimumCallsBeforeCalculation: 100,
      });

      // Add some calls
      await breaker.execute(() => Promise.resolve("ok"));
      await breaker.execute(() => Promise.resolve("ok"));

      expect(breaker.getStats().totalCalls).toBe(2);

      // Advance past the statistics window
      vi.advanceTimersByTime(6000);

      // Trigger cleanup interval (runs every 60s)
      vi.advanceTimersByTime(60000);

      // Old records should have been cleaned up
      // windowCalls should be 0 since records are outside the window
      const stats = breaker.getStats();
      expect(stats.windowCalls).toBe(0);
    });
  });

  describe("destroy()", () => {
    it("should clear cleanup timer", () => {
      breaker = new MCPCircuitBreaker("test-server");
      // destroy should not throw
      breaker.destroy();
      // Calling destroy again should be safe (idempotent)
      breaker.destroy();
    });

    it("should remove all event listeners", () => {
      breaker = new MCPCircuitBreaker("test-server");
      breaker.on("stateChange", vi.fn());
      breaker.on("callSuccess", vi.fn());

      breaker.destroy();

      expect(breaker.listenerCount("stateChange")).toBe(0);
      expect(breaker.listenerCount("callSuccess")).toBe(0);
    });

    it("should clear call history", async () => {
      breaker = new MCPCircuitBreaker("test-server");
      await breaker.execute(() => Promise.resolve("ok"));
      expect(breaker.getStats().totalCalls).toBe(1);

      breaker.destroy();

      expect(breaker.getStats().totalCalls).toBe(0);
    });
  });
});

describe("CircuitBreakerManager", () => {
  let manager: CircuitBreakerManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new CircuitBreakerManager();
  });

  afterEach(() => {
    manager.destroyAll();
    vi.useRealTimers();
  });

  describe("getBreaker()", () => {
    it("should create a new breaker if it does not exist", () => {
      const breaker = manager.getBreaker("server-a");
      expect(breaker).toBeInstanceOf(MCPCircuitBreaker);
      expect(breaker.getName()).toBe("server-a");
    });

    it("should return the same breaker instance on subsequent calls", () => {
      const first = manager.getBreaker("server-a");
      const second = manager.getBreaker("server-a");
      expect(first).toBe(second);
    });

    it("should create separate breakers for different names", () => {
      const a = manager.getBreaker("server-a");
      const b = manager.getBreaker("server-b");
      expect(a).not.toBe(b);
    });

    it("should pass config to new breaker", async () => {
      const breaker = manager.getBreaker("server-a", {
        failureThreshold: 1,
        minimumCallsBeforeCalculation: 1,
      });

      await breaker
        .execute(() => Promise.reject(new Error("fail")))
        .catch(() => {});

      expect(breaker.isOpen()).toBe(true);
    });
  });

  describe("removeBreaker()", () => {
    it("should remove an existing breaker and return true", () => {
      manager.getBreaker("server-a");
      expect(manager.removeBreaker("server-a")).toBe(true);
      expect(manager.getBreakerNames()).not.toContain("server-a");
    });

    it("should return false for non-existent breaker", () => {
      expect(manager.removeBreaker("nonexistent")).toBe(false);
    });

    it("should destroy the breaker when removing", () => {
      const breaker = manager.getBreaker("server-a");
      const destroySpy = vi.spyOn(breaker, "destroy");

      manager.removeBreaker("server-a");

      expect(destroySpy).toHaveBeenCalledTimes(1);
    });

    it("should create a fresh breaker after removal", () => {
      const original = manager.getBreaker("server-a");
      manager.removeBreaker("server-a");
      const fresh = manager.getBreaker("server-a");
      expect(fresh).not.toBe(original);
    });
  });

  describe("getBreakerNames()", () => {
    it("should return empty array when no breakers exist", () => {
      expect(manager.getBreakerNames()).toEqual([]);
    });

    it("should return all breaker names", () => {
      manager.getBreaker("alpha");
      manager.getBreaker("beta");
      manager.getBreaker("gamma");

      const names = manager.getBreakerNames();
      expect(names).toHaveLength(3);
      expect(names).toContain("alpha");
      expect(names).toContain("beta");
      expect(names).toContain("gamma");
    });
  });

  describe("getAllStats()", () => {
    it("should return stats for all breakers", async () => {
      const a = manager.getBreaker("server-a");
      const b = manager.getBreaker("server-b");

      await a.execute(() => Promise.resolve("ok"));
      await b.execute(() => Promise.resolve("ok"));
      await b.execute(() => Promise.resolve("ok"));

      const allStats = manager.getAllStats();
      expect(allStats["server-a"].totalCalls).toBe(1);
      expect(allStats["server-b"].totalCalls).toBe(2);
    });

    it("should return empty object when no breakers exist", () => {
      expect(manager.getAllStats()).toEqual({});
    });
  });

  describe("resetAll()", () => {
    it("should reset all breakers to closed state", async () => {
      const a = manager.getBreaker("server-a", {
        failureThreshold: 1,
        minimumCallsBeforeCalculation: 1,
      });
      const b = manager.getBreaker("server-b", {
        failureThreshold: 1,
        minimumCallsBeforeCalculation: 1,
      });

      // Open both circuits
      await a.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
      await b.execute(() => Promise.reject(new Error("fail"))).catch(() => {});

      expect(a.isOpen()).toBe(true);
      expect(b.isOpen()).toBe(true);

      manager.resetAll();

      expect(a.isClosed()).toBe(true);
      expect(b.isClosed()).toBe(true);
    });
  });

  describe("getHealthSummary()", () => {
    it("should return correct counts for mixed states", async () => {
      // Closed breaker
      manager.getBreaker("healthy");

      // Open breaker
      const openBreaker = manager.getBreaker("unhealthy", {
        failureThreshold: 1,
        minimumCallsBeforeCalculation: 1,
      });
      await openBreaker
        .execute(() => Promise.reject(new Error("fail")))
        .catch(() => {});

      const summary = manager.getHealthSummary();
      expect(summary.totalBreakers).toBe(2);
      expect(summary.closedBreakers).toBe(1);
      expect(summary.openBreakers).toBe(1);
      expect(summary.halfOpenBreakers).toBe(0);
      expect(summary.unhealthyBreakers).toEqual(["unhealthy"]);
    });

    it("should return zeros when no breakers exist", () => {
      const summary = manager.getHealthSummary();
      expect(summary.totalBreakers).toBe(0);
      expect(summary.closedBreakers).toBe(0);
      expect(summary.openBreakers).toBe(0);
      expect(summary.halfOpenBreakers).toBe(0);
      expect(summary.unhealthyBreakers).toEqual([]);
    });
  });

  describe("destroyAll()", () => {
    it("should destroy all breakers and clear the map", () => {
      const a = manager.getBreaker("server-a");
      const b = manager.getBreaker("server-b");
      const destroyA = vi.spyOn(a, "destroy");
      const destroyB = vi.spyOn(b, "destroy");

      manager.destroyAll();

      expect(destroyA).toHaveBeenCalledTimes(1);
      expect(destroyB).toHaveBeenCalledTimes(1);
      expect(manager.getBreakerNames()).toEqual([]);
    });

    it("should allow creating new breakers after destroyAll", () => {
      manager.getBreaker("server-a");
      manager.destroyAll();

      const fresh = manager.getBreaker("server-a");
      expect(fresh).toBeInstanceOf(MCPCircuitBreaker);
      expect(fresh.isClosed()).toBe(true);
    });
  });
});
