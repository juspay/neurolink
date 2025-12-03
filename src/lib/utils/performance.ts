/**
 * Performance measurement and memory management utilities
 * Part of Sub-phase 3.3.1-3.3.2 optimization efforts
 */

import type { PerformanceMetrics } from "../types/analytics.js";
import { logger } from "./logger.js";

/**
 * Performance measurement utility for tracking operations
 */
export class PerformanceTracker {
  private metrics: Map<string, PerformanceMetrics> = new Map();

  /**
   * Start tracking performance for an operation
   */
  start(operationName: string): void {
    this.metrics.set(operationName, {
      startTime: Date.now(),
      memoryStart: process.memoryUsage(),
    });
  }

  /**
   * End tracking and calculate metrics
   */
  end(operationName: string): PerformanceMetrics | null {
    const metric = this.metrics.get(operationName);
    if (!metric) {
      return null;
    }

    const endTime = Date.now();
    const memoryEnd = process.memoryUsage();

    const completedMetric: PerformanceMetrics = {
      ...metric,
      endTime,
      duration: endTime - metric.startTime,
      memoryEnd,
      memoryDelta: {
        rss: memoryEnd.rss - metric.memoryStart.rss,
        heapTotal: memoryEnd.heapTotal - metric.memoryStart.heapTotal,
        heapUsed: memoryEnd.heapUsed - metric.memoryStart.heapUsed,
        external: memoryEnd.external - metric.memoryStart.external,
      },
    };

    this.metrics.set(operationName, completedMetric);
    return completedMetric;
  }

  /**
   * Get metrics for an operation
   */
  getMetrics(operationName: string): PerformanceMetrics | null {
    return this.metrics.get(operationName) || null;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Format metrics for display
   */
  formatMetrics(operationName: string): string {
    const metric = this.metrics.get(operationName);
    if (!metric || !metric.duration) {
      return `${operationName}: No metrics available`;
    }

    const memoryMB = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);

    if (!metric.memoryDelta) {
      return [
        `${operationName}:`,
        `  Duration: ${metric.duration}ms`,
        `  Memory Delta: Not available`,
      ].join("\n");
    }

    const signHeap = metric.memoryDelta.heapUsed >= 0 ? "+" : "-";
    const signRss = metric.memoryDelta.rss >= 0 ? "+" : "-";

    return [
      `${operationName}:`,
      `  Duration: ${metric.duration}ms`,
      `  Memory Delta: ${signHeap}${memoryMB(Math.abs(metric.memoryDelta.heapUsed))}MB heap`,
      `  RSS Delta: ${signRss}${memoryMB(Math.abs(metric.memoryDelta.rss))}MB`,
    ].join("\n");
  }
}

/**
 * Global performance tracker instance
 */
export const globalTracker = new PerformanceTracker();

/**
 * Memory management utilities
 */
export class MemoryManager {
  /**
   * Force garbage collection if available
   */
  static forceGC(): boolean {
    if (typeof global !== "undefined" && global.gc) {
      global.gc();
      return true;
    }
    return false;
  }

  /**
   * Get current memory usage in MB
   */
  static getMemoryUsageMB(): {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  } {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024),
    };
  }

  /**
   * Monitor memory usage and warn if it exceeds threshold
   */
  static monitorMemory(threshold = 100): boolean {
    const usage = this.getMemoryUsageMB();
    if (usage.heapUsed > threshold) {
      logger.warn(
        `⚠️ High memory usage: ${usage.heapUsed}MB heap (threshold: ${threshold}MB)`,
      );
      return true;
    }
    return false;
  }

  /**
   * Clean up and optimize memory usage.
   * Attempts to force garbage collection if available.
   *
   * @returns {object|null} Memory usage statistics if cleanup was performed, or null if not possible.
   *   - If manual garbage collection is not available (i.e., Node.js not run with --expose-gc),
   *     no cleanup is performed and null is returned.
   *   - Clearing the require cache is not attempted due to potential side effects.
   */
  static cleanup(): {
    beforeMB: number;
    afterMB: number;
    freedMB: number;
  } | null {
    const before = this.getMemoryUsageMB();
    const gcForced = this.forceGC();

    if (!gcForced) {
      // Manual garbage collection not available.
      // No cleanup performed. Clearing require cache is dangerous and not attempted.
      // Memory cleanup relies on Node.js natural garbage collection.
      return null;
    }

    const after = this.getMemoryUsageMB();

    return {
      beforeMB: before.heapUsed,
      afterMB: after.heapUsed,
      freedMB: before.heapUsed - after.heapUsed,
    };
  }
}

/**
 * Decorator for tracking performance of async functions
 */
export function trackPerformance(operationName: string) {
  return function <T extends (...args: unknown[]) => Promise<unknown>>(
    _target: unknown,
    _propertyName: string,
    descriptor: TypedPropertyDescriptor<T>,
  ) {
    const method = descriptor.value;
    if (!method) {
      throw new Error(
        `Method descriptor value is required for performance tracking`,
      );
    }

    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      globalTracker.start(operationName);
      try {
        const result = await method.apply(this, args);
        globalTracker.end(operationName);
        return result;
      } catch (error) {
        globalTracker.end(operationName);
        throw error;
      }
    } as T;

    return descriptor;
  };
}

/**
 * Performance monitoring for CLI operations
 */
export class CLIPerformanceMonitor {
  private static instance: CLIPerformanceMonitor;
  private enabled = false;

  static getInstance(): CLIPerformanceMonitor {
    if (!CLIPerformanceMonitor.instance) {
      CLIPerformanceMonitor.instance = new CLIPerformanceMonitor();
    }
    return CLIPerformanceMonitor.instance;
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  /**
   * Monitor a CLI operation
   */
  async monitorOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    if (!this.enabled) {
      return operation();
    }

    globalTracker.start(operationName);
    const startMemory = MemoryManager.getMemoryUsageMB();

    try {
      const result = await operation();
      const metrics = globalTracker.end(operationName);
      const endMemory = MemoryManager.getMemoryUsageMB();

      if (metrics) {
        logger.debug(`\n🔍 Performance: ${operationName}`);
        logger.debug(`   Duration: ${metrics.duration}ms`);
        logger.debug(
          `   Memory: ${startMemory.heapUsed}MB → ${endMemory.heapUsed}MB`,
        );
        logger.debug(
          `   Delta: +${endMemory.heapUsed - startMemory.heapUsed}MB`,
        );
      }

      return result;
    } catch (error) {
      globalTracker.end(operationName);
      throw error;
    }
  }
}

/**
 * Export singleton monitor for easy access
 */
export const cliMonitor = CLIPerformanceMonitor.getInstance();
