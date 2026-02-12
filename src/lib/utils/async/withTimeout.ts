/**
 * Timeout Utilities
 *
 * Wrapper functions for adding timeout protection to async operations.
 */

/**
 * Error thrown when an operation times out.
 */
export class TimeoutError extends Error {
  /**
   * Creates a new TimeoutError.
   *
   * @param message - Error message describing the timeout
   * @param timeoutMs - The timeout duration that was exceeded
   */
  constructor(
    message: string,
    public readonly timeoutMs: number,
  ) {
    super(message);
    this.name = "TimeoutError";

    // Maintains proper stack trace for where error was thrown (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TimeoutError);
    }
  }
}

/**
 * Execute a promise with timeout protection.
 *
 * Wraps a promise and rejects with a TimeoutError if the operation
 * takes longer than the specified duration.
 *
 * @param promise - The promise to wrap with timeout
 * @param ms - Maximum time to wait in milliseconds
 * @param message - Optional custom error message for timeout
 * @returns Promise that resolves with the result or rejects on timeout
 * @throws {TimeoutError} If the operation exceeds the timeout duration
 *
 * @example
 * ```typescript
 * const result = await withTimeout(
 *   fetchData(),
 *   5000,
 *   'Data fetch timed out'
 * );
 * ```
 *
 * @example
 * ```typescript
 * try {
 *   const data = await withTimeout(slowOperation(), 3000);
 * } catch (error) {
 *   if (error instanceof TimeoutError) {
 *     console.log(`Timed out after ${error.timeoutMs}ms`);
 *   }
 * }
 * ```
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message?: string,
): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new TimeoutError(message || `Operation timed out after ${ms}ms`, ms),
      );
    }, ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Execute a function with timeout protection.
 *
 * Alternative signature that accepts a function instead of a promise,
 * useful when you want to delay starting the operation.
 *
 * @param fn - Async function to execute
 * @param ms - Maximum time to wait in milliseconds
 * @param message - Optional custom error message for timeout
 * @returns Promise that resolves with the function result or rejects on timeout
 * @throws {TimeoutError} If the operation exceeds the timeout duration
 *
 * @example
 * ```typescript
 * const result = await withTimeoutFn(
 *   () => fetchData(),
 *   5000,
 *   'Data fetch timed out'
 * );
 * ```
 */
export async function withTimeoutFn<T>(
  fn: () => Promise<T>,
  ms: number,
  message?: string,
): Promise<T> {
  return withTimeout(fn(), ms, message);
}
