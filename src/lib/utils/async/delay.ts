/**
 * Delay Utilities
 *
 * Promise-based delay/sleep functions for async flow control.
 */

/**
 * Delay execution for a specified number of milliseconds.
 *
 * This is the canonical implementation for promise-based delays.
 *
 * @param ms - Duration to wait in milliseconds
 * @returns Promise that resolves after the specified delay
 *
 * @example
 * ```typescript
 * await delay(1000); // Wait 1 second
 * ```
 *
 * @example
 * ```typescript
 * // Use in a loop for polling
 * while (condition) {
 *   await checkStatus();
 *   await delay(500);
 * }
 * ```
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Alias for delay - provided for code clarity in sleep-like contexts.
 *
 * @param ms - Duration to sleep in milliseconds
 * @returns Promise that resolves after the specified duration
 *
 * @example
 * ```typescript
 * await sleep(2000); // Sleep for 2 seconds
 * ```
 */
export const sleep = delay;
