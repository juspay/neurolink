/**
 * File Processing Error Helpers
 *
 * Utilities for creating consistent, user-friendly file processing errors.
 * Provides factory functions for structured errors, retry determination logic,
 * and HTTP status extraction.
 *
 * @module processors/errors
 */

import type { FileProcessingError } from "../base/types.js";

import {
  ERROR_MESSAGES,
  type ErrorMessageTemplate,
  FileErrorCode,
} from "./FileErrorCode.js";

export type { FileProcessingError };

/**
 * Summary of file processing operations.
 */
export type FileProcessingSummary = {
  /** Total number of files attempted */
  totalFiles: number;
  /** Successfully processed files */
  processedFiles: Array<{
    filename: string;
    size?: number;
    type?: string;
  }>;
  /** Files that failed to process */
  failedFiles: Array<{
    filename: string;
    error: FileProcessingError;
  }>;
  /** Files that were skipped */
  skippedFiles: Array<{
    filename: string;
    reason: string;
    suggestedAlternative?: string;
  }>;
  /** Non-fatal warnings */
  warnings: Array<{
    filename: string;
    message: string;
  }>;
};

/**
 * Create a structured file processing error with user-friendly messaging.
 *
 * @param code - The error code from FileErrorCode enum
 * @param details - Additional context for the error (e.g., file size, format)
 * @param originalError - The original error that caused this failure
 * @returns A structured FileProcessingError with user-friendly messaging
 *
 * @example
 * ```typescript
 * const error = createFileError(FileErrorCode.FILE_TOO_LARGE, {
 *   sizeMB: "15.5",
 *   maxMB: "10",
 *   filename: "large-document.pdf",
 * });
 * ```
 */
export function createFileError(
  code: FileErrorCode,
  details?: Record<string, unknown>,
  originalError?: Error,
): FileProcessingError {
  const template: ErrorMessageTemplate = ERROR_MESSAGES[code];

  const result: FileProcessingError = {
    code,
    message: template.message,
    userMessage: template.userMessage,
    suggestedAction: template.suggestedAction,
    retryable: template.retryable,
  };

  // Add details if provided
  if (details && Object.keys(details).length > 0) {
    result.details = details;
  }

  // Add technical details from original error
  const technicalDetails =
    originalError?.message || (details?.technicalDetails as string | undefined);
  if (technicalDetails) {
    result.technicalDetails = technicalDetails;
  }

  if (originalError) {
    result.originalError = originalError;
  }

  return result;
}

/**
 * Create a file processing error with custom messages.
 * Useful when you need to override the default messages with context-specific ones.
 *
 * @param code - The error code from FileErrorCode enum
 * @param customMessage - Custom technical message
 * @param customUserMessage - Custom user-friendly message
 * @param details - Additional context
 * @returns A structured FileProcessingError
 */
export function createCustomFileError(
  code: FileErrorCode,
  customMessage: string,
  customUserMessage: string,
  details?: Record<string, unknown>,
): FileProcessingError {
  const template: ErrorMessageTemplate = ERROR_MESSAGES[code];

  return {
    code,
    message: customMessage,
    userMessage: customUserMessage,
    suggestedAction: template.suggestedAction,
    retryable: template.retryable,
    details,
  };
}

/**
 * Extract HTTP status code from various error types.
 *
 * @param error - The error to extract status from
 * @returns The HTTP status code if found, null otherwise
 *
 * @example
 * ```typescript
 * const status = extractHttpStatus(error);
 * if (status === 404) {
 *   // Handle not found
 * }
 * ```
 */
export function extractHttpStatus(error: unknown): number | null {
  if (!error) {
    return null;
  }

  // Check for Error objects with HTTP status in message
  if (error instanceof Error) {
    // Match patterns like "HTTP 404", "status: 500", "statusCode: 503"
    const patterns = [
      /HTTP\s*(\d{3})/i,
      /status[:\s]+(\d{3})/i,
      /statusCode[:\s]+(\d{3})/i,
      /\b(\d{3})\s+(?:Not Found|Unauthorized|Forbidden|Internal Server Error|Bad Gateway|Service Unavailable|Gateway Timeout)/i,
    ];

    for (const pattern of patterns) {
      const match = error.message.match(pattern);
      if (match?.[1]) {
        return parseInt(match[1], 10);
      }
    }
  }

  // Check for objects with status or statusCode property
  if (typeof error === "object" && error !== null) {
    const errorObj = error as Record<string, unknown>;

    if (typeof errorObj.status === "number") {
      return errorObj.status;
    }
    if (typeof errorObj.statusCode === "number") {
      return errorObj.statusCode;
    }
    if (typeof errorObj.response === "object" && errorObj.response !== null) {
      const response = errorObj.response as Record<string, unknown>;
      if (typeof response.status === "number") {
        return response.status;
      }
    }
  }

  return null;
}

/**
 * Determine if an error is retryable based on error type and characteristics.
 * Checks for transient errors like 5xx, network errors, and timeouts.
 *
 * @param error - The error to check
 * @returns true if the error is transient and potentially retryable
 *
 * @example
 * ```typescript
 * if (isRetryableError(error) && retryCount < maxRetries) {
 *   await delay(backoffMs);
 *   return retry();
 * }
 * ```
 */
export function isRetryableError(error: unknown): boolean {
  // Check FileProcessingError
  if (isFileProcessingError(error)) {
    return error.retryable ?? false;
  }

  if (error instanceof Error) {
    // Network/timeout errors are retryable
    const retryableNames = ["AbortError", "TimeoutError", "FetchError"];
    if (retryableNames.includes(error.name)) {
      return true;
    }

    const message = error.message.toLowerCase();

    // HTTP 5xx server errors are retryable
    if (/http\s*5\d{2}/i.test(error.message)) {
      return true;
    }

    // HTTP 429 (rate limiting) is retryable
    if (/http\s*429/i.test(error.message) || message.includes("rate limit")) {
      return true;
    }

    // HTTP 408 (request timeout) is retryable
    if (/http\s*408/i.test(error.message)) {
      return true;
    }

    // Connection errors are retryable
    const connectionPatterns = [
      "econnreset",
      "etimedout",
      "econnrefused",
      "enotfound",
      "enetunreach",
      "ehostunreach",
      "epipe",
      "socket hang up",
      "network error",
      "connection refused",
      "connection reset",
      "dns lookup failed",
    ];

    if (connectionPatterns.some((pattern) => message.includes(pattern))) {
      return true;
    }

    // Temporary/transient errors are retryable
    if (message.includes("temporary") || message.includes("try again")) {
      return true;
    }
  }

  // Check HTTP status from error object
  const status = extractHttpStatus(error);
  if (status !== null) {
    // 5xx errors (server errors) are retryable
    if (status >= 500 && status < 600) {
      return true;
    }
    // 408 (Request Timeout) and 429 (Too Many Requests) are retryable
    if (status === 408 || status === 429) {
      return true;
    }
  }

  return false;
}

/**
 * Type guard to check if an error is a FileProcessingError.
 *
 * @param error - The value to check
 * @returns true if error is a FileProcessingError
 */
export function isFileProcessingError(
  error: unknown,
): error is FileProcessingError {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const e = error as Record<string, unknown>;
  return (
    typeof e.code === "string" &&
    typeof e.message === "string" &&
    typeof e.userMessage === "string" &&
    typeof e.retryable === "boolean"
  );
}

/**
 * Map an error to the appropriate FileErrorCode based on its characteristics.
 *
 * @param error - The error to analyze
 * @returns The most appropriate FileErrorCode
 */
export function mapErrorToCode(error: unknown): FileErrorCode {
  if (!error) {
    return FileErrorCode.UNKNOWN_ERROR;
  }

  // Check HTTP status first
  const status = extractHttpStatus(error);
  if (status !== null) {
    if (status === 401 || status === 403) {
      return FileErrorCode.DOWNLOAD_AUTH_FAILED;
    }
    if (status === 404) {
      return FileErrorCode.FILE_NOT_FOUND;
    }
    if (status === 408) {
      return FileErrorCode.DOWNLOAD_TIMEOUT;
    }
    if (status === 429) {
      return FileErrorCode.RATE_LIMITED;
    }
    if (status >= 500) {
      return FileErrorCode.DOWNLOAD_FAILED;
    }
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const name = error.name;

    // Timeout errors
    if (
      name === "AbortError" ||
      name === "TimeoutError" ||
      message.includes("timeout")
    ) {
      return FileErrorCode.DOWNLOAD_TIMEOUT;
    }

    // Network errors
    if (
      message.includes("econnreset") ||
      message.includes("econnrefused") ||
      message.includes("network") ||
      message.includes("socket")
    ) {
      return FileErrorCode.NETWORK_ERROR;
    }

    // Size errors
    if (message.includes("too large") || message.includes("size limit")) {
      return FileErrorCode.FILE_TOO_LARGE;
    }

    // Format/type errors
    if (message.includes("unsupported") || message.includes("not supported")) {
      return FileErrorCode.UNSUPPORTED_TYPE;
    }
    if (message.includes("invalid format") || message.includes("malformed")) {
      return FileErrorCode.INVALID_FORMAT;
    }
    if (message.includes("corrupt")) {
      return FileErrorCode.CORRUPTED_FILE;
    }

    // Parsing errors
    if (message.includes("parse") || message.includes("syntax")) {
      return FileErrorCode.PARSING_FAILED;
    }

    // Encoding errors
    if (
      message.includes("encoding") ||
      message.includes("utf") ||
      message.includes("decode")
    ) {
      return FileErrorCode.ENCODING_ERROR;
    }

    // Security errors
    if (message.includes("xxe") || message.includes("doctype")) {
      return FileErrorCode.XXE_DETECTED;
    }
    if (message.includes("xss") || message.includes("script")) {
      return FileErrorCode.XSS_DETECTED;
    }
    if (message.includes("zip bomb") || message.includes("compression ratio")) {
      return FileErrorCode.ZIP_BOMB_DETECTED;
    }
  }

  return FileErrorCode.UNKNOWN_ERROR;
}

/**
 * Format a file processing error for display to users.
 *
 * @param error - The FileProcessingError to format
 * @returns A formatted string suitable for display
 */
export function formatFileError(error: FileProcessingError): string {
  let message = error.userMessage;

  if (error.suggestedAction) {
    message += `\n${error.suggestedAction}`;
  }

  return message;
}

/**
 * Create a processing summary from arrays of results.
 *
 * @param totalFiles - Total number of files attempted
 * @param processedFiles - Successfully processed files
 * @param failedFiles - Files that failed to process
 * @param skippedFiles - Files that were skipped
 * @param warnings - Non-fatal warnings
 * @returns A FileProcessingSummary object
 */
export function createProcessingSummary(
  totalFiles: number,
  processedFiles: FileProcessingSummary["processedFiles"] = [],
  failedFiles: FileProcessingSummary["failedFiles"] = [],
  skippedFiles: FileProcessingSummary["skippedFiles"] = [],
  warnings: FileProcessingSummary["warnings"] = [],
): FileProcessingSummary {
  return {
    totalFiles,
    processedFiles,
    failedFiles,
    skippedFiles,
    warnings,
  };
}

/**
 * Combine multiple processing summaries into one.
 * Useful when processing different file types separately.
 *
 * @param summaries - Array of summaries to combine
 * @returns A combined FileProcessingSummary
 */
export function combineSummaries(
  summaries: FileProcessingSummary[],
): FileProcessingSummary {
  return summaries.reduce(
    (combined, summary) => ({
      totalFiles: combined.totalFiles + summary.totalFiles,
      processedFiles: [...combined.processedFiles, ...summary.processedFiles],
      failedFiles: [...combined.failedFiles, ...summary.failedFiles],
      skippedFiles: [...combined.skippedFiles, ...summary.skippedFiles],
      warnings: [...combined.warnings, ...summary.warnings],
    }),
    createProcessingSummary(0),
  );
}

/**
 * Get retry delay based on error type and attempt number.
 * Implements exponential backoff with jitter.
 *
 * @param error - The error that occurred
 * @param attempt - Current attempt number (1-based)
 * @param baseDelayMs - Base delay in milliseconds (default: 1000)
 * @returns Delay in milliseconds before next retry
 */
export function getRetryDelay(
  error: unknown,
  attempt: number,
  baseDelayMs: number = 1000,
): number {
  // Check for rate limit with Retry-After header
  if (typeof error === "object" && error !== null) {
    const errorObj = error as Record<string, unknown>;
    const retryAfter = (errorObj.retryAfter ??
      errorObj["retry-after"]) as unknown;
    if (typeof retryAfter === "number") {
      return retryAfter * 1000;
    }
    if (typeof retryAfter === "string") {
      const parsed = Number(retryAfter);
      if (!Number.isNaN(parsed)) {
        return parsed * 1000;
      }
    }
  }

  // Exponential backoff: base * 2^(attempt-1)
  const safeAttempt = Math.max(1, attempt);
  const exponentialDelay = baseDelayMs * 2 ** (safeAttempt - 1);

  // Add jitter (0-25% of delay)
  const jitter = exponentialDelay * 0.25 * Math.random();

  // Cap at 30 seconds
  return Math.min(exponentialDelay + jitter, 30000);
}
