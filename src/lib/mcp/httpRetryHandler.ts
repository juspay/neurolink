/**
 * HTTP Retry Handler for MCP Transport
 *
 * Provides retry logic with exponential backoff and jitter
 * specifically designed for HTTP-based MCP transport connections.
 */

import { isAbortError } from "../utils/errorHandling.js";
import { calculateBackoffDelay } from "../utils/retryHandler.js";
import { logger } from "../utils/logger.js";
import type { HTTPRetryConfig } from "../types/mcpTypes.js";

/**
 * Default HTTP retry configuration
 */
export const DEFAULT_HTTP_RETRY_CONFIG: HTTPRetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an HTTP status code is retryable based on configuration
 *
 * @param status - HTTP status code to check
 * @param config - HTTP retry configuration
 * @returns True if the status code should trigger a retry
 */
export function isRetryableStatusCode(
  status: number,
  config: HTTPRetryConfig = DEFAULT_HTTP_RETRY_CONFIG,
): boolean {
  return config.retryableStatusCodes.includes(status);
}

/**
 * Check if an error is retryable for HTTP operations
 *
 * Considers:
 * - Network errors (ECONNRESET, ENOTFOUND, ECONNREFUSED, ETIMEDOUT)
 * - Timeout errors
 * - HTTP status codes in the retryable list
 * - Fetch/network-related errors
 *
 * @param error - Error to check
 * @param config - HTTP retry configuration (optional)
 * @returns True if the error is retryable
 */
export function isRetryableHTTPError(
  error: unknown,
  config: HTTPRetryConfig = DEFAULT_HTTP_RETRY_CONFIG,
): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const errorObj = error as Record<string, unknown>;

  // User-initiated aborts are NOT retryable — the caller explicitly cancelled
  if (isAbortError(error)) {
    return false;
  }

  // Check for timeout errors
  if (
    errorObj.name === "TimeoutError" ||
    errorObj.code === "TIMEOUT" ||
    errorObj.code === "ETIMEDOUT"
  ) {
    return true;
  }

  // Check for network-related errors
  if (
    errorObj.code === "ECONNRESET" ||
    errorObj.code === "ENOTFOUND" ||
    errorObj.code === "ECONNREFUSED" ||
    errorObj.code === "ECONNABORTED" ||
    errorObj.code === "EPIPE" ||
    errorObj.code === "ENETUNREACH" ||
    errorObj.code === "EHOSTUNREACH"
  ) {
    return true;
  }

  // Check for fetch errors (network failures)
  if (errorObj.name === "TypeError" && typeof errorObj.message === "string") {
    const message = errorObj.message.toLowerCase();
    if (
      message.includes("fetch") ||
      message.includes("network") ||
      message.includes("connection")
    ) {
      return true;
    }
  }

  // Check for HTTP status codes
  if (typeof errorObj.status === "number") {
    return isRetryableStatusCode(errorObj.status, config);
  }

  // Check for response object with status
  if (
    errorObj.response &&
    typeof errorObj.response === "object" &&
    typeof (errorObj.response as Record<string, unknown>).status === "number"
  ) {
    return isRetryableStatusCode(
      (errorObj.response as Record<string, unknown>).status as number,
      config,
    );
  }

  // Check for statusCode (alternative property name)
  if (typeof errorObj.statusCode === "number") {
    return isRetryableStatusCode(errorObj.statusCode, config);
  }

  return false;
}

/**
 * Execute an HTTP operation with retry logic
 *
 * Implements exponential backoff with jitter to avoid thundering herd problems.
 * Uses the calculateBackoffDelay function from the core retry handler for
 * consistent delay calculation across the codebase.
 *
 * @param operation - Async operation to execute with retries
 * @param config - Partial HTTP retry configuration (merged with defaults)
 * @returns Result of the operation
 * @throws Last error if all retry attempts fail
 *
 * @example
 * ```typescript
 * const result = await withHTTPRetry(
 *   async () => {
 *     const response = await fetch(url);
 *     if (!response.ok) {
 *       const error = new Error(`HTTP ${response.status}`) as Error & { status: number };
 *       error.status = response.status;
 *       throw error;
 *     }
 *     return response.json();
 *   },
 *   { maxAttempts: 5, initialDelay: 500 }
 * );
 * ```
 */
export async function withHTTPRetry<T>(
  operation: () => Promise<T>,
  config: Partial<HTTPRetryConfig> = {},
): Promise<T> {
  const mergedConfig: HTTPRetryConfig = {
    ...DEFAULT_HTTP_RETRY_CONFIG,
    ...config,
  };

  let lastError: unknown;

  for (let attempt = 1; attempt <= mergedConfig.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry if it's the last attempt
      if (attempt === mergedConfig.maxAttempts) {
        logger.debug(
          `HTTP retry: All ${mergedConfig.maxAttempts} attempts exhausted`,
        );
        break;
      }

      // Check if we should retry this error
      if (!isRetryableHTTPError(error, mergedConfig)) {
        logger.debug(
          `HTTP retry: Non-retryable error encountered`,
          error instanceof Error ? error.message : String(error),
        );
        break;
      }

      // Calculate delay using the shared backoff calculation
      const delay = calculateBackoffDelay(
        attempt,
        mergedConfig.initialDelay,
        mergedConfig.backoffMultiplier,
        mergedConfig.maxDelay,
        true, // Enable jitter
      );

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.warn(
        `HTTP retry: Attempt ${attempt}/${mergedConfig.maxAttempts} failed: ${errorMessage}. Retrying in ${Math.round(delay)}ms...`,
      );

      await sleep(delay);
    }
  }

  throw lastError;
}
