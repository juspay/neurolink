/**
 * MCP Circuit Breaker
 * Implements circuit breaker pattern for external MCP operations
 * Provides fault tolerance and prevents cascading failures
 */

import { EventEmitter } from "events";
import { trace } from "@opentelemetry/api";
import { mcpLogger } from "../utils/logger.js";
import type {
  CallRecord,
  CircuitBreakerState,
  CircuitBreakerConfig,
  CircuitBreakerStats,
  CircuitBreakerEvents,
} from "../types/mcpTypes.js";

import { CircuitBreakerOpenError } from "../types/circuitBreakerErrors.js";

// Re-export CircuitBreakerOpenError from shared types to preserve public API
export { CircuitBreakerOpenError } from "../types/circuitBreakerErrors.js";

/**
 * Default operation timeout for circuit breaker protected operations.
 * Configurable via MCP_OPERATION_TIMEOUT env var (in milliseconds).
 * Increased from 30s to 60s to accommodate MCP server startup latency,
 * especially when multiple servers start concurrently.
 */
const DEFAULT_OPERATION_TIMEOUT = Math.max(
  10000,
  Number(process.env.MCP_OPERATION_TIMEOUT) || 60000,
);

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
  // Store the cleanup timer reference for proper cleanup
  private cleanupTimer?: NodeJS.Timeout;

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
      operationTimeout: config.operationTimeout ?? DEFAULT_OPERATION_TIMEOUT,
      minimumCallsBeforeCalculation: config.minimumCallsBeforeCalculation ?? 10,
      statisticsWindowSize: config.statisticsWindowSize ?? 300000, // 5 minutes
    };

    // Clean up old call records periodically - now storing the timer reference
    this.cleanupTimer = setInterval(() => this.cleanupCallHistory(), 60000);
  }

  /**
   * Execute an operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const startTime = Date.now();

    try {
      // Check if circuit is open
      if (this.state === "open") {
        const retryAfterMs =
          this.config.resetTimeout - (Date.now() - this.lastFailureTime);
        if (retryAfterMs > 0) {
          throw new CircuitBreakerOpenError({
            breakerName: this.name,
            retryAfter: new Date(
              this.lastFailureTime + this.config.resetTimeout,
            ),
            retryAfterMs,
            breakerState: "open",
            failureCount: this.getStats().failedCalls,
          });
        }

        // Transition to half-open
        this.changeState("half-open", "Reset timeout reached");
      }

      // Check half-open call limit
      if (
        this.state === "half-open" &&
        this.halfOpenCalls >= this.config.halfOpenMaxCalls
      ) {
        // Half-open call limit exceeded — revert to open with fresh cooldown
        this.lastFailureTime = Date.now();
        this.changeState(
          "open",
          "Half-open call limit reached, reverting to open",
        );

        throw new CircuitBreakerOpenError({
          breakerName: this.name,
          retryAfter: new Date(this.lastFailureTime + this.config.resetTimeout),
          retryAfterMs: this.config.resetTimeout,
          breakerState: "open",
          failureCount: this.getStats().failedCalls,
        });
      }

      // NLK-GAP-009: Record half-open test event when executing in half-open state
      if (this.state === "half-open") {
        const activeSpan = trace.getActiveSpan();
        if (activeSpan) {
          activeSpan.addEvent("circuit.half_open_test", {
            "circuit.name": this.name,
            "circuit.half_open_call": this.halfOpenCalls + 1,
            "circuit.half_open_max_calls": this.config.halfOpenMaxCalls,
          });
        }
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

    // NLK-GAP-009: Record state transition on active OTel span
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.addEvent("circuit.state_change", {
        "circuit.name": this.name,
        "circuit.from_state": oldState,
        "circuit.to_state": newState,
        "circuit.reason": reason.slice(0, 128),
        "circuit.failure_count": this.callHistory.filter((c) => !c.success)
          .length,
      });
    }

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

  /**
   * Destroy the circuit breaker and clean up resources
   * This method should be called when the circuit breaker is no longer needed
   * to prevent memory leaks from the cleanup timer
   */
  destroy(): void {
    // Clear the interval timer to prevent memory leaks
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
      mcpLogger.debug(`[CircuitBreaker:${this.name}] Cleanup timer cleared`);
    }

    // Clear any remaining event listeners
    this.removeAllListeners();

    // Clear call history to free memory
    this.callHistory = [];

    mcpLogger.debug(`[CircuitBreaker:${this.name}] Destroyed and cleaned up`);
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

    const breaker = this.breakers.get(name);
    if (!breaker) {
      throw new Error(`Circuit breaker ${name} not found after creation`);
    }
    return breaker;
  }

  /**
   * Remove a circuit breaker and clean up its resources
   */
  removeBreaker(name: string): boolean {
    const breaker = this.breakers.get(name);
    if (breaker) {
      // Destroy the breaker to clean up its timer and resources
      breaker.destroy();
      this.breakers.delete(name);

      mcpLogger.debug(
        `[CircuitBreakerManager] Removed and cleaned up circuit breaker: ${name}`,
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

  /**
   * Destroy all circuit breakers and clean up their resources
   * This should be called during application shutdown to prevent memory leaks
   */
  destroyAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.destroy();
    }
    this.breakers.clear();

    mcpLogger.info("[CircuitBreakerManager] Destroyed all circuit breakers");
  }
}

// Global circuit breaker manager instance
export const globalCircuitBreakerManager = new CircuitBreakerManager();
