/**
 * Retry Policy
 * Configurable retry strategies for observability exporters
 */

import { logger } from "../utils/logger.js";
import type {
  RetryPolicy,
  RetryContext,
  RetryDecision,
} from "../types/index.js";

/**
 * Base retry policy with common configuration
 */
export abstract class BaseRetryPolicy implements RetryPolicy {
  abstract readonly name: string;
  readonly maxAttempts: number;
  readonly maxTotalTimeMs: number;
  protected readonly retryableErrors: Set<string>;
  protected readonly nonRetryableErrors: Set<string>;

  constructor(config: {
    maxAttempts?: number;
    maxTotalTimeMs?: number;
    retryableErrors?: string[];
    nonRetryableErrors?: string[];
  }) {
    this.maxAttempts = config.maxAttempts ?? 3;
    this.maxTotalTimeMs = config.maxTotalTimeMs ?? 60000; // 1 minute
    this.retryableErrors = new Set(
      config.retryableErrors ?? [
        "ECONNRESET",
        "ETIMEDOUT",
        "ECONNREFUSED",
        "EPIPE",
        "ENOTFOUND",
        "ENETUNREACH",
        "EAI_AGAIN",
        "429", // Rate limit
        "500", // Internal server error
        "502", // Bad gateway
        "503", // Service unavailable
        "504", // Gateway timeout
      ],
    );
    this.nonRetryableErrors = new Set(
      config.nonRetryableErrors ?? [
        "400", // Bad request
        "401", // Unauthorized
        "403", // Forbidden
        "404", // Not found
        "422", // Unprocessable entity
      ],
    );
  }

  abstract shouldRetry(context: RetryContext): RetryDecision;

  protected isRetryableError(error: Error): boolean {
    const errorCode = this.extractErrorCode(error);

    // Check if explicitly non-retryable
    if (this.nonRetryableErrors.has(errorCode)) {
      return false;
    }

    // Check if explicitly retryable
    if (this.retryableErrors.has(errorCode)) {
      return true;
    }

    // Default: retry on network-like errors
    return (
      error.message.includes("timeout") ||
      error.message.includes("ECONNRESET") ||
      error.message.includes("network")
    );
  }

  protected extractErrorCode(error: Error): string {
    // Check for HTTP status code in error
    const httpMatch = error.message.match(/(\d{3})/);
    if (httpMatch) {
      return httpMatch[1];
    }

    // Check for Node.js error code
    const nodeError = error as Error & { code?: string };
    if (nodeError.code) {
      return nodeError.code;
    }

    return "UNKNOWN";
  }
}

/**
 * Exponential backoff retry policy
 * Delay increases exponentially with each attempt
 */
export class ExponentialBackoffPolicy extends BaseRetryPolicy {
  readonly name = "exponential-backoff";
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly jitterFactor: number;

  constructor(config?: {
    maxAttempts?: number;
    maxTotalTimeMs?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    jitterFactor?: number;
    retryableErrors?: string[];
    nonRetryableErrors?: string[];
  }) {
    super(config ?? {});
    this.baseDelayMs = config?.baseDelayMs ?? 1000;
    this.maxDelayMs = config?.maxDelayMs ?? 30000;
    this.jitterFactor = config?.jitterFactor ?? 0.1;
  }

  shouldRetry(context: RetryContext): RetryDecision {
    // Check max attempts
    if (context.attempt >= this.maxAttempts) {
      return {
        shouldRetry: false,
        delayMs: 0,
        reason: `Max attempts (${this.maxAttempts}) exceeded`,
      };
    }

    // Check max total time
    if (context.elapsedMs >= this.maxTotalTimeMs) {
      return {
        shouldRetry: false,
        delayMs: 0,
        reason: `Max total time (${this.maxTotalTimeMs}ms) exceeded`,
      };
    }

    // Check if error is retryable
    if (!this.isRetryableError(context.error)) {
      return {
        shouldRetry: false,
        delayMs: 0,
        reason: `Error not retryable: ${context.error.message}`,
      };
    }

    // Calculate delay with exponential backoff
    const exponentialDelay = this.baseDelayMs * 2 ** context.attempt;
    const cappedDelay = Math.min(exponentialDelay, this.maxDelayMs);

    // Add jitter
    const jitter = cappedDelay * this.jitterFactor * (Math.random() * 2 - 1);
    const delayMs = Math.max(0, Math.round(cappedDelay + jitter));

    return {
      shouldRetry: true,
      delayMs,
      reason: `Retrying after ${delayMs}ms (attempt ${context.attempt + 1}/${this.maxAttempts})`,
    };
  }
}

/**
 * Linear backoff retry policy
 * Delay increases linearly with each attempt
 */
export class LinearBackoffPolicy extends BaseRetryPolicy {
  readonly name = "linear-backoff";
  private readonly delayIncrementMs: number;
  private readonly initialDelayMs: number;

  constructor(config?: {
    maxAttempts?: number;
    maxTotalTimeMs?: number;
    initialDelayMs?: number;
    delayIncrementMs?: number;
    retryableErrors?: string[];
    nonRetryableErrors?: string[];
  }) {
    super(config ?? {});
    this.initialDelayMs = config?.initialDelayMs ?? 1000;
    this.delayIncrementMs = config?.delayIncrementMs ?? 1000;
  }

  shouldRetry(context: RetryContext): RetryDecision {
    if (context.attempt >= this.maxAttempts) {
      return {
        shouldRetry: false,
        delayMs: 0,
        reason: `Max attempts (${this.maxAttempts}) exceeded`,
      };
    }

    if (context.elapsedMs >= this.maxTotalTimeMs) {
      return {
        shouldRetry: false,
        delayMs: 0,
        reason: `Max total time (${this.maxTotalTimeMs}ms) exceeded`,
      };
    }

    if (!this.isRetryableError(context.error)) {
      return {
        shouldRetry: false,
        delayMs: 0,
        reason: `Error not retryable: ${context.error.message}`,
      };
    }

    const delayMs =
      this.initialDelayMs + context.attempt * this.delayIncrementMs;

    return {
      shouldRetry: true,
      delayMs,
      reason: `Retrying after ${delayMs}ms (attempt ${context.attempt + 1}/${this.maxAttempts})`,
    };
  }
}

/**
 * Fixed delay retry policy
 * Same delay for all retry attempts
 */
export class FixedDelayPolicy extends BaseRetryPolicy {
  readonly name = "fixed-delay";
  private readonly delayMs: number;

  constructor(config?: {
    maxAttempts?: number;
    maxTotalTimeMs?: number;
    delayMs?: number;
    retryableErrors?: string[];
    nonRetryableErrors?: string[];
  }) {
    super(config ?? {});
    this.delayMs = config?.delayMs ?? 1000;
  }

  shouldRetry(context: RetryContext): RetryDecision {
    if (context.attempt >= this.maxAttempts) {
      return {
        shouldRetry: false,
        delayMs: 0,
        reason: `Max attempts (${this.maxAttempts}) exceeded`,
      };
    }

    if (context.elapsedMs >= this.maxTotalTimeMs) {
      return {
        shouldRetry: false,
        delayMs: 0,
        reason: `Max total time (${this.maxTotalTimeMs}ms) exceeded`,
      };
    }

    if (!this.isRetryableError(context.error)) {
      return {
        shouldRetry: false,
        delayMs: 0,
        reason: `Error not retryable: ${context.error.message}`,
      };
    }

    return {
      shouldRetry: true,
      delayMs: this.delayMs,
      reason: `Retrying after ${this.delayMs}ms (attempt ${context.attempt + 1}/${this.maxAttempts})`,
    };
  }
}

/**
 * No retry policy - never retries
 */
export class NoRetryPolicy implements RetryPolicy {
  readonly name = "no-retry";
  readonly maxAttempts = 1;
  readonly maxTotalTimeMs = 0;

  shouldRetry(_context: RetryContext): RetryDecision {
    return {
      shouldRetry: false,
      delayMs: 0,
      reason: "Retry disabled",
    };
  }
}

/**
 * Circuit breaker aware retry policy
 * Works with circuit breaker state to prevent retries when circuit is open
 */
export class CircuitBreakerAwarePolicy extends BaseRetryPolicy {
  readonly name = "circuit-breaker-aware";
  private readonly innerPolicy: RetryPolicy;
  private failures: number = 0;
  private lastFailure: number = 0;
  private circuitState: "closed" | "open" | "half-open" = "closed";
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;

  constructor(config?: {
    innerPolicy?: RetryPolicy;
    failureThreshold?: number;
    resetTimeoutMs?: number;
    maxAttempts?: number;
    maxTotalTimeMs?: number;
    retryableErrors?: string[];
    nonRetryableErrors?: string[];
  }) {
    super(config ?? {});
    this.innerPolicy = config?.innerPolicy ?? new ExponentialBackoffPolicy();
    this.failureThreshold = config?.failureThreshold ?? 5;
    this.resetTimeoutMs = config?.resetTimeoutMs ?? 30000;
  }

  shouldRetry(context: RetryContext): RetryDecision {
    // Check circuit state
    if (this.circuitState === "open") {
      if (Date.now() - this.lastFailure > this.resetTimeoutMs) {
        this.circuitState = "half-open";
        logger.info(`[${this.name}] Circuit half-open, allowing probe request`);
      } else {
        return {
          shouldRetry: false,
          delayMs: 0,
          reason: "Circuit breaker open",
        };
      }
    }

    // Delegate to inner policy
    const decision = this.innerPolicy.shouldRetry(context);

    // Record result for circuit breaker
    if (!decision.shouldRetry) {
      this.recordFailure();
    }

    return decision;
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.circuitState = "open";
      logger.warn(
        `[${this.name}] Circuit opened after ${this.failures} failures`,
      );
    }
  }

  recordSuccess(): void {
    if (this.circuitState === "half-open") {
      logger.info(`[${this.name}] Circuit closed after successful request`);
    }
    this.failures = 0;
    this.circuitState = "closed";
  }

  getCircuitState(): "closed" | "open" | "half-open" {
    return this.circuitState;
  }

  reset(): void {
    this.failures = 0;
    this.circuitState = "closed";
    this.lastFailure = 0;
  }
}

/**
 * Retry executor - executes operations with retry policy
 */
export class RetryExecutor {
  private readonly policy: RetryPolicy;

  constructor(policy: RetryPolicy) {
    this.policy = policy;
  }

  /**
   * Execute an operation with retry
   * @param operation - The async operation to execute
   * @param operationName - Name for logging
   * @returns The result of the operation
   * @throws The last error if all retries fail
   */
  async execute<T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<T> {
    const startTime = Date.now();
    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt < this.policy.maxAttempts) {
      try {
        const result = await operation();

        // Record success if policy supports it
        if (this.policy instanceof CircuitBreakerAwarePolicy) {
          this.policy.recordSuccess();
        }

        return result;
      } catch (error) {
        lastError = error as Error;
        const elapsed = Date.now() - startTime;

        const decision = this.policy.shouldRetry({
          attempt,
          error: lastError,
          elapsedMs: elapsed,
          operationName,
        });

        if (!decision.shouldRetry) {
          logger.warn(`[RetryExecutor] ${operationName}: ${decision.reason}`);
          break;
        }

        logger.debug(`[RetryExecutor] ${operationName}: ${decision.reason}`);
        await this.delay(decision.delayMs);
        attempt++;
      }
    }

    throw (
      lastError ??
      new Error(`${operationName} failed after ${attempt} attempts`)
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Factory for creating retry policies
 */
export class RetryPolicyFactory {
  /**
   * Create a default policy for production use
   */
  static createDefault(): ExponentialBackoffPolicy {
    return new ExponentialBackoffPolicy({
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
    });
  }

  /**
   * Create an aggressive policy for critical operations
   */
  static createAggressive(): ExponentialBackoffPolicy {
    return new ExponentialBackoffPolicy({
      maxAttempts: 5,
      maxTotalTimeMs: 120000,
      baseDelayMs: 500,
      maxDelayMs: 60000,
    });
  }

  /**
   * Create a conservative policy for non-critical operations
   */
  static createConservative(): LinearBackoffPolicy {
    return new LinearBackoffPolicy({
      maxAttempts: 2,
      maxTotalTimeMs: 10000,
      initialDelayMs: 500,
      delayIncrementMs: 500,
    });
  }

  /**
   * Create a circuit breaker aware policy
   */
  static createWithCircuitBreaker(config?: {
    failureThreshold?: number;
    resetTimeoutMs?: number;
  }): CircuitBreakerAwarePolicy {
    return new CircuitBreakerAwarePolicy({
      innerPolicy: RetryPolicyFactory.createDefault(),
      failureThreshold: config?.failureThreshold ?? 5,
      resetTimeoutMs: config?.resetTimeoutMs ?? 30000,
    });
  }
}
