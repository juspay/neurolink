/**
 * MCP Circuit Breaker
 * Implements circuit breaker pattern for external MCP operations
 * Provides fault tolerance and prevents cascading failures
 */

import { EventEmitter } from "events";
import { mcpLogger } from "../utils/logger.js";
import type { JsonValue } from "../types/common.js";

/**
 * Circuit breaker states
 */
export type CircuitBreakerState = "closed" | "open" | "half-open";

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening the circuit */
  failureThreshold: number;

  /** Time to wait before attempting reset (milliseconds) */
  resetTimeout: number;

  /** Maximum calls allowed in half-open state */
  halfOpenMaxCalls: number;

  /** Timeout for individual operations (milliseconds) */
  operationTimeout: number;

  /** Minimum number of calls before calculating failure rate */
  minimumCallsBeforeCalculation: number;

  /** Window size for calculating failure rate (milliseconds) */
  statisticsWindowSize: number;
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  /** Current state */
  state: CircuitBreakerState;

  /** Total number of calls */
  totalCalls: number;

  /** Number of successful calls */
  successfulCalls: number;

  /** Number of failed calls */
  failedCalls: number;

  /** Current failure rate (0-1) */
  failureRate: number;

  /** Calls in current time window */
  windowCalls: number;

  /** Last state change timestamp */
  lastStateChange: Date;

  /** Next retry time (for open state) */
  nextRetryTime?: Date;

  /** Half-open call count */
  halfOpenCalls: number;
}

/**
 * Call record for statistics tracking
 */
interface CallRecord {
  timestamp: number;
  success: boolean;
  duration: number;
}

/**
 * Circuit breaker events
 */
export interface CircuitBreakerEvents {
  stateChange: {
    oldState: CircuitBreakerState;
    newState: CircuitBreakerState;
    reason: string;
    timestamp: Date;
  };

  callSuccess: {
    duration: number;
    timestamp: Date;
  };

  callFailure: {
    error: string;
    duration: number;
    timestamp: Date;
  };

  circuitOpen: {
    failureRate: number;
    totalCalls: number;
    timestamp: Date;
  };

  circuitHalfOpen: {
    timestamp: Date;
  };

  circuitClosed: {
    timestamp: Date;
  };
}

/**
 * MCPCircuitBreaker
 * Implements circuit breaker pattern for fault tolerance
 */
export class MCPCircuitBreaker extends EventEmitter {
  private state: CircuitBreakerState = "closed";
  private config: CircuitBreakerConfig;
  private callHistory: CallRecord[] = [];
  private lastFailureTime = 0;
  private halfOpenCalls = 0;
  private lastStateChange = new Date();

  constructor(
    private name: string,
    config: Partial<CircuitBreakerConfig> = {},
  ) {
    super();

    // Set default configuration
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      resetTimeout: config.resetTimeout ?? 60000,
      halfOpenMaxCalls: config.halfOpenMaxCalls ?? 3,
      operationTimeout: config.operationTimeout ?? 30000,
      minimumCallsBeforeCalculation: config.minimumCallsBeforeCalculation ?? 10,
      statisticsWindowSize: config.statisticsWindowSize ?? 300000, // 5 minutes
    };

    // Clean up old call records periodically
    setInterval(() => this.cleanupCallHistory(), 60000);
  }

  /**
   * Execute an operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const startTime = Date.now();

    try {
      // Check if circuit is open
      if (this.state === "open") {
        if (Date.now() - this.lastFailureTime < this.config.resetTimeout) {
          throw new Error(
            `Circuit breaker '${this.name}' is open. Next retry at ${new Date(this.lastFailureTime + this.config.resetTimeout)}`,
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
        throw new Error(
          `Circuit breaker '${this.name}' is half-open but call limit reached`,
        );
      }

      // Execute operation with timeout
      const result = await Promise.race([
        operation(),
        this.timeoutPromise<T>(this.config.operationTimeout),
      ]);

      // Record successful call
      this.recordCall(true, Date.now() - startTime);

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
      this.recordCall(false, duration);

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Emit failure event
      this.emit("callFailure", {
        error: errorMessage,
        duration,
        timestamp: new Date(),
      } satisfies CircuitBreakerEvents["callFailure"]);

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
  private recordCall(success: boolean, duration: number): void {
    const now = Date.now();

    this.callHistory.push({
      timestamp: now,
      success,
      duration,
    });

    // Emit success event
    if (success) {
      this.emit("callSuccess", {
        duration,
        timestamp: new Date(),
      } satisfies CircuitBreakerEvents["callSuccess"]);
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

    mcpLogger.debug(
      `[CircuitBreaker:${this.name}] Failure rate: ${(failureRate * 100).toFixed(1)}% (${failedCalls}/${windowCalls.length})`,
    );

    // Open circuit if failure rate exceeds threshold
    if (failedCalls >= this.config.failureThreshold) {
      this.changeState(
        "open",
        `Failure threshold exceeded: ${failedCalls} failures`,
      );

      this.emit("circuitOpen", {
        failureRate,
        totalCalls: windowCalls.length,
        timestamp: new Date(),
      } satisfies CircuitBreakerEvents["circuitOpen"]);
    }
  }

  /**
   * Change circuit breaker state
   */
  private changeState(newState: CircuitBreakerState, reason: string): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = new Date();

    // Reset counters based on state
    if (newState === "half-open") {
      this.halfOpenCalls = 0;
      this.emit("circuitHalfOpen", {
        timestamp: new Date(),
      } satisfies CircuitBreakerEvents["circuitHalfOpen"]);
    } else if (newState === "closed") {
      this.halfOpenCalls = 0;
      this.emit("circuitClosed", {
        timestamp: new Date(),
      } satisfies CircuitBreakerEvents["circuitClosed"]);
    }

    mcpLogger.info(
      `[CircuitBreaker:${this.name}] State changed: ${oldState} -> ${newState} (${reason})`,
    );

    // Emit state change event
    this.emit("stateChange", {
      oldState,
      newState,
      reason,
      timestamp: new Date(),
    } satisfies CircuitBreakerEvents["stateChange"]);
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
      mcpLogger.debug(
        `[CircuitBreaker:${this.name}] Cleaned up ${removed} old call records`,
      );
    }
  }

  /**
   * Get current statistics
   */
  getStats(): CircuitBreakerStats {
    const windowStart = Date.now() - this.config.statisticsWindowSize;
    const windowCalls = this.callHistory.filter(
      (call) => call.timestamp >= windowStart,
    );
    const successfulCalls = windowCalls.filter((call) => call.success).length;
    const failedCalls = windowCalls.length - successfulCalls;
    const failureRate =
      windowCalls.length > 0 ? failedCalls / windowCalls.length : 0;

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
}

/**
 * Circuit breaker manager for multiple circuit breakers
 */
export class CircuitBreakerManager {
  private breakers = new Map<string, MCPCircuitBreaker>();

  /**
   * Get or create a circuit breaker
   */
  getBreaker(
    name: string,
    config?: Partial<CircuitBreakerConfig>,
  ): MCPCircuitBreaker {
    if (!this.breakers.has(name)) {
      const breaker = new MCPCircuitBreaker(name, config);
      this.breakers.set(name, breaker);

      mcpLogger.debug(
        `[CircuitBreakerManager] Created circuit breaker: ${name}`,
      );
    }

    return this.breakers.get(name)!;
  }

  /**
   * Remove a circuit breaker
   */
  removeBreaker(name: string): boolean {
    const removed = this.breakers.delete(name);
    if (removed) {
      mcpLogger.debug(
        `[CircuitBreakerManager] Removed circuit breaker: ${name}`,
      );
    }
    return removed;
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
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};

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

    mcpLogger.info("[CircuitBreakerManager] Reset all circuit breakers");
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
      const stats = breaker.getStats();

      switch (stats.state) {
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
}

// Global circuit breaker manager instance
export const globalCircuitBreakerManager = new CircuitBreakerManager();
