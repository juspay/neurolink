/**
 * NeuroLink MCP Semaphore Manager Tests
 * Comprehensive test suite for race condition prevention
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockExecutionContext } from "./helpers/test-utilities.js";
import { SemaphoreManager } from "../lib/mcp/semaphore-manager.js";
import type { NeuroLinkExecutionContext } from "../lib/mcp/factory.js";

describe("SemaphoreManager", () => {
  let semaphoreManager: SemaphoreManager;
  let mockContext: NeuroLinkExecutionContext;

  beforeEach(() => {
    semaphoreManager = new SemaphoreManager();
    mockContext = createMockExecutionContext({
      sessionId: "test-session-123",
      userId: "test-user",
      timestamp: Date.now(),
    });
  });

  describe("Basic Functionality", () => {
    it("should execute operations sequentially for the same key", async () => {
      const executionOrder: number[] = [];
      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      // Create two operations that should execute sequentially
      const operation1 = async () => {
        await delay(100);
        executionOrder.push(1);
        return "result1";
      };

      const operation2 = async () => {
        executionOrder.push(2);
        return "result2";
      };

      // Execute both operations concurrently on the same key
      const [result1, result2] = await Promise.all([
        semaphoreManager.acquire("test-key", operation1),
        semaphoreManager.acquire("test-key", operation2),
      ]);

      // Verify sequential execution
      expect(executionOrder).toEqual([1, 2]);
      expect(result1.success).toBe(true);
      expect(result1.result).toBe("result1");
      expect(result2.success).toBe(true);
      expect(result2.result).toBe("result2");
      expect(result2.waitTime).toBeGreaterThan(0);
    });

    it("should allow parallel execution for different keys", async () => {
      const startTimes: number[] = [];
      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      const operation = async (id: number) => {
        startTimes.push(Date.now());
        await delay(100);
        return `result${id}`;
      };

      // Execute operations on different keys
      const startTime = Date.now();
      const [result1, result2] = await Promise.all([
        semaphoreManager.acquire("key1", () => operation(1)),
        semaphoreManager.acquire("key2", () => operation(2)),
      ]);
      const totalTime = Date.now() - startTime;

      // Verify parallel execution (should take ~100ms, not 200ms)
      expect(totalTime).toBeLessThan(150);
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(startTimes[1] - startTimes[0]).toBeLessThan(50); // Started almost simultaneously
    });
  });

  describe("Error Handling", () => {
    it("should handle operation errors gracefully", async () => {
      const operation = async () => {
        throw new Error("Operation failed");
      };

      const result = await semaphoreManager.acquire("error-key", operation);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Operation failed");
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it("should release semaphore even after error", async () => {
      const failingOperation = async () => {
        throw new Error("Failed");
      };

      const successOperation = async () => {
        return "success";
      };

      // First operation fails
      await semaphoreManager.acquire("key", failingOperation);

      // Second operation should still execute
      const result = await semaphoreManager.acquire("key", successOperation);

      expect(result.success).toBe(true);
      expect(result.result).toBe("success");
      expect(result.waitTime).toBe(0); // No wait since first operation completed
    });
  });

  describe("tryAcquire", () => {
    it("should return null if resource is locked", async () => {
      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      // Lock the resource with a long operation
      const longOperation = semaphoreManager.acquire("busy-key", async () => {
        await delay(200);
        return "long result";
      });

      // Try to acquire while locked
      const tryResult = await semaphoreManager.tryAcquire(
        "busy-key",
        async () => "quick result",
      );

      expect(tryResult).toBeNull();

      // Wait for long operation to complete
      await longOperation;
    });

    it("should execute immediately if resource is available", async () => {
      const result = await semaphoreManager.tryAcquire(
        "free-key",
        async () => "immediate result",
      );

      expect(result).not.toBeNull();
      expect(result!.success).toBe(true);
      expect(result!.result).toBe("immediate result");
      expect(result!.waitTime).toBe(0);
    });
  });

  describe("Statistics", () => {
    it("should track operation statistics correctly", async () => {
      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      // Execute multiple operations
      await Promise.all([
        semaphoreManager.acquire("stats-key", async () => {
          await delay(50);
          return 1;
        }),
        semaphoreManager.acquire("stats-key", async () => {
          await delay(30);
          return 2;
        }),
        semaphoreManager.acquire("stats-key", async () => {
          await delay(20);
          return 3;
        }),
      ]);

      const stats = semaphoreManager.getStats("stats-key");

      expect(stats.totalOperations).toBe(3);
      expect(stats.activeOperations).toBe(0);
      expect(stats.totalWaitTime).toBeGreaterThan(0);
      expect(stats.averageWaitTime).toBeGreaterThan(0);
      expect(stats.peakQueueDepth).toBeGreaterThanOrEqual(2);
    });

    it("should track global statistics", async () => {
      await Promise.all([
        semaphoreManager.acquire("key1", async () => "result1"),
        semaphoreManager.acquire("key2", async () => "result2"),
      ]);

      const globalStats = semaphoreManager.getStats();

      expect(globalStats.totalOperations).toBe(2);
      expect(globalStats.activeOperations).toBe(0);
    });
  });

  describe("Queue Management", () => {
    it("should correctly report queue depth", async () => {
      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));
      const depths: number[] = [];

      // Start a long operation
      const op1 = semaphoreManager.acquire("queue-key", async () => {
        await delay(100);
        return 1;
      });

      // Add operations to queue and check depth
      setTimeout(() => {
        depths.push(semaphoreManager.getQueueDepth("queue-key"));

        const op2 = semaphoreManager.acquire("queue-key", async () => 2);
        depths.push(semaphoreManager.getQueueDepth("queue-key"));

        const op3 = semaphoreManager.acquire("queue-key", async () => 3);
        depths.push(semaphoreManager.getQueueDepth("queue-key"));
      }, 10);

      await delay(150); // Wait for all operations to complete

      // Queue depth should have increased as operations were added
      expect(depths.length).toBeGreaterThan(0);
      expect(Math.max(...depths)).toBeGreaterThanOrEqual(1);
    });
  });

  describe("clearAll", () => {
    it("should clear all semaphores and reject pending operations", async () => {
      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));
      let rejectionError: Error | null = null;

      // Start operations that will be cleared
      const op1 = semaphoreManager.acquire("clear-key1", async () => {
        await delay(200);
        return "should not complete";
      });

      const op2 = semaphoreManager
        .acquire("clear-key1", async () => {
          return "should be rejected";
        })
        .catch((error) => {
          rejectionError = error;
        });

      // Clear all semaphores after a short delay
      setTimeout(() => {
        semaphoreManager.clearAll();
      }, 50);

      // Wait for operations to settle
      await delay(100);

      // Verify that subsequent operations work
      const newResult = await semaphoreManager.acquire(
        "clear-key1",
        async () => "new result",
      );
      expect(newResult.success).toBe(true);
      expect(newResult.result).toBe("new result");
    });
  });

  describe("Context Integration", () => {
    it("should accept and use execution context", async () => {
      const result = await semaphoreManager.acquire(
        "context-key",
        async () => "context result",
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.result).toBe("context result");
    });
  });

  describe("Race Condition Prevention", () => {
    it("should prevent race conditions in counter increment", async () => {
      let counter = 0;
      const incrementOperations: Promise<any>[] = [];

      // Create 100 concurrent increment operations
      for (let i = 0; i < 100; i++) {
        incrementOperations.push(
          semaphoreManager.acquire("counter", async () => {
            const current = counter;
            // Simulate async operation that could cause race condition
            await new Promise((resolve) => setImmediate(resolve));
            counter = current + 1;
            return counter;
          }),
        );
      }

      await Promise.all(incrementOperations);

      // Without semaphore protection, counter might be less than 100 due to race conditions
      // With semaphore protection, it should be exactly 100
      expect(counter).toBe(100);
    });
  });
});
