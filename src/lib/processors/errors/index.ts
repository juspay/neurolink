/**
 * File Processing Error Infrastructure
 *
 * Provides comprehensive error handling for file processing operations:
 * - Error codes for all file processing scenarios
 * - Factory functions for creating structured errors
 * - Error serialization with PII redaction
 * - Fingerprinting for error deduplication
 * - Retry determination logic
 *
 * @module processors/errors
 *
 * @example
 * ```typescript
 * import {
 *   FileErrorCode,
 *   createFileError,
 *   isRetryableError,
 *   serializeError,
 *   generateErrorFingerprint,
 * } from "./processors/errors/index.js";
 *
 * // Create a structured error
 * const error = createFileError(FileErrorCode.FILE_TOO_LARGE, {
 *   sizeMB: "15.5",
 *   maxMB: "10",
 *   filename: "large-document.pdf",
 * });
 *
 * // Check if error is retryable
 * if (isRetryableError(error) && retryCount < maxRetries) {
 *   await delay(getRetryDelay(error, retryCount));
 *   return retry();
 * }
 *
 * // Serialize for logging (with PII redaction)
 * const serialized = serializeError(originalError);
 * logger.error("File processing failed", serialized);
 *
 * // Group similar errors by fingerprint
 * const fingerprint = generateErrorFingerprint(error);
 * ```
 */

// Error creation helpers
export {
  combineSummaries,
  createCustomFileError,
  createFileError,
  createProcessingSummary,
  extractHttpStatus,
  type FileProcessingError,
  type FileProcessingSummary,
  formatFileError,
  getRetryDelay,
  isFileProcessingError,
  isRetryableError,
  mapErrorToCode,
} from "./errorHelpers.js";
// Error serialization
export {
  extractSafeMetadata,
  generateErrorFingerprint,
  type SerializedError,
  type SerializeOptions,
  safeStringify,
  serializeError,
  summarizeError,
} from "./errorSerializer.js";
// Error codes and message templates
export {
  ERROR_MESSAGES,
  type ErrorMessageTemplate,
  FileErrorCode,
  getErrorTemplate,
  isRetryableErrorCode,
} from "./FileErrorCode.js";
