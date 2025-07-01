/**
 * Timeout wrapper for AI provider operations
 *
 * Provides a consistent way to add timeout functionality to any async operation.
 */

import {
  parseTimeout,
  TimeoutError,
  createTimeoutPromise,
} from "../utils/timeout.js";

/**
 * Wrap an async operation with a timeout
 * @param promise - The promise to wrap
 * @param timeout - Timeout duration (number in ms or string with unit)
 * @param provider - Provider name for error messages
 * @param operation - Operation type (generate or stream)
 * @returns The result of the promise or throws TimeoutError
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeout: number | string | undefined,
  provider: string,
  operation: "generate" | "stream",
): Promise<T> {
  const timeoutPromise = createTimeoutPromise(timeout, provider, operation);

  if (!timeoutPromise) {
    // No timeout specified, return original promise
    return promise;
  }

  // Race between the actual operation and timeout
  return Promise.race([promise, timeoutPromise]);
}

/**
 * Wrap a streaming async generator with timeout
 * @param generator - The async generator to wrap
 * @param timeout - Timeout duration for the entire stream
 * @param provider - Provider name for error messages
 * @returns Wrapped async generator that respects timeout
 */
export async function* withStreamingTimeout<T>(
  generator: AsyncGenerator<T>,
  timeout: number | string | undefined,
  provider: string,
): AsyncGenerator<T> {
  const timeoutMs = parseTimeout(timeout);

  if (!timeoutMs) {
    // No timeout, pass through original generator
    yield* generator;
    return;
  }

  const startTime = Date.now();

  try {
    for await (const chunk of generator) {
      // Check if we've exceeded the timeout
      if (Date.now() - startTime > timeoutMs) {
        throw new TimeoutError(
          `${provider} streaming operation timed out after ${timeout}`,
          timeoutMs,
          provider,
          "stream",
        );
      }

      yield chunk;
    }
  } finally {
    // Ensure generator is properly closed
    if (generator.return) {
      await generator.return(undefined as any);
    }
  }
}

/**
 * Create an abort controller with timeout
 * @param timeout - Timeout duration
 * @param provider - Provider name for error messages
 * @param operation - Operation type
 * @returns AbortController and cleanup function
 */
export function createTimeoutController(
  timeout: number | string | undefined,
  provider: string,
  operation: "generate" | "stream",
): {
  controller: AbortController;
  cleanup: () => void;
  timeoutMs: number;
} | null {
  const timeoutMs = parseTimeout(timeout);

  if (!timeoutMs) {
    return null;
  }

  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort(
      new TimeoutError(
        `${provider} ${operation} operation timed out after ${timeout}`,
        timeoutMs,
        provider,
        operation,
      ),
    );
  }, timeoutMs);

  // Cleanup function to clear the timer
  const cleanup = () => {
    clearTimeout(timer);
  };

  return { controller, cleanup, timeoutMs };
}

/**
 * Merge abort signals (for combining user abort with timeout)
 * @param signals - Array of abort signals to merge
 * @returns Combined abort controller
 */
export function mergeAbortSignals(
  signals: (AbortSignal | undefined)[],
): AbortController {
  const controller = new AbortController();

  // Listen to all signals and abort when any fires
  for (const signal of signals) {
    if (signal && !signal.aborted) {
      signal.addEventListener("abort", () => {
        if (!controller.signal.aborted) {
          controller.abort(signal.reason);
        }
      });
    }

    // If any signal is already aborted, abort immediately
    if (signal?.aborted) {
      controller.abort(signal.reason);
      break;
    }
  }

  return controller;
}
