/**
 * Shared HTTP retryability constants.
 *
 * Centralises the status-code lists that were duplicated across
 * httpRetryHandler, neurolink.ts, fileDetector.ts, and errorHelpers.
 */

/** Server-side and rate-limiting codes worth retrying. */
export const RETRYABLE_HTTP_STATUS_CODES: readonly number[] = [
  408, 429, 500, 502, 503, 504,
];

/** Client-error codes where retrying is pointless. */
export const NON_RETRYABLE_HTTP_STATUS_CODES: readonly number[] = [
  400, 401, 403, 404, 405, 409, 422,
];

/** Check whether an HTTP status code is retryable. */
export function isRetryableStatusCode(code: number): boolean {
  return (RETRYABLE_HTTP_STATUS_CODES as readonly number[]).includes(code);
}

/** Check whether an HTTP status code is non-retryable. */
export function isNonRetryableStatusCode(code: number): boolean {
  return (NON_RETRYABLE_HTTP_STATUS_CODES as readonly number[]).includes(code);
}
