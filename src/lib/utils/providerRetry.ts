/**
 * Provider-level retry utility for AI SDK calls (NL11)
 *
 * The Vercel AI SDK's `generateText()` and `streamText()` have built-in retry
 * logic (`_retryWithExponentialBackoff()` with default `maxRetries: 2`) that
 * retries on HTTP 429/500/503. These retries are completely invisible to OTel
 * because they happen inside the AI SDK.
 *
 * This module provides an instrumented retry wrapper that:
 * 1. Disables the AI SDK's internal retries (via `maxRetries: 0`)
 * 2. Implements our own retry loop with full OTel span events
 * 3. Records retry attempts, delays, status codes, and total attempt count
 *
 * @module utils/providerRetry
 */

import { type Span } from "@opentelemetry/api";
import { logger } from "./logger.js";
import { APICallError } from "./generationErrors.js";

/** Maximum number of retry attempts after the initial call (total = 1 + MAX_PROVIDER_RETRIES). */
export const MAX_PROVIDER_RETRIES = 2;

/** Base delay in ms for exponential backoff between retries. */
export const BASE_RETRY_DELAY_MS = 1000;

/**
 * Check whether an error thrown by the AI SDK is retryable.
 *
 * Uses `APICallError.isInstance()` for proper type-safe detection (the class
 * uses a branded symbol marker, so `instanceof` doesn't work across package
 * boundaries). Falls back to duck-typing for non-APICallError cases.
 */
export function isRetryableProviderError(error: unknown): boolean {
  // Preferred path: use the AI SDK's own branded type check + isRetryable flag
  if (APICallError.isInstance(error)) {
    return error.isRetryable;
  }

  // Fallback: duck-type for status codes on errors that aren't APICallError
  if (error && typeof error === "object" && "statusCode" in error) {
    const statusCode = (error as { statusCode: number }).statusCode;
    return statusCode === 429 || statusCode >= 500;
  }

  return false;
}

/**
 * Extract the HTTP status code from an AI SDK error, if available.
 */
export function getErrorStatusCode(error: unknown): number | undefined {
  if (APICallError.isInstance(error)) {
    return error.statusCode;
  }
  if (error && typeof error === "object" && "statusCode" in error) {
    return (error as { statusCode: number }).statusCode;
  }
  return undefined;
}

/**
 * Execute a provider call with instrumented retry logic.
 *
 * @param operation  - The async operation to execute (should already use `maxRetries: 0`)
 * @param span       - The OTel span to annotate with retry events and attributes
 * @param label      - A human-readable label for log messages (e.g. "generateText", "streamText")
 * @returns The result of the operation
 */
export async function withProviderRetry<T>(
  operation: () => Promise<T>,
  span: Span,
  label: string,
): Promise<T> {
  for (let attempt = 0; attempt <= MAX_PROVIDER_RETRIES; attempt++) {
    try {
      const result = await operation();

      // Record how many attempts it took on the span
      span.setAttribute("gen_ai.provider.total_attempts", attempt + 1);

      if (attempt > 0) {
        logger.info(
          `[providerRetry] ${label} succeeded after ${attempt + 1} attempts`,
        );
      }

      return result;
    } catch (error) {
      const retryable = isRetryableProviderError(error);
      const statusCode = getErrorStatusCode(error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (!retryable || attempt === MAX_PROVIDER_RETRIES) {
        // Record failure details before re-throwing
        span.setAttribute("gen_ai.provider.total_attempts", attempt + 1);
        if (attempt > 0) {
          span.setAttribute("gen_ai.provider.retries_exhausted", true);
        }

        logger.warn(
          `[providerRetry] ${label} failed (non-retryable or retries exhausted)`,
          {
            attempt: attempt + 1,
            retryable,
            statusCode,
            error: errorMessage,
          },
        );

        throw error;
      }

      // Calculate exponential backoff delay
      const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);

      // Record retry event on the OTel span
      span.addEvent("gen_ai.provider.retry", {
        "retry.attempt": attempt + 1,
        "retry.delay_ms": delay,
        ...(statusCode !== undefined && { "retry.status_code": statusCode }),
        "retry.error": errorMessage.slice(0, 256),
      });

      logger.warn(
        `[providerRetry] ${label} retrying after ${statusCode || "unknown"} error`,
        {
          attempt: attempt + 1,
          maxRetries: MAX_PROVIDER_RETRIES,
          delayMs: delay,
          statusCode,
          error: errorMessage,
        },
      );

      await new Promise((r) => setTimeout(r, delay));
    }
  }

  // This should never be reached due to the throw inside the loop,
  // but TypeScript requires it for exhaustiveness.
  throw new Error(`[providerRetry] ${label} exhausted all retries`);
}
