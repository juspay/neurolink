/**
 * Retry Utilities
 *
 * Provides retry logic with exponential backoff for resilient async operations.
 */

import { delay } from "./delay.js";
import type { RetryOptions } from "../../types/index.js";

/**
 * Default retry configuration.
 */
export const DEFAULT_RETRY_OPTIONS: Required<
  Pick<
    RetryOptions,
    "maxAttempts" | "initialDelay" | "maxDelay" | "backoffMultiplier"
  >
> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

/**
 * Calculate exponential backoff delay with optional jitter.
 *
 * Uses the formula: min(baseDelay * 2^(attempt-1) + jitter, maxDelay)
 *
 * @param attempt - Current attempt number (1-based)
 * @param baseDelayMs - Base delay in milliseconds
 * @param maxDelayMs - Maximum delay cap in milliseconds
 * @param addJitter - Whether to add random jitter (default: true)
 * @returns Calculated delay in milliseconds
 *
 * @example
 * ```typescript
 * // Without jitter
 * calculateBackoff(1, 1000, 30000, false); // 1000ms
 * calculateBackoff(2, 1000, 30000, false); // 2000ms
 * calculateBackoff(3, 1000, 30000, false); // 4000ms
 *
 * // With jitter (adds up to 10% random delay)
 * calculateBackoff(3, 1000, 30000, true); // ~4000-4400ms
 * ```
 */
export function calculateBackoff(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  addJitter: boolean = true,
): number {
  const exponentialDelay = baseDelayMs * 2 ** (attempt - 1);

  if (addJitter) {
    // Add up to 10% jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * exponentialDelay;
    return Math.min(exponentialDelay + jitter, maxDelayMs);
  }

  return Math.min(exponentialDelay, maxDelayMs);
}

/**
 * Error thrown when all retry attempts are exhausted.
 */
export class RetryExhaustedError extends Error {
  /**
   * Creates a new RetryExhaustedError.
   *
   * @param message - Error message
   * @param attempts - Total number of attempts made
   * @param lastError - The last error that caused the final failure
   */
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error,
  ) {
    super(message);
    this.name = "RetryExhaustedError";

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RetryExhaustedError);
    }
  }
}

/**
 * Retry an async function with exponential backoff.
 *
 * Executes the provided function and retries on failure according to
 * the specified options. Uses exponential backoff between retries.
 *
 * @param fn - Async function to execute
 * @param options - Retry configuration (merged with defaults)
 * @returns Promise that resolves with the function result
 * @throws The last error if all retries are exhausted
 *
 * @example
 * ```typescript
 * // Basic usage with defaults
 * const data = await retry(() => fetchFromAPI());
 * ```
 *
 * @example
 * ```typescript
 * // With custom options
 * const data = await retry(
 *   () => fetchFromAPI(),
 *   {
 *     maxRetries: 5,
 *     baseDelayMs: 500,
 *     maxDelayMs: 10000,
 *     onRetry: (err, attempt, delay) => {
 *       console.log(`Retry ${attempt} after ${delay}ms: ${err.message}`);
 *     },
 *     shouldRetry: (err) => {
 *       // Only retry on network errors
 *       return err.name === 'NetworkError';
 *     }
 *   }
 * );
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const config = {
    ...DEFAULT_RETRY_OPTIONS,
    ...options,
  };

  const {
    maxAttempts,
    initialDelay,
    maxDelay,
    backoffMultiplier,
    retryCondition = () => true,
    onRetry,
  } = config;

  let lastError: Error = new Error("Retry failed");
  let currentDelay = initialDelay;

  // Total attempts = initial attempt + retries
  const totalAttempts = maxAttempts + 1;

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      lastError = err;

      // Check if we've exhausted all retries
      if (attempt >= totalAttempts) {
        throw new RetryExhaustedError(
          `All ${totalAttempts} retry attempts exhausted`,
          totalAttempts,
          err,
        );
      }

      // Check if we should retry this error
      if (!retryCondition(err)) {
        throw err;
      }

      // Calculate delay with exponential backoff (capped at maxDelay)
      const delayMs = Math.min(currentDelay, maxDelay);

      // Notify about retry
      if (onRetry) {
        onRetry(attempt, err);
      }

      // Wait before next attempt
      await delay(delayMs);

      // Increase delay for next iteration
      currentDelay = currentDelay * backoffMultiplier;
    }
  }

  // This should never be reached, but TypeScript needs it
  throw new RetryExhaustedError(
    `All ${totalAttempts} retry attempts exhausted`,
    totalAttempts,
    lastError || new Error("Unknown retry failure"),
  );
}

/**
 * Create a retry wrapper with pre-configured options.
 *
 * Useful for creating reusable retry strategies.
 *
 * @param defaultOptions - Default retry options for the wrapper
 * @returns A retry function with the specified defaults
 *
 * @example
 * ```typescript
 * const apiRetry = createRetry({
 *   maxRetries: 5,
 *   baseDelayMs: 100,
 *   onRetry: (err, attempt) => logger.warn(`API retry ${attempt}`)
 * });
 *
 * // Use the configured retry
 * const data = await apiRetry(() => fetchFromAPI());
 * ```
 */
export function createRetry(defaultOptions: Partial<RetryOptions>) {
  return <T>(
    fn: () => Promise<T>,
    overrideOptions?: Partial<RetryOptions>,
  ): Promise<T> => {
    return retry(fn, { ...defaultOptions, ...overrideOptions });
  };
}
