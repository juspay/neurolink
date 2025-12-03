/**
 * Retry and resilience utilities for NeuroLink
 * Part of Sub-phase 3.3.3 - Edge Case Handling
 */

import { logger } from "./logger.js";
import { SYSTEM_LIMITS } from "../core/constants.js";
import type { RetryOptions } from "../types/utilities.js";

/**
 * Calculate exponential backoff delay with jitter
 * @param attempt - Current attempt number (1-based)
 * @param initialDelay - Initial delay in milliseconds
 * @param multiplier - Backoff multiplier for exponential growth
 * @param maxDelay - Maximum delay cap in milliseconds
 * @param addJitter - Whether to add random jitter to prevent thundering herd
 * @returns Calculated delay in milliseconds
 */
export function calculateBackoffDelay(
  attempt: number,
  initialDelay: number = SYSTEM_LIMITS.DEFAULT_INITIAL_DELAY,
  multiplier: number = SYSTEM_LIMITS.DEFAULT_BACKOFF_MULTIPLIER,
  maxDelay: number = SYSTEM_LIMITS.DEFAULT_MAX_DELAY,
  addJitter: boolean = true,
): number {
  // Calculate exponential backoff
  const exponentialDelay = initialDelay * Math.pow(multiplier, attempt - 1);

  // Apply maximum delay cap
  const cappedDelay = Math.min(exponentialDelay, maxDelay);

  // Add jitter to avoid thundering herd (up to 10% of delay, max 1 second)
  const jitter = addJitter
    ? Math.random() * Math.min(cappedDelay * 0.1, 1000)
    : 0;

  return cappedDelay + jitter;
}

/**
 * Error types that are typically retryable
 */
export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

export class TemporaryError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "TemporaryError";
  }
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: Required<RetryOptions> = {
  maxAttempts: SYSTEM_LIMITS.DEFAULT_RETRY_ATTEMPTS,
  initialDelay: SYSTEM_LIMITS.DEFAULT_INITIAL_DELAY,
  maxDelay: SYSTEM_LIMITS.DEFAULT_MAX_DELAY,
  backoffMultiplier: SYSTEM_LIMITS.DEFAULT_BACKOFF_MULTIPLIER,
  retryCondition: (error: unknown) => {
    // Retry on network errors, timeouts, and specific HTTP errors
    if (error instanceof NetworkError || error instanceof TemporaryError) {
      return true;
    }

    // Retry on timeout errors
    if (
      error &&
      typeof error === "object" &&
      ((error as { name?: string }).name === "TimeoutError" ||
        (error as { code?: string }).code === "TIMEOUT")
    ) {
      return true;
    }

    // Retry on network-related errors
    if (
      error &&
      typeof error === "object" &&
      ((error as { code?: string }).code === "ECONNRESET" ||
        (error as { code?: string }).code === "ENOTFOUND" ||
        (error as { code?: string }).code === "ECONNREFUSED" ||
        (error as { code?: string }).code === "ETIMEDOUT")
    ) {
      return true;
    }

    // Retry on HTTP 5xx errors and some 4xx errors
    if (
      error &&
      typeof error === "object" &&
      (error as { status?: number }).status
    ) {
      const status = Number((error as { status: number }).status);
      return status >= 500 || status === 429 || status === 408;
    }

    // Don't retry by default
    return false;
  },
  onRetry: (attempt: number, error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`⚠️ Retry attempt ${attempt}: ${message}`);
  },
};

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute an operation with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry if it's the last attempt
      if (attempt === config.maxAttempts) {
        break;
      }

      // Check if we should retry this error
      if (!config.retryCondition(error)) {
        break;
      }

      // Call retry callback
      config.onRetry(attempt, error);

      // Calculate delay with exponential backoff and jitter
      const jitteredDelay = calculateBackoffDelay(
        attempt,
        config.initialDelay,
        config.backoffMultiplier,
        config.maxDelay,
        true, // Enable jitter
      );

      await sleep(jitteredDelay);
    }
  }

  throw lastError;
}

/**
 * Enhanced timeout with retry for network operations
 */
export async function withTimeoutAndRetry<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  retryOptions: RetryOptions = {},
): Promise<T> {
  return withRetry(async () => {
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new NetworkError(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      operation()
        .then((result) => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }, retryOptions);
}

/**
 * Circuit breaker pattern for preventing cascading failures
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  constructor(
    private threshold = 5,
    private timeout = 60000, // 1 minute
    private monitorWindow = 600000, // 10 minutes
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = "half-open";
      } else {
        throw new Error("Circuit breaker is open - operation rejected");
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = "closed";
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = "open";
    }
  }

  getState(): string {
    return this.state;
  }

  reset(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
    this.state = "closed";
  }
}

/**
 * Rate limiter to prevent overwhelming APIs
 */
export class RateLimiter {
  private requests: number[] = [];

  constructor(
    private maxRequests: number,
    private windowMs: number,
  ) {}

  async acquire(): Promise<void> {
    const now = Date.now();

    // Remove old requests outside the window
    this.requests = this.requests.filter((time) => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      // Calculate delay until next available slot
      const oldestRequest = Math.min(...this.requests);
      const delay = this.windowMs - (now - oldestRequest);

      if (delay > 0) {
        await sleep(delay);
        return this.acquire(); // Try again after delay
      }
    }

    this.requests.push(now);
  }
}

/**
 * Utility for graceful shutdown handling
 */
export class GracefulShutdown {
  private operations: Set<Promise<unknown>> = new Set();
  private shutdownPromise: Promise<void> | null = null;

  track<T>(operation: Promise<T>): Promise<T> {
    this.operations.add(operation);

    operation.finally(() => {
      this.operations.delete(operation);
    });

    return operation;
  }

  async shutdown(timeoutMs = 30000): Promise<void> {
    if (this.shutdownPromise) {
      return this.shutdownPromise;
    }

    this.shutdownPromise = this.performShutdown(timeoutMs);
    return this.shutdownPromise;
  }

  private async performShutdown(timeoutMs: number): Promise<void> {
    logger.debug(
      `🔄 Graceful shutdown: waiting for ${this.operations.size} operations...`,
    );

    try {
      await Promise.race([
        Promise.all(this.operations),
        sleep(timeoutMs).then(() => {
          throw new Error(
            `Shutdown timeout: ${this.operations.size} operations still running`,
          );
        }),
      ]);

      logger.debug("✅ Graceful shutdown completed");
    } catch (error) {
      logger.warn(
        `⚠️ Shutdown warning: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

/**
 * Global instances for convenience
 */
export const globalShutdown = new GracefulShutdown();
export const providerCircuitBreaker = new CircuitBreaker(3, 30000); // 3 failures, 30s timeout
export const apiRateLimiter = new RateLimiter(100, 60000); // 100 requests per minute
