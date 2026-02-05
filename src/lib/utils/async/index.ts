/**
 * Async Utilities
 *
 * Centralized async/promise utilities for NeuroLink.
 * Provides common patterns like delays, timeouts, and retry logic.
 *
 * @example
 * ```typescript
 * import { delay, withTimeout, retry } from './utils/async/index.js';
 *
 * // Simple delay
 * await delay(1000);
 *
 * // Timeout protection
 * const result = await withTimeout(fetchData(), 5000);
 *
 * // Retry with backoff
 * const data = await retry(() => unreliableAPI(), { maxRetries: 3 });
 * ```
 */

export { delay, sleep } from "./delay.js";
export {
  calculateBackoff,
  createRetry,
  DEFAULT_RETRY_OPTIONS,
  RetryExhaustedError,
  type RetryOptions,
  retry,
} from "./retry.js";
export { TimeoutError, withTimeout, withTimeoutFn } from "./withTimeout.js";
