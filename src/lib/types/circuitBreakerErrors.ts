/**
 * Circuit Breaker Error Classes
 * Shared error types for circuit breaker implementations across the codebase.
 * Lives in types/ to avoid circular dependencies between utils/ and mcp/.
 */

import type { CircuitBreakerState } from "./mcpTypes.js";

/**
 * Typed error thrown when a circuit breaker is open or half-open call limit is reached.
 * Contains structured metadata so callers can build actionable error messages
 * for AI models and downstream consumers.
 */
export class CircuitBreakerOpenError extends Error {
  /** The circuit breaker name (e.g., "tool-execution-bitbucket-server-add_comment") */
  readonly breakerName: string;
  /** ISO timestamp when the circuit breaker will transition to half-open and allow a retry */
  readonly retryAfter: string;
  /** Milliseconds until the circuit breaker will allow a retry */
  readonly retryAfterMs: number;
  /** Current circuit breaker state ("open" or "half-open") */
  readonly breakerState: CircuitBreakerState;
  /** Number of failures that caused the circuit to open */
  readonly failureCount: number;

  constructor(options: {
    breakerName: string;
    retryAfter: Date;
    retryAfterMs: number;
    breakerState: CircuitBreakerState;
    failureCount: number;
  }) {
    const retryAfterStr = options.retryAfter.toISOString();
    super(
      `Circuit breaker '${options.breakerName}' is ${options.breakerState}. ` +
        `Tool temporarily unavailable after ${options.failureCount} failures. ` +
        `Retry after: ${retryAfterStr} (${Math.ceil(options.retryAfterMs / 1000)}s).`,
    );
    this.name = "CircuitBreakerOpenError";
    this.breakerName = options.breakerName;
    this.retryAfter = retryAfterStr;
    this.retryAfterMs = options.retryAfterMs;
    this.breakerState = options.breakerState;
    this.failureCount = options.failureCount;
  }
}
