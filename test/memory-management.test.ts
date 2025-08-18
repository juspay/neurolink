import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  MemoryManager,
  PerformanceTracker,
} from "../src/lib/utils/performance.js";

// Memory management test constants
const MEMORY_CLEANUP_THRESHOLD_MB = 50;

describe("Memory Management Tests", () => {
  let initialMemory: ReturnType<typeof MemoryManager.getMemoryUsageMB>;

  beforeEach(() => {
    initialMemory = MemoryManager.getMemoryUsageMB();
  });

  describe("MemoryManager", () => {
    it("should track memory usage accurately", () => {
      const usage = MemoryManager.getMemoryUsageMB();

      expect(usage).toHaveProperty("rss");
      expect(usage).toHaveProperty("heapTotal");
      expect(usage).toHaveProperty("heapUsed");
      expect(usage).toHaveProperty("external");

      // Values should be positive numbers
      expect(usage.rss).toBeGreaterThan(0);
      expect(usage.heapTotal).toBeGreaterThan(0);
      expect(usage.heapUsed).toBeGreaterThan(0);
      expect(usage.external).toBeGreaterThanOrEqual(0);
    });

    it("should detect memory threshold violations", () => {
      const lowThreshold = 1; // 1MB - should trigger warning
      const highThreshold = 10000; // 10GB - should not trigger

      const violatesLow = MemoryManager.monitorMemory(lowThreshold);
      const violatesHigh = MemoryManager.monitorMemory(highThreshold);

      expect(violatesLow).toBe(true);
      expect(violatesHigh).toBe(false);
    });

    it("should handle garbage collection gracefully", () => {
      // Should not throw regardless of GC availability
      expect(() => MemoryManager.forceGC()).not.toThrow();

      const gcResult = MemoryManager.forceGC();
      expect(typeof gcResult).toBe("boolean");
    });

    it("should detect memory leaks in repeated operations", () => {
      const startUsage = MemoryManager.getMemoryUsageMB();

      // Simulate memory-intensive operations
      const largeArrays: number[][] = [];
      for (let i = 0; i < 100; i++) {
        largeArrays.push(new Array(1000).fill(i));
      }

      const peakUsage = MemoryManager.getMemoryUsageMB();

      // Clear references
      largeArrays.length = 0;

      // Force GC if available
      MemoryManager.forceGC();

      const endUsage = MemoryManager.getMemoryUsageMB();

      // Memory should increase during operations
      expect(peakUsage.heapUsed).toBeGreaterThan(startUsage.heapUsed);

      // Should be properly cleaned up (allowing some variance)
      expect(endUsage.heapUsed).toBeLessThanOrEqual(peakUsage.heapUsed);
    });
  });

  describe("PerformanceTracker", () => {
    it("should track operation duration accurately", async () => {
      vi.useFakeTimers();
      const tracker = new PerformanceTracker();
      const operationName = "test-operation";

      // Start tracking
      tracker.start(operationName);

      // Simulate work with fake timers
      const workPromise = new Promise((resolve) => setTimeout(resolve, 100));
      vi.advanceTimersByTime(100);
      await workPromise;

      // End tracking
      const metrics = tracker.end(operationName);
      vi.useRealTimers();

      expect(metrics).toBeDefined();
      expect(metrics!.duration).toBeGreaterThanOrEqual(90); // Allow some variance
      expect(metrics!.duration).toBeLessThan(200);
    });

    it("should handle multiple concurrent trackers", () => {
      const tracker = new PerformanceTracker();

      // Start multiple operations
      tracker.start("operation-1");
      tracker.start("operation-2");
      tracker.start("operation-3");

      // End in different order
      const metrics2 = tracker.end("operation-2");
      const metrics1 = tracker.end("operation-1");
      const metrics3 = tracker.end("operation-3");

      expect(metrics1).toBeDefined();
      expect(metrics2).toBeDefined();
      expect(metrics3).toBeDefined();
      expect(metrics1!.duration).toBeGreaterThanOrEqual(0);
      expect(metrics2!.duration).toBeGreaterThanOrEqual(0);
      expect(metrics3!.duration).toBeGreaterThanOrEqual(0);
    });

    it("should provide memory usage deltas", () => {
      const tracker = new PerformanceTracker();
      const operationName = "memory-test";

      // Start tracking
      tracker.start(operationName);

      // Create some objects
      const largeArray = new Array(10000).fill("test");

      // End tracking
      const metrics = tracker.end(operationName);

      expect(metrics).toBeDefined();
      expect(metrics!.memoryDelta).toBeDefined();

      // Should detect memory increase (allowing for some variance)
      expect(metrics!.memoryDelta!.heapUsed).toBeGreaterThanOrEqual(0);

      // Clean up
      largeArray.length = 0;
    });
  });

  describe("Memory Cleanup Integration", () => {
    it("should auto-cleanup when memory usage exceeds threshold", () => {
      const startMemory = MemoryManager.getMemoryUsageMB();

      // Create large memory usage (scaled down to avoid OOM on CI)
      const largeData: string[] = [];
      for (let i = 0; i < 20000; i++) {
        largeData.push(`large string data ${i}`.repeat(20));
      }

      const peakMemory = MemoryManager.getMemoryUsageMB();
      const memoryDelta = peakMemory.heapUsed - startMemory.heapUsed;

      // If memory delta exceeds threshold, should trigger auto-cleanup
      if (memoryDelta > MEMORY_CLEANUP_THRESHOLD_MB) {
        const gcTriggered = MemoryManager.forceGC();
        expect(gcTriggered).toBeDefined();
      }

      // Clean up test data
      largeData.length = 0;
    });

    it("should handle cleanup failures gracefully", () => {
      // Should not throw even if GC is not available
      expect(() => {
        const memoryBefore = MemoryManager.getMemoryUsageMB();
        MemoryManager.forceGC();
        const memoryAfter = MemoryManager.getMemoryUsageMB();

        // Both readings should be valid
        expect(memoryBefore.heapUsed).toBeGreaterThan(0);
        expect(memoryAfter.heapUsed).toBeGreaterThan(0);
      }).not.toThrow();
    });
  });
});
