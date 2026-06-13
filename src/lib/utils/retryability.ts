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

/**
 * Detect a deterministic client-error (HTTP 400 / malformed request) signature
 * embedded in a provider error MESSAGE, for cases where the numeric status is
 * not exposed as a structured `status`/`statusCode` field. Vertex/Gemini wrap a
 * 400 INVALID_ARGUMENT inside the message string (e.g. `Google Vertex AI Invalid
 * Request: {"error":{"code":400,"status":"INVALID_ARGUMENT", …}}`), so the
 * object-level status check misses it and the fallback orchestrator keeps
 * retrying the identical, malformed payload on every other provider — they
 * reject it the same way. A 400 means the request itself is bad, so retrying is
 * pointless regardless of provider. Matches only unambiguous markers to avoid
 * misclassifying transient (5xx/429) failures.
 */
export function isDeterministicClientErrorMessage(message: string): boolean {
  if (!message) {
    return false;
  }
  return (
    message.includes("INVALID_ARGUMENT") ||
    message.includes("Invalid JSON payload") ||
    /\bInvalid Request\b/i.test(message) ||
    /"code"\s*:\s*400\b/.test(message) ||
    /\b400\s+Bad Request\b/i.test(message)
  );
}
