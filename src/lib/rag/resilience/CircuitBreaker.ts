/**
 * RAG Circuit Breaker
 *
 * Implements circuit breaker pattern for RAG operations including
 * vector store queries, embeddings, and reranking calls.
 * Provides fault tolerance and prevents cascading failures.
 */

import { TypedEventEmitter } from "../../core/infrastructure/index.js";
import { logger } from "../../utils/logger.js";
import { RAGCircuitBreakerError, RAGErrorCodes } from "../errors/RAGError.js";

/**
 * Circuit breaker states
 */
export type CircuitState = "closed" | "open" | "half-open";

import type {
  RAGCircuitBreakerConfig,
  RAGCircuitBreakerStats,
} from "../../types/ragTypes.js";

export type { RAGCircuitBreakerConfig } from "../../types/ragTypes.js";
export type { RAGCircuitBreakerStats } from "../../types/ragTypes.js";

/**
 * Call record for statistics
 */
type CallRecord = {
  timestamp: number;
  success: boolean;
  duration: number;
  operationType?: string;
};

/**
 * Circuit breaker events
 */
export type RAGCircuitBreakerEvents = {
  stateChange: [
    {
      oldState: CircuitState;
      newState: CircuitState;
      reason: string;
      timestamp: Date;
    },
  ];
  callSuccess: [{ duration: number; timestamp: Date; operationType?: string }];
  callFailure: [
    {
      error: string;
      duration: number;
      timestamp: Date;
      operationType?: string;
    },
  ];
  circuitOpen: [{ failureRate: number; totalCalls: number; timestamp: Date }];
  circuitHalfOpen: [{ timestamp: Date }];
  circuitClosed: [{ timestamp: Date }];
};

/**
 * Default configuration
 */
const DEFAULT_CONFIG: RAGCircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 60000,
  halfOpenMaxCalls: 3,
  operationTimeout: 30000,
  minimumCallsBeforeCalculation: 10,
  statisticsWindowSize: 300000,
};

/**
 * RAG Circuit Breaker
 *
 * Provides circuit breaker pattern implementation for RAG operations
 * with comprehensive statistics and event handling.
 */
export class RAGCircuitBreaker extends TypedEventEmitter<RAGCircuitBreakerEvents> {
  private state: CircuitState = "closed";
  private config: RAGCircuitBreakerConfig;
  private callHistory: CallRecord[] = [];
  private lastFailureTime = 0;
  private halfOpenCalls = 0;
  private lastStateChange = new Date();
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(
    private name: string,
    config: Partial<RAGCircuitBreakerConfig> = {},
  ) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Clean up old call records periodically
    this.cleanupTimer = setInterval(() => this.cleanupCallHistory(), 60000);
  }

  /**
   * Execute an operation with circuit breaker protection
   */
  async execute<T>(
    operation: () => Promise<T>,
    operationType?: string,
  ): Promise<T> {
    const startTime = Date.now();

    try {
      // Check if circuit is open
      if (this.state === "open") {
        if (Date.now() - this.lastFailureTime < this.config.resetTimeout) {
          const nextRetryTime = new Date(
            this.lastFailureTime + this.config.resetTimeout,
          );
          throw new RAGCircuitBreakerError(
            `Circuit breaker '${this.name}' is open. Next retry at ${nextRetryTime.toISOString()}`,
            {
              code: RAGErrorCodes.CIRCUIT_BREAKER_OPEN,
              circuitName: this.name,
              nextRetryTime,
            },
          );
        }

        // Transition to half-open
        this.changeState("half-open", "Reset timeout reached");
      }

      // Check half-open call limit
      if (
        this.state === "half-open" &&
        this.halfOpenCalls >= this.config.halfOpenMaxCalls
      ) {
        throw new RAGCircuitBreakerError(
          `Circuit breaker '${this.name}' is half-open but call limit reached`,
          {
            code: RAGErrorCodes.CIRCUIT_BREAKER_HALF_OPEN_LIMIT,
            circuitName: this.name,
          },
        );
      }

      // Execute operation with timeout
      const result = await Promise.race([
        operation(),
        this.timeoutPromise<T>(this.config.operationTimeout),
      ]);

      // Record successful call
      this.recordCall(true, Date.now() - startTime, operationType);

      // Handle half-open success
      if (this.state === "half-open") {
        this.halfOpenCalls++;

        // If enough successful calls in half-open, close the circuit
        if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
          this.changeState("closed", "Half-open test successful");
        }
      }

      return result;
    } catch (error) {
      // Record failed call
      const duration = Date.now() - startTime;
      this.recordCall(false, duration, operationType);

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Emit failure event
      this.emit("callFailure", {
        error: errorMessage,
        duration,
        timestamp: new Date(),
        operationType,
      });

      // Handle state transitions on failure
      if (this.state === "half-open") {
        // Failure in half-open immediately opens circuit
        this.changeState("open", `Half-open test failed: ${errorMessage}`);
      } else if (this.state === "closed") {
        // Check if we should open the circuit
        this.checkFailureThreshold();
      }

      throw error;
    }
  }

  /**
   * Record a call in the history
   */
  private recordCall(
    success: boolean,
    duration: number,
    operationType?: string,
  ): void {
    const now = Date.now();

    this.callHistory.push({
      timestamp: now,
      success,
      duration,
      operationType,
    });

    // Emit success event
    if (success) {
      this.emit("callSuccess", {
        duration,
        timestamp: new Date(),
        operationType,
      });
    }

    // Update failure time
    if (!success) {
      this.lastFailureTime = now;
    }
  }

  /**
   * Check if failure threshold is exceeded
   */
  private checkFailureThreshold(): void {
    const windowStart = Date.now() - this.config.statisticsWindowSize;
    const windowCalls = this.callHistory.filter(
      (call) => call.timestamp >= windowStart,
    );

    // Need minimum calls before calculating failure rate
    if (windowCalls.length < this.config.minimumCallsBeforeCalculation) {
      return;
    }

    const failedCalls = windowCalls.filter((call) => !call.success).length;
    const failureRate = failedCalls / windowCalls.length;

    logger.debug(
      `[RAGCircuitBreaker:${this.name}] Failure rate: ${(failureRate * 100).toFixed(1)}% (${failedCalls}/${windowCalls.length})`,
    );

    // Open circuit if failure count exceeds threshold
    if (failedCalls >= this.config.failureThreshold) {
      this.changeState(
        "open",
        `Failure threshold exceeded: ${failedCalls} failures`,
      );

      this.emit("circuitOpen", {
        failureRate,
        totalCalls: windowCalls.length,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Change circuit breaker state
   */
  private changeState(newState: CircuitState, reason: string): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = new Date();

    // Reset counters based on state
    if (newState === "half-open") {
      this.halfOpenCalls = 0;
      this.emit("circuitHalfOpen", { timestamp: new Date() });
    } else if (newState === "closed") {
      this.halfOpenCalls = 0;
      this.emit("circuitClosed", { timestamp: new Date() });
    }

    logger.info(
      `[RAGCircuitBreaker:${this.name}] State changed: ${oldState} -> ${newState} (${reason})`,
    );

    // Emit state change event
    this.emit("stateChange", {
      oldState,
      newState,
      reason,
      timestamp: new Date(),
    });
  }

  /**
   * Create a timeout promise
   */
  private timeoutPromise<T>(timeout: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Clean up old call records
   */
  private cleanupCallHistory(): void {
    const cutoffTime = Date.now() - this.config.statisticsWindowSize;
    const originalLength = this.callHistory.length;

    this.callHistory = this.callHistory.filter(
      (call) => call.timestamp >= cutoffTime,
    );

    const removed = originalLength - this.callHistory.length;
    if (removed > 0) {
      logger.debug(
        `[RAGCircuitBreaker:${this.name}] Cleaned up ${removed} old call records`,
      );
    }
  }

  /**
   * Calculate percentile latency
   */
  private calculatePercentileLatency(percentile: number): number {
    if (this.callHistory.length === 0) {
      return 0;
    }

    const sortedDurations = this.callHistory
      .filter((call) => call.success)
      .map((call) => call.duration)
      .sort((a, b) => a - b);

    if (sortedDurations.length === 0) {
      return 0;
    }

    const index = Math.ceil((percentile / 100) * sortedDurations.length) - 1;
    return sortedDurations[Math.max(0, index)] ?? 0;
  }

  /**
   * Get current statistics
   */
  getStats(): RAGCircuitBreakerStats {
    const windowStart = Date.now() - this.config.statisticsWindowSize;
    const windowCalls = this.callHistory.filter(
      (call) => call.timestamp >= windowStart,
    );
    const successfulCalls = windowCalls.filter((call) => call.success).length;
    const failedCalls = windowCalls.length - successfulCalls;
    const failureRate =
      windowCalls.length > 0 ? failedCalls / windowCalls.length : 0;

    // Calculate average latency for successful calls
    const successfulDurations = windowCalls
      .filter((call) => call.success)
      .map((call) => call.duration);
    const averageLatency =
      successfulDurations.length > 0
        ? successfulDurations.reduce((a, b) => a + b, 0) /
          successfulDurations.length
        : 0;

    return {
      state: this.state,
      totalCalls: this.callHistory.length,
      successfulCalls: this.callHistory.filter((call) => call.success).length,
      failedCalls: this.callHistory.filter((call) => !call.success).length,
      failureRate,
      windowCalls: windowCalls.length,
      lastStateChange: this.lastStateChange,
      nextRetryTime:
        this.state === "open"
          ? new Date(this.lastFailureTime + this.config.resetTimeout)
          : undefined,
      halfOpenCalls: this.halfOpenCalls,
      averageLatency,
      p95Latency: this.calculatePercentileLatency(95),
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.changeState("closed", "Manual reset");
    this.callHistory = [];
    this.lastFailureTime = 0;
    this.halfOpenCalls = 0;
  }

  /**
   * Force open the circuit breaker
   */
  forceOpen(reason = "Manual force open"): void {
    this.changeState("open", reason);
    this.lastFailureTime = Date.now();
  }

  /**
   * Get circuit breaker name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Check if circuit is open
   */
  isOpen(): boolean {
    return this.state === "open";
  }

  /**
   * Check if circuit is closed
   */
  isClosed(): boolean {
    return this.state === "closed";
  }

  /**
   * Check if circuit is half-open
   */
  isHalfOpen(): boolean {
    return this.state === "half-open";
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Destroy the circuit breaker and clean up resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.removeAllListeners();
    this.callHistory = [];
    logger.debug(`[RAGCircuitBreaker:${this.name}] Destroyed`);
  }
}

/**
 * Circuit breaker manager for RAG operations
 */
export class RAGCircuitBreakerManager {
  private breakers = new Map<string, RAGCircuitBreaker>();

  /**
   * Get or create a circuit breaker
   */
  getBreaker(
    name: string,
    config?: Partial<RAGCircuitBreakerConfig>,
  ): RAGCircuitBreaker {
    if (!this.breakers.has(name)) {
      const breaker = new RAGCircuitBreaker(name, config);
      this.breakers.set(name, breaker);
      logger.debug(
        `[RAGCircuitBreakerManager] Created circuit breaker: ${name}`,
      );
    }

    const breaker = this.breakers.get(name);
    if (!breaker) {
      throw new Error(`Circuit breaker ${name} not found after creation`);
    }
    return breaker;
  }

  /**
   * Remove a circuit breaker
   */
  removeBreaker(name: string): boolean {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.destroy();
      this.breakers.delete(name);
      logger.debug(
        `[RAGCircuitBreakerManager] Removed circuit breaker: ${name}`,
      );
      return true;
    }
    return false;
  }

  /**
   * Get all circuit breaker names
   */
  getBreakerNames(): string[] {
    return Array.from(this.breakers.keys());
  }

  /**
   * Get statistics for all circuit breakers
   */
  getAllStats(): Record<string, RAGCircuitBreakerStats> {
    const stats: Record<string, RAGCircuitBreakerStats> = {};
    for (const [name, breaker] of this.breakers) {
      stats[name] = breaker.getStats();
    }
    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
    logger.info("[RAGCircuitBreakerManager] Reset all circuit breakers");
  }

  /**
   * Get health summary
   */
  getHealthSummary(): {
    totalBreakers: number;
    closedBreakers: number;
    openBreakers: number;
    halfOpenBreakers: number;
    unhealthyBreakers: string[];
  } {
    let closedBreakers = 0;
    let openBreakers = 0;
    let halfOpenBreakers = 0;
    const unhealthyBreakers: string[] = [];

    for (const [name, breaker] of this.breakers) {
      const state = breaker.getState();
      switch (state) {
        case "closed":
          closedBreakers++;
          break;
        case "open":
          openBreakers++;
          unhealthyBreakers.push(name);
          break;
        case "half-open":
          halfOpenBreakers++;
          break;
      }
    }

    return {
      totalBreakers: this.breakers.size,
      closedBreakers,
      openBreakers,
      halfOpenBreakers,
      unhealthyBreakers,
    };
  }

  /**
   * Destroy all circuit breakers
   */
  destroyAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.destroy();
    }
    this.breakers.clear();
    logger.info("[RAGCircuitBreakerManager] Destroyed all circuit breakers");
  }
}

/**
 * Global circuit breaker manager for RAG operations
 */
export const ragCircuitBreakerManager = new RAGCircuitBreakerManager();

/**
 * Convenience function to get a circuit breaker
 */
export function getCircuitBreaker(
  name: string,
  config?: Partial<RAGCircuitBreakerConfig>,
): RAGCircuitBreaker {
  return ragCircuitBreakerManager.getBreaker(name, config);
}

/**
 * Convenience function to execute with circuit breaker
 */
export async function executeWithCircuitBreaker<T>(
  breakerName: string,
  operation: () => Promise<T>,
  operationType?: string,
  config?: Partial<RAGCircuitBreakerConfig>,
): Promise<T> {
  const breaker = ragCircuitBreakerManager.getBreaker(breakerName, config);
  return breaker.execute(operation, operationType);
}
