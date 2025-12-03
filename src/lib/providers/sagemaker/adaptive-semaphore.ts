/**
 * Adaptive Semaphore Utility
 *
 * Provides a sophisticated semaphore implementation with dynamic concurrency adjustment
 * for optimal resource utilization and performance tuning based on response times and error rates.
 */

import { logger } from "../../utils/logger.js";
import type {
  AdaptiveSemaphoreConfig,
  AdaptiveSemaphoreMetrics,
} from "../../types/providers.js";

/**
 * Adaptive semaphore that automatically adjusts concurrency based on performance metrics
 */
export class AdaptiveSemaphore {
  private count: number;
  private waiters: Array<() => void> = [];
  private currentConcurrency: number;
  private activeRequests: number = 0;
  private completedCount: number = 0;
  private errorCount: number = 0;
  private responseTimes: number[] = [];

  private readonly maxConcurrency: number;
  private readonly minConcurrency: number;

  constructor(config: AdaptiveSemaphoreConfig) {
    this.currentConcurrency = config.initialConcurrency;
    this.count = config.initialConcurrency;
    this.maxConcurrency = config.maxConcurrency;
    this.minConcurrency = config.minConcurrency;

    logger.debug("AdaptiveSemaphore initialized", {
      initialConcurrency: config.initialConcurrency,
      maxConcurrency: config.maxConcurrency,
      minConcurrency: config.minConcurrency,
    });
  }

  /**
   * Acquire a semaphore permit, waiting if necessary
   */
  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.count > 0) {
        this.count--;
        this.activeRequests++;
        resolve();
      } else {
        this.waiters.push(() => {
          this.count--;
          this.activeRequests++;
          resolve();
        });
      }
    });
  }

  /**
   * Release a semaphore permit and wake up waiting requests
   */
  release(): void {
    this.activeRequests--;
    if (this.waiters.length > 0) {
      const waiter = this.waiters.shift();
      if (waiter) {
        this.count++; // Increment count before calling waiter so waiter can decrement it
        waiter();
      }
    } else {
      this.count++;
    }
  }

  /**
   * Record successful completion with response time for adaptive adjustment
   */
  recordSuccess(responseTimeMs: number): void {
    this.completedCount++;
    this.responseTimes.push(responseTimeMs);

    // Keep only recent response times for calculation (last 10 responses)
    if (this.responseTimes.length > 10) {
      this.responseTimes.shift();
    }

    this.adjustConcurrencyBasedOnPerformance(responseTimeMs, false);
  }

  /**
   * Record error for adaptive adjustment
   */
  recordError(responseTimeMs?: number): void {
    this.errorCount++;
    if (responseTimeMs) {
      this.responseTimes.push(responseTimeMs);
      if (this.responseTimes.length > 10) {
        this.responseTimes.shift();
      }
    }

    this.adjustConcurrencyBasedOnPerformance(responseTimeMs || 0, true);
  }

  /**
   * Manually adjust concurrency level
   */
  adjustConcurrency(newLimit: number): void {
    const clampedLimit = Math.max(
      this.minConcurrency,
      Math.min(this.maxConcurrency, newLimit),
    );

    const diff = clampedLimit - (this.currentConcurrency - this.count);
    this.count += diff;
    this.currentConcurrency = clampedLimit;

    logger.debug("Concurrency adjusted", {
      newConcurrency: clampedLimit,
      previousConcurrency: this.currentConcurrency - diff,
      availableCount: this.count,
      activeRequests: this.activeRequests,
    });

    // Wake up waiting requests if we increased concurrency
    while (this.count > 0 && this.waiters.length > 0) {
      const waiter = this.waiters.shift();
      if (waiter) {
        waiter();
      }
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): AdaptiveSemaphoreMetrics {
    const averageResponseTime =
      this.responseTimes.length > 0
        ? this.responseTimes.reduce((sum, time) => sum + time, 0) /
          this.responseTimes.length
        : 0;

    return {
      activeRequests: this.activeRequests,
      currentConcurrency: this.currentConcurrency,
      completedCount: this.completedCount,
      errorCount: this.errorCount,
      averageResponseTime,
      waitingCount: this.waiters.length,
    };
  }

  /**
   * Reset metrics for new batch or session
   */
  resetMetrics(): void {
    this.completedCount = 0;
    this.errorCount = 0;
    this.responseTimes = [];
  }

  /**
   * Automatically adjust concurrency based on performance indicators
   */
  private adjustConcurrencyBasedOnPerformance(
    responseTimeMs: number,
    isError: boolean,
  ): void {
    const metrics = this.getMetrics();

    if (isError) {
      // On error, reduce concurrency to be more conservative
      if (this.currentConcurrency > this.minConcurrency) {
        this.adjustConcurrency(
          Math.max(this.minConcurrency, this.currentConcurrency - 1),
        );
        logger.warn("Reduced concurrency due to error", {
          newConcurrency: this.currentConcurrency,
          errorCount: this.errorCount,
        });
      }
      return;
    }

    // Only adjust after we have some data to work with
    if (this.completedCount < 3) {
      return;
    }

    const fastResponseThreshold = 2000; // 2 seconds
    const slowResponseThreshold = 5000; // 5 seconds

    if (
      responseTimeMs < fastResponseThreshold &&
      metrics.averageResponseTime < fastResponseThreshold &&
      this.currentConcurrency < this.maxConcurrency
    ) {
      // Fast responses and no bottleneck - increase concurrency
      this.adjustConcurrency(
        Math.min(this.maxConcurrency, this.currentConcurrency + 1),
      );
      logger.debug("Increased concurrency due to fast responses", {
        newConcurrency: this.currentConcurrency,
        averageResponseTime: metrics.averageResponseTime,
      });
    } else if (
      responseTimeMs > slowResponseThreshold &&
      this.currentConcurrency > this.minConcurrency
    ) {
      // Slow responses - decrease concurrency
      this.adjustConcurrency(
        Math.max(this.minConcurrency, this.currentConcurrency - 1),
      );
      logger.debug("Decreased concurrency due to slow responses", {
        newConcurrency: this.currentConcurrency,
        responseTime: responseTimeMs,
      });
    }
  }

  /**
   * Check if semaphore is idle (no active or waiting requests)
   */
  isIdle(): boolean {
    return this.activeRequests === 0 && this.waiters.length === 0;
  }

  /**
   * Get current concurrency limit
   */
  getCurrentConcurrency(): number {
    return this.currentConcurrency;
  }

  /**
   * Get number of active requests
   */
  getActiveRequestCount(): number {
    return this.activeRequests;
  }

  /**
   * Get number of waiting requests
   */
  getWaitingRequestCount(): number {
    return this.waiters.length;
  }
}

/**
 * Factory function to create an adaptive semaphore with default configuration
 */
export function createAdaptiveSemaphore(
  initialConcurrency: number,
  maxConcurrency: number = 10,
  minConcurrency: number = 1,
): AdaptiveSemaphore {
  return new AdaptiveSemaphore({
    initialConcurrency,
    maxConcurrency,
    minConcurrency,
  });
}
